import { useEffect, useRef, useState } from "react";
import { descricaoGrafico } from "../../shared/grafico.js";
import { compararTreinos, duracaoPorTipo, nomeArquivoZip, resumoDuracao } from "../../shared/treino.js";
import * as api from "../api.js";
import { salvarArquivo } from "../arquivo.js";
import { lerArquivoTreinos } from "../carregar.js";
import { textoLeiame } from "../publicar.js";
import { Link } from "../router.jsx";
import { criarZip } from "../zip.js";
import GraficoTreino from "./GraficoTreino.jsx";
import Logo from "./Logo.jsx";
import { BotaoTema } from "../tema.jsx";
import VogaInfo from "./Info.jsx";
import MenuLista from "./MenuLista.jsx";
import Confirmacao from "./Confirmacao.jsx";
import { Baixar, Copiar, Filtro, Lapis, Lixeira, Mais, Ordem, Play, Subir } from "./Icones.jsx";

// "48:00 (35:00/13:00)" = total (tempo remando / tempo descansando)
const resumo = (treino) => resumoDuracao(treino.etapas);

// Filtro e ordem da lista, lembrados neste navegador.
const CHAVE_LISTA = "voga:lista";
const lerPreferencias = () => {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_LISTA) || "{}");
    return {
      filtro: ["todos", "locais", "site"].includes(p.filtro) ? p.filtro : "todos",
      ordem: ["nome", "nome-desc", "duracao", "duracao-desc"].includes(p.ordem) ? p.ordem : "nome",
    };
  } catch {
    return { filtro: "todos", ordem: "nome" };
  }
};
const duracaoTreino = (t) => {
  try {
    return t.invalido ? Infinity : duracaoPorTipo(t.etapas).total;
  } catch {
    return Infinity;
  }
};
const ORDENACOES = {
  nome: (a, b) => compararTreinos(a, b),
  "nome-desc": (a, b) => compararTreinos(b, a),
  duracao: (a, b) => duracaoTreino(a) - duracaoTreino(b) || compararTreinos(a, b),
  // os inválidos (duração infinita) ficam no fim também na ordem decrescente
  "duracao-desc": (a, b) => {
    const da = duracaoTreino(a);
    const db = duracaoTreino(b);
    return (da === Infinity) - (db === Infinity) || db - da || compararTreinos(a, b);
  },
};

