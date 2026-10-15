import { useEffect, useRef, useState } from "react";
import { Mais, Menos } from "./Icones.jsx";

// Segurar o botão repete: um passo ao apertar, uma pausa curta e depois repete cada vez mais rápido
// (de ~5 por segundo até ~10 por segundo), até soltar ou chegar ao limite.
export const ESPERA_REPETIR_MS = 400;
export const INTERVALO_INICIAL_MS = 200;
export const INTERVALO_MINIMO_MS = 100;
const FATOR_ACELERACAO = 0.88;

function BotaoPasso({ sinal, rotulo, onPasso, desativado }) {
  const acao = useRef(onPasso);
  const bloqueado = useRef(desativado);
  acao.current = onPasso; // sempre o passo calculado com o valor atual
  bloqueado.current = desativado;
  const temporizador = useRef(null);
  const ignorarClique = useRef(false);
  const [pressionado, setPressionado] = useState(false);

  const parar = () => {
    clearTimeout(temporizador.current);
    temporizador.current = null;
    setPressionado(false);
  };
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const repetir = (intervalo) => {
    if (bloqueado.current) return parar(); // chegou ao limite
    acao.current();
    const proximo = Math.max(INTERVALO_MINIMO_MS, intervalo * FATOR_ACELERACAO);
    temporizador.current = setTimeout(() => repetir(proximo), proximo);
  };

  const apertar = (e) => {
    if (desativado || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId); // soltar fora do botão também para a repetição
    ignorarClique.current = true; // o "click" que vem depois do soltar não pode contar de novo
    setPressionado(true);
    acao.current();
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => repetir(INTERVALO_INICIAL_MS), ESPERA_REPETIR_MS);
  };
  const soltar = () => {
    parar();
    setTimeout(() => (ignorarClique.current = false), 0);
  };

  return (
    <button
      type="button"
      className={`passo${pressionado ? " pressionado" : ""}`}
      aria-label={rotulo}
      disabled={desativado}
      tabIndex={-1} // o Tab continua indo de caixa em caixa; no teclado use as setas ↑ ↓ dentro da caixa
      onPointerDown={apertar}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      onContextMenu={(e) => e.preventDefault()} // toque longo no celular não abre o menu do navegador
      onClick={() => {
        if (ignorarClique.current) {
          ignorarClique.current = false;
          return;
        }
        if (!desativado) acao.current(); // teclado (Enter/Espaço): um passo por vez
      }}
    >
      {sinal === "+" ? <Mais aria-hidden="true" /> : <Menos aria-hidden="true" />}
    </button>
  );
}

/** Par de botões + (em cima) e − (embaixo), do tamanho da caixa ao lado. */
export default function Passos({ rotuloMais, rotuloMenos, onMais, onMenos, podeMais, podeMenos }) {
  return (
    <span className="passos">
      <BotaoPasso sinal="+" rotulo={rotuloMais} onPasso={onMais} desativado={!podeMais} />
      <BotaoPasso sinal="-" rotulo={rotuloMenos} onPasso={onMenos} desativado={!podeMenos} />
    </span>
  );
}

/** ↑ e ↓ no teclado, dentro da caixa, fazem o mesmo que + e − (inclusive a passagem dos segundos). */
export const teclasDePasso = (onMais, onMenos, podeMais, podeMenos) => (e) => {
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (podeMais) onMais();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (podeMenos) onMenos();
  }
};
