# YouSave

App desktop (Electron) para baixar vídeos ou áudio do YouTube. Cole o link, escolha vídeo ou MP3, clique em Baixar — o arquivo vai direto para a pasta Downloads do Windows.

## Rodar em desenvolvimento

```
npm install
npm start
```

## Gerar o instalador Windows (.exe)

```
npm install
npm run build
```

Gera `dist/YouSave Setup <versão>.exe` (NSIS). O script `prebuild` baixa automaticamente os binários Windows do `yt-dlp` e do `ffmpeg` antes de empacotar, então funciona mesmo rodando `npm install`/`npm run build` dentro do WSL — não precisa instalar nada manualmente.

## Publicar no git

```
npm run publish
```

Roda `git add . && git pull && git commit -m 'publish' && git push`. Requer que o repositório já tenha `origin` configurado.
