import { Fragment, useEffect, useRef, useState } from "react";
import { MAX_DURACAO_S, nomeDaCopia, normalizarEtapas, resumoDuracao, validarTreino, VOGA_MAX, VOGA_MIN } from "../../shared/treino.js";
import * as api from "../api.js";
import { navegar, Link } from "../router.jsx";
import { BotaoTema } from "../tema.jsx";
import { Baixo, Cima, Fechar, Mais, Voltar } from "./Icones.jsx";
import Passos, { teclasDePasso } from "./Passos.jsx";

let contador = 0;
const chave = () => ++contador;
let ultimaInserida = null; // chave da etapa recém-inserida: a tela rola até ela e destaca (ver LinhaEtapa)

const novaEtapa = (tipo) => {
  if (tipo === "remada") return { chave: chave(), tipo, duracao_s: 240, voga: 20 };
  if (tipo === "descanso") return { chave: chave(), tipo, duracao_s: 60 };
  return {
    chave: chave(),
    tipo: "repeticao",
    vezes: 2,
    etapas: [
      { chave: chave(), tipo: "remada", duracao_s: 120, voga: 22 },
      { chave: chave(), tipo: "descanso", duracao_s: 30 },
    ],
  };
};

// As chaves só existem na tela (para o React); saem antes de salvar.
const comChaves = (lista) =>
  lista.map((e) => ({ ...e, chave: chave(), ...(e.etapas && { etapas: comChaves(e.etapas) }) }));
// forma "canônica" das etapas, para comparar se algo mudou (ignora a ordem das propriedades)
const canonico = (etapas) => JSON.stringify(normalizarEtapas(etapas));
const limpar = (lista) =>
  lista.map(({ chave: _c, etapas, ...resto }) => (etapas ? { ...resto, etapas: limpar(etapas) } : resto));

/** Caixa numérica com os botões + e − ao lado (e ↑ ↓ no teclado). `passo(delta)` aplica o ajuste. */
function CampoNumero({ children, rotuloMais, rotuloMenos, onMais, onMenos, podeMais, podeMenos }) {
  return (
    <span className="campo-numero">
      {children(teclasDePasso(onMais, onMenos, podeMais, podeMenos))}
      <Passos rotuloMais={rotuloMais} rotuloMenos={rotuloMenos} onMais={onMais} onMenos={onMenos} podeMais={podeMais} podeMenos={podeMenos} />
    </span>
  );
}

function CampoTempo({ valor, onChange, rotulo }) {
  const min = Math.floor(valor / 60);
  const seg = valor % 60;
  const num = (v, max) => Math.min(max, Math.max(0, parseInt(v, 10) || 0));
  // Os botões mexem no tempo TOTAL: 59 s + 1 vira 1:00 e 1:00 − 1 vira 0:59. O tempo fica entre 1 s e 24 h.
  const somar = (delta) => onChange(Math.min(MAX_DURACAO_S, Math.max(1, valor + delta)));
  const pode = (delta) => valor + delta >= 1 && valor + delta <= MAX_DURACAO_S;
  return (
    <fieldset className="campo-tempo">
      <legend>{rotulo}</legend>
      <CampoNumero rotuloMais="Aumentar 1 minuto" rotuloMenos="Diminuir 1 minuto" onMais={() => somar(60)} onMenos={() => somar(-60)} podeMais={pode(60)} podeMenos={pode(-60)}>
        {(teclas) => <input type="number" inputMode="numeric" min="0" max="999" value={min} aria-label={`${rotulo}: minutos`} onChange={(e) => onChange(num(e.target.value, 999) * 60 + seg)} onKeyDown={teclas} onFocus={(e) => e.target.select()} />}
      </CampoNumero>
      <span aria-hidden="true">:</span>
      <CampoNumero rotuloMais="Aumentar 1 segundo" rotuloMenos="Diminuir 1 segundo" onMais={() => somar(1)} onMenos={() => somar(-1)} podeMais={pode(1)} podeMenos={pode(-1)}>
        {(teclas) => <input type="number" inputMode="numeric" min="0" max="59" value={String(seg).padStart(2, "0")} aria-label={`${rotulo}: segundos`} onChange={(e) => onChange(min * 60 + num(e.target.value, 59))} onKeyDown={teclas} onFocus={(e) => e.target.select()} />}
      </CampoNumero>
    </fieldset>
  );
}

