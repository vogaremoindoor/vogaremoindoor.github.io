// Armazenamento dos treinos em ARQUIVOS: um .json por treino na pasta `treinos/` (ou em TREINOS_DIR).
// A pasta é lida a cada pedido, então um arquivo colocado lá à mão aparece ao atualizar a página (sem reiniciar).
// Para usar um banco de dados no futuro, basta trocar este módulo: a interface (listar, buscar, criar,
// atualizar, excluir) é a única coisa que o resto do servidor conhece.
import fs from "node:fs";
import path from "node:path";
import { compararTreinos, conteudoArquivoTreino, interpretarArquivoTreino, slugDoNome } from "../shared/treino.js";

const EXT = ".json";
export const pasta = () => path.resolve(process.env.TREINOS_DIR || "treinos");
const garantirPasta = () => fs.mkdirSync(pasta(), { recursive: true });

/** O id é o nome do arquivo sem ".json"; nada de caminhos (barras, "..") nem arquivos ocultos. */
export const idValido = (id) =>
  typeof id === "string" && id.length > 0 && id.length <= 150 && !/[\\/\0]/.test(id) && !id.startsWith(".") && id !== "index";

const caminho = (id) => path.join(pasta(), id + EXT);

function ler(id) {
  let texto;
  let stat;
  try {
    texto = fs.readFileSync(caminho(id), "utf8");
    stat = fs.statSync(caminho(id));
  } catch {
    return null;
  }
  return { ...interpretarArquivoTreino(texto, id), atualizado_em: stat.mtime.toISOString() };
}

const idsNaPasta = () => {
  garantirPasta();
  return fs
    .readdirSync(pasta(), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(EXT) && e.name !== "index.json" && !e.name.startsWith("."))
    .map((e) => e.name.slice(0, -EXT.length));
};

/** Todos os treinos da pasta. Arquivo com problema vem com `invalido: "motivo"` (e sem etapas). */
export const listar = () =>
  idsNaPasta()
    .map(ler)
    .filter(Boolean)
    .sort(compararTreinos);

export const buscar = (id) => (idValido(id) ? ler(id) : null);

function escrever(id, treino) {
  garantirPasta();
  const temporario = path.join(pasta(), `.${id}.${process.pid}.tmp`);
  fs.writeFileSync(temporario, conteudoArquivoTreino(treino));
  fs.renameSync(temporario, caminho(id)); // troca inteira: nunca deixa um arquivo pela metade
}

// nome livre para um treino novo: progressao, progressao-2, progressao-3...
function idLivre(nome, ocupados) {
  const base = slugDoNome(nome);
  let id = base;
  for (let n = 2; ocupados.has(id.toLowerCase()); n++) id = `${base}-${n}`;
  ocupados.add(id.toLowerCase());
  return id;
}
const ocupadosAgora = () => new Set(idsNaPasta().map((i) => i.toLowerCase()).concat("index"));

export function criar(treino) {
  const id = idLivre(treino.nome, ocupadosAgora());
  escrever(id, treino);
  return ler(id);
}

export function atualizar(id, treino) {
  if (!idValido(id) || !fs.existsSync(caminho(id))) return null;
  escrever(id, treino);
  return ler(id);
}

export function excluir(id) {
  if (!idValido(id)) return false;
  try {
    fs.unlinkSync(caminho(id));
    return true;
  } catch {
    return false;
  }
}
