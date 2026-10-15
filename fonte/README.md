# Voga · Remo Indoor

Cadastro e execução de treinos de remo: contador regressivo grande, voga em destaque (ou DESCANSO), sinal sonoro a cada troca de etapa e mensagem **FIM** no final. Treinos ficam salvos no servidor, sem login.

## Rodar

Requer **Node 20 ou mais novo**.

```bash
npm install
npm run dev        # desenvolvimento: API em :3000 e app em http://localhost:5173
```

Produção (um único processo serve o app e a API):

```bash
npm run build
npm start          # http://localhost:3000
```

Variáveis: `PORT` (padrão 3000) e `TREINOS_DIR` (padrão: pasta `treinos/` do projeto). Com Docker:

```bash
docker build -t treino-remo .
docker run -p 3000:3000 -v "$(pwd)/treinos:/app/treinos" treino-remo
```

## Treinos em arquivos (pasta `treinos/`)

Cada treino é **um arquivo `.json`** na pasta `treinos/` (um treino de exemplo já vem lá). O nome do arquivo (sem `.json`) é o id do treino. Formato, uma etapa por linha:

```json
{
  "nome": "Meu treino",
  "etapas": [
    { "tipo": "remada", "duracao_s": 240, "voga": 20 },
    { "tipo": "descanso", "duracao_s": 60 },
    {
      "tipo": "repeticao",
      "vezes": 3,
      "etapas": [
        { "tipo": "remada", "duracao_s": 90, "voga": 28 },
        { "tipo": "descanso", "duracao_s": 30 }
      ]
    }
  ]
}
```

`duracao_s` é em segundos; `voga` vai de **12 a 46** (a faixa das falas gravadas). Arquivo com erro (JSON quebrado, voga fora da faixa…) aparece na lista como um cartão vermelho com o motivo, em vez de sumir.

**Versão com servidor:** a pasta é lida a cada pedido. Coloque, edite ou apague arquivos nela à mão e **atualize a página**: vale na hora, sem reiniciar. Criar, editar e excluir pela tela também grava/reescreve/apaga os arquivos (novo treino = `nome-do-treino.json`, com `-2`, `-3`… se o nome já existir). Para usar um banco de dados no futuro, basta trocar `server/armazenamento.js` (é o único módulo que conhece o formato de armazenamento).

**Versão estática (GitHub Pages):** um site estático não consegue listar uma pasta, então o app lê `treinos/index.json` (a lista dos arquivos) e depois cada arquivo. O build faz isso sozinho: `npm run build:pages` copia `treinos/*.json` para `dist-pages/treinos/` e gera o índice. Três jeitos de adicionar um treino:
1. **Pelo projeto + GitHub Actions (recomendado):** coloque o `.json` em `treinos/` e faça push; o workflow recompila e publica. Atualize a página.
2. **No site já compilado:** coloque o `.json` em `treinos/` do site e rode `node scripts/indice-treinos.mjs <pasta-do-site>/treinos` (ou acrescente o nome do arquivo à lista de `treinos/index.json` à mão: `["a.json", "b.json"]`).
3. **Pela tela:** *Novo treino* (fica só no navegador, em `localStorage`).

Na versão estática os treinos de arquivo são **somente leitura** (aparecem com o selo *arquivo*; use **Duplicar** para ter uma cópia editável no navegador). Atualizar a página sempre busca a lista de novo na rede (o service worker só usa a cópia guardada se estiver offline).

## Uso no celular e no computador

