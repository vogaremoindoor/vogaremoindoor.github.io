// Gera o índice treinos/index.json: a lista dos arquivos de treino (.json) de uma pasta.
// O site estático (GitHub Pages) não consegue "listar uma pasta", então lê este índice para saber quais
// arquivos existem. O build (`npm run build:pages`) já faz isso sozinho; este script serve para quando você
// adiciona arquivos direto na pasta treinos/ de um site já compilado:
//
//   node scripts/indice-treinos.mjs                 -> atualiza treinos/index.json (pasta do projeto)
//   node scripts/indice-treinos.mjs meu-site/treinos
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Nomes dos arquivos de treino da pasta, em ordem alfabética (sem index.json nem arquivos ocultos). */
export function nomesDeTreinos(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json") && e.name !== "index.json" && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
}

export function gravarIndice(pasta) {
  const nomes = nomesDeTreinos(pasta);
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, "index.json"), `${JSON.stringify(nomes, null, 2)}\n`);
  return nomes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pasta = path.resolve(process.argv[2] || "treinos");
  const nomes = gravarIndice(pasta);
  console.log(`${path.join(pasta, "index.json")}: ${nomes.length} treino(s)`);
  for (const n of nomes) console.log(`  - ${n}`);
}
