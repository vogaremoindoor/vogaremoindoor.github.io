import { useEffect, useState } from "react";
import { descricaoGrafico } from "../../shared/grafico.js";
import { nomeArquivoZip, resumoDuracao } from "../../shared/treino.js";
import * as api from "../api.js";
import { salvarArquivo } from "../arquivo.js";
import { textoLeiame } from "../publicar.js";
import { Link } from "../router.jsx";
import { criarZip } from "../zip.js";
import GraficoTreino from "./GraficoTreino.jsx";
import Logo from "./Logo.jsx";
import { BotaoTema } from "../tema.jsx";
import VogaInfo from "./Info.jsx";
import Confirmacao from "./Confirmacao.jsx";
import { Baixar, Copiar, Lapis, Lixeira, Mais, Play } from "./Icones.jsx";

// "48:00 (35:00/13:00)" = total (tempo remando / tempo descansando)
const resumo = (treino) => resumoDuracao(treino.etapas);

export default function Lista() {
  const [treinos, setTreinos] = useState(null);
  const [offline, setOffline] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [mensagem, setMensagem] = useState("");

  const carregar = async () => {
    try {
      const r = await api.listar();
      setTreinos(r.treinos);
      setOffline(r.offline);
      setErro("");
    } catch (e) {
      setErro(e.message);
      setTreinos((t) => t ?? []);
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  const duplicar = async (t) => {
    setOcupado(true);
    try {
      await api.criar({ nome: `${t.nome} (cópia)`.slice(0, 80), etapas: t.etapas });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  };

  const excluir = async (t) => {
    setParaExcluir(null);
    setOcupado(true);
    try {
      await api.excluir(t.id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  };

  // Só os treinos criados neste navegador (os da pasta treinos já são arquivos do site).
  const locais = treinos?.filter((t) => !t.somenteLeitura && !t.invalido) ?? [];

  // Gera um .zip com a pasta treinos/ pronta para enviar ao site: um treino-NNN.json por treino + o index.json.
  const salvarTreinos = async () => {
    setMensagem("");
    setErro("");
    try {
      const { arquivos, indice, ignorados, jaPublicados, conflitos } = await api.prepararPublicacao();
      if (arquivos.length === 0) {
        if (jaPublicados.length > 0 && ignorados.length === 0) {
          return setMensagem("Todos os seus treinos já estão publicados na pasta treinos do site, iguais. Nada a enviar.");
        }
        return setErro("Nenhum treino do navegador pode ser salvo: " + (ignorados[0] ? `"${ignorados[0].nome}": ${ignorados[0].motivo}.` : "não há treinos para enviar."));
      }
      const conteudos = [
        ...arquivos.map((a) => ({ nome: `treinos/${a.nome}`, conteudo: a.conteudo })),
        { nome: "treinos/index.json", conteudo: `${JSON.stringify(indice, null, 2)}\n` },
        { nome: "LEIAME.txt", conteudo: textoLeiame({ arquivos, indice }) },
      ];
      const r = await salvarArquivo(nomeArquivoZip(new Date()), criarZip(conteudos));
      if (r.situacao === "cancelado") return;
      const n = arquivos.length;
      const sufixo = n === 1 ? "" : "s";
      const onde = r.situacao === "salvo" ? `salvo${sufixo} em ${r.nome}` : `baixado${sufixo} (${r.nome}, na pasta de downloads)`;
      const atualiza = arquivos.filter((a) => a.situacao === "atualiza").map((a) => a.nome);
      const partes = [
        `${n} ${n === 1 ? "treino" : "treinos"} ${onde}. Descompacte e envie os arquivos da pasta treinos, inclusive o index.json, para a pasta treinos do site (o LEIAME.txt do zip explica).`,
        atualiza.length ? `Reescrevem arquivos que já estão no site: ${atualiza.join(", ")}.` : "",
        ...conflitos.map((c) => `Atenção: o ${c.arquivo} do site foi alterado por fora, então “${c.nome}” saiu como ${c.novoArquivo}, sem sobrescrever o do site.`),
        ignorados.length ? `Ficaram de fora por erro: ${ignorados.map((i) => `"${i.nome}" (${i.motivo})`).join("; ")}.` : "",
      ];
      setMensagem(partes.filter(Boolean).join(" "));
    } catch (e) {
      setErro(e.message || "Não foi possível salvar os treinos.");
    }
  };

  return (
    <main className="pagina">
      <header className="cabecalho">
        <div className="marca">
          <Logo className="marca-logo" />
          <div className="marca-texto">
            <h1>Voga</h1>
            <p>Remo Indoor</p>
          </div>
        </div>
        <div className="cabecalho-botoes">
          <VogaInfo />
          <BotaoTema />
        </div>
      </header>
      <div className="acoes-lista">
        <Link className="btn btn-verde" para="/novo">
          <Mais /> Novo treino
        </Link>
        {/* versão estática: gera o .zip com os treinos criados aqui, para publicar na pasta treinos do site */}
        {__MODO_LOCAL__ && (
          <button type="button" className="btn btn-contorno btn-secundario" disabled={!locais.length} onClick={salvarTreinos} title="Baixa um .zip com os treinos locais (criados neste navegador), para enviar à pasta treinos do site">
            <Baixar /> Baixar treinos locais
          </button>
        )}
      </div>

      {mensagem && <p className="aviso aviso-ok" role="status">{mensagem}</p>}
      {offline && <p className="aviso">Sem conexão: mostrando os treinos salvos neste aparelho. Edições ficam indisponíveis.</p>}
      {erro && <p className="aviso aviso-erro" role="alert">{erro}</p>}
      {treinos === null && <p className="vazio">Carregando…</p>}
      {treinos?.length === 0 && !erro && (
        <p className="vazio">Nenhum treino ainda. Toque em “Novo treino”.</p>
      )}

      <ul className="cartoes">
        {treinos?.map((t) =>
          t.invalido ? (
            // arquivo da pasta treinos que não deu para usar: mostra o motivo em vez de esconder
            <li key={t.id} className="cartao cartao-invalido">
              <div className="cartao-corpo">
                <span className="cartao-play cartao-alerta" aria-hidden="true">!</span>
                <span className="cartao-texto">
                  <strong>{t.nome}</strong>
                  <small>Arquivo {t.id.replace(/^arq-/, "")}.json com problema: {t.invalido}</small>
                </span>
              </div>
            </li>
          ) : (
            <li key={t.id} className={t.somenteLeitura ? "cartao" : "cartao cartao-local"}>
              <Link className="cartao-corpo" para={`/treino/${encodeURIComponent(t.id)}`}>
                <span className="cartao-play" aria-hidden="true">
                  <Play />
                </span>
                <span className="cartao-texto">
                  <strong>{t.nome}</strong>
                  <small>
                    {resumo(t)}
                    {!t.somenteLeitura && (
                      <span className="selo-local" title="Treino salvo só neste navegador. Use Baixar treinos locais para publicá-lo no site.">
                        local
                      </span>
                    )}
                  </small>
                  <span className="so-leitor">{descricaoGrafico(t.etapas)}</span>
                </span>
              </Link>
              {/* gráfico: ao lado do nome; embaixo, na largura toda, quando o cartão é estreito (ver .cartao no CSS) */}
              <Link className="cartao-grafico" para={`/treino/${encodeURIComponent(t.id)}`} tabIndex={-1} aria-hidden="true">
                <GraficoTreino etapas={t.etapas} />
              </Link>
              <div className="cartao-acoes">
                {/* treino de arquivo: o lápis abre em "modo cópia" (ver ou alterar; ao salvar vira um treino novo) */}
                <Link
                  className="btn-icone"
                  para={`/editar/${encodeURIComponent(t.id)}`}
                  aria-label={t.somenteLeitura ? `Ver ou editar ${t.nome}` : `Editar ${t.nome}`}
                  title={t.somenteLeitura ? "Ver ou editar (ao salvar, vira um treino novo)" : undefined}
                >
                  <Lapis />
                </Link>
                <button type="button" className="btn-icone" disabled={ocupado || offline} onClick={() => duplicar(t)} aria-label={`Duplicar ${t.nome}`}>
                  <Copiar />
                </button>
                {!t.somenteLeitura && (
                  <button type="button" className="btn-icone perigo" disabled={ocupado || offline} onClick={() => setParaExcluir(t)} aria-label={`Excluir ${t.nome}`}>
                    <Lixeira />
                  </button>
                )}
              </div>
            </li>
          ),
        )}
      </ul>

      {paraExcluir && (
        <Confirmacao
          texto={`Excluir "${paraExcluir.nome}"?`}
          confirmar="Excluir"
          cancelar="Cancelar"
          onConfirmar={() => excluir(paraExcluir)}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </main>
  );
}
