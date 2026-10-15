import { useEffect, useState } from "react";
import * as api from "./api.js";
import Editor from "./components/Editor.jsx";
import Lista from "./components/Lista.jsx";
import Player from "./components/Player.jsx";
import { Link, navegar, useRota } from "./router.jsx";

const voltar = () => navegar("/");

function Execucao({ id }) {
  const [treino, setTreino] = useState(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    api.buscar(id).then(setTreino).catch((e) => setErro(e.message));
  }, [id]);

  if (erro) {
    return (
      <main className="pagina">
        <p className="aviso aviso-erro" role="alert">{erro}</p>
        <Link className="btn btn-contorno" para="/">Voltar</Link>
      </main>
    );
  }
  if (!treino) return <main className="pagina"><p className="vazio">Carregando…</p></main>;
  return <Player key={treino.id} treino={treino} onSair={voltar} />;
}

export default function App() {
  const [parte, id] = useRota();
  if (parte === "novo") return <Editor />;
  if (parte === "editar" && id) return <Editor key={id} id={id} />;
  if (parte === "treino" && id) return <Execucao key={id} id={id} />;
  return <Lista />;
}
