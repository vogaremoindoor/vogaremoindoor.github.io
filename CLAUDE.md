# Voga · Remo Indoor (repositório do site)

Este repositório guarda só o **site compilado** publicado no GitHub Pages (`index.html`, `assets/`, `sw.js`,
`audio/`, `icons/`, `manifest.webmanifest`).

- O **código-fonte** fica no repositório privado **vogaremoindoor/vogaremoindoor**. Mudanças no app são feitas lá.
- Não edite nada aqui à mão: tudo é substituído a cada nova versão pelo workflow "Publicar site" do repositório dos
  fontes (commits "Publica vX.Y.Z").
- Os **treinos** não ficam aqui: estão no repositório **vogaremoindoor/treinos** e o app os lê e grava pelo Worker
  `voga-treinos` (desde a v1.14.0). A antiga pasta `treinos/` foi removida (continua no histórico do git).
