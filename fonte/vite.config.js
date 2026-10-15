import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { gravarIndice } from "./scripts/indice-treinos.mjs";

// vite build               -> versão com servidor (Express + SQLite): pasta dist/
// vite build --mode pages  -> versão estática para o GitHub Pages (treinos no navegador): pasta dist-pages/
//                             funciona na raiz ou em subpasta (usuario.github.io/repo/)
// Nas duas, os arquivos saem SEPARADOS (index.html leve + assets/ com JS e CSS + audio/ com as falas),
// para o navegador carregar em paralelo e guardar em cache cada parte.

// Troca o `api.js` (servidor) pelo `api.local.js` (localStorage) na versão estática.
const apiLocal = () => ({
  name: "api-local",
  enforce: "pre",
  resolveId(origem, importador) {
    if (importador && /(^|\/)api\.js$/.test(origem)) return path.resolve("src/api.local.js");
  },
});

// Preenche o service worker (public/sw.js) com a versão da compilação e a lista dos arquivos do app,
// que ficam guardados para o app abrir offline. Um build novo = cache novo (o antigo é apagado).
const precacheSW = () => {
  let saida;
  return {
    name: "precache-sw",
    apply: "build",
    configResolved: (c) => (saida = path.resolve(c.root, c.build.outDir)),
    closeBundle() {
      const sw = path.join(saida, "sw.js");
      const assets = path.join(saida, "assets");
      if (!fs.existsSync(sw)) return;
      const lista = fs.existsSync(assets) ? fs.readdirSync(assets).map((a) => `assets/${a}`) : [];
      const texto = fs
        .readFileSync(sw, "utf8")
        .replace('"__VERSAO__"', JSON.stringify(Date.now().toString(36)))
        .replace("/*__ASSETS__*/", lista.map((a) => JSON.stringify(a)).join(", "));
      fs.writeFileSync(sw, texto);
    },
  };
};

// Versão estática: copia a pasta treinos/ do projeto para o site (dist-pages/treinos/) e gera o treinos/index.json
// com a lista dos arquivos (um site estático não consegue listar uma pasta sozinho).
const treinosEstaticos = () => {
  let saida;
  let raiz;
  return {
    name: "treinos-estaticos",
    apply: "build",
    configResolved: (c) => {
      raiz = c.root;
      saida = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const origem = path.resolve(raiz, "treinos");
      const destino = path.join(saida, "treinos");
      fs.mkdirSync(destino, { recursive: true });
      if (fs.existsSync(origem)) {
        for (const e of fs.readdirSync(origem, { withFileTypes: true })) {
          if (e.isFile() && e.name.toLowerCase().endsWith(".json") && e.name !== "index.json" && !e.name.startsWith(".")) {
            fs.copyFileSync(path.join(origem, e.name), path.join(destino, e.name));
          }
        }
      }
      const nomes = gravarIndice(destino);
      console.log(`treinos/: ${nomes.length} arquivo(s) de treino copiados para o site`);
    },
  };
};

export default defineConfig(({ mode }) => {
  const pages = mode === "pages";
  return {
    base: pages ? "./" : "/",
    plugins: [react(), ...(pages ? [apiLocal(), treinosEstaticos()] : []), precacheSW()],
    define: { __MODO_LOCAL__: JSON.stringify(pages) },
    build: {
      outDir: pages ? "dist-pages" : "dist",
      // React num arquivo à parte: muda raramente, então o navegador o reaproveita do cache a cada atualização do app
      rollupOptions: { output: { manualChunks: { react: ["react", "react-dom"] } } },
    },
    server: { host: true, proxy: { "/api": "http://localhost:3000" } },
  };
});
