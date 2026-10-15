# Pasta dos treinos

Cada treino é um arquivo `.json` aqui dentro. Veja o formato e como publicar no README do projeto
(seções "Treinos em arquivos" e "Salvar treinos"). Resumo:

- O nome do arquivo é só um número: `treino-001.json`, `treino-002.json`... O nome do treino que aparece
  na lista fica DENTRO do arquivo, no campo `nome`.
- `etapas`: lista de `remada` (`duracao_s`, `voga` de 12 a 46), `descanso` (`duracao_s`) e
  `repeticao` (`vezes` e uma lista `etapas` dentro).
- Site estático (GitHub Pages): o `index.json` é a lista dos arquivos. Sem o nome do arquivo no `index.json`,
  o treino não aparece. O build gera esse índice sozinho; num site já compilado, rode
  `node scripts/indice-treinos.mjs <pasta-do-site>/treinos` ou edite o `index.json` à mão.
- Servidor: coloque o arquivo aqui e atualize a página (o índice não é usado).