function LinhaEtapa({ etapa, indice, total, onChange, onRemover, onMover, aninhada }) {
  const ref = useRef(null);
  const vogaInvalida = etapa.tipo === "remada" && (etapa.voga < VOGA_MIN || etapa.voga > VOGA_MAX);
  // +/−: dentro da faixa 12–46 (de fora da faixa, o primeiro toque já entra nela)
  const mudarVoga = (delta) => onChange({ ...etapa, voga: Math.min(VOGA_MAX, Math.max(VOGA_MIN, etapa.voga + delta)) });
  const mudarVezes = (delta) => onChange({ ...etapa, vezes: Math.min(99, Math.max(1, etapa.vezes + delta)) });

  // Etapa recém-inserida no meio da lista: rola até ela, destaca por um instante e (no computador) já
  // coloca o cursor no primeiro campo, pronto para configurar. No celular não abre o teclado sozinho.
  useEffect(() => {
    if (etapa.chave !== ultimaInserida) return;
    ultimaInserida = null;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
    el.classList.add("etapa-nova");
    const t = setTimeout(() => el.classList.remove("etapa-nova"), 1800);
    if (!window.matchMedia?.("(pointer: coarse)").matches) el.querySelector("input")?.focus({ preventScroll: true });
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li ref={ref} className={`etapa etapa-${etapa.tipo}`}>
      <div className="etapa-cabeca">
        <span className="etapa-tipo">
          {etapa.tipo === "remada" ? "Remada" : etapa.tipo === "descanso" ? "Descanso" : "Repetição"}
        </span>
        <div className="etapa-controles">
          <button type="button" className="btn-icone" disabled={indice === 0} onClick={() => onMover(-1)} aria-label="Mover para cima"><Cima /></button>
          <button type="button" className="btn-icone" disabled={indice === total - 1} onClick={() => onMover(1)} aria-label="Mover para baixo"><Baixo /></button>
          <button type="button" className="btn-icone perigo" onClick={onRemover} aria-label="Remover etapa"><Fechar /></button>
        </div>
      </div>

      {etapa.tipo !== "repeticao" && (
        <div className="etapa-campos">
          <CampoTempo rotulo="Tempo" valor={etapa.duracao_s} onChange={(v) => onChange({ ...etapa, duracao_s: v })} />
          {etapa.tipo === "remada" && (
            <label className="campo-voga">
              <span>Voga</span>
              <CampoNumero rotuloMais="Aumentar a voga em 1" rotuloMenos="Diminuir a voga em 1" onMais={() => mudarVoga(1)} onMenos={() => mudarVoga(-1)} podeMais={etapa.voga < VOGA_MAX} podeMenos={etapa.voga > VOGA_MIN}>
                {(teclas) => <input type="number" inputMode="numeric" min={VOGA_MIN} max={VOGA_MAX} value={etapa.voga} aria-invalid={vogaInvalida} title={`Voga de ${VOGA_MIN} a ${VOGA_MAX}`} onChange={(e) => onChange({ ...etapa, voga: Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)) })} onKeyDown={teclas} onFocus={(e) => e.target.select()} />}
              </CampoNumero>
              {vogaInvalida && <span className="dica-erro">{VOGA_MIN} a {VOGA_MAX}</span>}
            </label>
          )}
        </div>
      )}

      {etapa.tipo === "repeticao" && (
        <>
          <label className="campo-voga">
            <span>Repetir</span>
            <CampoNumero rotuloMais="Aumentar as repetições em 1" rotuloMenos="Diminuir as repetições em 1" onMais={() => mudarVezes(1)} onMenos={() => mudarVezes(-1)} podeMais={etapa.vezes < 99} podeMenos={etapa.vezes > 1}>
              {(teclas) => <input type="number" inputMode="numeric" min="1" max="99" value={etapa.vezes} onChange={(e) => onChange({ ...etapa, vezes: Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)) })} onKeyDown={teclas} onFocus={(e) => e.target.select()} />}
            </CampoNumero>
            <span>vezes</span>
          </label>
          <ListaEtapas etapas={etapa.etapas} onChange={(etapas) => onChange({ ...etapa, etapas })} aninhada />
        </>
      )}
    </li>
  );
}

