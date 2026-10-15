import { useEffect, useState } from "react";
import { CONTAGEM_MAX, CONTAGEM_MIN, lerConfig, salvarConfig } from "../config.js";
import { base } from "./Icones.jsx";
import { CampoNumero } from "./Passos.jsx";

const IconeConfig = (p) => (
  <svg {...base} {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Botão (engrenagem) do cabeçalho da lista: abre as configurações. Cada mudança vale e fica salva na hora. */
export default function VogaConfig() {
  const [aberto, setAberto] = useState(false);
  const [config, setConfig] = useState(lerConfig);
  const [rascunho, setRascunho] = useState(null); // texto da caixa enquanto se digita (pode estar fora da faixa)
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);

  const mudar = (mudanca) =>
    setConfig((c) => {
      const nova = { ...c, ...mudanca };
      salvarConfig(nova);
      return nova;
    });
  const limitar = (n) => Math.min(CONTAGEM_MAX, Math.max(CONTAGEM_MIN, n));
  const ajustar = (delta) => {
    setRascunho(null);
    mudar({ contagem: limitar(config.contagem + delta) });
  };

  return (
    <>
      <button
        type="button"
        className="btn-icone btn-config"
        onClick={() => {
          setConfig(lerConfig());
          setRascunho(null);
          setAberto(true);
        }}
        aria-label="Configurações"
        title="Configurações"
      >
        <IconeConfig />
      </button>
      {aberto && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="config-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <div className="modal-caixa config-caixa">
            <h1 id="config-titulo" className="config-titulo">Configurações</h1>
            <section className="config-secao">
              <h2>Treino</h2>
              <div className="config-linha">
                <div className="config-texto">
                  <span id="config-contagem">Contagem regressiva</span>
                  <small>{`Segundos de preparação antes do início do treino (de ${CONTAGEM_MIN} a ${CONTAGEM_MAX}).`}</small>
                </div>
                <CampoNumero
                  rotuloMais="Aumentar 1 segundo"
                  rotuloMenos="Diminuir 1 segundo"
                  onMais={() => ajustar(1)}
                  onMenos={() => ajustar(-1)}
                  podeMais={config.contagem < CONTAGEM_MAX}
                  podeMenos={config.contagem > CONTAGEM_MIN}
                >
                  {(teclas) => (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={CONTAGEM_MIN}
                      max={CONTAGEM_MAX}
                      value={rascunho ?? config.contagem}
                      aria-labelledby="config-contagem"
                      onChange={(e) => {
                        const texto = e.target.value;
                        const n = parseInt(texto, 10);
                        setRascunho(texto);
                        if (Number.isFinite(n) && n >= CONTAGEM_MIN && n <= CONTAGEM_MAX) mudar({ contagem: n });
                      }}
                      onBlur={() => setRascunho(null)}
                      onKeyDown={teclas}
                      onFocus={(e) => e.target.select()}
                    />
                  )}
                </CampoNumero>
              </div>
            </section>
            <section className="config-secao">
              <h2>Aparência</h2>
              <div className="config-linha config-futuro">
                <div className="config-texto">
                  <span>Paleta de cores</span>
                  <small>Verde (padrão)</small>
                </div>
                <span className="selo-breve">em breve</span>
              </div>
            </section>
            <section className="config-secao">
              <h2>Falas</h2>
              <div className="config-linha config-futuro">
                <div className="config-texto">
                  <span>Conjunto de falas</span>
                  <small>Padrão</small>
                </div>
                <span className="selo-breve">em breve</span>
              </div>
            </section>
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
