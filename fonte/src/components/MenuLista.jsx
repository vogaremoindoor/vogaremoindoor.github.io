import { useEffect, useRef, useState } from "react";
import { Marcado } from "./Icones.jsx";

/**
 * Botão-ícone que abre um menu de opções (uma marcada), usado para filtrar e ordenar a lista.
 * Pode ter um segundo grupo de opções (titulo2, valor2, opcoes2, onEscolher2), mostrado só se tiver 2 ou mais.
 */
export default function MenuLista({ icone: Icone, rotulo, titulo, valor, opcoes, onEscolher, ativo, titulo2, valor2, opcoes2, onEscolher2 }) {
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
  const atual2 = opcoes2 && opcoes2.find((o) => o.valor === valor2);
  const descricao = `${rotulo}: ${atual ? atual.rotulo : ""}${atual2 && valor2 ? `, ${atual2.rotulo}` : ""}`;
  const item = (o, marcado, escolher, chave) => (
    <button
      key={chave}
      type="button"
      role="menuitemradio"
      aria-checked={marcado}
      className="menu-item"
      onClick={() => {
        escolher(o.valor);
        setAberto(false);
      }}
    >
      <Marcado className={marcado ? "" : "invisivel"} />
      {o.rotulo}
    </button>
  );
  return (
    <div className="menu-lista" ref={caixa}>
      <button
        type="button"
        className={`btn-icone${ativo ? " ativo" : ""}`}
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-label={descricao}
        title={descricao}
        onClick={() => setAberto((a) => !a)}
      >
        <Icone />
      </button>
      {aberto && (
        <div className="menu-caixa" role="menu" aria-label={titulo}>
          <p className="menu-titulo">{titulo}</p>
          {opcoes.map((o) => item(o, o.valor === valor, onEscolher, o.valor))}
          {opcoes2 && opcoes2.length > 1 && <p className="menu-titulo menu-titulo-2">{titulo2}</p>}
          {opcoes2 && opcoes2.length > 1 && opcoes2.map((o) => item(o, o.valor === valor2, onEscolher2, `tag:${o.valor}`))}
        </div>
      )}
    </div>
  );
}
