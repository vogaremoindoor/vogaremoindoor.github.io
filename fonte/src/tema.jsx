import { useSyncExternalStore } from "react";
import { Lua, Sol } from "./components/Icones.jsx";
import { aoSalvarConfig, lerConfig } from "./config.js";

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

// cor da barra do navegador: o fundo da paleta escolhida (ver config.js) no tema atual
function fundoPaleta(tema, paleta) {
  const cores =
    {
      verde: ["#0e1a14", "#f5f7f4"],
      oceano: ["#0b1622", "#f3f6f9"],
      vermelho: ["#140b0c", "#faf7f7"],
      violeta: ["#14111f", "#f6f5fa"],
      grafite: ["#121314", "#f4f4f5"],
    }[paleta] || [COR_DA_BARRA.escuro, COR_DA_BARRA.claro];
  return cores[tema === "claro" ? 1 : 0];
}

function aplicar(tema) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", fundoPaleta(tema, document.documentElement.dataset.paleta));
}



let atual = lerSalvo();
const ouvintes = new Set();
if (typeof document !== "undefined") aplicar(atual);

// Paleta de cores (configurações): fica em data-paleta e muda também a cor da barra do navegador.
function aplicarPaleta(paleta) {
  document.documentElement.dataset.paleta = paleta;
  aplicar(atual);
}
if (typeof document !== "undefined") aplicarPaleta(lerConfig().paleta);
aoSalvarConfig((config) => aplicarPaleta(config.paleta));

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
