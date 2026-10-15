// Botões de bips e de voz: desligar silencia na hora (inclusive o que já estava agendado) e religar volta ao normal.
import test from "node:test";
import assert from "node:assert/strict";
import { criarAmbiente } from "./helpers/fakeaudio.mjs";

const passos = [
  { tipo: "descanso", duracao_s: 12 },
  { tipo: "remada", duracao_s: 20, voga: 24 },
];

async function cenario(fn) {
  const amb = criarAmbiente({ iniciaEm: 0 });
  try {
    const audio = await import(`../src/audio.js?${Math.random()}`);
    audio.prepararAudio();
    audio.registrarVoz("voga:24", { duration: 0.9 });
    audio.registrarVoz("5seg", { duration: 0.9 });
    audio.registrarVoz("vai", { duration: 0.3 });
    await amb.avancar(60, 10);
    const t0 = audio.agora() + 200;
    const fim = t0 + passos[0].duracao_s * 1000;
    const agenda = audio.iniciarAgenda(audio.sinaisTreino(passos, 0, fim));
    await fn({ audio, amb, agenda });
    agenda.parar();
  } finally {
    amb.restaurar();
  }
}

test("por padrão bips e vozes estão ligados", async () => {
  await cenario(async ({ amb }) => {
    await amb.avancar(14000, 10);
    assert.ok(amb.escutados().length > 0 && amb.falas().length === 3, "bips e as 3 falas (voga, 5 segundos, vai) foram agendados");
    assert.ok(amb.escutados().every((o) => !o.mudo) && amb.falas().every((f) => !f.mudo));
  });
});

test("desligar os bips silencia só os bips", async () => {
  await cenario(async ({ audio, amb }) => {
    audio.definirBipes(false);
    await amb.avancar(14000, 10);
    assert.ok(amb.escutados().length > 0 && amb.escutados().every((o) => o.mudo), "todos os bips mudos");
    assert.ok(amb.falas().length === 3 && amb.falas().every((f) => !f.mudo), "as vozes continuam");
  });
});

test("desligar as vozes silencia só as vozes", async () => {
  await cenario(async ({ audio, amb }) => {
    audio.definirVozes(false);
    await amb.avancar(14000, 10);
    assert.ok(amb.falas().length === 3 && amb.falas().every((f) => f.mudo), "todas as falas mudas");
    assert.ok(amb.escutados().every((o) => !o.mudo), "os bips continuam");
  });
});

test("desligar no meio do treino vale também para o que já estava agendado; religar volta", async () => {
  await cenario(async ({ audio, amb }) => {
    await amb.avancar(3000, 10); // o "5 segundos" e o bipe da troca já estão agendados
    assert.ok(amb.escutados().length > 0);
    audio.definirBipes(false);
    audio.definirVozes(false);
    assert.ok(amb.escutados().every((o) => o.mudo) && amb.falas().every((f) => f.mudo), "tudo agendado fica mudo");
    audio.definirBipes(true);
    audio.definirVozes(true);
    assert.ok(amb.escutados().every((o) => !o.mudo) && amb.falas().every((f) => !f.mudo), "religar: volta a soar");
  });
});

test("bipe da troca para remada: curto quando o 'Vai!' acompanha, completo se a voz estiver desligada", async () => {
  const bipeDaTroca = (amb) => amb.escutados().filter((o) => o.f === 1046).at(-1);
  await cenario(async ({ amb }) => {
    await amb.avancar(14000, 10);
    assert.ok(Math.abs(bipeDaTroca(amb).dur - 0.32) < 0.001, "com voz: 0,3 s (+0,02)");
  });
  await cenario(async ({ audio, amb }) => {
    audio.definirVozes(false);
    await amb.avancar(14000, 10);
    assert.ok(Math.abs(bipeDaTroca(amb).dur - 0.52) < 0.001, "sem voz: 0,5 s (+0,02)");
  });
});