- **Orientação:** a tela de execução (versão C: anel com o tempo, voga em destaque) segue o formato da janela. No celular, deitar o aparelho muda para paisagem (precisa da rotação automática ligada). No computador, muda conforme a proporção da janela.
- **Resumo do tempo:** a lista e a tela de início mostram **total (remando/descansando)**, por exemplo `48:00 (36:00/12:00)`; o editor mostra o mesmo na barra de baixo. Não há mais contagem de etapas nem faixa de voga.
- **Bips e voz já na tela de início:** os ícones de sino e de balão de fala também aparecem na tela de início do treino (canto superior direito). Eles começam **ligados**; desligue antes de tocar em **Iniciar** para começar já em silêncio (a escolha continua valendo na tela de execução).
- **Treino de arquivo: ver e alterar em "modo cópia" (versão estática):** os treinos da pasta `treinos/` (selo *arquivo*) têm o lápis **Ver ou editar**. Ele abre o editor com todas as etapas e um aviso de que o arquivo é somente leitura. Enquanto nada muda, **Salvar como novo treino** fica desativado e o link é **Voltar**. Na primeira alteração (tempo, voga, etapa inserida, removida ou movida) o nome vira **"Nome (cópia)"**, ou "(cópia 2)", "(cópia 3)"… se já existir; você pode digitar outro nome. Se tudo voltar ao original, o nome também volta. Ao salvar, nasce um **treino novo no navegador** (editável, sem selo) e o arquivo **nunca** é alterado; o app recusa salvar com o mesmo nome do arquivo. Para levar a cópia ao site, use **Salvar treinos**.
- **Tela de início do treino: gráfico grande e etapas:** abaixo de **Iniciar** e **Voltar** aparecem o gráfico (120 px, com a voga em 0/20/40, minutos e legenda) e a **lista das etapas** (remada ou descanso, tempo e voga, com as repetições em bloco "Repetir N vezes"). A tela rola se precisar, o Iniciar fica sempre à vista no topo e os ícones de bips, voz e tema ficam fixos.
- **Nome e logotipo:** o app se chama **Voga** (subtítulo **Remo Indoor**). O logotipo é um V formado por dois remos, um verde e um âmbar, com as cores do tema (`src/components/Logo.jsx`). Ele aparece no cabeçalho da lista (64 px no computador, 52 px no celular) e vira o ícone do app instalável e o favicon (`public/icons/`: `icon.svg` com traço reforçado para 16–32 px; `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` com a marca na zona segura do Android e `apple-touch-icon.png`). O título da aba é "Voga - Remo Indoor" e o nome na tela inicial é "Voga". No celular o cartão do treino fica assim: o nome com a linha de cima inteira, e embaixo o gráfico e os botões de ação lado a lado.
- **Gráfico do treino na lista:** cada cartão mostra um gráfico de degraus, **tempo no eixo x e voga no eixo y**, com o descanso em voga 0. A linha da **voga é verde** e a do **descanso é âmbar** (cores do tema claro e escuro); traços finos ligam uma etapa à seguinte e uma linha de base marca a voga 0. A escala é a mesma em todos os cartões (0 a 46), então a mesma voga tem a mesma altura em qualquer treino. Fica **ao lado do nome** (172 × 56 px) e, quando o cartão tem menos de 660 px de largura (celular), desce para **embaixo do nome, na largura toda**. Clicar nele abre o treino. A geometria está em `shared/grafico.js` (com testes) e o desenho em `src/components/GraficoTreino.jsx`.
- **Editar treino, botões + e − nos campos numéricos:** ao lado de cada caixa de **minutos**, **segundos**, **voga** e **repetições** há um par de botões pequenos, **+** em cima e **−** embaixo (30 × 25 px, com a altura da caixa). Um clique soma ou tira 1. **Segurar** repete: um passo na hora, pausa de 0,4 s e depois cada vez mais rápido, até uns 10 por segundo; para ao soltar (mesmo soltando fora do botão) ou ao chegar ao limite, quando o botão fica apagado. Os **segundos passam para os minutos**: 3:59 + 1 s = 4:00 e 4:00 − 1 s = 3:59; os botões de minutos somam e tiram 60 s. O tempo fica entre 1 s e 24 h, a voga entre 12 e 46 (de fora da faixa, o primeiro toque já entra nela) e as repetições entre 1 e 99. A digitação continua como antes, e **↑ ↓** dentro da caixa fazem o mesmo que + e − (o Tab continua indo de caixa em caixa, sem parar nos botões).
- **Editar treino, inserir etapa no meio:** entre duas etapas (e antes da primeira) há um ponto de inserção: no computador aparece um **"+"** ao passar o mouse; no celular ele fica sempre visível, discreto. Ao clicar, escolha **Remada**, **Descanso** ou **Repetição** (dentro de uma repetição, só Remada e Descanso). A etapa entra naquela posição, a tela rola até ela e a destaca, e no computador o cursor já vai para o primeiro campo, pronto para configurar. Escape, o X ou clicar fora cancelam. Os botões "Remada / Descanso / Repetição" no fim da lista continuam acrescentando no final.
- **Instalar:** em HTTPS, o navegador oferece "Adicionar à tela inicial" (PWA).
- **Tela acesa** (Wake Lock) e **instalação** exigem **HTTPS** (ou `localhost`). Ao publicar, coloque o app atrás de HTTPS.
- **Offline:** depois do primeiro acesso, o app abre sem internet e executa os treinos já carregados. Criar, editar e excluir precisam de conexão.
- **Som:** liberado pelo botão **Iniciar**. Bipe curto nos últimos 3 s; bipe agudo quando a próxima etapa é remada, grave quando é descanso; três notas no FIM. Os sinais são agendados no relógio de áudio, então mantêm o tempo certo mesmo com a aba em segundo plano.

