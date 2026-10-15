// "Carregar treinos" (versão estática): lê um .zip baixado antes por "Baixar treinos locais" (ou um .json de treino)
// e devolve os treinos válidos, prontos para virar treinos locais (ver importarTreinos em api.local.js).
import { normalizarEtapas, normalizarTags, validarTreino } from "../shared/treino.js";

/** Arquivos .json de um .zip (sem o index.json e sem as sobras do macOS), como { nome, texto }. */
async function lerZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const utf8 = new TextDecoder();
  let fim = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50 /* fim do diretório central */) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("o arquivo não é um .zip válido");
  const arquivos = [];
  let pos = dv.getUint32(fim + 16, true);
  const total = dv.getUint16(fim + 10, true);
  for (let k = 0; k < total; k++) {
    if (dv.getUint32(pos, true) !== 0x02014b50 /* entrada do diretório central */) throw new Error("o .zip está corrompido");
    const metodo = dv.getUint16(pos + 10, true);
    const tamanho = dv.getUint32(pos + 20, true);
    const tamNome = dv.getUint16(pos + 28, true);
    const tamExtra = dv.getUint16(pos + 30, true);
    const tamComentario = dv.getUint16(pos + 32, true);
    const local = dv.getUint32(pos + 42, true);
    const caminho = utf8.decode(bytes.subarray(pos + 46, pos + 46 + tamNome));
    pos += 46 + tamNome + tamExtra + tamComentario;
    const nome = caminho.split("/").pop();
    if (!/\.json$/i.test(nome) || /^index\.json$/i.test(nome) || nome.startsWith("._") || caminho.includes("__MACOSX")) continue;
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const dados = bytes.subarray(inicio, inicio + tamanho);
    let conteudo;
    if (metodo === 0) conteudo = dados;
    else if (metodo === 8 && typeof DecompressionStream === "function") {
      conteudo = new Uint8Array(await new Response(new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    } else throw new Error("o .zip usa uma compressão que este navegador não lê");
    arquivos.push({ nome, texto: utf8.decode(conteudo) });
  }
  return arquivos;
}

/** Lê um .zip ou .json escolhido pelo usuário: { validos: [{ nome, etapas, arquivo }], invalidos: ["arquivo (motivo)"] }. */
export async function lerArquivoTreinos(arquivo) {
  const lidos = /\.json$/i.test(arquivo.name) ? [{ nome: arquivo.name, texto: await arquivo.text() }] : await lerZip(await arquivo.arrayBuffer());
  const validos = [];
  const invalidos = [];
  for (const { nome, texto } of lidos) {
    let dados;
    try {
      dados = JSON.parse(String(texto).replace(/^﻿/, ""));
    } catch {
      invalidos.push(`${nome} (não é um JSON válido)`);
      continue;
    }
    const erro = validarTreino(dados);
    if (erro) invalidos.push(`${nome} (${erro})`);
    else validos.push({ nome: dados.nome.trim(), tags: normalizarTags(dados.tags), etapas: normalizarEtapas(dados.etapas), arquivo: nome });
  }
  return { validos, invalidos };
}
