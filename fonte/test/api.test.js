// API do servidor com os treinos guardados em ARQUIVOS (um .json por treino na pasta treinos/).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "treinos-"));
process.env.TREINOS_DIR = pasta;
const { criarApp } = await import("../server/app.js");

const servidor = criarApp().listen(0);
const base = `http://localhost:${servidor.address().port}/api`;
test.after(() => {
  servidor.close();
  fs.rmSync(pasta, { recursive: true, force: true });
});

const chamar = (caminho, opcoes = {}) =>
  fetch(base + caminho, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
const arquivos = () => fs.readdirSync(pasta).sort();
const remada = (voga = 20, duracao_s = 60) => ({ tipo: "remada", duracao_s, voga });

test("pasta vazia: a lista começa vazia (a pasta é criada se não existir)", async () => {
  const r = await chamar("/treinos");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), []);
});

test("criar grava UM arquivo .json legível, com o nome do treino no nome do arquivo", async () => {
  const r = await chamar("/treinos", { method: "POST", body: { nome: "Progressão de Voga 16 → 36", etapas: [remada(16), { tipo: "descanso", duracao_s: 30 }] } });
  assert.equal(r.status, 201);
  const criado = await r.json();
  assert.equal(criado.id, "progressao-de-voga-16-36");
  assert.deepEqual(arquivos(), ["progressao-de-voga-16-36.json"]);
  const texto = fs.readFileSync(path.join(pasta, "progressao-de-voga-16-36.json"), "utf8");
  assert.deepEqual(JSON.parse(texto), { nome: "Progressão de Voga 16 → 36", etapas: [remada(16), { tipo: "descanso", duracao_s: 30 }] });
  assert.match(texto, /\{ "tipo": "remada", "duracao_s": 60, "voga": 16 \}/, "uma etapa por linha");
});

test("dois treinos com o mesmo nome não se sobrescrevem (-2, -3)", async () => {
  const corpo = { nome: "Duplo", etapas: [remada()] };
  const a = await (await chamar("/treinos", { method: "POST", body: corpo })).json();
  const b = await (await chamar("/treinos", { method: "POST", body: corpo })).json();
  const c = await (await chamar("/treinos", { method: "POST", body: corpo })).json();
  assert.deepEqual([a.id, b.id, c.id], ["duplo", "duplo-2", "duplo-3"]);
});

test("buscar, atualizar (mantém o arquivo, mesmo mudando o nome) e excluir", async () => {
  const novo = { nome: "Teste", etapas: [remada()] };
  const criado = await (await chamar("/treinos", { method: "POST", body: novo })).json();
  let r = await chamar(`/treinos/${criado.id}`);
  assert.equal((await r.json()).nome, "Teste");

  r = await chamar(`/treinos/${criado.id}`, { method: "PUT", body: { ...novo, nome: "Renomeado" } });
  assert.equal((await r.json()).nome, "Renomeado");
  assert.ok(arquivos().includes(`${criado.id}.json`), "continua no mesmo arquivo");
  assert.equal(JSON.parse(fs.readFileSync(path.join(pasta, `${criado.id}.json`), "utf8")).nome, "Renomeado");

  r = await chamar(`/treinos/${criado.id}`, { method: "DELETE" });
  assert.equal(r.status, 204);
  assert.ok(!arquivos().includes(`${criado.id}.json`), "arquivo apagado");
  assert.equal((await chamar(`/treinos/${criado.id}`)).status, 404);
  assert.equal((await chamar(`/treinos/${criado.id}`, { method: "DELETE" })).status, 404);
  assert.equal((await chamar(`/treinos/nao-existe`, { method: "PUT", body: novo })).status, 404);
});

test("arquivo colocado na pasta à mão aparece no próximo pedido (sem reiniciar) e pode ser executado e editado", async () => {
  fs.writeFileSync(path.join(pasta, "feito-a-mao.json"), JSON.stringify({ nome: "Feito à mão", etapas: [remada(30, 90), { tipo: "descanso", duracao_s: 15 }] }));
  const lista = await (await chamar("/treinos")).json();
  const t = lista.find((x) => x.id === "feito-a-mao");
  assert.ok(t && t.nome === "Feito à mão" && !t.invalido && t.etapas.length === 2);
  const r = await chamar("/treinos/feito-a-mao", { method: "PUT", body: { nome: "Feito à mão 2", etapas: [remada(31)] } });
  assert.equal((await r.json()).nome, "Feito à mão 2");
  // arquivo editado por fora também vale na hora
  fs.writeFileSync(path.join(pasta, "feito-a-mao.json"), JSON.stringify({ nome: "Editado por fora", etapas: [remada(40)] }));
  assert.equal((await (await chamar("/treinos/feito-a-mao")).json()).nome, "Editado por fora");
  // apagar o arquivo à mão some da lista
  fs.unlinkSync(path.join(pasta, "feito-a-mao.json"));
  assert.ok(!(await (await chamar("/treinos")).json()).some((x) => x.id === "feito-a-mao"));
});

