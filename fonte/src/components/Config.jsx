import { useEffect, useState } from "react";
import { CONTAGEM_MAX, CONTAGEM_MIN, lerConfig, PALETAS, salvarConfig, VOZES } from "../config.js";
import { base, Marcado, Play } from "./Icones.jsx";
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
              <div className="config-texto">
                <span id="config-paleta">Paleta de cores</span>
                <small>Vale para o tema claro e para o escuro. A padrão é a Verde.</small>
              </div>
              <div className="paletas" role="radiogroup" aria-labelledby="config-paleta">
                {PALETAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={config.paleta === p.id}
                    className={`paleta${config.paleta === p.id ? " escolhida" : ""}`}
                    data-paleta={p.id}
                    onClick={() => mudar({ paleta: p.id })}
                  >
                    <span className="paleta-amostra" aria-hidden="true">
                      <i className="paleta-acento" />
                      <i className="paleta-pausa" />
                    </span>
                    <span className="paleta-nome">{p.nome}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="config-secao">
              <h2>Falas</h2>
              <div className="config-texto">
                <span id="config-voz">Voz das falas</span>
                <small>Voz que anuncia a voga, a contagem e o descanso durante o treino.</small>
              </div>
              <div className="vozes" role="radiogroup" aria-labelledby="config-voz">
                {VOZES.map((v) => (
                  <div key={v.id} className={`voz-opcao${config.voz === v.id ? " escolhida" : ""}`}>
                    <button type="button" role="radio" aria-checked={config.voz === v.id} className="voz-escolher" onClick={() => mudar({ voz: v.id })}>
                      <Marcado className={config.voz === v.id ? "" : "invisivel"} />
                      <span className="voz-texto">
                        <b>{v.nome}</b>
                        <small>{v.descricao}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-icone voz-ouvir"
                      aria-label={`Ouvir a voz ${v.nome}`}
                      title="Ouvir"
                      onClick={() => {
                        // amostra: "Voga 20" desta voz
                        try {
                          new Audio(new URL(`audio/${v.pasta}/voga-20.mp3`, document.baseURI).href).play().catch(() => {});
                        } catch {
                          /* sem áudio: nada a fazer */
                        }
                      }}
                    >
                      <Play />
                    </button>
                  </div>
                ))}
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
