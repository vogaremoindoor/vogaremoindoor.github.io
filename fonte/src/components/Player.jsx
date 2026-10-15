import { useEffect, useMemo, useRef, useState } from "react";
import { achatar, formatarTempo, resumoDuracao } from "../../shared/treino.js";
import {
  aguardarAudio,
  baixarVozes,
  definirBipes,
  definirVozes,
  audioRodando,
  iniciarAgenda,
  margemInicialMs,
  prepararAudio,
  prepararVozes,
  sinaisContagem,
  sinaisTreino,
  sinalTroca,
} from "../audio.js";
import { contagemAtual } from "../config.js";
import { useWakeLock } from "../useWakeLock.js";
import { BotaoTema } from "../tema.jsx";
import Confirmacao from "./Confirmacao.jsx";
import BotoesSom from "./BotoesSom.jsx";
import EtapasDoTreino from "./EtapasDoTreino.jsx";
import { GraficoGrande } from "./GraficoTreino.jsx";
import { Pause, Play, ProximaEtapa, TelaCheia } from "./Icones.jsx";

const CIRCUNFERENCIA = 2 * Math.PI * 140;
const EXTRA_MS = 30_000; // botão "+30 s"

export default function Player({ treino, onSair }) {
  const CONTAGEM_S = contagemAtual(); // contagem regressiva antes de começar o treino (configurável)
  const passos = useMemo(() => achatar(treino.etapas), [treino]);
  const total = useMemo(() => passos.reduce((s, p) => s + p.duracao_s, 0), [passos]);

  const [fase, setFase] = useState("pronto"); // pronto | preparando | contagem | rodando | pausado | fim
  const [contagemMs, setContagemMs] = useState(CONTAGEM_S * 1000);
  const [idx, setIdx] = useState(0);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [restanteMs, setRestanteMs] = useState(passos[0].duracao_s * 1000);
  // Estado do relógio fora do React. Todos os instantes usam performance.now() (monotônico: não
  // pula se a hora do computador for ajustada): `fim` = quando o passo atual termina.
  // `extra` = tempo adicionado à etapa atual pelo botão "+30 s" (zera ao mudar de etapa).
  const rel = useRef({ inicio: 0, fim: 0, idx: 0, restante: 0, extra: 0, cancelar: () => {} });
  const tentativa = useRef(0); // invalida um "Iniciar" que ainda estava esperando o áudio
  const mostrado = useRef({ seg: -1, anel: -1 }); // o que está na tela, para só redesenhar quando muda

  useWakeLock(fase === "preparando" || fase === "contagem" || fase === "rodando" || fase === "pausado");
  useEffect(
    () => () => {
      tentativa.current += 1;
      rel.current.cancelar();
    },
    [],
  );

  // O tempo vem sempre do relógio, nunca de contar ticks: não atrasa com a aba em segundo plano
  // e, se o navegador ficar parado (computador lento), as etapas puladas são recuperadas aqui.
  // Para poupar um computador lento, só redesenha quando o segundo ou o anel realmente mudam.
  useEffect(() => {
    if (fase !== "rodando") return;
    mostrado.current = { seg: -1, anel: -1 };
    const tick = () => {
      const agora = performance.now();
      let { fim, idx: i } = rel.current;
      while (agora >= fim) {
        i += 1;
        if (i >= passos.length) {
          rel.current.idx = passos.length - 1;
          setFase("fim");
          return;
        }
        fim += passos[i].duracao_s * 1000;
      }
      rel.current.fim = fim;
      if (i !== rel.current.idx) {
        rel.current.idx = i;
        rel.current.extra = 0;
        setIdx(i);
        mostrado.current = { seg: -1, anel: -1 };
      }
      const restante = fim - agora;
      const seg = Math.ceil(restante / 1000);
      const anel = Math.round((restante / (passos[i].duracao_s * 1000 + rel.current.extra)) * 360);
      if (seg !== mostrado.current.seg || anel !== mostrado.current.anel) {
        mostrado.current = { seg, anel };
        setRestanteMs(restante);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [fase, passos]);

  // Contagem de 5 s: o treino começa em `inicio`; os sinais já foram agendados a partir dele.
  useEffect(() => {
    if (fase !== "contagem") return;
    const tick = () => {
      const falta = rel.current.inicio - performance.now();
      if (falta <= 0) setFase("rodando");
      else setContagemMs(falta);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [fase]);

  // Já baixa as falas deste treino ao abrir a tela (assim estão prontas quando tocar em Iniciar).
  useEffect(() => {
    baixarVozes(passos);
  }, [passos]);

  // Bips e vozes começam sempre ligados em cada treino; o liga/desliga vale só para esta execução.
  const [bipes, setBipes] = useState(true);
  const [voz, setVoz] = useState(true);
  useEffect(() => {
    definirBipes(bipes);
  }, [bipes]);
  useEffect(() => {
    definirVozes(voz);
  }, [voz]);
  useEffect(
    () => () => {
      definirBipes(true);
      definirVozes(true);
    },
    [],
  );

  const iniciar = async () => {
    const minhaVez = ++tentativa.current;
    setFase("preparando");
    // Espera o áudio realmente rodar ANTES de começar a contar. Em computador lento ele pode levar
    // segundos para iniciar; se a contagem começasse antes, todos os bipes sairiam atrasados.
    // (aguardarAudio libera o som dentro do toque do usuário, antes do primeiro await.)
    const audioPronto = aguardarAudio();
    const vozesProntas = prepararVozes(passos); // decodifica "Voga N", "5 segundos" e "Vai!" enquanto o som abre
    await audioPronto;
    await vozesProntas;
    if (tentativa.current !== minhaVez) return; // cancelado enquanto esperava

    const t0 = performance.now() + margemInicialMs(); // 1º bipe da contagem
    const inicio = t0 + CONTAGEM_S * 1000;
    const fim = inicio + passos[0].duracao_s * 1000;
    rel.current.cancelar();
    const agenda = iniciarAgenda([
      ...sinaisContagem(t0, CONTAGEM_S, passos[0]),
      ...sinaisTreino(passos, 0, fim),
    ]);
    rel.current = { inicio, fim, idx: 0, restante: 0, extra: 0, cancelar: agenda.parar };
    setIdx(0);
    setRestanteMs(passos[0].duracao_s * 1000);
    setContagemMs(inicio - performance.now());
    setFase("contagem");
  };

  const cancelarContagem = () => {
    tentativa.current += 1;
    rel.current.cancelar();
    rel.current.cancelar = () => {};
    setFase("pronto");
  };

  const pausar = () => {
    rel.current.cancelar();
    rel.current.restante = Math.max(0, rel.current.fim - performance.now());
    setRestanteMs(rel.current.restante);
    setFase("pausado");
  };

  const continuar = () => {
    prepararAudio();
    const fim = performance.now() + rel.current.restante;
    rel.current.fim = fim;
    const totalMs = passos[rel.current.idx].duracao_s * 1000 + rel.current.extra;
    rel.current.cancelar = iniciarAgenda(sinaisTreino(passos, rel.current.idx, fim, totalMs)).parar;
    setFase("rodando");
  };

  // Pula para a próxima etapa (remada ou descanso), na hora. Funciona também com o treino pausado.
  const proximaEtapa = () => {
    const i = rel.current.idx + 1;
    if (i >= passos.length || (fase !== "rodando" && fase !== "pausado")) return;
    rel.current.extra = 0;
    mostrado.current = { seg: -1, anel: -1 };
    if (fase === "pausado") {
      rel.current.idx = i;
      rel.current.restante = passos[i].duracao_s * 1000;
      setIdx(i);
      setRestanteMs(rel.current.restante);
      return;
    }
    const agoraMs = performance.now();
    const fim = agoraMs + passos[i].duracao_s * 1000;
    rel.current.cancelar();
    // bipe de troca agora + sinais das etapas seguintes a partir do novo fim
    const agenda = iniciarAgenda([
      ...sinalTroca(agoraMs + margemInicialMs(), passos[i].tipo),
      ...sinaisTreino(passos, i, fim),
    ]);
    rel.current.fim = fim;
    rel.current.idx = i;
    rel.current.cancelar = agenda.parar;
    setIdx(i);
    setRestanteMs(passos[i].duracao_s * 1000);
  };

  // Soma 30 s à etapa atual (remada ou descanso); o resto do treino se desloca junto. Funciona pausado.
  const maisTrinta = () => {
    if (fase === "pausado") {
      rel.current.restante += EXTRA_MS;
      rel.current.extra += EXTRA_MS;
      setRestanteMs(rel.current.restante);
      return;
    }
    if (fase !== "rodando") return;
    rel.current.extra += EXTRA_MS;
    rel.current.fim += EXTRA_MS;
    rel.current.cancelar();
    const totalMs = passos[rel.current.idx].duracao_s * 1000 + rel.current.extra;
    rel.current.cancelar = iniciarAgenda(sinaisTreino(passos, rel.current.idx, rel.current.fim, totalMs)).parar;
    mostrado.current = { seg: -1, anel: -1 };
    setRestanteMs(rel.current.fim - performance.now());
  };

  const encerrar = () => {
    tentativa.current += 1;
    rel.current.cancelar();
    onSair();
  };
  const sair = () => {
    if (fase === "rodando" || fase === "pausado") setConfirmandoSaida(true);
    else encerrar();
  };

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const suportaTelaCheia = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  if (fase === "pronto") {
    return (
      <div className="tela-cheia pronto">
        <div className="canto-tema canto-acoes">
          <BotoesSom bipes={bipes} voz={voz} onBipes={() => setBipes((v) => !v)} onVoz={() => setVoz((v) => !v)} />
          <BotaoTema />
        </div>
        <div className="pronto-miolo">
          <p className="rotulo">TREINO</p>
          <h1>{treino.nome}</h1>
          <p className="resumo">{resumoDuracao(treino.etapas)}</p>
          <button type="button" className="btn btn-verde btn-grande" onClick={iniciar}>
            <Play /> Iniciar
          </button>
          <button type="button" className="btn btn-contorno" onClick={onSair}>
            Voltar
          </button>
          {/* para conferir o treino antes de começar: gráfico maior e a lista das etapas (a tela rola se for preciso) */}
          <GraficoGrande etapas={treino.etapas} />
          <EtapasDoTreino etapas={treino.etapas} />
        </div>
      </div>
    );
  }

  if (fase === "fim") {
    return (
      <div className="tela-cheia fim">
        <div className="canto-tema">
          <BotaoTema />
        </div>
        <div className="pronto-miolo">
          <div className="fim-texto">FIM</div>
          <p className="resumo">
            {treino.nome} · {formatarTempo(total)}
          </p>
          <button type="button" className="btn btn-verde btn-grande" onClick={onSair}>
            Voltar aos treinos
          </button>
          {/* volta para a tela de início do mesmo treino */}
          <button type="button" className="btn btn-contorno" onClick={cancelarContagem}>
            Repetir treino
          </button>
        </div>
      </div>
    );
  }

  const passo = passos[idx];
  const descanso = passo.tipo === "descanso";
  const proximo = passos[idx + 1];
  const fracaoRestante = Math.min(1, Math.max(0, restanteMs / (passo.duracao_s * 1000 + rel.current.extra)));
  const ultimaEtapa = idx >= passos.length - 1;
  const tituloProxima = proximo ? (proximo.tipo === "remada" ? `VOGA ${proximo.voga}` : "DESCANSO") : "FIM";
  const tempoProxima = proximo ? formatarTempo(proximo.duracao_s) : "";
  const emProxima = Math.max(2, 0.52 * tituloProxima.length + 0.47 * tempoProxima.length + 0.2);
  const segundos = Math.ceil(restanteMs / 1000);
  const contando = fase === "contagem" || fase === "preparando";
  const semSom = fase !== "preparando" && !audioRodando(); // sem áudio rodando: o treino segue só na tela

  return (
    <div className={`tela-cheia player ${descanso ? "descanso" : "remada"}`}>
      {confirmandoSaida && (
        <Confirmacao
          texto="Sair do treino?"
          confirmar="Sim, sair"
          cancelar="Não"
          onConfirmar={encerrar}
          onCancelar={() => setConfirmandoSaida(false)}
        />
      )}
      {contando && (
        <div className="contagem" role="timer" aria-live="assertive" aria-label="Contagem para começar">
          <div className="contagem-rotulo">PREPARE-SE</div>
          {fase === "preparando" ? (
            <div className="contagem-preparando">Preparando o som…</div>
          ) : (
            <div key={Math.min(CONTAGEM_S, Math.ceil(contagemMs / 1000))} className="contagem-num">
              {Math.max(1, Math.min(CONTAGEM_S, Math.ceil(contagemMs / 1000)))}
            </div>
          )}
          <button type="button" className="btn btn-contorno contagem-cancelar" onClick={cancelarContagem}>
            Cancelar
          </button>
        </div>
      )}
      <div className="p-topo">
        <div className="p-titulo">
          <span className="p-etapa">
            ETAPA {idx + 1}/{passos.length}
          </span>
          <span className="p-nome">{treino.nome}</span>
        </div>
        {semSom && (
          <span className="sem-som" title="O navegador não liberou o áudio: o treino segue só na tela">
            SEM SOM
          </span>
        )}
        <div className="p-acoes">
          <BotoesSom bipes={bipes} voz={voz} onBipes={() => setBipes((v) => !v)} onVoz={() => setVoz((v) => !v)} />
          {suportaTelaCheia && (
            <button type="button" className="btn-icone" onClick={alternarTelaCheia} aria-label="Tela cheia">
              <TelaCheia />
            </button>
          )}
          <BotaoTema />
        </div>
      </div>

      <div className="p-caixa">
        <div className={`p-regiao${passo.rep ? " com-rep" : ""}`}>
          {passo.rep && (
            <div className="p-rep" role="img" aria-label={`Repetição ${passo.rep.n} de ${passo.rep.total}`}>
              <span className="rep-num">{passo.rep.n}</span>
              <span className="rep-barra" aria-hidden="true" />
              <span className="rep-num">{passo.rep.total}</span>
            </div>
          )}
          <div className="p-voga" aria-live="polite">
            {descanso ? (
              <div className="descanso-texto">DESCANSO</div>
            ) : (
              <>
                <span className="voga-rotulo">VOGA</span>
                <span className="voga-num">{passo.voga}</span>
              </>
            )}
          </div>
        </div>

        {/* --em = largura estimada (em "em") de título + tempo; o CSS usa isso para a letra caber sempre no cartão */}
        <div className={`p-proxima ${proximo ? `proxima-${proximo.tipo}` : "proxima-fim"}`} style={{ "--em": emProxima }}>
          <span className="proxima-rotulo">PRÓXIMA</span>
          <div className="proxima-linha">
            <span className="proxima-titulo">{tituloProxima}</span>
            {proximo && <span className="proxima-tempo">{tempoProxima}</span>}
          </div>
        </div>
      </div>

      <div className="p-anel">
        <svg viewBox="0 0 320 320" fill="none" aria-hidden="true">
          <circle cx="160" cy="160" r="140" className="anel-fundo" strokeWidth="14" />
          <circle
            key={idx}
            cx="160"
            cy="160"
            r="140"
            className="anel-progresso"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={CIRCUNFERENCIA * (1 - fracaoRestante)}
            transform="rotate(-90 160 160)"
          />
        </svg>
        <div className="anel-centro">
          <div className="tempo" role="timer">
            {formatarTempo(segundos)}
          </div>
          <div className="rotulo">{fase === "pausado" ? "PAUSADO" : "RESTANTES"}</div>
        </div>
      </div>

      <div className="p-botoes">
        <button
          type="button"
          className="btn btn-cor"
          disabled={contando}
          onClick={fase === "pausado" ? continuar : pausar}
        >
          {fase === "pausado" ? <Play /> : <Pause />}
          {fase === "pausado" ? "Continuar" : "Pausar"}
        </button>
        <div className="p-botoes-sec">
          <button type="button" className="btn btn-contorno" disabled={contando || ultimaEtapa} onClick={proximaEtapa}>
            <ProximaEtapa /> Próxima
          </button>
          <button type="button" className="btn btn-contorno" disabled={contando} onClick={maisTrinta} aria-label="Adicionar 30 segundos">
            +30 s
          </button>
          <button type="button" className="btn btn-contorno" onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
