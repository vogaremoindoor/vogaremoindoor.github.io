// Texto do LEIAME.txt que acompanha o .zip gerado por "Salvar treinos".
export function textoLeiame({ arquivos, indice }) {
  const marca = { atualiza: "   [reescreve o arquivo que já está no site]", conflito: "   [número novo: o arquivo antigo do site foi alterado por fora e NÃO é sobrescrito]" };
  const lista = arquivos.map((a) => `  - ${a.nome}  ->  "${a.nomeDoTreino}"${marca[a.situacao] ?? ""}`).join("\n");
  return `COMO PUBLICAR ESTES TREINOS NO SITE
==================================

Este .zip tem a pasta "treinos" com:

${lista}
  - index.json  (a lista de TODOS os arquivos de treino do site: os que já estavam publicados + estes)

O nome do arquivo é só um número (treino-001.json, treino-002.json...). O nome do treino que aparece na
lista fica DENTRO do arquivo, no campo "nome".

Passo a passo (pelo GitHub, sem usar a ferramenta):
  1. Descompacte este .zip.
  2. No repositório do site, abra a pasta "treinos" e escolha Add file > Upload files.
  3. Arraste os arquivos treino-NNN.json E o index.json desta pasta "treinos" (o index.json novo
     SUBSTITUI o que está lá). Confirme em "Commit changes".
  4. Espere o GitHub Pages publicar (costuma levar 1 a 2 minutos) e atualize a página do app.

ATENÇÃO
  - Sem enviar o index.json, os treinos novos NÃO aparecem: é ele que diz ao site quais arquivos existem.
  - Para tirar um treino do site, apague o arquivo dele na pasta "treinos" e retire o nome da lista do
    index.json (a lista tem hoje ${indice.length} arquivo(s)).
  - Para mudar um treino já publicado, edite o arquivo .json dele (ou salve de novo por aqui: o mesmo
    treino sempre gera o mesmo número de arquivo).
  - Depois de publicar, os treinos aparecem no app com o selo "arquivo" e a cópia salva no seu navegador some da
    lista (ela continua guardada; volta a aparecer se o arquivo do site mudar ou sair do índice).
`;
}
