import { useMemo } from "react";
import { GRAFICO_ALTURA, GRAFICO_LARGURA, geometriaGrafico } from "../../shared/grafico.js";

const n = (v) => Math.round(v * 100) / 100;

// O desenho em si: linhas num eixo x de 0 a 1000 que estica na largura disponível (o traço não engrossa).
function Desenho({ g, grade = false }) {
  return (
    <svg className="grafico" viewBox={`0 0 ${GRAFICO_LARGURA} ${g.altura}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ height: g.altura }}>
      {grade && g.escalaY.filter((e) => e.valor > 0).map((e) => <line key={`g${e.valor}`} className="g-grade" x1={g.base.x1} x2={g.base.x2} y1={n(e.y)} y2={n(e.y)} />)}
      <line className="g-base" x1={g.base.x1} x2={g.base.x2} y1={g.base.y} y2={g.base.y} />
      {g.ligacoes.map((l, i) => (
        <line key={`l${i}`} className="g-liga" x1={n(l.x)} x2={n(l.x)} y1={n(l.y1)} y2={n(l.y2)} />
      ))}
      {g.segmentos.map((s, i) => (
        <line key={`s${i}`} className={s.tipo === "remada" ? "g-voga" : "g-descanso"} x1={n(s.x1)} x2={n(s.x2)} y1={n(s.y)} y2={n(s.y)} />
      ))}
    </svg>
  );
}

/**
 * Gráfico de degraus do treino: tempo no eixo x, voga no eixo y; verde = remada (na voga da etapa),
 * âmbar = descanso (voga 0). Versão compacta da lista: só o desenho, sem eixos.
 */
export default function GraficoTreino({ etapas }) {
  const g = useMemo(() => geometriaGrafico(etapas, GRAFICO_ALTURA), [etapas]);
  return <Desenho g={g} />;
}

/** Versão grande, da tela de início do treino: mesmo desenho com escala da voga, minutos e legenda. */
export function GraficoGrande({ etapas, altura = 120 }) {
  const g = useMemo(() => geometriaGrafico(etapas, altura), [etapas, altura]);
  return (
    <figure className="grafico-grande">
      <div className="gg-corpo">
        <div className="gg-y" aria-hidden="true" style={{ height: altura }}>
          {g.escalaY.map((e) => (
            <span key={e.valor} style={{ top: e.y }}>{e.valor}</span>
          ))}
        </div>
        <div className="gg-area">
          <Desenho g={g} grade />
          <div className="gg-x" aria-hidden="true">
            {g.escalaX.map((m) => (
              <span key={m.minuto} className={m.minuto === 0 ? "gg-ini" : m.pos > 0.9 ? "gg-fim" : ""} style={{ left: `${m.pos * 100}%` }}>
                {m.minuto}
                {m.ultimo ? " min" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="gg-legenda" aria-hidden="true">
        <span><i className="chave chave-voga" /> voga</span>
        <span><i className="chave chave-descanso" /> descanso (voga 0)</span>
      </figcaption>
    </figure>
  );
}
