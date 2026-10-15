// Copia o site compilado (dist-pages/) para a pasta do repositório do GitHub Pages, sem os erros comuns:
//  - NÃO mexe na pasta treinos/ (o treinos/index.json do build só lista o exemplo e apagaria os seus treinos da lista);
//  - apaga os arquivos antigos de assets/, audio/ e icons/ (os nomes de assets mudam a cada build);
//  - não toca em README, LICENSE, CNAME, .git etc.
//
//   npm run build:pages
//   node scripts/publicar-pages.mjs ../vogaremoindoor            (copia)
//   node scripts/publicar-pages.mjs ../vogaremoindoor --simular  (só mostra o que faria)
// Depois, no repositório: git add -A && git commit -m "..." && git push
import fs from "node:fs";
import path from "node:path";

const [, , destinoArg, ...opcoes] = process.argv;
const simular = opcoes.includes("--simular");
if (!destinoArg) {
  console.error("Uso: node scripts/publicar-pages.mjs <pasta-do-repositorio> [--simular]");
  process.exit(1);
}
const origem = path.resolve("dist-pages");
const destino = path.resolve(destinoArg);
if (!fs.existsSync(path.join(origem, "index.html"))) {
  console.error("Não achei dist-pages/. Rode antes: npm run build:pages");
  process.exit(1);
}
if (!fs.existsSync(path.join(destino, ".git"))) {
  console.error(`${destino} não parece ser um repositório git (sem .git).`);
  process.exit(1);
}

const listar = (base, rel = "") => {
  const pasta = path.join(base, rel);
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const r = path.join(rel, e.name);
    return e.isDirectory() ? listar(base, r) : [r];
  });
};
const mesmo = (a, b) => fs.existsSync(b) && fs.statSync(a).size === fs.statSync(b).size && fs.readFileSync(a).equals(fs.readFileSync(b));

const novos = listar(origem).filter((f) => !f.startsWith(`treinos${path.sep}`) && f !== "treinos");
let copiados = 0;
let iguais = 0;
for (const f of novos) {
  const de = path.join(origem, f);
  const para = path.join(destino, f);
  if (mesmo(de, para)) {
    iguais++;
    continue;
  }
  console.log(`${simular ? "[simulação] " : ""}copiar   ${f}`);
  if (!simular) {
    fs.mkdirSync(path.dirname(para), { recursive: true });
    fs.copyFileSync(de, para);
  }
  copiados++;
}

const pastasGeridas = ["assets", "audio", "icons"];
const mantidos = new Set(novos);
let apagados = 0;
for (const pasta of pastasGeridas) {
  for (const f of listar(destino, pasta)) {
    if (mantidos.has(f) || path.basename(f).startsWith(".")) continue;
    console.log(`${simular ? "[simulação] " : ""}apagar   ${f}`);
    if (!simular) fs.unlinkSync(path.join(destino, f));
    apagados++;
  }
}
console.log(`\n${copiados} copiado(s), ${iguais} já igual(is), ${apagados} apagado(s). A pasta treinos/ não foi tocada.`);
if (!simular) console.log("Agora, no repositório: git add -A && git commit -m \"Atualiza o site\" && git push");
