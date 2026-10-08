/* Gera as cópias leves de cada vídeo do portfólio.
   Uso (na pasta do site):  npm run videos
   Precisa do ffmpeg instalado (https://ffmpeg.org — no Windows: winget install ffmpeg).
   Para cada clientes/<cliente>/edicoes/<edicao>/video.mp4 cria, se ainda não existir:
     video-720.mp4  video-480.mp4  video-360.mp4
   Para refazer as cópias de um vídeo, apague as antigas e rode de novo. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..", "clientes");
const VERSOES = [
  { sufixo: "720", args: ["-vf", "scale=-2:720", "-crf", "24", "-maxrate", "2500k", "-bufsize", "5M", "-profile:v", "main"] },
  { sufixo: "480", args: ["-vf", "scale=-2:480", "-crf", "25", "-maxrate", "1200k", "-bufsize", "2400k", "-profile:v", "main"] },
  { sufixo: "360", args: ["-vf", "scale=-2:360,fps=24", "-crf", "27", "-maxrate", "600k", "-bufsize", "1200k", "-profile:v", "baseline"] }
];

if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) {
  console.error("ffmpeg não encontrado. Instale (no Windows: winget install ffmpeg) e abra o terminal de novo.");
  process.exit(1);
}

const videos = [];
for (const cliente of fs.existsSync(RAIZ) ? fs.readdirSync(RAIZ) : []) {
  const edicoes = path.join(RAIZ, cliente, "edicoes");
  if (!fs.existsSync(edicoes)) continue;
  for (const ed of fs.readdirSync(edicoes)) {
    const v = path.join(edicoes, ed, "video.mp4");
    if (fs.existsSync(v)) videos.push(v);
  }
}

let feitas = 0;
for (const v of videos) {
  for (const versao of VERSOES) {
    const saida = v.replace(/\.mp4$/i, `-${versao.sufixo}.mp4`);
    if (fs.existsSync(saida)) continue;
    console.log(`→ ${path.relative(process.cwd(), saida)}`);
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", v, ...versao.args,
      "-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-g", "48", "-an", "-movflags", "+faststart", saida], { stdio: "inherit" });
    if (r.status !== 0) { console.error(`  falhou: ${saida}`); try { fs.unlinkSync(saida); } catch (_) {} }
    else feitas++;
  }
}
console.log(videos.length ? `Pronto: ${feitas} cópia(s) nova(s) para ${videos.length} vídeo(s).` : "Nenhum video.mp4 encontrado em clientes/.");