## Versão estática para GitHub Pages (sem servidor)

Mesma interface e funcionamento, mas os treinos ficam **só no navegador** (localStorage) e o site é um conjunto de arquivos estáticos.

```bash
npm install
npm run build:pages    # gera a pasta dist-pages/
```

`dist-pages/` contém arquivos separados: `index.html` (leve), `assets/` (o JS do app, o React à parte e o CSS, com nomes que mudam a cada versão, para o cache do navegador), `audio/` (as falas em MP3), `icons/`, `manifest.webmanifest` e `sw.js`. **Envie a pasta inteira, mantendo a estrutura.** Funciona na raiz do domínio ou em subpasta (`https://usuario.github.io/treino-remo/`).

Publicar, duas formas:

1. **Manual:** coloque o conteúdo de `dist-pages/` na raiz de um repositório (ou na pasta `/docs`) e, em *Settings > Pages*, escolha a branch e a pasta.
2. **Automática:** o arquivo `.github/workflows/pages.yml` compila e publica a cada push na `main`. Em *Settings > Pages > Source*, escolha **GitHub Actions**.

Diferenças em relação à versão com servidor: os treinos não são compartilhados entre aparelhos nem pessoas (cada navegador tem os seus) e somem se os dados do site forem apagados. O restante (execução, contagem, sons, temas, tela acesa, instalação como app e uso offline) é igual, pois o GitHub Pages usa HTTPS.

## Salvar treinos (versão estática): publicar na pasta `treinos/`

Na versão estática **não há mais "Carregar treinos"**: os treinos entram pela pasta `treinos/` do site (veja acima). O botão **Salvar treinos** serve para o caminho inverso: levar para essa pasta os treinos que você **criou na ferramenta** (os que ficam no `localStorage` do navegador). Os treinos que já estão na pasta (selo *arquivo*) não entram no arquivo gerado.

Ao tocar em **Salvar treinos** o app gera um `treinos-AAAA-MM-DD-HH-MM.zip` com:

- `treinos/treino-NNN.json`: um arquivo por treino. **O nome do arquivo é só um número** (`treino-003.json`); o nome do treino fica dentro, no campo `"nome"`.
- `treinos/index.json`: a lista de **todos** os arquivos de treino do site (os que já estavam publicados, lidos agora do site, mais os novos). Você só envia e substitui.
- `LEIAME.txt`: o passo a passo.

Como funciona a numeração: os números continuam depois do maior que já existe no site (`treinos/index.json`), e cada treino do navegador **guarda o seu número**. Salvar de novo gera o mesmo arquivo para o mesmo treino (não duplica). Treinos com erro (por exemplo voga fora de 12–46) ficam de fora, e o aviso diz quais. Se o app não conseguir ler o `index.json` do site (sem conexão), ele **não gera nada**, para não criar um índice que esconda treinos já publicados.

Depois de publicar, a **cópia do navegador some da lista**: só o treino de arquivo (selo *arquivo*) aparece. A cópia continua guardada no navegador e só é escondida se o arquivo do site for **idêntico** a ela; se o arquivo mudar ou sair do `index.json`, a cópia volta a aparecer. Treinos já publicados e iguais não entram em um novo zip. Se você alterar uma cópia depois de publicada, o zip reescreve o **mesmo** arquivo, desde que o do site ainda seja o que o app enviou: a mensagem e o `LEIAME.txt` avisam quais arquivos serão reescritos. Se o arquivo do site foi **alterado por fora** (por exemplo, editado no GitHub), o app **não sobrescreve**: a versão do navegador sai com um número novo, e a mensagem conta o que aconteceu.

Para publicar: descompacte, abra a pasta `treinos` do repositório no GitHub, *Add file → Upload files*, arraste os `treino-NNN.json` **e o `index.json`** e confirme. Em 1 a 2 minutos o GitHub Pages publica e, ao atualizar a página, os treinos aparecem com o selo *arquivo*.

## Tela de execução

