// Configurações do app (engrenagem na lista), guardadas neste navegador.
import { reaplicarTema } from "./tema.jsx";

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

export function lerConfig() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    const contagem = Math.round(Number(salvo.contagem));
    return {
      contagem: Number.isFinite(contagem) && contagem >= CONTAGEM_MIN && contagem <= CONTAGEM_MAX ? contagem : CONTAGEM_PADRAO,
      paleta: PALETAS.some((p) => p.id === salvo.paleta) ? salvo.paleta : "verde",
    };
  } catch {
    return { contagem: CONTAGEM_PADRAO, paleta: "verde" };
  }
}

function aplicarPaleta(paleta) {
  document.documentElement.dataset.paleta = paleta;
  reaplicarTema();
}

// valor em uso (vale nesta sessão mesmo se o navegador bloquear o armazenamento)
let contagem = lerConfig().contagem;
export const contagemAtual = () => contagem;

export function salvarConfig(config) {
  contagem = config.contagem;
  aplicarPaleta(config.paleta);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

if (typeof document !== "undefined") aplicarPaleta(lerConfig().paleta);
