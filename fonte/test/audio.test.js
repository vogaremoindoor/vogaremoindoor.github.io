// Sincronia dos bipes com o relógio do treino em computadores lentos (áudio que demora a iniciar,
// relógio de áudio fora de ritmo, saída com latência). Usa um AudioContext simulado.
import test from "node:test";
import assert from "node:assert/strict";
import { criarAmbiente } from "./helpers/fakeaudio.mjs";

const curto = [
  { tipo: "remada", duracao_s: 5, voga: 20 },
  { tipo: "descanso", duracao_s: 5 },
  { tipo: "remada", duracao_s: 10, voga: 22 },
];

// Fluxo do Player: espera o áudio rodar, depois começa a contagem e agenda os sinais.
async function rodar({ iniciaEm, taxa = 1, latencia = 0, passos = curto }) {
  const amb = criarAmbiente({ iniciaEm, taxa, latencia });
  try {
    const audio = await import(`../src/audio.js?${Math.random()}`);
    let pronto = false;
    const espera = audio.aguardarAudio().then((v) => (pronto = v));
    while (!pronto && amb.agora() < 9000) await amb.avancar(25);
    await espera;
    const t0 = audio.agora() + audio.margemInicialMs();
    const fim = t0 + 5000 + passos[0].duracao_s * 1000;
    const sinais = [...audio.sinaisContagem(t0, 5, passos[0].tipo), ...audio.sinaisTreino(passos, 0, fim)];
    const agenda = audio.iniciarAgenda(sinais);
    const total = passos.reduce((s, p) => s + p.duracao_s, 0) * 1000;
    await amb.avancar(5000 + total + 3000, 10);
    const ouvidos = amb.escutados();
    agenda.parar();
    const previstos = sinais.flatMap((s) => s.notas.map((n) => s.t + n.off * 1000));
    const desvios = ouvidos.map((o) => Math.min(...previstos.map((p) => Math.abs(o.ouvido - p))));
    return { pronto, ouvidos: ouvidos.length, previstos: previstos.length, pior: Math.max(0, ...desvios) };
  } finally {
    amb.restaurar();
  }
}

test("áudio leva 5 s para iniciar: nenhum bipe sai atrasado (antes: +5 s em todos)", async () => {
  const r = await rodar({ iniciaEm: 5000 });
  assert.ok(r.pronto);
  assert.equal(r.ouvidos, r.previstos);
  assert.ok(r.pior < 50, `pior desvio ${r.pior} ms`);
});

test("treino curto (5 s + 5 s + 10 s) com áudio lento: todos os sinais no lugar", async () => {
  const r = await rodar({ iniciaEm: 4200 });
  assert.equal(r.ouvidos, r.previstos);
  assert.ok(r.pior < 50, `pior desvio ${r.pior} ms`);
});

test("relógio de áudio 0,5% mais lento em 45 min: a deriva é corrigida", async () => {
  const bloco = [{ tipo: "remada", duracao_s: 240, voga: 16 }, { tipo: "descanso", duracao_s: 60 }];
  const longo = Array.from({ length: 9 }, () => bloco).flat();
  const r = await rodar({ iniciaEm: 300, taxa: 0.995, passos: longo });
  assert.equal(r.ouvidos, r.previstos);
  assert.ok(r.pior < 80, `pior desvio ${r.pior} ms`);
});

test("saída com latência de 0,4 s (Bluetooth) é compensada", async () => {
  const r = await rodar({ iniciaEm: 300, latencia: 0.4 });
  assert.ok(r.pior < 50, `pior desvio ${r.pior} ms`);
});

test("áudio que só inicia depois do limite de espera: o som entra no tempo certo", async () => {
  const r = await rodar({ iniciaEm: 12000 });
  assert.equal(r.pronto, false);
  assert.ok(r.ouvidos > 0 && r.pior < 60, `${r.ouvidos} sinais, pior desvio ${r.pior} ms`);
});

test("áudio que nunca inicia: nada toca e nada trava", async () => {
  const r = await rodar({ iniciaEm: 1e9 });
  assert.equal(r.pronto, false);
  assert.equal(r.ouvidos, 0);
});
