import { formatarTempo } from "../../shared/treino.js";

function Linha({ e }) {
  if (e.tipo === "repeticao") {
    return (
      <li className="el-rep">
        <span className="el-rep-titulo">Repetir {e.vezes} {e.vezes === 1 ? "vez" : "vezes"}</span>
        <ul>
          {e.etapas.map((x, i) => (
            <Linha key={i} e={x} />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li className={`el-linha el-${e.tipo}`}>
      <span className="el-tipo">{e.tipo === "remada" ? "Remada" : "Descanso"}</span>
      <span className="el-tempo">{formatarTempo(e.duracao_s)}</span>
      <span className="el-voga">{e.tipo === "remada" ? `voga ${e.voga}` : ""}</span>
    </li>
  );
}

/** Lista das etapas do treino, na ordem, com as repetições em bloco (somente leitura). */
export default function EtapasDoTreino({ etapas }) {
  return (
    <section className="etapas-leitura" aria-label="Etapas do treino">
      <h2>Etapas</h2>
      <ul>
        {etapas.map((e, i) => (
          <Linha key={i} e={e} />
        ))}
      </ul>
    </section>
  );
}
