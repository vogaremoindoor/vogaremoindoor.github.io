// Geometria do gráfico do treino na lista: tempo no eixo x, voga no eixo y, descanso = voga 0.
// Sem dependência de tela: o React só desenha o que esta função devolve (e os testes conferem aqui).
import { achatar, formatarTempo, VOGA_MAX } from "./treino.js";

export const GRAFICO_LARGURA = 1000; // o desenho usa um eixo x de 0 a 1000 e estica para a largura disponível
export const GRAFICO_ALTURA = 56; // px
const PAD_X = 6;
const PAD_Y = 4;

/**
 * @returns {{ segmentos, ligacoes, base, total, vogaMin, vogaMax }}
 *  segmentos: [{ x1, x2, y, tipo }]  linhas horizontais (verde = remada na voga; âmbar = descanso, em voga 0)
 *  ligacoes:  [{ x, y1, y2 }]        traços verticais entre uma etapa e a seguinte
 *  base:      { x1, x2, y }          linha da voga 0
 *  escalaY / escalaX: marcas dos eixos (usadas só no gráfico grande da tela de início)
 * `altura` em px (padrão 56, o da lista).
 * A escala da voga é a mesma para todos os treinos (0 a VOGA_MAX): a mesma voga tem a mesma altura em qualquer cartão.
 */
export function geometriaGrafico(etapas, altura = GRAFICO_ALTURA) {
  const passos = achatar(etapas);
  const total = passos.reduce((s, p) => s + p.duracao_s, 0);
  const util = altura - 2 * PAD_Y;
  const y = (v) => PAD_Y + util * (1 - Math.min(VOGA_MAX, Math.max(0, v)) / VOGA_MAX);
  const x = (t) => PAD_X + ((GRAFICO_LARGURA - 2 * PAD_X) * t) / total;
  const segmentos = [];
  const ligacoes = [];
  let t = 0;
  passos.forEach((p, i) => {
    const nivel = p.tipo === "remada" ? p.voga : 0;
    segmentos.push({ x1: x(t), x2: x(t + p.duracao_s), y: y(nivel), tipo: p.tipo });
    t += p.duracao_s;
    const prox = passos[i + 1];
    if (prox) ligacoes.push({ x: x(t), y1: y(nivel), y2: y(prox.tipo === "remada" ? prox.voga : 0) });
  });
  const vogas = passos.filter((p) => p.tipo === "remada").map((p) => p.voga);
  return {
    segmentos,
    ligacoes,
    base: { x1: PAD_X, x2: GRAFICO_LARGURA - PAD_X, y: y(0) },
    total,
    vogaMin: vogas.length ? Math.min(...vogas) : null,
    vogaMax: vogas.length ? Math.max(...vogas) : null,
    altura,
    escalaY: [0, 20, 40].map((valor) => ({ valor, y: y(valor) })),
    escalaX: marcasDoTempo(total).map((m) => ({ minuto: m.minuto, ultimo: m.ultimo, pos: x(m.minuto * 60) / GRAFICO_LARGURA })),
  };
}

/** Marcas do eixo do tempo, em minutos: no máximo ~5, em passos "redondos" (1, 2, 5, 10, 15, 20, 30, 60, 120). */
export function marcasDoTempo(totalSegundos) {
  const minutos = totalSegundos / 60;
  const passo = [1, 2, 5, 10, 15, 20, 30, 60, 120].find((p) => minutos / p <= 5) ?? 120;
  const marcas = [];
  for (let m = 0; m <= minutos + 1e-9; m += passo) marcas.push({ minuto: m, ultimo: false });
  marcas[marcas.length - 1].ultimo = true;
  return marcas;
}

/** Texto para leitores de tela (o desenho em si é decorativo). */
export function descricaoGrafico(etapas) {
  const g = geometriaGrafico(etapas);
  const voga = g.vogaMax === null ? "só descanso" : g.vogaMin === g.vogaMax ? `voga ${g.vogaMax}` : `voga de ${g.vogaMin} a ${g.vogaMax}`;
  return `Gráfico do treino: ${voga} ao longo de ${formatarTempo(g.total)}, com os descansos em voga 0.`;
}
