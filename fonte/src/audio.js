// Sinais sonoros (Web Audio) sincronizados com o relógio do treino.
//
// Por que não agendar tudo de uma vez? O relógio do áudio (ctx.currentTime) só começa a andar
// quando o navegador consegue abrir a saída de som. Em máquinas lentas ou sobrecarregadas isso
// pode levar segundos, e tudo que foi agendado "de uma vez" sai atrasado por esse mesmo tempo
// (um atraso constante em todos os bipes). Aqui o áudio só é agendado em janelas curtas e é
// reconferido várias vezes por segundo contra o relógio do treino, que é a referência.

let ctx = null;

/** Relógio do treino: monotônico (não pula se a hora do computador for ajustada). */
export const agora = () => performance.now();

/** Precisa ser chamado dentro de um toque do usuário (botão Iniciar) para liberar o som. */
export function prepararAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    // "playback" usa buffers maiores: resiste melhor a computador lento (sem picotar). O atraso
    // maior da saída é compensado por getOutputTimestamp, quando o navegador oferece.
    const compensa = typeof AC.prototype?.getOutputTimestamp === "function";
    try {
      ctx = new AC(compensa ? { latencyHint: "playback" } : undefined);
    } catch {
      ctx = new AC();
    }
  }
  if (ctx.state !== "running") ctx.resume?.().catch?.(() => {});
  return ctx;
}

const pronto = (c) => c.state === "running" && c.currentTime > 0;

// A posição real da saída (getOutputTimestamp) só fica disponível depois de alguns instantes.
const saidaMedida = (c) => {
  try {
    const ts = c.getOutputTimestamp?.();
    return !!ts && ts.performanceTime > 0 && ts.contextTime > 0;
  } catch {
    return false;
  }
};

/** O som está de fato rodando? (usado para avisar "SEM SOM") */
export const audioRodando = () => !!ctx && ctx.state === "running";

/**
 * Espera o áudio realmente começar a rodar (ou o limite de tempo). Resolve true/false.
 * Em computador lento isso pode levar vários segundos; começar a contagem antes disso faria todos
 * os bipes saírem atrasados. Chame dentro do toque do usuário: o primeiro passo (criar/retomar o
 * áudio) é síncrono.
 */
export function aguardarAudio(limiteMs = 8000) {
  const c = prepararAudio();
  if (!c) return Promise.resolve(false);
  return new Promise((resolve) => {
    let feito = false;
    let desde = null; // quando o áudio passou a rodar
    let sondagem = null;
    let prazo = null;
    const fim = (ok) => {
      if (feito) return;
      feito = true;
      clearInterval(sondagem);
      clearTimeout(prazo);
      resolve(ok);
    };
    const checar = () => {
      if (!pronto(c)) return;
      desde ??= agora();
      // espera a medida da saída ficar válida (no máx. 1,5 s) para compensar a latência desde o 1º bipe
      if (saidaMedida(c) || !c.getOutputTimestamp || agora() - desde > 1500) fim(true);
    };
    sondagem = setInterval(checar, 25);
    prazo = setTimeout(() => fim(pronto(c)), limiteMs);
    checar();
  });
}

/**
 * Folga (ms) entre agendar o primeiro bipe e ele soar: um som pedido para "agora" só sai depois
 * da latência da saída de áudio (placa, Bluetooth). Usada para começar a contagem com margem.
 */