/**
 * Ponto de inserção entre duas etapas (e antes da primeira): aparece como um "+" ao passar o mouse
 * (sempre visível, discreto, em telas de toque). Ao clicar, oferece Remada, Descanso ou Repetição.
 */
function PontoDeInsercao({ indice, aninhada, onInserir }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (!ref.current?.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const onde = indice === 0 ? "antes da primeira etapa" : `depois da etapa ${indice}`;
  const escolher = (tipo) => {
    setAberto(false);
    onInserir(tipo);
  };

  return (
    <li ref={ref} className={`inserir${aberto ? " aberto" : ""}`}>
      {aberto ? (
        <div className="inserir-menu" role="group" aria-label={`Inserir etapa ${onde}`}>
          <span className="inserir-titulo">Inserir:</span>
          <button type="button" className="btn btn-contorno btn-remada" autoFocus onClick={() => escolher("remada")}>Remada</button>
          <button type="button" className="btn btn-contorno btn-descanso" onClick={() => escolher("descanso")}>Descanso</button>
          {!aninhada && <button type="button" className="btn btn-contorno btn-repeticao" onClick={() => escolher("repeticao")}>Repetição</button>}
          <button type="button" className="btn-icone" onClick={() => setAberto(false)} aria-label="Cancelar"><Fechar /></button>
        </div>
      ) : (
        <button type="button" className="inserir-botao" onClick={() => setAberto(true)} aria-expanded="false" aria-label={`Inserir etapa ${onde}`} title="Inserir etapa aqui">
          <Mais />
        </button>
      )}
    </li>
  );
}

function ListaEtapas({ etapas, onChange, aninhada = false }) {
  const mudar = (i, nova) => onChange(etapas.map((e, j) => (j === i ? nova : e)));
  const remover = (i) => onChange(etapas.filter((_, j) => j !== i));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= etapas.length) return;
    const copia = [...etapas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  };
  const adicionar = (tipo) => onChange([...etapas, novaEtapa(tipo)]);
  const inserir = (i, tipo) => {
    const nova = novaEtapa(tipo);
    ultimaInserida = nova.chave;
    onChange([...etapas.slice(0, i), nova, ...etapas.slice(i)]);
  };

  return (
    <div className={aninhada ? "etapas etapas-aninhadas" : "etapas"}>
      <ul>
        {etapas.map((e, i) => (
          <Fragment key={e.chave}>
            <PontoDeInsercao indice={i} aninhada={aninhada} onInserir={(tipo) => inserir(i, tipo)} />
            <LinhaEtapa etapa={e} indice={i} total={etapas.length} aninhada={aninhada} onChange={(n) => mudar(i, n)} onRemover={() => remover(i)} onMover={(d) => mover(i, d)} />
          </Fragment>
        ))}
      </ul>
      <div className="adicionar">
        <button type="button" className="btn btn-contorno" onClick={() => adicionar("remada")}><Mais /> Remada</button>
        <button type="button" className="btn btn-contorno" onClick={() => adicionar("descanso")}><Mais /> Descanso</button>
        {!aninhada && (
          <button type="button" className="btn btn-contorno" onClick={() => adicionar("repeticao")}><Mais /> Repetição</button>
        )}
      </div>
    </div>
  );
}

