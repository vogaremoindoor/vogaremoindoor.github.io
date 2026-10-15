import test from "node:test";
import assert from "node:assert/strict";
import {
  achatar,
  duracaoTotal,
  formatarTempo,
  validarTreino,
  TREINO_EXEMPLO,
} from "../shared/treino.js";

test("treino de exemplo: 36 passos e 48:00 no total", () => {
  const passos = achatar(TREINO_EXEMPLO.etapas);
  assert.equal(passos.length, 36);
  assert.equal(duracaoTotal(TREINO_EXEMPLO.etapas), 48 * 60);
  assert.equal(validarTreino(TREINO_EXEMPLO), null);
});

test("achatar expande repetições na ordem certa", () => {
  const passos = achatar([
    { tipo: "remada", duracao_s: 10, voga: 20 },
    {
      tipo: "repeticao",
      vezes: 2,
      etapas: [
        { tipo: "remada", duracao_s: 5, voga: 22 },
        { tipo: "descanso", duracao_s: 3 },
      ],
    },
  ]);
  assert.deepEqual(
    passos.map((p) => `${p.tipo}:${p.duracao_s}:${p.voga ?? "-"}`),
    ["remada:10:20", "remada:5:22", "descanso:3:-", "remada:5:22", "descanso:3:-"],
  );
});

test("sequência das vogas do exemplo", () => {
  const vogas = achatar(TREINO_EXEMPLO.etapas)
    .filter((p) => p.tipo === "remada")
    .map((p) => p.voga);
  assert.deepEqual(vogas, [16, 18, 20, 22, 22, 24, 24, 26, 26, 28, 28, 28, 30, 30, 30, 32, 34, 36]);
});

test("formatarTempo", () => {
  assert.equal(formatarTempo(0), "0:00");
  assert.equal(formatarTempo(90), "1:30");
  assert.equal(formatarTempo(2880), "48:00");
  assert.equal(formatarTempo(3725), "1:02:05");
});

test("validação rejeita treinos inválidos", () => {
  assert.match(validarTreino({ nome: "", etapas: [] }), /nome/);
  assert.match(validarTreino({ nome: "x", etapas: [] }), /etapa/);
  assert.match(
    validarTreino({ nome: "x", etapas: [{ tipo: "remada", duracao_s: 0, voga: 20 }] }),
    /duração/,
  );
  assert.match(
    validarTreino({ nome: "x", etapas: [{ tipo: "remada", duracao_s: 10, voga: 0 }] }),
    /voga/,
  );
  assert.match(
    validarTreino({ nome: "x", etapas: [{ tipo: "repeticao", vezes: 2, etapas: [] }] }),
    /etapa/,
  );
  assert.match(validarTreino({ nome: "x", etapas: [{ tipo: "foo" }] }), /tipo/);
});

// ---------- resumo de tempo, faixa de voga e treinos em arquivos ----------
import {
  conteudoArquivoTreino,
  duracaoPorTipo,
  interpretarArquivoTreino,
  resumoDuracao,
  slugDoNome,
  TREINO_EXEMPLO as EXEMPLO,
  validarTreino as validar,
} from "../shared/treino.js";

test("resumoDuracao: total (remando/descansando), com as repetições contadas", () => {
  const etapas = [
    { tipo: "remada", duracao_s: 240, voga: 20 },
    { tipo: "descanso", duracao_s: 60 },
    { tipo: "repeticao", vezes: 3, etapas: [{ tipo: "remada", duracao_s: 90, voga: 24 }, { tipo: "descanso", duracao_s: 30 }] },
  ];
  assert.deepEqual(duracaoPorTipo(etapas), { total: 660, remando: 510, descansando: 150 });
  assert.equal(resumoDuracao(etapas), "11:00 (8:30/2:30)");
  assert.equal(resumoDuracao([{ tipo: "remada", duracao_s: 3725, voga: 20 }]), "1:02:05 (1:02:05/0:00)");
  assert.equal(resumoDuracao(EXEMPLO.etapas), "48:00 (36:00/12:00)", "treino de exemplo: 48:00 no total, 36:00 remando e 12:00 descansando");
});

test("voga aceita só de 12 a 46 (as falas gravadas)", () => {
  const t = (voga) => ({ nome: "x", etapas: [{ tipo: "remada", duracao_s: 60, voga }] });
  assert.equal(validar(t(12)), null);
  assert.equal(validar(t(46)), null);
  for (const v of [0, 11, 47, 99, 20.5, "20", null]) assert.match(validar(t(v)), /voga deve ser um número de 12 a 46/);
});

test("slugDoNome: sem acento, minúsculo, com hífens", () => {
  assert.equal(slugDoNome("Progressão de voga 16 → 36"), "progressao-de-voga-16-36");
  assert.equal(slugDoNome("  Treino  Ágil!! "), "treino-agil");
  assert.equal(slugDoNome("???"), "treino");
  assert.ok(slugDoNome("a".repeat(200)).length <= 60);
});

