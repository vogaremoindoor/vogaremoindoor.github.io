import express from "express";
import fs from "node:fs";
import path from "node:path";
import { validarTreino } from "../shared/treino.js";
import * as armazenamento from "./armazenamento.js";
import { idValido } from "./armazenamento.js";

export function criarApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "5mb" }));

  const api = express.Router();
  api.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // o id é o nome do arquivo do treino (sem .json)
  const lerId = (req, res) => {
    const id = req.params.id;
    if (!idValido(id)) {
      res.status(400).json({ erro: "id inválido" });
      return null;
    }
    return id;
  };

  api.get("/treinos", (_req, res) => res.json(armazenamento.listar()));

  api.get("/treinos/:id", (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;
    const t = armazenamento.buscar(id);
    if (!t) return res.status(404).json({ erro: "treino não encontrado" });
    if (t.invalido) return res.status(422).json({ erro: `arquivo ${id}.json com problema: ${t.invalido}` });
    res.json(t);
  });

  api.post("/treinos", (req, res) => {
    const erro = validarTreino(req.body);
    if (erro) return res.status(400).json({ erro });
    res.status(201).json(armazenamento.criar(req.body));
  });

  api.put("/treinos/:id", (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;
    const erro = validarTreino(req.body);
    if (erro) return res.status(400).json({ erro });
    const t = armazenamento.atualizar(id, req.body);
    if (!t) return res.status(404).json({ erro: "treino não encontrado" });
    res.json(t);
  });

  api.delete("/treinos/:id", (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;
    if (!armazenamento.excluir(id)) return res.status(404).json({ erro: "treino não encontrado" });
    res.status(204).end();
  });

  api.use((_req, res) => res.status(404).json({ erro: "rota não encontrada" }));
  app.use("/api", api);

  // Front-end compilado (npm run build). Em desenvolvimento quem serve é o Vite.
  const dist = path.resolve("dist");
  if (fs.existsSync(dist)) {
    app.use(
      express.static(dist, {
        setHeaders(res, file) {
          // O service worker e o HTML nunca devem ficar presos em cache.
          if (/(sw\.js|index\.html)$/.test(file)) res.set("Cache-Control", "no-cache");
        },
      }),
    );
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido" });
    console.error(err);
    res.status(500).json({ erro: "erro interno" });
  });

  return app;
}
