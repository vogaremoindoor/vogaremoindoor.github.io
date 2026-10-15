// Filtro, tag e ordem da lista de treinos, lembrados neste navegador.
import { normalizarTags } from "../shared/treino.js";

export const CHAVE_LISTA = "voga:lista";

export const lerPreferencias = () => {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_LISTA) || "{}");
    return {
      filtro: ["todos", "locais", "site"].includes(p.filtro) ? p.filtro : "todos",
      tag: typeof p.tag === "string" ? p.tag : "",
      ordem: ["nome", "nome-desc", "duracao", "duracao-desc", "recentes"].includes(p.ordem) ? p.ordem : "nome",
    };
  } catch {
    return { filtro: "todos", tag: "", ordem: "nome" };
  }
};

/**
 * Depois de criar, duplicar ou salvar um treino: a lista passa a mostrar os alterados recentemente primeiro,
 * de um jeito que o treino apareça (sai do filtro "só os do site" e da tag, se ele não a tiver).
 */
export const marcarRecentes = (treino) => {
  const p = lerPreferencias();
  const chave = (t) => String(t).trim().toLocaleLowerCase("pt-BR");
  const tag = p.tag && normalizarTags(treino.tags).some((t) => chave(t) === chave(p.tag)) ? p.tag : "";
  try {
    localStorage.setItem(CHAVE_LISTA, JSON.stringify({ ...p, filtro: p.filtro === "site" ? "todos" : p.filtro, tag, ordem: "recentes" }));
  } catch {
    /* sem armazenamento: a lista fica como estava */
  }
};
