import { useSyncExternalStore } from "react";

// Rota guardada em memória e espelhada no hash (#/treino/3). Funciona mesmo quando a página
// roda dentro de um quadro isolado onde mexer no endereço pode ser bloqueado.
const decodificar = (p) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};
// as partes voltam decodificadas: o id de um treino é o nome do arquivo (pode ter espaço e acento)
const dividir = (h) => h.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodificar);
const lerHash = () => {
  try {
    return location.hash;
  } catch {
    return "";
  }
};

let atual = dividir(lerHash());
const ouvintes = new Set();

function definir(partes) {
  if (partes.join("/") === atual.join("/")) return;
  atual = partes;
  ouvintes.forEach((f) => f());
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => definir(dividir(lerHash())));
}

export function navegar(caminho) {
  definir(dividir(caminho));
  try {
    location.hash = caminho.startsWith("#") ? caminho : `#${caminho}`;
  } catch {
    /* sem acesso ao endereço: a rota em memória já basta */
  }
}

export function useRota() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );
}

export function Link({ para, onClick, children, ...resto }) {
  return (
    <a
      href={`#${para}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navegar(para);
      }}
      {...resto}
    >
      {children}
    </a>
  );
}
