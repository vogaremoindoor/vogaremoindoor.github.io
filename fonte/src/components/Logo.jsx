// Logotipo do Voga: um V formado por dois remos (verde e âmbar). As cores seguem o tema (--verde e --ambar).
// Em 100 × 100: cada remo vai da base (50, 88) até a pá, no alto.
function Remo({ x1, y1, cor }) {
  const dx = x1 - 50;
  const dy = y1 - 88;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const angulo = (Math.atan2(-ux, uy) * 180) / Math.PI; // gira a pá para acompanhar o cabo
  const cx = x1 - ux * 11;
  const cy = y1 - uy * 11;
  return (
    <>
      <line className={`logo-cabo logo-${cor}`} x1="50" y1="88" x2={x1} y2={y1} strokeWidth="7" strokeLinecap="round" />
      <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${angulo.toFixed(1)})`}>
        <rect className={`logo-pa logo-${cor}`} x="-9" y="-15" width="18" height="30" rx="9" />
      </g>
    </>
  );
}

export default function Logo({ className = "", titulo = "" }) {
  return (
    <svg className={`logo ${className}`} viewBox="0 0 100 100" role={titulo ? "img" : undefined} aria-label={titulo || undefined} aria-hidden={titulo ? undefined : "true"} focusable="false">
      <Remo x1={22} y1={20} cor="verde" />
      <Remo x1={78} y1={20} cor="ambar" />
    </svg>
  );
}
