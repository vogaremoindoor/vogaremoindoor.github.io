import { useSyncExternalStore } from "react";
import { Lua, Sol } from "./components/Icones.jsx";

// Tema claro/escuro. A escolha fica salva no navegador; o padrão é o escuro.
const CHAVE = "voga:tema";
const COR_DA_BARRA = { escuro: "#0e1a14", claro: "#f5f7f4" };

const lerSalvo = () => {
  try {
    return localStorage.getItem(CHAVE) === "claro" ? "claro" : "escuro";
  } catch {
    return "escuro";
  }
};

function aplicar(tema) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_DA_BARRA[tema]);
}

let atual = lerSalvo();
const ouvintes = new Set();
if (typeof document !== "undefined") aplicar(atual);

export function alternarTema() {
  atual = atual === "claro" ? "escuro" : "claro";
  aplicar(atual);
  try {
    localStorage.setItem(CHAVE, atual);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  ouvintes.forEach((f) => f());
}

export const useTema = () =>
  useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );

/** Botão-ícone que alterna entre escuro e claro (sol no escuro, lua no claro). */
export function BotaoTema() {
  const claro = useTema() === "claro";
  const rotulo = claro ? "Mudar para o tema escuro" : "Mudar para o tema claro";
  return (
    <button type="button" className="btn-icone btn-tema" onClick={alternarTema} aria-label={rotulo} title={rotulo}>
      {claro ? <Lua /> : <Sol />}
    </button>
  );
}
