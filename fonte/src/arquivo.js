// Salvar e escolher arquivos no computador.

/**
 * Salva `conteudo` (texto ou bytes, como um .zip) no arquivo `nome`. Tenta, nesta ordem:
 *  1. permissão de download do artefato do Claude (quando a página roda dentro dele);
 *  2. janela "Salvar como…" do navegador (Chrome/Edge no computador): o usuário escolhe a pasta;
 *  3. download comum (vai para a pasta de downloads, ou pergunta o local se o navegador estiver
 *     configurado para isso, como no Firefox e no Safari).
 * Retorna { situacao: "salvo" | "baixado" | "cancelado", nome }.
 */
const TIPOS = {
  zip: { mime: "application/zip", descricao: "Pasta de treinos (ZIP)" },
  json: { mime: "application/json", descricao: "Treinos de remo (JSON)" },
};

export async function salvarArquivo(nome, conteudo) {
  const ext = /\.zip$/i.test(nome) ? "zip" : "json";
  const { mime, descricao } = TIPOS[ext];
  // 1. artefato do Claude
  if (typeof window.claude?.use === "function") {
    let downloads = null;
    try {
      downloads = await window.claude.use("downloads");
    } catch {
      downloads = null;
    }
    if (downloads) {
      try {
        await downloads.save({ filename: nome, data: conteudo });
        return { situacao: "salvo", nome };
      } catch (e) {
        if (e?.code === "declined") return { situacao: "cancelado", nome };
        throw new Error("Não foi possível salvar o arquivo aqui.");
      }
    }
  }

  // 2. janela "Salvar como…"
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const arquivo = await window.showSaveFilePicker({
        suggestedName: nome,
        types: [{ description: descricao, accept: { [mime]: [`.${ext}`] } }],
      });
      const escrita = await arquivo.createWritable();
      await escrita.write(conteudo);
      await escrita.close();
      return { situacao: "salvo", nome: arquivo.name || nome };
    } catch (e) {
      if (e?.name === "AbortError") return { situacao: "cancelado", nome };
      // sem permissão (página dentro de quadro isolado, por exemplo): cai no download comum
    }
  }

  // 3. download comum
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { situacao: "baixado", nome };
}
