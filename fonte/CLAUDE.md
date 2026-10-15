# Voga · Remo Indoor: contexto do projeto (para continuar no Claude Code)

App web em **português do Brasil** para cadastrar e executar treinos de remo indoor. Um treino é uma sequência de
etapas (remada com **voga** = remadas por minuto + tempo, ou descanso + tempo, com blocos de repetição). A tela de
execução mostra contador regressivo, voga/DESCANSO, próxima etapa, anel de progresso, bipes e falas ("Voga 20",
"5 segundos", "Vai!"). O dono do projeto é o Tiago (`tiagoferreto`); fala português e prefere ver um desenho antes de
implementar mudanças visuais.

## Duas versões, mesmo código
- **Estática (a que ele usa): GitHub Pages.** `npm run build:pages` → `dist-pages/`. Treinos criados na tela ficam no
  `localStorage`; treinos "de arquivo" vêm da pasta `treinos/` do site.
- **Com servidor (secundária, "ignorar"):** Express em `server/`, treinos como arquivos `.json` na pasta `treinos/`
  (`server/armazenamento.js`). Pode virar banco de dados trocando só esse módulo.
- O alias `api.js` ↔ `api.local.js` é feito em `vite.config.js` (plugin `api-local`) no build `--mode pages`.

## Comandos
```
npm install
npm run dev              # app em :5173 + API em :3000 (versão com servidor)
npm test                 # node --test: regras compartilhadas, geometria do gráfico, ZIP, API do servidor (59 testes)
npm run build            # versão com servidor → dist/
npm run build:pages      # versão estática → dist-pages/ (copia treinos/ e gera treinos/index.json)
npm run treinos:indice   # regera treinos/index.json de uma pasta
npm run publicar:pages ../vogaremoindoor [--simular]   # ver "Publicar" abaixo
```

## Estrutura
- `shared/treino.js` regras comuns (achatar repetições, validação, tempos, formato dos arquivos, nome da cópia);
  `shared/grafico.js` geometria do gráfico (testada).
- `src/components/`: `Lista` (tela principal), `Editor`, `Player` (início/execução/fim), `GraficoTreino`,
  `EtapasDoTreino`, `Passos` (botões + e − com repetição), `BotoesSom`, `Logo`, `Icones`.
- `src/audio.js`: bipes e falas agendados no relógio do áudio (reagenda a cada 250 ms; ver testes em `test/`).
- `public/audio/`: 37 MP3 (voz Faber, Piper TTS): `voga-12…46`, `5seg`, `vai`. `public/sw.js`: service worker
  (versão e lista de assets preenchidas no build por `vite.config.js`).
- `treinos/`: um `.json` por treino `{ "nome", "etapas" }`; o **nome do arquivo é só um número** (`treino-001.json`).

## Regras de negócio que valem manter
- **Voga de 12 a 46** (as falas gravadas). Tempo de cada etapa de 1 s a 24 h. Descanso = voga 0 no gráfico.
- Falas: "Voga N" antes de uma remada (termina 250 ms antes do "5 segundos"); "5 segundos" só se a etapa atual dura
  mais de 5 s e a próxima é remada; "Vai!" no início da remada; nada antes de descanso. Bips e voz começam sempre
  ligados (ícones sino/balão na tela de início e na execução).
- Treino de arquivo é **somente leitura**; o lápis abre em **modo cópia**: ao alterar, o nome vira "Nome (cópia)" e
  salvar cria um treino novo no navegador. Nunca alterar o arquivo.
- **Salvar treinos** (só estática) gera um `.zip` com `treinos/treino-NNN.json` + `treinos/index.json` + `LEIAME.txt`
  para publicar no GitHub. Números novos seguem o maior do `index.json` lido do site; cada treino guarda o seu número;
  se o arquivo do site foi alterado por fora, **não sobrescreve** (usa número novo). Se não conseguir ler o índice,
  não gera nada. Cópia local idêntica ao arquivo publicado some da lista.
- Layout: cartão da lista com gráfico ao lado do nome (≥ 660 px) ou embaixo (celular: nome em cima; gráfico e
  botões lado a lado embaixo). Tela de execução é tela cheia sem rolagem; a de início rola (gráfico grande + etapas).

## Publicar no GitHub Pages
Repositório do site: **https://github.com/tiagoferreto/vogaremoindoor** (branch `main`, site na **raiz**, só o site
compilado, não o código-fonte). Os treinos dele já têm os 10 novos (`treino-101…110`) além do `treino-001`.
1. `npm run build:pages`
2. `npm run publicar:pages <pasta do repositório clonado>` (use `--simular` antes).
3. No repositório: `git add -A && git commit && git push`.
**Armadilhas:** (a) o `treinos/index.json` gerado no build só lista o exemplo; copiá-lo por cima apagaria os treinos
da lista: por isso o script não toca em `treinos/`; (b) os arquivos de `assets/` mudam de nome a cada build: o script
apaga os antigos; (c) pode aparecer `.DS_Store` em `treinos/` (macOS): é inofensivo, vale pôr no `.gitignore`.
Alternativa a estudar: guardar o código-fonte num repositório próprio e usar `.github/workflows/pages.yml`
(build + deploy automáticos), mantendo `treinos/` no repositório do código.

## O que NÃO está no repositório
Os testes de interface e de navegador desta fase foram scripts avulsos (jsdom e Chromium sem tela) rodados fora do
projeto, por isso `npm test` cobre só a lógica, o ZIP, o gráfico e a API. No Claude Code, com um navegador de verdade,
vale transformá-los em testes do repositório (Playwright) e manter o checklist: lista (ao lado/embaixo), editor
(inserir etapa, botões + e −, modo cópia), tela de início, execução (sem texto fora da área em 1000×760, 1366×768,
390×844 e 667×375), arquivos em `treinos/` e uso offline (service worker).

## Ideias em aberto (nada disso foi pedido ainda)
- Botões + e − maiores só em telas de toque; ver valores ao tocar no gráfico; gráfico maior ao tocar no cartão.
- Migrar o código-fonte para um repositório próprio com GitHub Actions (acima).
- Treinos novos pela IA seguem o formato de `treinos/LEIAME.md`; o app mede tempo e voga, não distância.