- **Paisagem:** à esquerda a caixa da etapa atual (2/3 de cima: voga, ou DESCANSO; 1/3 de baixo: a próxima etapa com voga ou descanso e o tempo); à direita o anel com o tempo; título no topo e botões centralizados na base.
- **Retrato:** a mesma caixa em cima e o anel do tempo embaixo.
- **Botões:** Pausar/Continuar, **Próxima** (pula para a próxima etapa, remada ou descanso, na hora; desativado na última etapa) e **+30 s** (soma 30 s à etapa atual, repetível; o resto do treino se desloca junto e os bipes são refeitos). Ambos funcionam também com o treino pausado. Em retrato, Pausar fica em cima e Próxima, +30 s e Sair numa segunda linha; em paisagem ficam todos numa linha.
- **Falas (voz masculina pt-BR "Faber"):** antes de uma remada o app diz **"Voga N"** (N = a voga configurada naquela etapa) e, 5 s antes de ela começar, **"5 segundos"** (só se a etapa atual dura mais de 5 s); quando a remada começa diz **"Vai!"**. Nada é falado antes de descanso. Em etapa muito curta o "5 segundos" é omitido para as vozes não se sobreporem. Se as falas não carregarem, o treino segue só com os bipes.
  - **Onde ficam:** arquivos MP3 em `public/audio/` (`voga-12.mp3` … `voga-46.mp3`, `5seg.mp3`, `vai.mp3`), copiados para `audio/` ao fazer o build. O `index.html` fica leve; as falas só são baixadas quando você abre um treino (apenas as vogas que ele usa) e o service worker as guarda para uso offline. **Ao publicar (GitHub Pages ou servidor), mantenha a pasta `audio/` ao lado do `index.html`.**
  - **Trocar a voz:** substitua os MP3 de `public/audio/` mantendo os nomes e rode o build de novo.
- **Liga/desliga dos sons (tela de execução, canto superior direito):** ícone de **sino** = bips e ícone de **balão de fala** = avisos de voz. Os dois começam **sempre ligados** a cada execução; ao desligar, o ícone fica apagado com um corte na diagonal. Vale na hora, inclusive para o que já estava agendado, e cada um age só no seu tipo de som. Sem o "Vai!" (voz desligada) o bipe da troca para remada volta ao tamanho cheio.
- **Repetições:** dentro de um bloco de repetição (2 ou mais vezes), cerca de 20% da esquerda da área da voga mostram a fração da volta (1 sobre 2, 2 sobre 2…) em uma caixa branca sólida (no tema claro, escura). Vale para remada e descanso; etapas simples usam a área inteira. A orientação segue a posição do celular ou a proporção da janela.

## Sincronia do som e do relógio (computadores lentos)

- **Relógio:** os tempos usam `performance.now()` (monotônico), então um ajuste da hora do computador não bagunça o treino. A tela só é redesenhada quando o segundo ou o anel realmente mudam, para poupar máquinas fracas.
- **Som:** ao tocar em **Iniciar**, o app espera o áudio do navegador *realmente* começar ("Preparando o som…", até 8 s) antes de iniciar a contagem de 5 s. Os bipes são agendados em janelas curtas e reconferidos 4 vezes por segundo contra o relógio do treino, o que corrige início lento, deriva do relógio de áudio e latência de saída (Bluetooth).
- **Sem som:** se o navegador não liberar o áudio, o treino segue na tela com o aviso **SEM SOM**.
- `npm test` simula um áudio que demora 5 s para iniciar, deriva de 0,5% e latência de 0,4 s.

## Estrutura

```
shared/treino.js   modelo, achatar(), duração total, validação (usado no servidor e no app)
server/            Express + treinos em arquivos (server/armazenamento.js): GET/POST /api/treinos, GET/PUT/DELETE /api/treinos/:id
treinos/           um .json por treino (lido pelo servidor; copiado para o site estático no build)
scripts/           indice-treinos.mjs (gera treinos/index.json)
src/               app React (lista, editor, execução)
public/            manifest, service worker, ícones
test/              testes (npm test)
```

Formato de um treino (`etapas` aceita blocos de repetição):

```json
{ "nome": "Exemplo", "etapas": [
  { "tipo": "remada", "duracao_s": 240, "voga": 16 },
  { "tipo": "descanso", "duracao_s": 60 },
  { "tipo": "repeticao", "vezes": 2, "etapas": [
    { "tipo": "remada", "duracao_s": 120, "voga": 22 },
    { "tipo": "descanso", "duracao_s": 30 } ] } ] }
```

## Atenção: sem login

Qualquer pessoa com o endereço vê, edita e exclui todos os treinos. Para uso pessoal ou de equipe isso basta; se o endereço for público, convém colocar o app atrás de uma senha do servidor web ou de um link secreto.
