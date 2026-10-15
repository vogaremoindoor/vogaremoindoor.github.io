// Geometria do gráfico do treino na lista (tempo x voga; descanso = voga 0)
import test from "node:test";
import assert from "node:assert/strict";
import { descricaoGrafico, GRAFICO_ALTURA, GRAFICO_LARGURA, geometriaGrafico } from "../shared/grafico.js";
import { achatar, TREINO_EXEMPLO, VOGA_MAX } from "../shared/treino.js";

const R = (duracao_s, voga) => ({ tipo: "remada", duracao_s, voga });
const D = (duracao_s) => ({ tipo: "descanso", duracao_s });

test("um segmento por etapa (repetições já abertas) e uma ligação entre cada par", () => {
  const g = geometriaGrafico(TREINO_EXEMPLO.etapas);
  const n = achatar(TREINO_EXEMPLO.etapas).length;
  assert.equal(g.segmentos.length, n);
  assert.equal(g.ligacoes.length, n - 1);
  assert.equal(g.total, 2880);
  assert.equal(g.vogaMin, 16);
  assert.equal(g.vogaMax, 36);
});

test("descanso fica na linha da voga 0 e remada acima dela, mais alta quanto maior a voga", () => {
  const g = geometriaGrafico([R(60, 20), D(30), R(60, 40)]);
  const [a, d, b] = g.segmentos;
  assert.equal(d.tipo, "descanso");
  assert.equal(d.y, g.base.y, "descanso = voga 0 = linha de base");
  assert.ok(a.y < g.base.y && b.y < a.y, "voga 40 fica acima da voga 20, que fica acima do descanso");
  assert.ok(g.base.y < GRAFICO_ALTURA && b.y > 0, "tudo dentro da altura do desenho");
});

test("escala fixa: a mesma voga tem a mesma altura em qualquer treino", () => {
  const um = geometriaGrafico([R(60, 30)]).segmentos[0].y;
  const outro = geometriaGrafico([R(600, 18), D(60), R(60, 30)]).segmentos[2].y;
  assert.equal(um, outro);
  const topo = geometriaGrafico([R(60, VOGA_MAX)]).segmentos[0].y;
  assert.ok(topo >= 0 && topo < um);
});

test("o tempo vai da esquerda para a direita, proporcional às durações, sem sobreposição", () => {
  const g = geometriaGrafico([R(120, 20), D(60), R(180, 24)]);
  const [a, d, b] = g.segmentos;
  assert.equal(a.x2, d.x1);
  assert.equal(d.x2, b.x1);
  const larg = (s) => s.x2 - s.x1;
  assert.ok(Math.abs(larg(a) / larg(d) - 2) < 1e-9 && Math.abs(larg(b) / larg(d) - 3) < 1e-9, "120 s : 60 s : 180 s = 2 : 1 : 3");
  assert.ok(a.x1 > 0 && b.x2 < GRAFICO_LARGURA, "com uma folga nas bordas");
});

test("ligações verticais ficam nas fronteiras e vão do nível de uma etapa ao da outra", () => {
  const g = geometriaGrafico([R(60, 20), D(30), R(60, 30)]);
  assert.equal(g.ligacoes[0].x, g.segmentos[0].x2);
  assert.equal(g.ligacoes[0].y1, g.segmentos[0].y);
  assert.equal(g.ligacoes[0].y2, g.segmentos[1].y);
  assert.equal(g.ligacoes[1].y1, g.base.y);
  assert.equal(g.ligacoes[1].y2, g.segmentos[2].y);
});

test("treino só de remada (sem descanso) e treino só de descanso não quebram", () => {
  const fundo = geometriaGrafico([R(3600, 20)]);
  assert.equal(fundo.segmentos.length, 1);
  assert.equal(fundo.ligacoes.length, 0);
  const so = geometriaGrafico([D(30)]);
  assert.equal(so.vogaMax, null);
  assert.equal(so.segmentos[0].y, so.base.y);
});

test("voga fora da faixa (dado antigo) é limitada ao desenho, nunca sai da caixa", () => {
  const g = geometriaGrafico([R(60, 99), R(60, -5)]);
  for (const s of g.segmentos) assert.ok(s.y >= 0 && s.y <= GRAFICO_ALTURA);
});

test("descrição para leitor de tela", () => {
  assert.equal(descricaoGrafico(TREINO_EXEMPLO.etapas), "Gráfico do treino: voga de 16 a 36 ao longo de 48:00, com os descansos em voga 0.");
  assert.equal(descricaoGrafico([R(3600, 20)]), "Gráfico do treino: voga 20 ao longo de 1:00:00, com os descansos em voga 0.");
  assert.equal(descricaoGrafico([D(30)]), "Gráfico do treino: só descanso ao longo de 0:30, com os descansos em voga 0.");
});

// ---------- versão grande (tela de início) ----------
import { marcasDoTempo } from "../shared/grafico.js";

test("altura variável: o desenho acompanha a altura pedida e a escala da voga continua a mesma", () => {
  const pequeno = geometriaGrafico([R(60, 20), D(30), R(60, 40)], 56);
  const grande = geometriaGrafico([R(60, 20), D(30), R(60, 40)], 120);
  assert.equal(pequeno.altura, 56);
  assert.equal(grande.altura, 120);
  const frac = (g, s) => (g.base.y - s.y) / (g.base.y - g.segmentos[2].y); // altura relativa à da voga 40
  assert.ok(Math.abs(frac(grande, grande.segmentos[0]) - frac(pequeno, pequeno.segmentos[0])) < 1e-9, "mesma proporção");
  for (const s of grande.segmentos) assert.ok(s.y >= 0 && s.y <= 120);
});

test("escalas dos eixos: voga 0, 20 e 40 nas alturas certas; minutos em passos redondos", () => {
  const g = geometriaGrafico(TREINO_EXEMPLO.etapas, 120);
  assert.deepEqual(g.escalaY.map((e) => e.valor), [0, 20, 40]);
  assert.equal(g.escalaY[0].y, g.base.y, "a marca 0 é a linha de base");
  assert.ok(g.escalaY[2].y < g.escalaY[1].y && g.escalaY[1].y < g.escalaY[0].y, "40 em cima, 0 embaixo");
  assert.deepEqual(g.escalaX.map((m) => m.minuto), [0, 10, 20, 30, 40], "48 min: marcas de 10 em 10");
  assert.equal(g.escalaX.filter((m) => m.ultimo).length, 1);
  assert.ok(g.escalaX.every((m, i, a) => i === 0 || m.pos > a[i - 1].pos) && g.escalaX[0].pos > 0 && g.escalaX.at(-1).pos < 1);
});

test("marcasDoTempo: no máximo 5 passos, de 1 a 120 minutos", () => {
  const passos = (s) => marcasDoTempo(s).map((m) => m.minuto);
  assert.deepEqual(passos(3 * 60), [0, 1, 2, 3]);
  assert.deepEqual(passos(26 * 60), [0, 10, 20]);
  assert.deepEqual(passos(60 * 60), [0, 15, 30, 45, 60].length === 5 ? [0, 15, 30, 45, 60] : passos(3600), "1 h");
  assert.ok(marcasDoTempo(10 * 3600).length <= 6);
  assert.equal(marcasDoTempo(20).length >= 1, true, "treino de segundos não quebra");
});