export default function Lista() {
  const [preferencias, setPreferencias] = useState(lerPreferencias);
  const [cargaPendente, setCargaPendente] = useState(null);
  const entradaArquivo = useRef(null);
  const mudarPreferencia = (mudanca) =>
    setPreferencias((p) => {
      const nova = { ...p, ...mudanca };
      try {
        localStorage.setItem(CHAVE_LISTA, JSON.stringify(nova));
      } catch {
        /* sem armazenamento: vale só nesta sessão */
      }
      return nova;
    });
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
      // sem mensagem de confirmação quando dá certo: só os avisos (conflitos e treinos que ficaram de fora)
      const partes = [
        ...conflitos.map((c) => `Atenção: o ${c.arquivo} do site foi alterado por fora, então “${c.nome}” saiu como ${c.novoArquivo}, sem sobrescrever o do site.`),
        ignorados.length ? `Ficaram de fora por erro: ${ignorados.map((i) => `"${i.nome}" (${i.motivo})`).join("; ")}.` : "",
      ];
      setMensagem(partes.filter(Boolean).join(" "));
    } catch (e) {
      setErro(e.message || "Não foi possível salvar os treinos.");
    }
  };

  const visiveis = treinos
    ?.filter((t) => preferencias.filtro === "todos" || (preferencias.filtro === "locais" ? !t.somenteLeitura : t.somenteLeitura))
    .sort(ORDENACOES[preferencias.ordem] || compararTreinos);

  // "Carregar treinos": grava como locais os treinos do arquivo escolhido (adicionando ou substituindo os atuais).
  const concluirCarga = async (carga, substituir) => {
    setCargaPendente(null);
    setOcupado(true);
    try {
      const { novos, repetidos } = api.importarTreinos(carga.validos, substituir);
      let iguaisAoSite = 0;
      try {
        iguaisAoSite = await api.quantosJaPublicados(novos);
      } catch {
        /* sem conexão: só não conta */
      }
      await carregar();
      const n = novos.length;
      setMensagem(
        [
          n === 0
            ? "Nenhum treino novo foi carregado."
            : `${n} ${n === 1 ? "treino carregado" : "treinos carregados"} de ${carga.arquivo}${substituir ? ", substituindo os treinos locais anteriores" : ""}.`,
          repetidos ? `${repetidos} ${repetidos === 1 ? "já existia e foi ignorado" : "já existiam e foram ignorados"}.` : "",
          iguaisAoSite
            ? `${iguaisAoSite} ${iguaisAoSite === 1 ? "é igual a um treino do site e aparece como treino do site" : "são iguais a treinos do site e aparecem como treinos do site"}.`
            : "",
          carga.invalidos.length ? `Ficaram de fora por erro: ${carga.invalidos.join("; ")}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (e) {
      setErro(e.message || "Não foi possível carregar os treinos.");
    }
    setOcupado(false);
  };

  const escolherArquivo = async (e) => {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setMensagem("");
    setErro("");
    try {
      const lido = await lerArquivoTreinos(arquivo);
      if (lido.validos.length === 0) {
        return setErro(`Nenhum treino válido em ${arquivo.name}.${lido.invalidos.length ? ` Com erro: ${lido.invalidos.join("; ")}.` : ""}`);
      }
      const carga = { ...lido, arquivo: arquivo.name, locais: api.quantidadeLocais() };
      if (carga.locais > 0) setCargaPendente(carga);
      else await concluirCarga(carga, false);
    } catch (e) {
      setErro(`Não foi possível ler ${arquivo.name}: ${e.message || e}.`);
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
        {__MODO_LOCAL__ && (
          <>
            <button
              type="button"
              className="btn btn-contorno btn-secundario"
              disabled={ocupado}
              onClick={() => entradaArquivo.current?.click()}
              title="Carrega treinos de um .zip baixado antes (ou de um arquivo .json) como treinos locais"
            >
              <Subir /> Carregar treinos
            </button>
            <input ref={entradaArquivo} type="file" accept=".zip,.json,application/zip,application/json" hidden onChange={escolherArquivo} />
          </>
        )}
        <div className="lista-ferramentas">
          <MenuLista
            icone={Filtro}
            rotulo="Filtrar"
            titulo="Mostrar"
            valor={preferencias.filtro}
            ativo={preferencias.filtro !== "todos"}
            opcoes={[
              { valor: "todos", rotulo: "Todos os treinos" },
              { valor: "locais", rotulo: "Só os locais" },
              { valor: "site", rotulo: "Só os do site" },
            ]}
            onEscolher={(filtro) => mudarPreferencia({ filtro })}
          />
          <MenuLista
            icone={Ordem}
            rotulo="Ordenar"
            titulo="Ordenar por"
            valor={preferencias.ordem}
            opcoes={[
              { valor: "nome", rotulo: "Nome (A → Z)" },
              { valor: "nome-desc", rotulo: "Nome (Z → A)" },
              { valor: "duracao", rotulo: "Duração (menor → maior)" },
              { valor: "duracao-desc", rotulo: "Duração (maior → menor)" },
            ]}
            onEscolher={(ordem) => mudarPreferencia({ ordem })}
          />
        </div>
      </div>

      {mensagem && <p className="aviso aviso-ok" role="status">{mensagem}</p>}
      {offline && <p className="aviso">Sem conexão: mostrando os treinos salvos neste aparelho. Edições ficam indisponíveis.</p>}
      {erro && <p className="aviso aviso-erro" role="alert">{erro}</p>}
      {treinos === null && <p className="vazio">Carregando…</p>}
      {treinos?.length === 0 && !erro && (
        <p className="vazio">Nenhum treino ainda. Toque em “Novo treino”.</p>
      )}
      {treinos?.length > 0 && visiveis.length === 0 && (
        <p className="vazio">
          {preferencias.filtro === "locais" ? "Nenhum treino local. Crie um em “Novo treino” ou use “Carregar treinos”." : "Nenhum treino do site."}
        </p>
      )}

      <ul className="cartoes">
        {visiveis?.map((t) =>
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
                {/* treino do site não se edita: só se duplica */}
                {!t.somenteLeitura && (
                  <Link className="btn-icone" para={`/editar/${encodeURIComponent(t.id)}`} aria-label={`Editar ${t.nome}`}>
                    <Lapis />
                  </Link>
                )}
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

      {cargaPendente && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="carga-titulo">
          <div className="modal-caixa">
            <p id="carga-titulo">
              {`Carregar ${cargaPendente.validos.length} ${cargaPendente.validos.length === 1 ? "treino" : "treinos"} de ${cargaPendente.arquivo}?`}
            </p>
            <p className="modal-detalhe">
              {`Você já tem ${cargaPendente.locais} ${cargaPendente.locais === 1 ? "treino local" : "treinos locais"}. Adicionar mantém os atuais e inclui os novos; substituir apaga os atuais e deixa só os carregados.`}
            </p>
            <div className="modal-botoes modal-botoes-3">
              <button type="button" className="btn btn-contorno" onClick={() => setCargaPendente(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-contorno btn-perigo-texto" onClick={() => concluirCarga(cargaPendente, true)}>
                Substituir
              </button>
              <button type="button" className="btn btn-verde" onClick={() => concluirCarga(cargaPendente, false)} autoFocus>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

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
