// Regras do treino compartilhadas entre o servidor (validação) e o app (execução/edição).
//
// Um treino é: { id, nome, etapas: Etapa[] }
// Etapa:
//   { tipo: "remada",    duracao_s, voga }
//   { tipo: "descanso",  duracao_s }
//   { tipo: "repeticao", vezes, etapas: Etapa[] }   // bloco que se repete

export const MAX_DURACAO_S = 24 * 3600;
export const MAX_PASSOS = 2000;
// Faixa de voga aceita: é a das falas gravadas ("Voga 12" ... "Voga 46").
export const VOGA_MIN = 12;
export const VOGA_MAX = 46;
const MAX_PROFUNDIDADE = 3;

/**
 * Transforma a árvore de etapas em uma lista linear de passos: { tipo, duracao_s, voga?, rep? }.
 * `rep` = { n, total } só existe nos passos (remada ou descanso) dentro de uma repetição de 2 ou mais
 * vezes: n é a volta atual (1, 2, …) e total o número de repetições. Em repetições aninhadas vale a
 * mais interna.
 */
export function achatar(etapas) {
  const passos = [];
  const visitar = (lista, rep) => {
    for (const e of lista) {
      if (e.tipo === "repeticao") {
        for (let i = 0; i < e.vezes; i++) {
          visitar(e.etapas, e.vezes > 1 ? { n: i + 1, total: e.vezes } : rep);
        }
      } else if (e.tipo === "remada") {
        passos.push({ tipo: "remada", duracao_s: e.duracao_s, voga: e.voga, ...(rep && { rep }) });
      } else {
        passos.push({ tipo: "descanso", duracao_s: e.duracao_s, ...(rep && { rep }) });
      }
    }
  };
  visitar(etapas, null);
  return passos;
}

export function duracaoTotal(etapas) {
  return achatar(etapas).reduce((soma, p) => soma + p.duracao_s, 0);
}

/** Tempo total, tempo remando e tempo descansando, em segundos (as repetições já contam todas as voltas). */
export function duracaoPorTipo(etapas) {
  let remando = 0;
  let descansando = 0;
  for (const p of achatar(etapas)) {
    if (p.tipo === "remada") remando += p.duracao_s;
    else descansando += p.duracao_s;
  }
  return { total: remando + descansando, remando, descansando };
}

/** "48:00 (35:00/13:00)": total (tempo remando / tempo descansando). */
export function resumoDuracao(etapas) {
  const { total, remando, descansando } = duracaoPorTipo(etapas);
  return `${formatarTempo(total)} (${formatarTempo(remando)}/${formatarTempo(descansando)})`;
}

/** 125 -> "2:05"; 3725 -> "1:02:05" */
export function formatarTempo(segundos) {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const inteiro = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function validarLista(lista, profundidade, contexto) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return `${contexto}: precisa ter pelo menos uma etapa`;
  }
  if (lista.length > 200) return `${contexto}: etapas demais`;
  for (let i = 0; i < lista.length; i++) {
    const e = lista[i];
    const onde = `${contexto}, etapa ${i + 1}`;
    if (!e || typeof e !== "object") return `${onde}: inválida`;
    if (e.tipo === "remada") {
      if (!inteiro(e.duracao_s, 1, MAX_DURACAO_S)) return `${onde}: a duração precisa ser maior que zero`;
      if (!inteiro(e.voga, VOGA_MIN, VOGA_MAX)) return `${onde}: voga deve ser um número de ${VOGA_MIN} a ${VOGA_MAX}`;
    } else if (e.tipo === "descanso") {
      if (!inteiro(e.duracao_s, 1, MAX_DURACAO_S)) return `${onde}: a duração precisa ser maior que zero`;
    } else if (e.tipo === "repeticao") {
      if (profundidade >= MAX_PROFUNDIDADE) return `${onde}: repetições aninhadas demais`;
      if (!inteiro(e.vezes, 1, 99)) return `${onde}: repetir de 1 a 99 vezes`;
      const erro = validarLista(e.etapas, profundidade + 1, `${onde} (repetição)`);
      if (erro) return erro;
    } else {
      return `${onde}: tipo desconhecido`;
    }
  }
  return null;
}

/** Retorna uma mensagem de erro (string) ou null se o treino é válido. */
export function validarTreino(t) {
  if (!t || typeof t !== "object") return "treino inválido";
  if (typeof t.nome !== "string" || t.nome.trim() === "") return "informe o nome do treino";
  if (t.nome.trim().length > 80) return "nome muito longo (máximo 80 caracteres)";
  const erro = validarLista(t.etapas, 1, "treino");
  if (erro) return erro;
  if (achatar(t.etapas).length > MAX_PASSOS) return "treino com passos demais";
  return null;
}

/** Treino de exemplo do enunciado (48:00, 36 passos). Usado como seed e em testes. */
export const TREINO_EXEMPLO = {
  nome: "Progressão de voga 16 → 36",
  etapas: [
    { tipo: "remada", duracao_s: 240, voga: 16 },
    { tipo: "descanso", duracao_s: 60 },
    { tipo: "remada", duracao_s: 240, voga: 18 },
    { tipo: "descanso", duracao_s: 60 },
    { tipo: "remada", duracao_s: 240, voga: 20 },
    { tipo: "descanso", duracao_s: 60 },
    ...[22, 24, 26].map((voga) => ({
      tipo: "repeticao",
      vezes: 2,
      etapas: [
        { tipo: "remada", duracao_s: 120, voga },
        { tipo: "descanso", duracao_s: 30 },
      ],
    })),
    ...[28, 30].map((voga) => ({
      tipo: "repeticao",
      vezes: 3,
      etapas: [
        { tipo: "remada", duracao_s: 90, voga },
        { tipo: "descanso", duracao_s: 30 },
      ],
    })),
    { tipo: "remada", duracao_s: 60, voga: 32 },
    { tipo: "descanso", duracao_s: 60 },
    { tipo: "remada", duracao_s: 60, voga: 34 },
    { tipo: "descanso", duracao_s: 60 },
    { tipo: "remada", duracao_s: 60, voga: 36 },
    { tipo: "descanso", duracao_s: 60 },
  ],
};

