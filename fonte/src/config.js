// Configurações do app (engrenagem na lista), guardadas neste navegador.
const CHAVE = "voga:config";

export const CONTAGEM_MIN = 3;
export const CONTAGEM_MAX = 30;
export const CONTAGEM_PADRAO = 5; // segundos de contagem regressiva antes do início do treino

export function lerConfig() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    const contagem = Math.round(Number(salvo.contagem));
    return {
      contagem: Number.isFinite(contagem) && contagem >= CONTAGEM_MIN && contagem <= CONTAGEM_MAX ? contagem : CONTAGEM_PADRAO,
    };
  } catch {
    return { contagem: CONTAGEM_PADRAO };
  }
}

// valor em uso (vale nesta sessão mesmo se o navegador bloquear o armazenamento)
let contagem = lerConfig().contagem;
export const contagemAtual = () => contagem;

export function salvarConfig(config) {
  contagem = config.contagem;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}
