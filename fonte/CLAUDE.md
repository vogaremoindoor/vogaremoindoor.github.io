# Voga · Remo Indoor: contexto do projeto (para continuar no Claude Code)

App web em **português do Brasil** para cadastrar e executar treinos de remo indoor. Um treino é uma sequência de
etapas (remada com **voga** = remadas por minuto + tempo, ou descanso + tempo, com blocos de repetição). A tela de
execução mostra contador regressivo, voga/DESCANSO, próxima etapa, anel de progresso, bipes e falas ("Voga 20",
"5 segundos", "Vai!"). O dono do projeto é o Tiago (`tiagoferreto`); fala português e prefere ver um desenho antes de
implementar mudanças visuais.

## Onde fica: pasta `fonte/` do repositório do site
O código-fonte fica em `fonte/` do repositório **vogaremoindoor**; a raiz do repositório é o site publicado
(GitHub Pages, branch `main`). **Nunca edite `assets/`, `index.html` ou `sw.js` da raiz à mão**: altere `fonte/`,
gere o build e publique (ver "Publicar"). Entre 8 e 15/10/2026 várias mudanças foram feitas direto no JS
minificado; todas foram trazidas de volta para `fonte/` (um commit "fonte: …" para cada uma) e o build deste
código é equivalente ao que estava publicado.

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
npm run publicar:pages .. [--simular]   # copia dist-pages/ para a raiz do repositório (ver "Publicar")
```

## Estrutura
- `shared/treino.js` regras comuns (achatar repetições, validação, tempos, formato dos arquivos, nome da cópia);
  `shared/grafico.js` geometria do gráfico (testada).
- `src/components/`: `Lista` (tela principal), `Editor` (com o campo de tags), `Player` (início/execução/fim),
  `GraficoTreino`, `EtapasDoTreino`, `Passos` (botões + e −, ±30 s e `CampoNumero`), `MenuLista` (filtro e ordem),
  `Info` (ⓘ, com a versão do app, atualizada à mão), `Config` (engrenagem), `BotoesSom`, `Logo`, `Icones`.
- `src/config.js`: configurações (contagem regressiva, paleta, voz) em `voga:config`; sem React, quem reage a uma
  mudança se inscreve com `aoSalvarConfig` (`tema.jsx` aplica a paleta, `audio.js` troca a voz).
- `src/preferenciasLista.js`: filtro/tag/ordem da lista (`voga:lista`); criar ou salvar um treino muda a ordem
  para "alterados recentemente". `src/carregar.js`: lê o .zip/.json do botão "Carregar treinos".
- Chaves do navegador com o prefixo `voga:` (o `index.html` migra as antigas `treino-remo:*`).
- `src/audio.js`: bipes e falas agendados no relógio do áudio (reagenda a cada 250 ms; ver testes em `test/`).
- `public/audio/<Voz>/` (Faber, Nassif, Aranha): 39 MP3 cada, com os mesmos nomes: `voga-12…46`, `5seg`, `vai`,
  `respira`, `prepara-vai`. As vozes e o tempo do "Prepara… Vai!" de cada uma estão em `VOZES` (`config.js`).
  `public/sw.js`: service worker (versão e lista de assets preenchidas no build por `vite.config.js`); guarda
  as falas da voz Faber para uso offline. Ao trocar um MP3, aumente `CACHE_FALAS` (`voga-falas-vN`).
- `treinos/`: um `.json` por treino `{ "nome", "etapas" }`; o **nome do arquivo é só um número** (`treino-001.json`).

## Regras de negócio que valem manter
- **Voga de 12 a 46** (as falas gravadas). Tempo de cada etapa de 1 s a 24 h. Descanso = voga 0 no gráfico.
- Falas: "Voga N" antes de uma remada (termina 250 ms antes do "5 segundos"); "5 segundos" só se a etapa atual dura
  mais de 5 s e a próxima é remada; "Prepara… Vai!" no lugar do último bipe antes da remada (ou só "Vai!" na
  largada, se não couber); "Respira" no início de cada descanso. Bips e voz começam sempre ligados.
- Treino do site (pasta `treinos/`) é **somente leitura** e não tem botão de editar: só Duplicar (a cópia é um
  treino "local", com fundo destacado). `#/editar/arq-…` volta para a lista. Nunca alterar o arquivo.
- Tags: até 20 por treino, até 30 caracteres cada, sem repetir (maiúsculas = minúsculas); campo `"tags"` do arquivo.
- **Baixar treinos locais** (só estática) gera um `.zip` com `treinos/treino-NNN.json` + `treinos/index.json` + `LEIAME.txt`
  para publicar no GitHub. Números novos seguem o maior do `index.json` lido do site; cada treino guarda o seu número;
  se o arquivo do site foi alterado por fora, **não sobrescreve** (usa número novo). Se não conseguir ler o índice,
  não gera nada. Cópia local idêntica ao arquivo publicado some da lista.
- Layout: cartão da lista com gráfico ao lado do nome (≥ 660 px) ou embaixo (celular: nome em cima; gráfico e
  botões lado a lado embaixo). Tela de execução é tela cheia sem rolagem; a de início rola (gráfico grande + etapas).

## Publicar no GitHub Pages
Repositório: **https://github.com/vogaremoindoor/vogaremoindoor** (branch `main`, site na **raiz**, código em `fonte/`).
Os treinos do site ficam em `treinos/` da raiz; `fonte/treinos/` tem uma cópia (para o build local mostrar os mesmos).
1. Em `fonte/`: `npm ci` (a primeira vez), `npm test` e `npm run build:pages`
2. `npm run publicar:pages .. --simular` e depois sem `--simular` (o normal é mudar só `assets/index-*`, `index.html`
   e `sw.js`; áudio, ícones e treinos já iguais não são copiados).
3. Na raiz: commit e push (de preferência num branch com PR).
**Armadilhas:** (a) o `treinos/index.json` gerado no build só lista o exemplo; copiá-lo por cima apagaria os treinos
da lista: por isso o script não toca em `treinos/`; (b) os arquivos de `assets/` mudam de nome a cada build: o script
apaga os antigos; (c) pode aparecer `.DS_Store` em `treinos/` (macOS): é inofensivo, vale pôr no `.gitignore`.
Alternativa a estudar: publicar com GitHub Actions (`fonte/.github/workflows/pages.yml` está **inativo**: o GitHub só
lê workflows da raiz; ele precisaria de ajustes para a pasta `fonte/` e para os treinos da raiz).
**Diferença conhecida em relação ao build publicado até 15/10:** o `sw.js` daqui ainda deixa passar direto as URLs
`api/` (só existem na versão com servidor; no site não muda nada).

## O que NÃO está no repositório
Os testes de interface e de navegador desta fase foram scripts avulsos (jsdom e Chromium sem tela) rodados fora do
projeto, por isso `npm test` cobre só a lógica, o ZIP, o gráfico e a API. No Claude Code, com um navegador de verdade,
vale transformá-los em testes do repositório (Playwright) e manter o checklist: lista (ao lado/embaixo), editor
(inserir etapa, botões + e −, modo cópia), tela de início, execução (sem texto fora da área em 1000×760, 1366×768,
390×844 e 667×375), arquivos em `treinos/` e uso offline (service worker).

## Ideias em aberto (nada disso foi pedido ainda)
- Botões + e − maiores só em telas de toque; ver valores ao tocar no gráfico; gráfico maior ao tocar no cartão.
- Publicar com GitHub Actions (acima).
- Treinos novos pela IA seguem o formato de `treinos/LEIAME.md`; o app mede tempo e voga, não distância.
