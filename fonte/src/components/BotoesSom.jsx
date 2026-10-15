import { Fala, Sino } from "./Icones.jsx";

/**
 * Liga/desliga dos bipes (sino) e dos avisos de voz (balão de fala). Aparecem na tela de início do treino
 * (para começar já em silêncio) e na de execução. Ligado = ícone claro; desligado = apagado com corte na diagonal.
 */
export default function BotoesSom({ bipes, voz, onBipes, onVoz }) {
  return (
    <>
      <button
        type="button"
        className={`btn-icone btn-som${bipes ? "" : " desligado"}`}
        onClick={onBipes}
        aria-pressed={bipes}
        aria-label={bipes ? "Bipes ligados. Tocar para desligar" : "Bipes desligados. Tocar para ligar"}
        title={bipes ? "Desligar os bipes" : "Ligar os bipes"}
      >
        <Sino desligado={!bipes} />
      </button>
      <button
        type="button"
        className={`btn-icone btn-som${voz ? "" : " desligado"}`}
        onClick={onVoz}
        aria-pressed={voz}
        aria-label={voz ? "Avisos de voz ligados. Tocar para desligar" : "Avisos de voz desligados. Tocar para ligar"}
        title={voz ? "Desligar os avisos de voz" : "Ligar os avisos de voz"}
      >
        <Fala desligado={!voz} />
      </button>
    </>
  );
}
