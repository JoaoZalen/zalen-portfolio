/* Servidor do portfólio no Render: só entrega os arquivos estáticos da pasta. */
const path = require("path");
const express = require("express");
const compression = require("compression");

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT) || 3000;
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

// Logging de performance para requisições lentas
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log(`[SLOW] ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});

app.get("/healthz", (req, res) => {
  res.set("Cache-Control", "no-store").type("text/plain").send("ok");
});

/* Arquivos do projeto que não fazem parte do site. */
const BLOQUEADOS = [
  /(^|\/)\.git(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)package(-lock)?\.json$/,
  /^\/server\.js$/,
  /^\/ferramentas(\/|$)/,
  /^\/render\.ya?ml$/,
  /\.md$/,
  /(^|\/)importacao-youtube\.json$/,
  /(^|\/)\.env/
];
app.use((req, res, next) => {
  let caminho;
  try { caminho = decodeURIComponent(req.path); } catch (_) { return naoEncontrado(req, res); }
  caminho = caminho.replace(/\\/g, "/").toLowerCase();
  if (BLOQUEADOS.some((re) => re.test(caminho))) return naoEncontrado(req, res);
  next();
});

/* Compressão: texto com gzip/brotli; vídeo e imagem já vêm comprimidos (e precisam de Range). */
const COMPRIMIR = /^(text\/html|text\/css|text\/javascript|application\/javascript|application\/json)/i;
app.use(compression({
  level: 6, // Balanço entre velocidade e compressão
  threshold: 1024, // Só comprimir se > 1KB
  filter: (req, res) => COMPRIMIR.test(String(res.getHeader("Content-Type") || ""))
}));

/* Cache por tipo de arquivo. Os info.js e perfil.js são editados à mão,
   então sempre revalidam (ETag) para a mudança aparecer no próximo F5. */
const SETE_DIAS = 7 * 24 * 60 * 60;
const TRINTA_DIAS = 30 * 24 * 60 * 60; // Assets com fingerprinting podem ter cache mais longo
function cabecalhos(res, arquivo) {
  const rel = path.relative(RAIZ, arquivo).split(path.sep).join("/");
  const ext = path.extname(arquivo).toLowerCase();
  let cache = "public, max-age=0, must-revalidate";
  if (ext === ".html") cache = "no-cache";
  else if (rel === "perfil.js" || rel.startsWith("clientes/")) cache = /\.(js|json)$/.test(ext) ? "no-cache" : `public, max-age=${SETE_DIAS}`;
  else if (ext === ".css" || ext === ".js") cache = `public, max-age=${TRINTA_DIAS}, immutable`; // 30 dias para assets
  else if ([".mp4", ".webm", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".woff2", ".woff"].includes(ext)) cache = `public, max-age=${TRINTA_DIAS}, immutable`;
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Vary", "Accept-Encoding");
}

app.use(express.static(RAIZ, {
  index: "index.html",
  dotfiles: "ignore",
  etag: true,
  lastModified: true,
  acceptRanges: true,
  cacheControl: false,
  redirect: false,
  setHeaders: cabecalhos
}));

const PAGINA_404 = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Página não encontrada · Zalen</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #f2efe8;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; padding: 1rem; }
  h1 { font-size: clamp(4rem, 18vw, 10rem); margin: 0; color: #ff2a1f; line-height: 1; }
  p { margin: 1rem 0 2rem; opacity: .8; }
  a { color: #000; background: #f2efe8; padding: .8rem 1.4rem; text-decoration: none; font-weight: 700; }
</style></head>
<body><main><h1>404</h1><p>Esta página não existe.</p><a href="/">Voltar ao portfólio</a></main></body></html>`;

function naoEncontrado(req, res) {
  res.status(404).set("Cache-Control", "no-cache");
  if (req.accepts("html")) res.type("html").send(PAGINA_404);
  else res.type("text/plain").send("Não encontrado");
}
app.use(naoEncontrado);

app.use((err, req, res, next) => {
  console.error("[zalen]", err);
  if (res.headersSent) return next(err);
  res.status(500).type("text/plain").send("Erro interno");
});

app.listen(PORTA, () => console.log(`[zalen] servidor na porta ${PORTA}`));
