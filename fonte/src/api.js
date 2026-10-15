// Cliente da API REST (os treinos são arquivos .json na pasta treinos/ do servidor) + cópia local da lista,
// para abrir e executar treinos sem internet.
const CHAVE_CACHE = "treino-remo:lista";

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function req(url, { method = "GET", body } = {}) {
  let r;
  try {
    r = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErroApi("Sem conexão com o servidor.", 0);
  }
  if (r.status === 204) return null;
  const dados = await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi(dados?.erro || `Erro ${r.status}`, r.status);
  return dados;
}

const lerCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE));
  } catch {
    return null;
  }
};
const gravarCache = (lista) => {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(lista));
  } catch {
    /* sem espaço ou bloqueado: segue sem cache */
  }
};

/** { treinos, offline } — se o servidor não responder, usa a última lista salva no aparelho. */
export async function listar() {
  try {
    const treinos = await req("/api/treinos");
    gravarCache(treinos);
    return { treinos, offline: false };
  } catch (e) {
    if (e.status === 0) {
      const salvos = lerCache();
      if (salvos) return { treinos: salvos, offline: true };
    }
    throw e;
  }
}

export async function buscar(id) {
  try {
    return await req(`/api/treinos/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e.status === 0) {
      const t = lerCache()?.find((x) => String(x.id) === String(id) && !x.invalido);
      if (t) return t;
    }
    throw e;
  }
}

export const persistente = () => true;
export const ehDeArquivo = () => false;
export const criar = (treino) => req("/api/treinos", { method: "POST", body: treino });
export const atualizar = (id, treino) => req(`/api/treinos/${encodeURIComponent(id)}`, { method: "PUT", body: treino });
export const excluir = (id) => req(`/api/treinos/${encodeURIComponent(id)}`, { method: "DELETE" });
