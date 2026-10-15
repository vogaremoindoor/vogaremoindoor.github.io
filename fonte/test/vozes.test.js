// Falas do treino: "Voga N" + "5 segundos" antes de uma remada e "Vai!" quando ela começa.
import test from "node:test";
import assert from "node:assert/strict";
import * as audio from "../src/audio.js";

// Falas de mentira, só com a duração: voga 0,9 s · 5 segundos 0,9 s · vai 0,3 s
for (const k of ["voga:20", "voga:24", "voga:30"]) audio.registrarVoz(k, { duration: 0.9 });
audio.registrarVoz("5seg", { duration: 0.9 });
audio.registrarVoz("vai", { duration: 0.3 });

const R = (duracao_s, voga) => ({ tipo: "remada", duracao_s, voga });
const D = (duracao_s) => ({ tipo: "descanso", duracao_s });
const falas = (sinais) => sinais.filter((s) => s.voz).map((s) => [s.voz, Math.round(s.t)]).sort((a, b) => a[1] - b[1]);

test("descanso -> remada: 'Voga N' termina 250 ms antes do '5 segundos'; 'Vai' na troca", () => {
  const passos = [D(30), R(60, 24)];
  const f = falas(audio.sinaisTreino(passos, 0, 30_000));
  // 5 segundos em 25.000; voga começa em 25.000 - 250 - 900 = 23.850; vai em 30.000
  assert.deepEqual(f, [["voga:24", 23_850], ["5seg", 25_000], ["vai", 30_000]]);
});

test("próxima etapa é descanso: sem falas", () => {
  const passos = [R(60, 24), D(30)];
  assert.deepEqual(falas(audio.sinaisTreino(passos, 0, 60_000)), []);
});

test("etapa de 5 s ou menos: sem '5 segundos', mas com 'Voga N' no começo e 'Vai' na troca", () => {
  const passos = [D(5), R(60, 20)];
  assert.deepEqual(falas(audio.sinaisTreino(passos, 0, 5_000)), [["voga:20", 150], ["vai", 5_000]]);
  const passos3 = [D(3), R(60, 20)];
  assert.deepEqual(falas(audio.sinaisTreino(passos3, 0, 3_000)), [["voga:20", 150], ["vai", 3_000]]);
});

test("etapa curta demais para a voga caber: só o 'Vai'", () => {
  const passos = [D(1), R(60, 20)];
  assert.deepEqual(falas(audio.sinaisTreino(passos, 0, 1_000)), [["vai", 1_000]]);
});

test("etapa de 6 s: voga e '5 segundos' brigariam; fica só a voga (sem sobrepor vozes)", () => {
  const passos = [D(6), R(60, 20)];
  const f = falas(audio.sinaisTreino(passos, 0, 6_000));
  assert.deepEqual(f, [["voga:20", 150], ["vai", 6_000]]);
});

test("cada remada usa a voga da sua própria configuração", () => {
  const passos = [R(60, 20), D(30), R(60, 24), D(30), R(60, 30)];
  const f = falas(audio.sinaisTreino(passos, 0, 60_000)).filter(([k]) => k.startsWith("voga"));
  assert.deepEqual(f.map(([k]) => k), ["voga:24", "voga:30"]);
});

test("remada -> remada (sem descanso): também fala e começa com 'Vai'", () => {
  const f = falas(audio.sinaisTreino([R(40, 20), R(40, 24)], 0, 40_000));
  assert.deepEqual(f.map(([k]) => k), ["voga:24", "5seg", "vai"]);
});

test("'+30 s' desloca as falas junto com o fim da etapa", () => {
  const passos = [D(30), R(60, 24)];
  const f = falas(audio.sinaisTreino(passos, 0, 60_000, 60_000)); // fim em 60 s, total 60 s
  assert.deepEqual(f, [["voga:24", 53_850], ["5seg", 55_000], ["vai", 60_000]]);
});

test("contagem inicial: 'Voga N' no 1º bipe e 'Vai' na largada (só se a 1ª etapa for remada)", () => {
  const c = falas(audio.sinaisContagem(1_000, 5, R(60, 20)));
  assert.deepEqual(c, [["voga:20", 1_000], ["vai", 6_000]]);
  assert.deepEqual(falas(audio.sinaisContagem(1_000, 5, D(30))), []);
  assert.equal(audio.sinaisContagem(1_000, 5, "remada").filter((s) => s.voz).length, 1); // só 'vai' (assinatura antiga)
});

test("quando 'Vai' acompanha o bipe da remada, o bipe é mais curto e baixo", () => {
  const bipe = audio.sinalTroca(0, "remada").find((s) => !s.voz).notas[0];
  assert.ok(bipe.d < 0.5 && bipe.v < 0.6);
  const [so] = audio.sinalTroca(0, "descanso");
  assert.equal(so.notas[0].d, 0.5);
});