// Mantém só os campos conhecidos de cada etapa (ignora qualquer outra coisa que venha no arquivo).
export function normalizarEtapas(lista) {
  return lista.map((e) => {
    if (e.tipo === "repeticao") return { tipo: "repeticao", vezes: e.vezes, etapas: normalizarEtapas(e.etapas) };
    if (e.tipo === "remada") return { tipo: "remada", duracao_s: e.duracao_s, voga: e.voga };
    return { tipo: "descanso", duracao_s: e.duracao_s };
  });
}

// ---------- treinos em arquivos (pasta treinos/) ----------
// Cada treino é um arquivo .json com { "nome": "...", "etapas": [...] }. O "id" do treino é o nome do arquivo
// sem o ".json". Servidor e site estático interpretam os arquivos pela mesma função, então as regras são iguais.

/**
 * Interpreta o texto de UM arquivo de treino. Retorna { id, nome, etapas } se for válido, ou
 * { id, nome, invalido: "motivo" } se não der para usar (a tela mostra o motivo em vez de esconder o arquivo).
 */
export function interpretarArquivoTreino(texto, id) {
  let dados;
  try {
    dados = JSON.parse(String(texto).replace(/^\uFEFF/, ""));
  } catch {
    return { id, nome: id, invalido: "o arquivo não é um JSON válido" };
  }
  const erro = validarTreino(dados);
  if (erro) {
    const nome = typeof dados?.nome === "string" && dados.nome.trim() ? dados.nome.trim().slice(0, 80) : id;
    return { id, nome, invalido: erro };
  }
  return { id, nome: dados.nome.trim(), etapas: normalizarEtapas(dados.etapas) };
}

// Uma etapa por linha (repetição abre um bloco): fácil de ler e de editar à mão.
function linhasEtapas(lista, recuo) {
  const pad = "  ".repeat(recuo);
  return lista.map((e, i) => {
    const fim = i < lista.length - 1 ? "," : "";
    if (e.tipo === "repeticao") {
      return [
        `${pad}{`,
        `${pad}  "tipo": "repeticao",`,
        `${pad}  "vezes": ${e.vezes},`,
        `${pad}  "etapas": [`,
        ...linhasEtapas(e.etapas, recuo + 2),
        `${pad}  ]`,
        `${pad}}${fim}`,
      ].join("\n");
    }
    return `${pad}${JSON.stringify(e).replace(/([,:])/g, "$1 ").replace(/^\{/, "{ ").replace(/\}$/, " }")}${fim}`;
  });
}

/** Conteúdo de um arquivo de treino, legível e editável à mão. */
export const conteudoArquivoTreino = ({ nome, etapas }) =>
  `{\n  "nome": ${JSON.stringify(nome.trim())},\n  "etapas": [\n${linhasEtapas(normalizarEtapas(etapas), 2).join("\n")}\n  ]\n}\n`;

/** "Progressão de voga 16 → 36" -> "progressao-de-voga-16-36" (nome do arquivo sem a extensão). */
export function slugDoNome(nome) {
  const s = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || "treino";
}

/** Ordem da lista: por nome, ignorando maiúsculas/acentos e tratando números como números (T2 antes de T10). */
export const compararTreinos = (a, b) =>
  a.nome.localeCompare(b.nome, "pt-BR", { numeric: true, sensitivity: "base" }) ||
  String(a.id).localeCompare(String(b.id), "pt-BR", { numeric: true });

// ---------- publicar treinos na pasta treinos/ do site ----------
// Os arquivos recebem um NÚMERO no nome (treino-001.json, treino-002.json...) e o nome do treino fica DENTRO
// do arquivo. Assim renomear um treino não muda o arquivo, e dois treinos com o mesmo nome não se atropelam.

export const nomeArquivoDeNumero = (n) => `treino-${String(n).padStart(3, "0")}.json`;

/** "treino-012.json" -> 12; qualquer outro nome -> null. */
export function numeroDoArquivo(nome) {
  const m = /^treino-(\d+)\.json$/i.exec(String(nome ?? "").trim());
  return m ? Number(m[1]) : null;
}

/** treinos-YYYY-MM-DD-HH-MM.zip, com a data e a hora locais. */
export function nomeArquivoZip(data = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const dia = `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
  return `treinos-${dia}-${p(data.getHours())}-${p(data.getMinutes())}.zip`;
}

/**
 * Nome para a cópia de um treino de arquivo: "Nome (cópia)", ou "Nome (cópia 2)", "(cópia 3)"... se esse já existir
 * (sem diferenciar maiúsculas). Nunca passa de `max` caracteres e não empilha "(cópia) (cópia)".
 */
export function nomeDaCopia(nome, existentes = [], max = 80) {
  const usados = new Set(existentes.map((n) => String(n).trim().toLowerCase()));
  const base = String(nome).trim().replace(/\s+\(cópia(?: \d+)?\)$/i, "");
  const montar = (sufixo) => `${base.slice(0, Math.max(1, max - sufixo.length)).trimEnd()}${sufixo}`;
  let candidato = montar(" (cópia)");
  for (let n = 2; usados.has(candidato.toLowerCase()); n++) candidato = montar(` (cópia ${n})`);
  return candidato;
}
