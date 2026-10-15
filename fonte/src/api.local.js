// Versão estática (GitHub Pages), sem servidor. Dois tipos de treino:
//  - os do navegador (localStorage): criados e editados na tela;
//  - os da pasta treinos/ do site (um .json por treino, listados em treinos/index.json): somente leitura,
//    carregados a cada vez que a lista abre (atualizar a página mostra arquivos novos).
// Mesmas funções de src/api.js, então o resto do app não muda.
import {
  compararTreinos,
  conteudoArquivoTreino,
  interpretarArquivoTreino,
  normalizarEtapas,
  nomeArquivoDeNumero,
  numeroDoArquivo,
  validarTreino,
} from "../shared/treino.js";
import { crc32 } from "./zip.js";

const CHAVE = "treino-remo:treinos";

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

let memoria = null; // usado se o navegador bloquear o armazenamento

// cópia por JSON (em vez de structuredClone) para funcionar também em navegadores mais antigos
const copia = (t) => JSON.parse(JSON.stringify(t));

const inicial = () => ({ proximoId: 1, treinos: [] });

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto !== null) {
      const dados = JSON.parse(bruto);
      if (Array.isArray(dados?.treinos) && Number.isInteger(dados.proximoId)) return dados;
    }
    const novo = inicial();
    gravar(novo);
    return novo;
  } catch {
    memoria ??= inicial();
    return memoria;
  }
}

function gravar(dados) {
  memoria = dados;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* sem armazenamento: fica só em memória nesta sessão */
  }
}

export const persistente = () => {
  try {
    localStorage.setItem("treino-remo:teste", "1");
    localStorage.removeItem("treino-remo:teste");
    return true;
  } catch {
    return false;
  }
};

// ---------- treinos da pasta treinos/ (arquivos do site) ----------
const PREFIXO = "arq-"; // id de treino de arquivo: arq-<nome do arquivo sem .json>
const ehDeArquivo = (id) => typeof id === "string" && id.startsWith(PREFIXO);
const urlTreinos = (nome) => new URL(`treinos/${encodeURIComponent(nome)}`, document.baseURI).href;
const SEM_REDE = "não foi possível ler o arquivo";
const chaveArquivo = (nome) => String(nome).trim().toLowerCase().replace(/\.json$/, ""); // treino-002 = treino-002.json
const canonico = (t) => conteudoArquivoTreino(t); // mesmo texto para o mesmo conteúdo, qualquer que seja a formatação
const hash = (texto) => crc32(new TextEncoder().encode(texto));
const SO_LEITURA =
  "Este treino vem de um arquivo da pasta treinos e não pode ser alterado aqui. Use Duplicar para criar uma cópia editável.";

async function lerArquivo(nome) {
  const id = PREFIXO + nome.replace(/\.json$/i, "");
  try {
    const r = await fetch(urlTreinos(nome.replace(/(\.json)?$/i, ".json")), { cache: "no-cache" });
    if (!r.ok) return { id, nome: id.slice(PREFIXO.length), invalido: `arquivo não encontrado (erro ${r.status})`, somenteLeitura: true };
    return { ...interpretarArquivoTreino(await r.text(), id), somenteLeitura: true };
  } catch {
    return { id, nome: id.slice(PREFIXO.length), invalido: SEM_REDE, somenteLeitura: true, semRede: true };
  }
}

/** Nomes listados em treinos/index.json. Lança erro se não for possível ler (404 = ainda não existe = lista vazia). */
async function lerIndiceDoSite() {
  let r;
  try {
    r = await fetch(urlTreinos("index.json"), { cache: "no-cache" });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error(`erro ${r.status}`);
    const lista = await r.json();
    if (!Array.isArray(lista)) throw new Error("índice inválido");
    return [...new Set(lista.filter((n) => typeof n === "string" && n.trim()).map((n) => n.trim()))];
  } catch {
    throw new ErroApi(
      "Não consegui ler o treinos/index.json do site agora (sem conexão?). Tente de novo: sem ele o índice novo poderia esconder treinos já publicados.",
      0,
    );
  }
}

/** Lê treinos/index.json (lista de nomes de arquivo) e cada arquivo. Sem o índice (ou offline sem cópia): lista vazia. */
async function listarArquivos() {
  if (typeof fetch !== "function") return [];
  let nomes;
  try {
    nomes = await lerIndiceDoSite();
  } catch {
    return [];
  }
  return Promise.all(nomes.map(lerArquivo));
}

