// Configurações do app (engrenagem na lista), guardadas neste navegador. Módulo sem React nem DOM:
// quem precisa reagir a uma mudança (tema/paleta, falas) se inscreve com aoSalvarConfig.
const CHAVE = "voga:config";

export const CONTAGEM_MIN = 3;
export const CONTAGEM_MAX = 30;
export const CONTAGEM_PADRAO = 5; // segundos de contagem regressiva antes do início do treino
// as cores de cada paleta estão em styles.css ([data-paleta="…"]); o index.html aplica a escolhida antes do app carregar
export const PALETAS = [
  { id: "verde", nome: "Verde" },
  { id: "oceano", nome: "Oceano" },
  { id: "vermelho", nome: "Vermelho" },
  { id: "violeta", nome: "Violeta" },
  { id: "grafite", nome: "Grafite" },
];
// Vozes das falas: cada uma numa pasta de audio/ (public/audio/<pasta>/) com os mesmos nomes de arquivo.
// `antes` = em quanto tempo antes da largada começa o "Prepara… Vai!" (para o "Vai!" cair na largada).
export const VOZES = [
  { id: "faber", nome: "Faber", pasta: "Faber", descricao: "Masculina · voz padrão", antes: 1000 },
  { id: "nassif", nome: "Nassif", pasta: "Nassif", descricao: "Masculina · estilo narrador esportivo", antes: 1295 },
  { id: "aranha", nome: "Aranha", pasta: "Aranha", descricao: "Masculina", antes: 1285 },
];

export function lerConfig() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    const contagem = Math.round(Number(salvo.contagem));
    return {
      contagem: Number.isFinite(contagem) && contagem >= CONTAGEM_MIN && contagem <= CONTAGEM_MAX ? contagem : CONTAGEM_PADRAO,
      paleta: PALETAS.some((p) => p.id === salvo.paleta) ? salvo.paleta : "verde",
      voz: VOZES.some((v) => v.id === salvo.voz) ? salvo.voz : "faber",
    };
  } catch {
    return { contagem: CONTAGEM_PADRAO, paleta: "verde", voz: "faber" };
  }
}

/** A voz escolhida (com pasta e `antes`). */
export function vozAtual() {
  const id = lerConfig().voz;
  return VOZES.find((v) => v.id === id) || VOZES[0];
}

// valor em uso (vale nesta sessão mesmo se o navegador bloquear o armazenamento)
let contagem = lerConfig().contagem;
export const contagemAtual = () => contagem;

const ouvintes = new Set();
/** `f(nova, anterior)` é chamada a cada salvarConfig, antes de gravar. */
export const aoSalvarConfig = (f) => ouvintes.add(f);

export function salvarConfig(config) {
  contagem = config.contagem;
  const anterior = lerConfig();
  ouvintes.forEach((f) => f(config, anterior));
  try {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}
