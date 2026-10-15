import { useEffect, useState } from "react";
import * as api from "../api.js";
import { base } from "./Icones.jsx";
import Logo from "./Logo.jsx";

const IconeInfo = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v6M12 7.5v.01" />
  </svg>
);

/** Botão (ⓘ) do cabeçalho da lista: abre uma janela explicando o app e como os treinos são organizados. */
export default function VogaInfo() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);

  return (
    <>
      <button type="button" className="btn-icone btn-info" onClick={() => setAberto(true)} aria-label="Sobre o Voga" title="Sobre o Voga">
        <IconeInfo />
      </button>
      {aberto && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <div className="modal-caixa info-caixa">
            <div className="info-topo">
              <Logo className="info-logo" />
              <div className="marca-texto">
                <h1 id="info-titulo">Voga</h1>
                <p>Remo Indoor</p>
              </div>
            </div>
            <div className="info-texto">
              <p>
                O Voga guia treinos de remo indoor (remoergômetro). Durante o treino ele mostra o tempo de cada etapa e a voga, isto é, as remadas por minuto, e avisa por voz as trocas de ritmo e os descansos. A tela fica acesa enquanto o treino roda.
              </p>
              <p>
                Você pode usar os treinos prontos ou montar os seus, combinando remadas, descansos e repetições. Depois da primeira visita o app funciona sem internet e pode ser instalado na tela inicial do celular.
              </p>
              <h2>Como os treinos são organizados</h2>
              <ul>
                <li>
                  <b>Treinos do site</b> (sem etiqueta): vêm da pasta treinos do site e são iguais para todos. Não podem ser editados aqui; use Duplicar para criar uma cópia editável.
                </li>
                <li>
                  <b>Treinos locais</b> (etiqueta “local”, fundo destacado): são os que você cria ou duplica. Ficam salvos só neste navegador; se você limpar os dados do navegador ou trocar de aparelho, eles não vão junto.
                </li>
                <li>
                  <b>Baixar treinos locais</b>: gera um .zip com os seus treinos locais, para enviar à pasta treinos do site e publicá-los para todos (o LEIAME.txt do zip explica como).
                </li>
              </ul>
              {!api.persistente() && <p className="aviso">O armazenamento está bloqueado neste navegador, então os treinos locais se perdem ao fechar a página.</p>}
            </div>
            <div className="modal-botoes">
              <button
                type="button"
                className="btn btn-verde"
                onClick={() => setAberto(false)}
                ref={(b) => {
                  if (b) b.focus({ preventScroll: true });
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
