import { useEffect, useRef, useState } from "react";
import { Marcado } from "./Icones.jsx";

/** Botão-ícone que abre um menu de opções (uma marcada), usado para filtrar e ordenar a lista. */
export default function MenuLista({ icone: Icone, rotulo, titulo, valor, opcoes, onEscolher, ativo }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const atual = opcoes.find((o) => o.valor === valor);
  return (
    <div className="menu-lista" ref={caixa}>
      <button
        type="button"
        className={`btn-icone${ativo ? " ativo" : ""}`}
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${atual ? atual.rotulo : ""}`}
        title={`${rotulo}: ${atual ? atual.rotulo : ""}`}
        onClick={() => setAberto((a) => !a)}
      >
        <Icone />
      </button>
      {aberto && (
        <div className="menu-caixa" role="menu" aria-label={titulo}>
          <p className="menu-titulo">{titulo}</p>
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="menuitemradio"
              aria-checked={o.valor === valor}
              className="menu-item"
              onClick={() => {
                onEscolher(o.valor);
                setAberto(false);
              }}
            >
              <Marcado className={o.valor === valor ? "" : "invisivel"} />
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