/**
 * Treinos criados aqui que JÁ estão publicados na pasta treinos/ do site, com conteúdo idêntico, não aparecem
 * (só o treino de arquivo aparece, com o selo). Se o arquivo foi alterado, ou saiu do índice, a cópia daqui volta.
 */
const jaPublicado = (t, arquivos) => {
  if (!t.arquivo) return false;
  const publicado = arquivos.find((a) => !a.invalido && a.id.slice(PREFIXO.length).toLowerCase() === chaveArquivo(t.arquivo));
  try {
    return !!publicado && canonico(publicado) === canonico(t);
  } catch {
    return false;
  }
};

export async function listar() {
  const arquivos = await listarArquivos();
  const locais = ler()
    .treinos.filter((t) => !jaPublicado(t, arquivos))
    .map(copia);
  return { treinos: [...arquivos, ...locais].sort(compararTreinos), offline: false };
}

export async function buscar(id) {
  if (ehDeArquivo(id)) {
    const t = await lerArquivo(id.slice(PREFIXO.length));
    if (t.invalido) throw new ErroApi(`Arquivo com problema: ${t.invalido}.`, 422);
    return t;
  }
  const t = ler().treinos.find((x) => x.id === Number(id));
  if (!t) throw new ErroApi("Treino não encontrado.", 404);
  return copia(t);
}

export async function criar(treino) {
  const erro = validarTreino(treino);
  if (erro) throw new ErroApi(erro, 400);
  const dados = ler();
  const novo = { id: dados.proximoId, nome: treino.nome.trim(), etapas: copia(treino.etapas) };
  gravar({ ...dados, proximoId: dados.proximoId + 1, treinos: [...dados.treinos, novo] });
  return copia(novo);
}

export async function atualizar(id, treino) {
  if (ehDeArquivo(id)) throw new ErroApi(SO_LEITURA, 403);
  const erro = validarTreino(treino);
  if (erro) throw new ErroApi(erro, 400);
  const dados = ler();
  if (!dados.treinos.some((x) => x.id === Number(id))) throw new ErroApi("Treino não encontrado.", 404);
  const antigo = dados.treinos.find((x) => x.id === Number(id));
  const novo = { id: Number(id), nome: treino.nome.trim(), etapas: copia(treino.etapas), ...(antigo.arquivo && { arquivo: antigo.arquivo, exportado: antigo.exportado }) };
  gravar({ ...dados, treinos: dados.treinos.map((x) => (x.id === novo.id ? novo : x)) });
  return copia(novo);
}

export async function excluir(id) {
  if (ehDeArquivo(id)) throw new ErroApi(SO_LEITURA, 403);
  const dados = ler();
  gravar({ ...dados, treinos: dados.treinos.filter((x) => x.id !== Number(id)) });
  return null;
}



/**
 * Prepara os treinos criados AQUI (localStorage) para serem publicados na pasta treinos/ do site.
 *  - cada treino recebe um número de arquivo (treino-003.json) que fica guardado;
 *  - os números começam depois do maior que já existe no site (treinos/index.json lido agora);
 *  - o índice novo = tudo o que já estava no índice do site + os arquivos novos (é só enviar e substituir);
 *  - treino já publicado e igual: não entra no zip (e some da lista, ver jaPublicado);
 *  - treino editado depois de publicado: reescreve o MESMO arquivo, desde que o arquivo do site ainda seja o que
 *    este app enviou (não foi alterado por fora). Se foi (alguém editou no GitHub, ou o número colidiu com outro
 *    aparelho), NÃO sobrescreve: a versão daqui sai com um número novo e o aviso conta o que aconteceu;
 *  - treinos com erro (por exemplo voga fora de 12–46) ficam de fora e voltam em `ignorados`.
 */