export default function Editor({ id }) {
  const [nome, setNome] = useState("");
  const [etapas, setEtapas] = useState(() => (id ? [] : comChaves([{ tipo: "remada", duracao_s: 240, voga: 20 }])));
  const [carregando, setCarregando] = useState(Boolean(id));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Treino de arquivo (pasta treinos do site): abre em "modo cópia". Dá para ver e mexer, mas nada altera o
  // arquivo: ao salvar, vira um treino NOVO no navegador. `original` guarda como o treino estava.
  const [original, setOriginal] = useState(null);
  const [nomesExistentes, setNomesExistentes] = useState([]);
  const nomeAutomatico = useRef(null); // nome "(cópia)" que o app colocou sozinho (se o usuário digitou outro, não mexemos)

  useEffect(() => {
    if (!id) return;
    api
      .buscar(id)
      .then((t) => {
        setNome(t.nome);
        setEtapas(comChaves(t.etapas));
        if (t.somenteLeitura) {
          setOriginal({ nome: t.nome, canonico: canonico(t.etapas), arquivo: `${String(id).replace(/^arq-/, "")}.json` });
          api.listar().then((l) => setNomesExistentes(l.treinos.map((x) => x.nome))).catch(() => {});
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id]);

  const modoCopia = original !== null;
  const etapasMudaram = modoCopia && canonico(limpar(etapas)) !== original.canonico;
  const alterado = modoCopia && (etapasMudaram || nome.trim() !== original.nome);

  // 1ª alteração das etapas: o nome vira "Nome (cópia)" (ou "(cópia 2)"...). Se tudo voltar ao original, o nome também volta.
  useEffect(() => {
    if (!modoCopia) return;
    if (etapasMudaram && nome === original.nome) {
      const novo = nomeDaCopia(original.nome, nomesExistentes);
      nomeAutomatico.current = novo;
      setNome(novo);
    } else if (!etapasMudaram && nomeAutomatico.current !== null && nome === nomeAutomatico.current) {
      nomeAutomatico.current = null;
      setNome(original.nome);
    }
  }, [etapas]); // eslint-disable-line react-hooks/exhaustive-deps

  const treino = { nome, etapas: limpar(etapas) };
  const problema = validarTreino(treino);
  // O total aparece mesmo sem nome; só some se alguma etapa estiver inválida.
  const total = validarTreino({ nome: "x", etapas: treino.etapas }) ? null : resumoDuracao(treino.etapas);

  const salvar = async () => {
    if (modoCopia && !alterado) return;
    if (modoCopia && nome.trim() === original.nome) {
      return setErro("Este treino vem de um arquivo e não pode ser sobrescrito. Dê outro nome à cópia.");
    }
    if (problema) return setErro(problema);
    setSalvando(true);
    setErro("");
    try {
      if (id && !modoCopia) await api.atualizar(id, treino);
      else await api.criar(treino); // novo treino, ou cópia de um treino de arquivo
      navegar("/");
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  };

  if (carregando) return <main className="pagina"><p className="vazio">Carregando…</p></main>;

  return (
    <main className="pagina">
      <header className="cabecalho">
        <Link className="btn-icone" para="/" aria-label="Voltar"><Voltar /></Link>
        <h1>{modoCopia ? "Treino do arquivo" : id ? "Editar treino" : "Novo treino"}</h1>
        <BotaoTema />
      </header>

      {modoCopia && (
        <p className="aviso aviso-copia" role="note">
          {alterado ? (
            <>Você alterou um treino do arquivo <code>{original.arquivo}</code>. Ao salvar, ele vira um <b>treino novo</b> no seu navegador; o arquivo original não muda.</>
          ) : (
            <>Treino do arquivo <code>{original.arquivo}</code>, somente leitura. Se você alterar algo, ao salvar ele vira um treino novo no seu navegador. O arquivo não muda.</>
          )}
        </p>
      )}

      <label className="campo-nome">
        <span>Nome</span>
        <input type="text" value={nome} maxLength={80} placeholder="Ex.: Progressão de voga" onChange={(e) => setNome(e.target.value)} />
      </label>

      <ListaEtapas etapas={etapas} onChange={setEtapas} />

      <div className="barra-salvar">
        <div className="barra-total">
          {total === null ? "Revise as etapas" : <>Duração total <b>{total}</b> <small className="legenda-total">(remando/descansando)</small></>}
        </div>
        {erro && <p className="aviso aviso-erro" role="alert">{erro}</p>}
        <div className="barra-botoes">
          <Link className="btn btn-contorno" para="/">{modoCopia && !alterado ? "Voltar" : "Cancelar"}</Link>
          <button type="button" className="btn btn-verde" disabled={salvando || (modoCopia && !alterado)} onClick={salvar}>
            {salvando ? "Salvando…" : modoCopia ? "Salvar como novo treino" : "Salvar"}
          </button>
        </div>
      </div>
    </main>
  );
}