test("arquivo de treino: grava legível e lê de volta igual; arquivo ruim vira 'invalido'", () => {
  const texto = conteudoArquivoTreino(EXEMPLO);
  assert.equal(texto.split("\n").length > 20 && texto.split("\n").length < 60, true, "uma etapa por linha");
  const lido = interpretarArquivoTreino(texto, "ex");
  assert.deepEqual({ nome: lido.nome, etapas: lido.etapas }, { nome: EXEMPLO.nome, etapas: EXEMPLO.etapas });
  assert.equal(lido.id, "ex");
  assert.match(interpretarArquivoTreino("{ não é json", "a").invalido, /JSON/);
  assert.match(interpretarArquivoTreino('{"nome":"X","etapas":[]}', "a").invalido, /pelo menos uma etapa/);
  assert.equal(interpretarArquivoTreino('{"nome":"X","etapas":[]}', "a").nome, "X");
  assert.equal(interpretarArquivoTreino("\uFEFF" + JSON.stringify({ nome: "Com BOM", etapas: [{ tipo: "descanso", duracao_s: 5 }] }), "b").invalido, undefined, "aceita BOM (arquivos salvos pelo Bloco de Notas)");
  assert.deepEqual(interpretarArquivoTreino(JSON.stringify({ nome: "N", etapas: [{ tipo: "descanso", duracao_s: 5, lixo: 1 }] }), "c").etapas, [{ tipo: "descanso", duracao_s: 5 }], "ignora campos desconhecidos");
});

// ---------- arquivos numerados e ZIP para publicar na pasta treinos ----------
import { nomeArquivoDeNumero, nomeArquivoZip, numeroDoArquivo } from "../shared/treino.js";
import { crc32, criarZip } from "../src/zip.js";

test("arquivos de treino por número: treino-001.json; o nome do treino fica dentro", () => {
  assert.equal(nomeArquivoDeNumero(1), "treino-001.json");
  assert.equal(nomeArquivoDeNumero(42), "treino-042.json");
  assert.equal(nomeArquivoDeNumero(1234), "treino-1234.json");
  assert.equal(numeroDoArquivo("treino-007.json"), 7);
  assert.equal(numeroDoArquivo(" TREINO-12.JSON "), 12);
  for (const x of ["progressao.json", "treino-.json", "treino-1.txt", "xtreino-1.json", "", null, undefined]) assert.equal(numeroDoArquivo(x), null, String(x));
  assert.equal(nomeArquivoZip(new Date(2026, 9, 6, 7, 5)), "treinos-2026-10-06-07-05.zip");
});

// leitor mínimo de ZIP (método "store") para conferir o que criarZip gera
function lerZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const texto = new TextDecoder();
  const fimPos = bytes.length - 22;
  assert.equal(v.getUint32(fimPos, true), 0x06054b50, "fim do diretório central");
  const total = v.getUint16(fimPos + 10, true);
  let pos = v.getUint32(fimPos + 16, true);
  const arquivos = [];
  for (let i = 0; i < total; i++) {
    assert.equal(v.getUint32(pos, true), 0x02014b50);
    const crc = v.getUint32(pos + 16, true);
    const tam = v.getUint32(pos + 24, true);
    const nomeLen = v.getUint16(pos + 28, true);
    const local = v.getUint32(pos + 42, true);
    const nome = texto.decode(bytes.subarray(pos + 46, pos + 46 + nomeLen));
    assert.equal(v.getUint32(local, true), 0x04034b50);
    const dadosPos = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const dados = bytes.subarray(dadosPos, dadosPos + tam);
    assert.equal(crc32(dados), crc, `CRC de ${nome}`);
    arquivos.push({ nome, conteudo: texto.decode(dados) });
    pos += 46 + nomeLen;
  }
  return arquivos;
}

test("criarZip: estrutura válida, CRC certo, acentos nos nomes e no conteúdo", () => {
  const entrada = [
    { nome: "treinos/treino-002.json", conteudo: '{ "nome": "Ação → 36" }\n' },
    { nome: "treinos/index.json", conteudo: '[\n  "treino-001.json",\n  "treino-002.json"\n]\n' },
    { nome: "LEIAME.txt", conteudo: "olá ✓\n" },
    { nome: "treinos/vazio.json", conteudo: "" },
  ];
  assert.deepEqual(lerZip(criarZip(entrada)), entrada);
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "CRC-32 padrão");
});

// ---------- modo cópia: nome da cópia ----------
import { nomeDaCopia } from "../shared/treino.js";

test("nomeDaCopia: '(cópia)', depois '(cópia 2)', '(cópia 3)'... sem repetir nomes existentes", () => {
  assert.equal(nomeDaCopia("Pirâmide", ["Pirâmide"]), "Pirâmide (cópia)");
  assert.equal(nomeDaCopia("Pirâmide", ["Pirâmide", "Pirâmide (cópia)"]), "Pirâmide (cópia 2)");
  assert.equal(nomeDaCopia("Pirâmide", ["Pirâmide", "pirâmide (CÓPIA)", "Pirâmide (cópia 2)"]), "Pirâmide (cópia 3)", "sem diferenciar maiúsculas");
  assert.equal(nomeDaCopia("Pirâmide (cópia)", ["Pirâmide"]), "Pirâmide (cópia)", "não empilha '(cópia) (cópia)'");
  assert.equal(nomeDaCopia("  Teste  "), "Teste (cópia)");
});

test("nomeDaCopia: nunca passa de 80 caracteres (limite do nome do treino)", () => {
  const longo = "a".repeat(80);
  const nome = nomeDaCopia(longo, []);
  assert.ok(nome.length <= 80 && nome.endsWith(" (cópia)"), nome.length + " " + nome.slice(-12));
  const outro = nomeDaCopia(longo, [nome]);
  assert.ok(outro.length <= 80 && outro.endsWith(" (cópia 2)") && outro !== nome);
  assert.equal(validar({ nome: outro, etapas: [{ tipo: "descanso", duracao_s: 5 }] }), null, "continua válido para salvar");
});