export async function prepararPublicacao() {
  const existentes = await lerIndiceDoSite();
  const noSite = new Set(existentes.map(chaveArquivo));

  const dados = ler();
  const ignorados = [];
  const validos = [];
  for (const t of [...dados.treinos].sort((a, b) => a.id - b.id)) {
    const erro = validarTreino(t);
    if (erro) ignorados.push({ nome: t.nome, motivo: erro });
    else validos.push(t);
  }

  let maximo = 0;
  for (const n of existentes) maximo = Math.max(maximo, numeroDoArquivo(n) ?? 0);
  for (const t of dados.treinos) maximo = Math.max(maximo, numeroDoArquivo(t.arquivo) ?? 0);

  const arquivos = []; // vão no zip: { nome, nomeDoTreino, conteudo, situacao: "novo" | "atualiza" | "conflito" }
  const jaPublicados = [];
  const conflitos = [];
  const registro = new Map(); // id do treino -> { arquivo, exportado }

  for (const t of validos) {
    const conteudo = conteudoArquivoTreino(t);
    let arquivo = t.arquivo && numeroDoArquivo(t.arquivo) !== null ? t.arquivo : null;
    let situacao = "novo";

    if (arquivo && noSite.has(chaveArquivo(arquivo))) {
      const publicado = await lerArquivo(arquivo);
      if (publicado.semRede) {
        throw new ErroApi(`Não consegui ler o ${arquivo} do site agora (sem conexão?). Tente de novo.`, 0);
      }
      if (!publicado.invalido && canonico(publicado) === conteudo) {
        jaPublicados.push(arquivo);
        registro.set(t.id, { arquivo, exportado: hash(conteudo) });
        continue; // já está lá, igual: nada a enviar
      }
      if (publicado.invalido || t.exportado === hash(canonico(publicado))) {
        situacao = "atualiza"; // o arquivo do site é o que enviamos antes (ou está quebrado): pode reescrever
      } else {
        conflitos.push({ arquivo, nome: t.nome }); // mudou por fora: não sobrescreve
        arquivo = null;
        situacao = "conflito";
      }
    }

    if (!arquivo) arquivo = nomeArquivoDeNumero(++maximo);
    if (situacao === "conflito") conflitos[conflitos.length - 1].novoArquivo = arquivo;
    arquivos.push({ nome: arquivo, nomeDoTreino: t.nome, conteudo, situacao });
    registro.set(t.id, { arquivo, exportado: hash(conteudo) });
  }

  gravar({ ...dados, treinos: dados.treinos.map((t) => (registro.has(t.id) ? { ...t, ...registro.get(t.id) } : t)) });

  const novosNomes = arquivos
    .map((a) => a.nome)
    .filter((n) => !noSite.has(chaveArquivo(n)))
    .sort((a, b) => numeroDoArquivo(a) - numeroDoArquivo(b));
  return { arquivos, indice: [...existentes, ...novosNomes], ignorados, jaPublicados, conflitos };
}

/** Quantos treinos locais existem (para perguntar se a carga adiciona ou substitui). */
export const quantidadeLocais = () => ler().treinos.length;

/**
 * "Carregar treinos": grava como locais os treinos lidos de um .zip ou .json (ver src/carregar.js).
 * Ignora os que já existem iguais. Com `substituir`, apaga antes os treinos locais atuais.
 * O treino que veio de um arquivo treino-NNN.json guarda esse número (se ninguém aqui já o usa), como se
 * tivesse sido baixado deste navegador: assim o próximo "Baixar treinos locais" reescreve o mesmo arquivo.
 */
export function importarTreinos(lista, substituir) {
  const dados = ler();
  const mantidos = substituir ? [] : dados.treinos;
  const conteudos = new Set(
    mantidos.map((t) => {
      try {
        return canonico(t);
      } catch {
        return "";
      }
    }),
  );
  const usados = new Set(mantidos.map((t) => t.arquivo).filter(Boolean));
  const novos = [];
  let proximoId = dados.proximoId;
  let repetidos = 0;
  for (const t of lista) {
    const conteudo = canonico(t);
    if (conteudos.has(conteudo)) {
      repetidos++;
      continue;
    }
    conteudos.add(conteudo);
    const guardaArquivo = numeroDoArquivo(t.arquivo) !== null && !usados.has(t.arquivo);
    if (guardaArquivo) usados.add(t.arquivo);
    novos.push({ id: proximoId++, nome: t.nome, etapas: normalizarEtapas(t.etapas), ...(guardaArquivo && { arquivo: t.arquivo, exportado: hash(conteudo) }) });
  }
  gravar({ ...dados, proximoId, treinos: [...mantidos, ...novos] });
  return { novos, repetidos };
}

/** Quantos destes treinos são iguais a um arquivo publicado no site (e por isso aparecem como treino do site). */
export async function quantosJaPublicados(treinos) {
  const arquivos = await listarArquivos();
  return treinos.filter((t) => jaPublicado(t, arquivos)).length;
}
