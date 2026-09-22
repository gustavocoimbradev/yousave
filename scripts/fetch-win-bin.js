// Garante que os binários win32 do yt-dlp e ffmpeg estejam presentes antes
// de empacotar para Windows, mesmo rodando `npm install` em outra plataforma
// (ex.: dentro do WSL).
// (YOUTUBE_DL_PLATFORM não funciona: bug de precedência de operador na lib
// faz o valor ser ignorado. Forçar o nome do arquivo contorna o problema.)
process.env.YOUTUBE_DL_FILENAME = "yt-dlp.exe";
process.env.npm_config_platform = "win32";
process.env.npm_config_arch = "x64";

require("youtube-dl-exec/scripts/postinstall.js");
require("ffmpeg-static/install.js");
