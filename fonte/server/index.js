import { criarApp } from "./app.js";
import { listar, pasta } from "./armazenamento.js";

const porta = Number(process.env.PORT) || 3000;
criarApp().listen(porta, "0.0.0.0", () => {
  const n = listar().length;
  console.log(`Voga - Remo Indoor rodando em http://localhost:${porta}`);
  console.log(`Treinos (um arquivo .json por treino): ${pasta()} — ${n} encontrado(s). Arquivos novos aparecem ao atualizar a página.`);
});