test("nome de arquivo com espaço e acento funciona como id", async () => {
  fs.writeFileSync(path.join(pasta, "Treino Rápido 1.json"), JSON.stringify({ nome: "Rápido", etapas: [remada()] }));
  const r = await chamar(`/treinos/${encodeURIComponent("Treino Rápido 1")}`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).id, "Treino Rápido 1");
});

test("arquivo com problema aparece na lista com o motivo (não some em silêncio)", async () => {
  fs.writeFileSync(path.join(pasta, "quebrado.json"), "{ isso não é json");
  fs.writeFileSync(path.join(pasta, "voga-fora.json"), JSON.stringify({ nome: "Voga alta demais", etapas: [remada(60)] }));
  const lista = await (await chamar("/treinos")).json();
  const q = lista.find((x) => x.id === "quebrado");
  const v = lista.find((x) => x.id === "voga-fora");
  assert.match(q.invalido, /JSON/);
  assert.equal(v.nome, "Voga alta demais");
  assert.match(v.invalido, /voga deve ser um número de 12 a 46/);
  assert.equal((await chamar("/treinos/quebrado")).status, 422);
  assert.equal(q.etapas, undefined);
  fs.unlinkSync(path.join(pasta, "quebrado.json"));
  fs.unlinkSync(path.join(pasta, "voga-fora.json"));
});

test("só arquivos .json contam; index.json e arquivos ocultos são ignorados", async () => {
  fs.writeFileSync(path.join(pasta, "notas.txt"), "oi");
  fs.writeFileSync(path.join(pasta, "index.json"), JSON.stringify(["x.json"]));
  fs.writeFileSync(path.join(pasta, ".oculto.json"), JSON.stringify({ nome: "Oculto", etapas: [remada()] }));
  const ids = (await (await chamar("/treinos")).json()).map((t) => t.id);
  assert.ok(!ids.includes("notas") && !ids.includes("index") && !ids.includes(".oculto"));
  for (const f of ["notas.txt", "index.json", ".oculto.json"]) fs.unlinkSync(path.join(pasta, f));
});

test("ids com caminho ou arquivos ocultos são recusados (nada fora da pasta)", async () => {
  for (const id of ["..%2Fpackage", "..%2F..%2Fetc%2Fpasswd", "a%5Cb", ".oculto", "%2e%2e"]) {
    const r = await chamar(`/treinos/${id}`);
    assert.ok([400, 404].includes(r.status), `${id} -> ${r.status}`);
    assert.notEqual(r.status, 200);
    const d = await chamar(`/treinos/${id}`, { method: "DELETE" });
    assert.ok([400, 404].includes(d.status));
  }
  assert.ok(fs.existsSync(path.resolve("package.json")), "nada fora da pasta foi tocado");
});

test("rejeita treino inválido (voga fora de 12–46, etapas vazias, nome vazio)", async () => {
  let r = await chamar("/treinos", { method: "POST", body: { nome: "Ruim", etapas: [remada(11)] } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).erro, /voga deve ser um número de 12 a 46/);
  r = await chamar("/treinos", { method: "POST", body: { nome: "Ruim", etapas: [remada(47)] } });
  assert.equal(r.status, 400);
  r = await chamar("/treinos", { method: "POST", body: { nome: "Ruim", etapas: [] } });
  assert.equal(r.status, 400);
  r = await chamar("/treinos", { method: "POST", body: { nome: "  ", etapas: [remada()] } });
  assert.equal(r.status, 400);
  assert.ok(!arquivos().includes("ruim.json"), "nenhum arquivo foi criado");
});

test("limites da faixa de voga: 12 e 46 valem", async () => {
  for (const voga of [12, 46]) {
    const r = await chamar("/treinos", { method: "POST", body: { nome: `Limite ${voga}`, etapas: [remada(voga)] } });
    assert.equal(r.status, 201);
  }
});

test("a rota /importar não existe mais (os treinos são arquivos da pasta)", async () => {
  assert.equal((await chamar("/importar", { method: "POST", body: { modo: "adicionar", treinos: [] } })).status, 404);
});

test("lista ordenada por nome, com números como números (T2 antes de T10)", async () => {
  for (const f of fs.readdirSync(pasta)) fs.unlinkSync(path.join(pasta, f));
  for (const nome of ["T10", "t2", "Ágil", "T1"]) await chamar("/treinos", { method: "POST", body: { nome, etapas: [remada()] } });
  const nomes = (await (await chamar("/treinos")).json()).map((t) => t.nome);
  assert.deepEqual(nomes, ["Ágil", "T1", "t2", "T10"]);
});