export function margemInicialMs() {
  const c = ctx;
  if (!c) return 0; // sem áudio não há o que esperar
  let latencia = 0;
  try {
    const ts = c.getOutputTimestamp?.();
    if (ts && ts.contextTime > 0) latencia = (c.currentTime - ts.contextTime) * 1000;
  } catch {
    latencia = 0;
  }
  if (!(latencia > 0)) latencia = ((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000;
  return Math.min(1500, Math.max(150, latencia + 120));
}

// ---------- notas ----------

function tom(nos, freq, quando, duracao, volume, tipo = "triangle") {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = freq;
  ganho.gain.setValueAtTime(0.0001, quando);
  ganho.gain.exponentialRampToValueAtTime(volume, quando + 0.01);
  ganho.gain.setValueAtTime(volume, Math.max(quando + 0.01, quando + duracao - 0.06));
  ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
  osc.connect(ganho).connect(barramento("bipes"));
  osc.start(quando);
  osc.stop(quando + duracao + 0.02);
  nos.push(osc);
}

// ---------- falas ----------
// "Voga N" (antes de uma remada), "5 segundos", "Vai!" (ao começar a remada) e "Respira" (ao começar um descanso)
// são MP3s decodificados
// uma vez, ao iniciar o treino, e tocados no relógio do treino exatamente como os bipes.

const buffers = new Map(); // chave -> AudioBuffer ("voga:20", "5seg", "vai", "respira")
const GANHO_VOZ = 1;
const FOLGA_FALA_MS = 250; // pausa entre o fim de "Voga N" e o "5 segundos"
const INICIO_FALA_MS = 150; // "Voga N" de etapa curta: logo depois que a etapa começa

export const chaveVoga = (n) => `voga:${n}`;
export const temVoz = (chave) => buffers.has(chave);
const duracaoVozMs = (chave) => (buffers.get(chave)?.duration ?? 0) * 1000;
/** Registra uma fala já decodificada (usado nos testes). */
export const registrarVoz = (chave, buffer) => buffers.set(chave, buffer);

// As falas são arquivos MP3 em audio/ (public/audio/): baixados uma vez e guardados em cache pelo navegador.
const bytesVozes = new Map(); // chave -> Promise<ArrayBuffer | null> (baixados uma vez só)

const chavesDoTreino = (passos) => {
  const chaves = new Set(["5seg", "vai"]);
  for (const p of passos) if (p.tipo === "remada") chaves.add(chaveVoga(p.voga));
  if (passos.some((p) => p.tipo === "descanso")) chaves.add("respira");
  return [...chaves];
};
// "voga:24" -> audio/voga-24.mp3 (relativo à página: funciona na raiz e em subpasta, como no github.io/repo/)
const urlDaVoz = (chave) => new URL(`audio/${chave.replace(":", "-")}.mp3`, document.baseURI).href;

function obterBytes(chave) {
  if (!bytesVozes.has(chave)) {
    const pedido = (async () => {
      try {
        if (typeof fetch !== "function") return null;
        const r = await fetch(urlDaVoz(chave));
        return r.ok ? await r.arrayBuffer() : null;
      } catch {
        return null;
      }
    })().then((b) => {
      if (!b) bytesVozes.delete(chave); // falhou (offline?): tenta de novo na próxima vez
      return b;
    });
    bytesVozes.set(chave, pedido);
  }
  return bytesVozes.get(chave);
}

/** Começa a baixar as falas do treino (sem precisar do som liberado). Chamada ao abrir o treino. */
export const baixarVozes = (passos) => Promise.all(chavesDoTreino(passos).map(obterBytes));

const decodificar = (c, bytes) =>
  new Promise((ok, falha) => {
    const r = c.decodeAudioData(bytes, ok, falha); // versão com callback (Safari antigo)
    r?.then?.(ok, falha); // versão com promessa
  });

/**
 * Decodifica as falas que este treino usa (a voga de cada remada, "5 segundos" e "vai").
 * Chame logo depois de prepararAudio(). Se algo falhar, o treino segue só com os bipes.
 */
export async function prepararVozes(passos, limiteMs = 8000) {
  const c = ctx;
  if (!c || typeof c.decodeAudioData !== "function") return false;
  const faltam = chavesDoTreino(passos).filter((k) => !buffers.has(k));
  if (!faltam.length) return true;
  let prazo = null;
  const trabalho = Promise.all(
    faltam.map(async (k) => {
      try {
        const bytes = await obterBytes(k);
        // decodeAudioData consome o ArrayBuffer: decodifica uma cópia e mantém o original para a próxima vez
        if (bytes) buffers.set(k, await decodificar(c, bytes.slice(0)));
      } catch {
        /* esta fala não toca; o resto continua */
      }
    }),
  );
  await Promise.race([trabalho, new Promise((r) => (prazo = setTimeout(r, limiteMs)))]);
  clearTimeout(prazo);
  return faltam.every((k) => buffers.has(k));
}

function falar(nos, buffer, quando) {
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  const ganho = ctx.createGain();
  ganho.gain.value = GANHO_VOZ;
  fonte.connect(ganho).connect(barramento("vozes"));
  fonte.start(quando);
  nos.push(fonte);
}

// ---------- liga/desliga (bips e vozes) ----------
// Cada tipo de som passa por um "barramento" (ganho 1 = liga, 0 = desliga). Assim, desligar vale na hora,
// inclusive para o que já estava agendado, e religar volta a soar normalmente no ponto em que o treino está.
let bipesLigados = true;
let vozesLigadas = true;
const barramentos = { bipes: null, vozes: null };

function barramento(tipo) {
  const atual = barramentos[tipo];
  if (atual && atual.ctx === ctx) return atual.no;
  const no = ctx.createGain();
  const ligado = tipo === "bipes" ? bipesLigados : vozesLigadas;
  if (no.gain) no.gain.value = ligado ? 1 : 0;
  no.connect(ctx.destination);
  barramentos[tipo] = { ctx, no };
  return no;
}

function aplicarGanho(tipo, ligado) {
  const b = barramentos[tipo];
  if (!b || b.ctx !== ctx) return;
  const g = b.no.gain;
  if (typeof g.setTargetAtTime === "function") g.setTargetAtTime(ligado ? 1 : 0, ctx.currentTime, 0.01);
  else g.value = ligado ? 1 : 0;
}

export function definirBipes(ligado) {
  bipesLigados = !!ligado;
  aplicarGanho("bipes", bipesLigados);
}
const agendasAtivas = new Set(); // cada agenda registra aqui como refazer os bipes que dependem do "Vai!"

export function definirVozes(ligado) {
  vozesLigadas = !!ligado;
  aplicarGanho("vozes", vozesLigadas);
  // o bipe da troca para remada muda (curto com "Vai!", completo sem): refaz os que ainda não tocaram
  agendasAtivas.forEach((refazer) => refazer());
}

const pararNo = (o) => {
  try {
    o.stop();
  } catch {
    /* já terminou */
  }
};

const AGUDO = 1046; // próxima etapa é remada
const GRAVE = 523; // próxima etapa é descanso

// Um sinal é { t, notas }: t = instante no relógio do treino (agora()), notas = o que tocar.
const bipeCurto = (t) => ({ t, notas: [{ f: 660, d: 0.12, v: 0.35, tipo: "sine", off: 0 }] });
// Quando o "Vai!" acompanha o bipe de uma remada, o bipe fica mais curto e mais baixo para não abafar a voz.
// Se o "Vai!" estiver desligado na hora de tocar, vale a versão cheia do bipe (`notasSemVoz`).
const bipeLongo = (t, tipo, comVoz = false) => {
  const f = tipo === "remada" ? AGUDO : GRAVE;
  return {
    t,
    notas: [{ f, d: comVoz ? 0.3 : 0.5, v: comVoz ? 0.4 : 0.6, off: 0 }],
    ...(comVoz && { notasSemVoz: [{ f, d: 0.5, v: 0.6, off: 0 }] }),
  };
};
const fala = (t, chave) => ({ t, voz: chave, notas: [] });

// Fala do início de uma etapa: "Vai!" na remada, "Respira" no descanso (se a fala estiver carregada).
const falaDoInicio = (tipo) => (tipo === "remada" ? "vai" : "respira");
const temFalaDoInicio = (tipo) => (tipo === "remada" ? temVoz("vai") : tipo === "descanso" && temVoz("respira"));

/** Bipe de troca avulso (agudo se a etapa que começa é remada, grave se é descanso) + "Vai!" ou "Respira". */
export const sinalTroca = (t, tipo) => {
  const comVoz = temFalaDoInicio(tipo);
  return [bipeLongo(t, tipo, comVoz), ...(comVoz ? [fala(t, falaDoInicio(tipo))] : [])];
};

/**
 * Contagem antes do treino: um bipe por segundo a partir de `t0` e o bipe de largada ao zerar.
 * `primeiroPasso` é o 1º passo do treino (ou só o seu tipo). Se for remada: "Voga N" junto do 1º
 * bipe da contagem e "Vai!" na largada; se for descanso, "Respira" na largada.
 */
export function sinaisContagem(t0, segundos, primeiroPasso) {
  const tipo = typeof primeiroPasso === "string" ? primeiroPasso : primeiroPasso?.tipo;
  const comVai = temFalaDoInicio(tipo);
  const sinais = [];
  for (let k = 0; k < segundos; k++) sinais.push(bipeCurto(t0 + k * 1000));
  sinais.push(bipeLongo(t0 + segundos * 1000, tipo, comVai));
  if (tipo === "remada") {
    const chave = chaveVoga(primeiroPasso.voga);
    if (typeof primeiroPasso !== "string" && temVoz(chave) && duracaoVozMs(chave) < segundos * 1000 - 300) {
      sinais.push(fala(t0, chave));
    }
    if (comVai) sinais.push(fala(t0 + segundos * 1000, "vai"));
  } else if (comVai) sinais.push(fala(t0 + segundos * 1000, "respira"));
  return sinais;
}

/**
 * Falas que antecedem a remada `proximo`, dentro da etapa atual (que começou em `inicio` e termina em `fim`):
 *  - "Voga N" termina FOLGA antes do "5 segundos";
 *  - "5 segundos" quando faltam 5 s, só se a etapa atual dura mais de 5 s;
 *  - etapa curta: "Voga N" logo no começo, se couber; o "5 segundos" só entra se não bater com a voga.
 */
function falasAntesDaRemada(proximo, inicio, fim, total) {
  const chave = chaveVoga(proximo.voga);
  const dV = temVoz(chave) ? duracaoVozMs(chave) : 0;
  const falas = [];
  if (temVoz("5seg") && total > 5000) {
    const t5 = fim - 5000;
    const tV = t5 - FOLGA_FALA_MS - dV;
    if (dV && tV >= inicio + INICIO_FALA_MS) falas.push(fala(tV, chave), fala(t5, "5seg"));
    else if (dV && inicio + INICIO_FALA_MS + dV <= fim - 3200) falas.push(fala(inicio + INICIO_FALA_MS, chave));
    else falas.push(fala(t5, "5seg"));
  } else if (dV && inicio + INICIO_FALA_MS + dV <= fim - 100) {
    falas.push(fala(inicio + INICIO_FALA_MS, chave));
  }
  return falas;
}

/**
 * Sinais do treino a partir do passo `indice`, que termina em `fimDoPasso`:
 *  - bipes curtos nos últimos 3 segundos de cada etapa (etapas de 5 s ou mais)
 *  - bipe longo no fim de cada etapa: agudo se a próxima é remada, grave se é descanso
 *  - três notas subindo no fim do treino
 *  - falas (quando carregadas): "Voga N" e "5 segundos" antes de uma remada, "Vai!" quando ela começa,
 *    "Respira" quando um descanso começa (num descanso, as falas da remada seguinte só vêm depois do "Respira")
 * `totalAtualMs` = duração total do passo `indice` (inclui os "+30 s" já somados).
 */
export function sinaisTreino(passos, indice, fimDoPasso, totalAtualMs = passos[indice].duracao_s * 1000) {
  const sinais = [];
  let fim = fimDoPasso;
  for (let i = indice; i < passos.length; i++) {
    const total = i === indice ? totalAtualMs : passos[i].duracao_s * 1000;
    if (i > indice) fim += total;
    if (total >= 5000) {
      for (const s of [3, 2, 1]) sinais.push(bipeCurto(fim - s * 1000));
    }
    const proximo = passos[i + 1];
    if (proximo) {
      const comVoz = temFalaDoInicio(proximo.tipo);
      const respira = passos[i].tipo === "descanso" && temVoz("respira") ? duracaoVozMs("respira") + INICIO_FALA_MS : 0;
      sinais.push(bipeLongo(fim, proximo.tipo, comVoz));
      if (proximo.tipo === "remada") sinais.push(...falasAntesDaRemada(proximo, fim - total + respira, fim, total - respira));
      if (comVoz) sinais.push(fala(fim, falaDoInicio(proximo.tipo)));
    } else {
      sinais.push({
        t: fim,
        notas: [
          { f: 784, d: 0.25, v: 0.6, off: 0 },
          { f: 988, d: 0.25, v: 0.6, off: 0.3 },
          { f: 1319, d: 0.9, v: 0.6, off: 0.6 },
        ],
      });
    }
  }
  return sinais;
}

// ---------- agenda ----------

const HORIZONTE_MS = 90_000; // só agenda o que acontece nos próximos 90 s
const ATRASO_MAX_MS = 300; // um sinal que já passou há mais que isso não toca (seria confuso)
const TOLERANCIA_S = 0.04; // diferença aceita antes de reagendar um sinal
const INTERVALO_MS = 250;

// Converte um instante do relógio do treino para o relógio do áudio, usando a posição REAL da
// saída de som neste momento (inclui a latência da placa/Bluetooth). Sem getOutputTimestamp,
// usa ctx.currentTime.
function criarMapa(c, agoraMs) {
  const base = c.currentTime;
  const porRelogio = (ms) => base + (ms - agoraMs) / 1000;
  let ts = null;
  try {
    ts = c.getOutputTimestamp?.();
  } catch {
    ts = null;
  }
  if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
    const porSaida = (ms) => ts.contextTime + (ms - ts.performanceTime) / 1000;
    if (Math.abs(porSaida(agoraMs) - porRelogio(agoraMs)) < 1) return porSaida;
  }
  return porRelogio;
}

/**
 * Toca os sinais nos instantes certos do relógio do treino. A cada 250 ms confere o mapeamento
 * entre os dois relógios e reagenda o que estiver fora do lugar (início lento do áudio, deriva do
 * relógio de áudio, troca de dispositivo). Retorna { parar }.
 */
export function iniciarAgenda(sinais) {
  const lista = sinais
    .map((s) => ({ ...s, nos: [], alvo: null, feito: false }))
    .sort((a, b) => a.t - b.t);
  let parado = false;

  const sincronizar = () => {
    const c = ctx;
    if (parado || !c) return;
    if (c.state !== "running") {
      c.resume?.().catch?.(() => {}); // pode falhar fora de um toque; tentamos de novo no próximo ciclo
      return;
    }
    const agoraMs = agora();
    const mapa = criarMapa(c, agoraMs);
    for (const s of lista) {
      if (s.feito) continue;
      const falta = s.t - agoraMs;
      if (falta > HORIZONTE_MS) break; // lista ordenada: o resto está mais longe ainda
      if (falta < -ATRASO_MAX_MS) {
        s.feito = true;
        continue;
      }
      const alvo = mapa(s.t);
      if (s.alvo !== null && s.alvo <= c.currentTime + 0.05) continue; // já tocando (ou quase)
      if (s.alvo !== null && Math.abs(alvo - s.alvo) <= TOLERANCIA_S) continue; // bem posicionado
      s.nos.forEach(pararNo);
      s.nos = [];
      const quando = Math.max(alvo, c.currentTime + 0.005);
      s.alvo = quando;
      if (s.voz) {
        const buffer = buffers.get(s.voz);
        if (buffer) falar(s.nos, buffer, quando);
      }
      for (const n of s.notasSemVoz && !vozesLigadas ? s.notasSemVoz : s.notas) tom(s.nos, n.f, quando + n.off, n.d, n.v, n.tipo);
    }
  };

  const refazerVariantes = () => {
    const c = ctx;
    if (parado || !c) return;
    for (const s of lista) {
      if (s.feito || !s.notasSemVoz || s.alvo === null || s.alvo <= c.currentTime + 0.05) continue;
      s.nos.forEach(pararNo);
      s.nos = [];
      s.alvo = null; // sincronizar() agenda de novo, já com a versão certa
    }
    sincronizar();
  };

  const id = setInterval(sincronizar, INTERVALO_MS);
  document.addEventListener("visibilitychange", sincronizar);
  agendasAtivas.add(refazerVariantes);
  sincronizar();

  return {
    parar() {
      if (parado) return;
      parado = true;
      agendasAtivas.delete(refazerVariantes);
      clearInterval(id);
      document.removeEventListener("visibilitychange", sincronizar);
      lista.forEach((s) => s.nos.forEach(pararNo));
    },
  };
}
