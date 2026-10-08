/* =========================================================
   ZALEN · Portfólio
   O site lê os arquivos info.js de cada pasta:
     perfil.js
     clientes/lista.js
     clientes/<cliente>/info.js
     clientes/<cliente>/edicoes/<edicao>/info.js
   Você não precisa mexer neste arquivo para adicionar conteúdo.
   ========================================================= */

const FPS = 30;
const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const temHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const estado = { perfil: {}, ids: [], clientes: [], edicoes: [], filtro: "todos", aberta: -1 };
window.estado = estado;

/* ---------- Funções chamadas pelos arquivos info.js ---------- */
// Os info.js carregam em paralelo; cada um descobre a quem pertence
// pelo próprio endereço (document.currentScript), não pela ordem.
const contextoDoScript = new Map();
const contextoAtual = () => contextoDoScript.get(document.currentScript && document.currentScript.src);
window.perfil = (d) => { estado.perfil = d || {}; };
window.listaClientes = (ids) => { estado.ids = Array.isArray(ids) ? ids : []; };
window.cliente = (d = {}) => {
  const ctx = contextoAtual();
  if (!ctx) return;
  const { edicoes, ...resto } = d;
  Object.assign(ctx, resto);
  ctx.listaEdicoes = Array.isArray(edicoes) ? edicoes : [];
};
window.edicao = (d = {}) => { const ctx = contextoAtual(); if (ctx) Object.assign(ctx, d); };

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t = "") => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iniciais = (nome = "?") => nome.trim().slice(0, 2).toUpperCase();
const pad = (n, z = 2) => String(n).padStart(z, "0");
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function timecode(seg) {
  const s = Math.max(0, seg || 0);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60), Math.floor((s % 1) * FPS)].map((n) => pad(n)).join(":");
}
const duracaoCurta = (seg) => `${Math.floor(seg / 60)}:${pad(Math.round(seg % 60))}`;

/* ---------- Etapas da inicialização ----------
   Cada etapa roda isolada: se falhar ou demorar, registra no console
   e o resto do site segue. */
const log = (...a) => console.warn("[zalen]", ...a);
function etapaSync(nome, fn) {
  try { return fn(); } catch (erro) { log(`etapa "${nome}" falhou:`, erro); }
}
function etapa(nome, fn, limiteMs) {
  let timer;
  const tempo = new Promise((ok) => { timer = setTimeout(() => { log(`etapa "${nome}" passou de ${limiteMs} ms; seguindo sem esperar.`); ok(); }, limiteMs); });
  const trabalho = Promise.resolve().then(fn).catch((erro) => { log(`etapa "${nome}" falhou:`, erro); });
  return Promise.race([trabalho, tempo]).finally(() => clearTimeout(timer));
}

/* tenta de novo uma vez: numa internet instável um download pode ser abortado
   ou ficar parado; depois de 4 s sem resposta conta como falha. */
function carregarScript(src, ctx, tentativa = 1) {
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    let fim = false;
    const parado = setTimeout(() => erro(), 4000);
    function erro() {
      if (fim) return;
      fim = true;
      clearTimeout(parado);
      s.remove();
      if (tentativa < 2) setTimeout(() => carregarScript(src, ctx, tentativa + 1).then(ok, falha), 400);
      else falha(src);
    }
    s.src = src;
    if (ctx) contextoDoScript.set(s.src, ctx);
    s.onload = () => { if (fim) return; fim = true; clearTimeout(parado); ok(); };
    s.onerror = erro;
    document.head.appendChild(s);
  });
}

/* ---------- YouTube ----------
   Uma só carga da API para o site todo. Se ela for bloqueada (adblock,
   Brave, rede da empresa) ou não responder, o site usa o que tem local. */
const youtube = { api: null, bloqueado: !/^https?:$/.test(location.protocol) };
window.zalenYoutube = youtube;
function carregarYoutubeAPI() {
  if (window.YT && YT.Player) return Promise.resolve();
  if (youtube.bloqueado) return Promise.reject(new Error("YouTube indisponível"));
  if (youtube.api) return youtube.api;
  youtube.api = new Promise((ok, falha) => {
    const desistir = (motivo) => {
      youtube.bloqueado = true;
      document.documentElement.classList.add("no-youtube");
      window.dispatchEvent(new CustomEvent("zalen:youtube-bloqueado"));
      falha(new Error(motivo));
    };
    const limite = setTimeout(() => desistir("API do YouTube não respondeu"), 8000);
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(limite);
      try { if (anterior) anterior(); } catch (erro) { log("onYouTubeIframeAPIReady:", erro); }
      ok();
    };
    if (!$('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => { clearTimeout(limite); desistir("API do YouTube bloqueada"); };
      document.head.appendChild(s);
    }
  });
  youtube.api.catch((erro) => log(erro.message + "; usando os arquivos locais."));
  return youtube.api;
}
window.carregarYoutubeAPI = carregarYoutubeAPI;

/* capa do YouTube que não carrega: tenta a preview.jpg local, depois some */
function capaHTML(ed, classe = "", depois = "this.style.visibility='hidden'") {
  const reserva = ed.youtubeId ? ed.pasta + (ed.arquivoCapa || "preview.jpg") : "";
  const erro = reserva
    ? `if(!this.dataset.reserva){this.dataset.reserva=1;this.src=this.dataset.local;}else{${depois}}`
    : depois;
  return `<img${classe ? ` class="${classe}"` : ""} src="${esc(ed.capa)}"${reserva ? ` data-local="${esc(reserva)}"` : ""} alt="" loading="lazy" onerror="${erro}">`;
}
window.capaHTML = capaHTML;

const errosLeitura = [];
window.addEventListener("error", (e) => {
  if (e.filename && /info\.js|lista\.js|perfil\.js/.test(e.filename)) {
    const caminho = decodeURIComponent(e.filename).split("/").slice(-4).join("/");
    errosLeitura.push(`Erro de digitação em <code>${esc(caminho)}</code>, linha ${e.lineno}. Confira aspas, vírgulas e chaves.`);
  }
});

function mostrarErro(msg) {
  const el = $("#error");
  if (!el) return;
  el.innerHTML = msg;
  el.hidden = false;
}

function avatarHTML(c) {
  const foto = c.foto || c.arquivoFoto;
  return `<span class="avatar">${foto ? `<img src="${esc(c.pasta + foto)}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(iniciais(c.nome))}'))">` : esc(iniciais(c.nome))}</span>`;
}

/* ---------- Leitura das pastas ---------- */
/* Três rodadas em paralelo (perfil + lista → coleções → edições) em vez de
   ~50 downloads em fila: numa internet comum isso cai de ~9 s para ~1 s.
   A ordem do site continua a das listas, não a de chegada dos arquivos. */
async function carregarTudo() {
  const [, listaOk] = await Promise.all([
    carregarScript("perfil.js").catch(() => { /* opcional */ }),
    carregarScript("clientes/lista.js").then(() => true, () => false)
  ]);
  if (!listaOk) {
    mostrarErro("Não encontrei <code>clientes/lista.js</code>. Ele precisa existir e listar as pastas dos clientes.");
    return;
  }

  const clientes = estado.ids.map((id) => ({ id, nome: id, pasta: `clientes/${id}/`, edicoes: [] }));
  const clientesOk = await Promise.all(clientes.map((c) => carregarScript(c.pasta + "info.js", c).then(() => true, (src) => {
    errosLeitura.push(`Não encontrei <code>${esc(src)}</code>. Crie o arquivo ou remova "${esc(c.id)}" de <code>clientes/lista.js</code>.`);
    return false;
  })));
  const validos = clientes.filter((_, k) => clientesOk[k]);

  const edicoes = validos.flatMap((c) => (c.listaEdicoes || []).map((edId) => (
    { id: edId, titulo: edId, cliente: c, pasta: `${c.pasta}edicoes/${edId}/`, tags: [], duracaoSeg: 0 }
  )));
  const edicoesOk = await Promise.all(edicoes.map((ed) => carregarScript(ed.pasta + "info.js", ed).then(() => true, (src) => {
    errosLeitura.push(`Não encontrei <code>${esc(src)}</code>.`);
    return false;
  })));

  edicoes.forEach((ed, k) => {
    if (!edicoesOk[k]) return;
    ed.youtubeId = /^[A-Za-z0-9_-]{11}$/.test(ed.youtube || "") ? ed.youtube : "";
    ed.video = ed.youtubeId ? "" : ed.pasta + (ed.arquivoVideo || "video.mp4");
    ed.capa = ed.youtubeId ? `https://i.ytimg.com/vi/${ed.youtubeId}/hqdefault.jpg` : ed.pasta + (ed.arquivoCapa || "preview.jpg");
    ed.cliente.edicoes.push(ed);
    estado.edicoes.push(ed);
  });
  validos.forEach((c) => estado.clientes.push(c));
  if (errosLeitura.length) mostrarErro(errosLeitura.join("<br>"));
}

/* =========================================================
   LOADER
   ========================================================= */
/* O loader nunca espera mais que ESPERA_MAX pelo conteúdo e some de vez
   em FECHA_MAX, mesmo sem requestAnimationFrame (aba em segundo plano). */
const ESPERA_MAX = 1800, FECHA_MAX = 3500;
function loader(promessaPronto) {
  const el = $("#loader");
  const num = $("#loaderNum");
  const bar = $("#loaderBar");
  const tc = $("#loaderTc");
  const t0 = performance.now();
  let fechado = false, ok;
  const terminou = new Promise((r) => { ok = r; });
  const fim = () => {
    if (fechado) return;
    fechado = true;
    clearTimeout(window.__zalenLoaderFailsafe);
    if (el) el.classList.add("is-gone");
    document.body.classList.remove("is-loading");
    ok();
  };
  setTimeout(fim, FECHA_MAX);
  if (!el || !num || !bar || !tc) { fim(); return terminou; }

  const liberar = Promise.race([
    Promise.resolve(promessaPronto).catch((erro) => log("carregamento parcial liberado:", erro)),
    new Promise((r) => setTimeout(r, ESPERA_MAX))
  ]);

  if (reduzMovimento) { liberar.then(fim); return terminou; }

  let alvo = 0, atual = 0, pronto = false, cortou = false;
  liberar.then(() => { pronto = true; });
  const cortar = () => {
    if (cortou) return;
    cortou = true;
    el.classList.add("is-cut", "is-out");
    setTimeout(fim, 1250);
  };
  const tick = (t) => {
    if (cortou) return;
    try {
      const passado = Math.max(0, (t - t0) / 1000);
      // sobe sozinho até 85%, completa quando tudo carregou (mínimo 1,6s)
      alvo = pronto && passado > 1.6 ? 100 : Math.min(85, passado * 60);
      atual = lerp(atual, alvo, .12);
      const n = Math.round(atual);
      num.textContent = pad(n, 3);
      bar.style.transform = `scaleX(${atual / 100})`;
      tc.textContent = timecode(passado);
      if (n >= 100) { cortar(); return; }
    } catch (erro) { log("loader:", erro); cortar(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // sem quadros (aba oculta) o corte acontece pelo relógio
  setTimeout(cortar, FECHA_MAX - 1250);
  return terminou;
}

/* =========================================================
   CURSOR
   ========================================================= */
const cursor = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
/* último ponto clicado: origem das bolas de transição e do player */
const ultimoToque = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointerdown", (e) => { ultimoToque.x = e.clientX; ultimoToque.y = e.clientY; }, { capture: true, passive: true });
addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const r = document.activeElement?.getBoundingClientRect?.();
  if (r && r.width) { ultimoToque.x = r.left + r.width / 2; ultimoToque.y = r.top + r.height / 2; }
}, true);
window.ultimoToque = ultimoToque;
function iniciarCursor() {
  if (!temHover || reduzMovimento) return;
  document.documentElement.classList.add("has-cursor");
  const el = $("#cursor");
  const dot = $("#cursorDot");
  const ring = $("#cursorRing");
  addEventListener("pointermove", (e) => { cursor.x = e.clientX; cursor.y = e.clientY; }, { passive: true });
  addEventListener("pointerdown", () => el.classList.add("is-down"));
  addEventListener("pointerup", () => el.classList.remove("is-down"));
  document.addEventListener("pointerover", (e) => {
    const alvo = e.target.closest("a, button, [data-cursor]");
    el.classList.toggle("is-hover", !!alvo);
    const rotulo = e.target.closest("[data-cursor]");
    if (rotulo && !rotulo.matches(".panel-media")) cursorLabel(rotulo.dataset.cursor);
    else if (!e.target.closest(".panel-media")) cursorLabel("");
  });
  let parado = false;
  quadroAQuadro(() => {
    const longe = Math.abs(cursor.x - cursor.rx) + Math.abs(cursor.y - cursor.ry) > .3;
    if (!longe && parado) return; // mouse parado: nada a redesenhar
    parado = !longe;
    cursor.rx = lerp(cursor.rx, cursor.x, .2);
    cursor.ry = lerp(cursor.ry, cursor.y, .2);
    dot.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
    ring.style.transform = `translate(${cursor.rx}px, ${cursor.ry}px)`;
  });
}

/* laço de animação que para com a aba oculta e volta quando ela reaparece */
function quadroAQuadro(fn) {
  let id = 0;
  const frame = (t) => {
    id = 0;
    try { fn(t); } catch (erro) { log("animação:", erro); }
    if (!document.hidden) id = requestAnimationFrame(frame);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(id); id = 0; }
    else if (!id) id = requestAnimationFrame(frame);
  });
  id = requestAnimationFrame(frame);
}

/* vídeos decorativos pausam com a aba oculta e voltam se estavam tocando */
function pausarComAba(video) {
  let tocava = false;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { tocava = !video.paused; video.pause(); }
    else if (tocava) { tocava = false; video.play().catch(() => {}); }
  });
}
function cursorLabel(txt) {
  const el = $("#cursor");
  $("#cursorText").textContent = txt;
  el.classList.toggle("is-label", !!txt);
}

/* botões magnéticos */
function iniciarMagnetismo() {
  if (!temHover || reduzMovimento) return;
  $$("[data-magnet]").forEach((el) => {
    if (el.dataset.magnetDone) return;
    el.dataset.magnetDone = "1";
    const forca = el.classList.contains("btn-mega") ? .35 : .25;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * forca}px, ${dy * forca}px)`;
      const span = el.querySelector("span");
      if (span) span.style.transform = `translate(${dx * forca * .5}px, ${dy * forca * .5}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "";
      const span = el.querySelector("span");
      if (span) { span.style.transition = el.style.transition; span.style.transform = ""; }
      setTimeout(() => { el.style.transition = ""; if (span) span.style.transition = ""; }, 600);
    });
  });
}

/* =========================================================
   PERFIL
   ========================================================= */
function renderPerfil() {
  const p = estado.perfil;
  const nome = p.nome || "Zalen";
  const funcao = p.funcao || "Editor de vídeo";
  if (typeof telaAtual !== "function" || telaAtual() === "topo") document.title = `${nome} · ${funcao}`;
  $("#navLogo").textContent = nome.toUpperCase();
  $("#zoomWord").textContent = nome.toUpperCase();
  $$("[data-brand]").forEach((el) => { el.textContent = nome.toUpperCase(); });
  $("#heroRole").textContent = funcao;
  $("#heroKickerRole").textContent = funcao;
  $("#heroBio").textContent = p.bio || "";
  if (p.chamada) $("#heroHeadline").textContent = p.chamada;
  $("#heroBadge").hidden = !p.disponivel;
  $("#heroKickerOpen").hidden = !p.disponivel;
  $("#footName").textContent = nome;
  $("#year").textContent = new Date().getFullYear();

  const contatos = montarContatos(p.contato || {});
  const html = contatos.length
    ? contatos.map(contatoHTML).join("")
    : `<li class="contact-empty">Contatos em breve</li>`;
  $$("[data-contact-links]").forEach((ul) => { ul.innerHTML = html; });
  // o botão do rodapé vai direto para o primeiro contato que abre (e-mail ou WhatsApp)
  const direto = contatos.find((k) => k.url && (k.tipo === "email" || k.tipo === "whatsapp"));
  if (direto) {
    const cta = $("#footerCta");
    cta.href = direto.url;
    if (direto.tipo !== "email") { cta.target = "_blank"; cta.rel = "noopener"; }
  }
}

/* ---------- Contatos: ícone + rótulo + valor + ação ---------- */
const ICONES = {
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  whatsapp: '<path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.6c0 3.4 2.9 6.4 6.4 6.4l1.2-1.6-2-1-1 1a4.7 4.7 0 0 1-2.9-2.9l1-1-1-2z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.3v5.4l4.6-2.7z" fill="currentColor"/>',
  twitter: '<path d="M4 4h4.6L20 20h-4.6z"/><path d="M19.6 4 13.4 11M10.6 13 4.4 20"/>',
  tiktok: '<path d="M14 3.5v11a3.8 3.8 0 1 1-3.8-3.8"/><path d="M14 3.5c.6 2.6 2.6 4.5 5.2 4.7"/>',
  discord: '<path d="M8.2 6.6A14 14 0 0 1 12 6c1.3 0 2.6.2 3.8.6l.6-1.1a12.5 12.5 0 0 1 3.4 1.2c1.9 2.8 2.7 5.8 2.5 9a12 12 0 0 1-3.9 2l-.9-1.5M8.2 6.6l-.6-1.1a12.5 12.5 0 0 0-3.4 1.2C2.3 9.5 1.5 12.5 1.7 15.7a12 12 0 0 0 3.9 2l.9-1.5M6.5 16.2a11 11 0 0 0 11 0"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/>'
};
const icone = (tipo) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONES[tipo]}</svg>`;

/* aceita link completo ou só o @ do perfil */
function perfilSocial(valor, base) {
  const v = String(valor).trim();
  if (/^https?:\/\//i.test(v)) {
    const ultimo = v.replace(/\/+$/, "").split("/").pop().replace(/^@/, "");
    return { url: v, valor: "@" + ultimo };
  }
  const nome = v.replace(/^@/, "");
  return { url: base + nome, valor: "@" + nome };
}

function montarContatos(c) {
  const lista = [];
  if (c.email) lista.push({ tipo: "email", rotulo: "E-mail", valor: c.email.trim(), url: `mailto:${c.email.trim()}` });
  const zap = String(c.whatsapp || "").replace(/\D/g, "");
  if (zap) {
    // 5511999999999 → +55 11 99999-9999
    const m = zap.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
    lista.push({ tipo: "whatsapp", rotulo: "WhatsApp", valor: m ? `+${m[1]} ${m[2]} ${m[3]}-${m[4]}` : `+${zap}`, url: `https://wa.me/${zap}` });
  }
  if (c.instagram) lista.push({ tipo: "instagram", rotulo: "Instagram", ...perfilSocial(c.instagram, "https://instagram.com/") });
  if (c.youtube) lista.push({ tipo: "youtube", rotulo: "YouTube", ...perfilSocial(c.youtube, "https://youtube.com/@") });
  if (c.twitter) lista.push({ tipo: "twitter", rotulo: "X / Twitter", ...perfilSocial(c.twitter, "https://x.com/") });
  if (c.tiktok) lista.push({ tipo: "tiktok", rotulo: "TikTok", ...perfilSocial(c.tiktok, "https://tiktok.com/@") });
  // Discord não tem link: o nome de usuário é copiado ao clicar
  if (c.discord) lista.push({ tipo: "discord", rotulo: "Discord", valor: String(c.discord).trim(), copiar: true });
  return lista;
}

function contatoHTML(k) {
  const miolo = `
    <span class="ci-icon">${icone(k.tipo)}</span>
    <span class="ci-text"><small>${esc(k.rotulo)}</small><b>${esc(k.valor)}</b></span>
    <span class="ci-action" aria-hidden="true">${k.copiar ? "Copiar" : "↗"}</span>`;
  if (k.copiar) {
    return `<li class="contact-item contact-item--${k.tipo}"><button type="button" class="ci" data-copy="${esc(k.valor)}" aria-label="Copiar ${esc(k.rotulo)}: ${esc(k.valor)}">${miolo}</button></li>`;
  }
  const externo = k.tipo === "email" ? "" : ' target="_blank" rel="noopener"';
  return `<li class="contact-item contact-item--${k.tipo}"><a class="ci" href="${esc(k.url)}"${externo} aria-label="${esc(k.rotulo)}: ${esc(k.valor)}">${miolo}</a></li>`;
}

async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (_) { /* tenta o jeito antigo */ }
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
  area.remove();
  return ok;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  e.preventDefault();
  const ok = await copiarTexto(b.dataset.copy);
  const acao = $(".ci-action", b);
  b.classList.toggle("is-copied", ok);
  acao.textContent = ok ? "Copiado ✓" : "Selecione";
  if (!ok) { const r = document.createRange(); r.selectNodeContents($(".ci-text b", b)); getSelection().removeAllRanges(); getSelection().addRange(r); }
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.classList.remove("is-copied"); acao.textContent = "Copiar"; }, 1800);
});

/* =========================================================
   TELA INICIAL · faixa, números, serviços, destaques, processo
   Tudo calculado a partir das pastas e do perfil.js.
   ========================================================= */
function renderInicio() {
  const p = estado.perfil;
  const tipos = [...new Set(estado.edicoes.map((e) => e.tipo).filter(Boolean))];
  const especialidades = Array.isArray(p.especialidades) && p.especialidades.length ? p.especialidades : tipos;
  const faixa = especialidades.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join("");
  $("#tickerTrack").innerHTML = faixa.repeat(4);
  $("#tickerTrackAlt").innerHTML = faixa.repeat(4);

  // números reais: nada inventado, só contagem das edições cadastradas
  const conta = (tipo) => estado.edicoes.filter((e) => e.tipo === tipo).length;
  const numeros = [
    { n: estado.edicoes.length, rotulo: "edições" },
    { n: conta("Comissão"), rotulo: "comissões" },
    { n: conta("Reedit"), rotulo: "reedits" },
    { n: conta("Projeto"), rotulo: "colaborações" }
  ].filter((s) => s.n > 0);
  $("#impactGrid").innerHTML = numeros.map((s, k) => `
    <div class="impact-card" data-reveal style="--d:${k * 90}ms">
      <strong data-count="${s.n}">${s.n}</strong>
      <span>${esc(s.rotulo)}</span>
    </div>`).join("");

  const servicos = Array.isArray(p.servicos) ? p.servicos : [];
  $(".services").classList.toggle("is-empty", !servicos.length);
  $("#servicesGrid").innerHTML = servicos.map((s, k) => {
    const col = estado.clientes.find((c) => c.id === s.colecao);
    const capa = col && col.edicoes[0] ? capaHTML(col.edicoes[0], "service-cover", "this.remove()") : "";
    return `
    <article class="service-card" data-reveal data-tilt style="--d:${k * 110}ms">
      ${capa}
      <span class="service-num">${pad(k + 1)}</span>
      <h3>${esc(s.titulo || "")}</h3>
      <p>${esc(s.texto || "")}</p>
      ${col ? `<button class="service-link" data-collection="${esc(col.id)}">Exemplos <small>${col.edicoes.length}</small><b aria-hidden="true">→</b></button>` : ""}
    </article>`;
  }).join("");
  $("#servicesGrid").onclick = (e) => {
    const b = e.target.closest("[data-collection]");
    if (b) selecionarColecao(b.dataset.collection, e);
  };

  // destaques: a edição em destaque + a primeira de cada coleção
  const escolhidas = [];
  const add = (ed) => { if (ed && !escolhidas.includes(ed)) escolhidas.push(ed); };
  add(estado.edicoes.find((e) => e.destaque));
  estado.clientes.forEach((c) => add(c.edicoes.find((e) => e.tipo !== "Ao vivo")));
  $("#bento").innerHTML = escolhidas.slice(0, 4).map((ed, k) => {
    const i = estado.edicoes.indexOf(ed);
    return `
    <button class="bento-item" data-preview="${i}" data-reveal data-tilt style="--d:${k * 100}ms" aria-label="Assistir ${esc(ed.titulo)}">
      <div class="card-cover">${capaHTML(ed)}<span aria-hidden="true">▶</span></div>
      <div class="bento-copy">
        <small>${esc(ed.cliente.nome)} · ${esc(ed.tipo || "Edição")}</small>
        <h3>${esc(ed.titulo)}</h3>
      </div>
    </button>`;
  }).join("");
  $("#bento").onclick = (e) => {
    const b = e.target.closest("[data-preview]");
    if (b) abrirPlayer(Number(b.dataset.preview));
  };

  const passos = Array.isArray(p.processo) ? p.processo : [];
  $(".process").classList.toggle("is-empty", !passos.length);
  $("#processList").innerHTML = passos.map((s, k) => `
    <li data-reveal style="--d:${k * 120}ms">
      <span class="process-num">${pad(k + 1)}</span>
      <h3>${esc(s.titulo || "")}</h3>
      <p>${esc(s.texto || "")}</p>
    </li>`).join("");
}

/* =========================================================
   HERO · zoom através das letras
   ========================================================= */
const hero = { ed: null, origem: { x: .5, y: .5 } };

function prepararHero() {
  const video = $("#heroVideo");
  const ed = estado.edicoes.find((e) => e.destaque) || estado.edicoes[0];
  hero.ed = ed;
  if (!ed) { $("#heroPlay").hidden = true; return Promise.resolve(); }

  video.poster = ed.capa;
  /* o vídeo do topo é o cartão de visita: toca sempre que o topo estiver na tela */
  let heroNaTela = true;
  const deveTocar = () => heroNaTela && !document.hidden && !$("#topo").hidden && !$("#player").open;
  if (ed.video) {
    if (window.zalenVideo) zalenVideo.aplicar(video, ed.video, { adaptar: true, deveTocar });
    else video.src = ed.video;
  }
  $("#heroPlay").addEventListener("click", () => abrirPlayer(estado.edicoes.indexOf(ed), video.currentTime));

  video.addEventListener("loadedmetadata", () => {
    $("#hudInfo").textContent = `${video.videoWidth}×${video.videoHeight}  ${timecode(video.duration)}`;
  });
  video.addEventListener("timeupdate", () => { $("#hudTc").textContent = timecode(video.currentTime); });
  video.muted = true;
  video.play().catch(() => {});

  // pausa quando sai da tela ou quando a aba fica oculta
  pausarComAba(video);
  new IntersectionObserver(([en]) => {
    heroNaTela = en.isIntersecting;
    heroNaTela ? video.play().catch(() => {}) : video.pause();
  }).observe($(".zoom-stage"));

  return new Promise((ok) => {
    if (video.readyState >= 2) return ok();
    video.addEventListener("loadeddata", ok, { once: true });
    video.addEventListener("error", ok, { once: true });
    setTimeout(ok, 4000);
  });
}

/* acha um ponto DENTRO de uma letra para a câmera atravessar */
function calcularOrigem() {
  if ($("#topo").hidden) return;
  const word = $("#zoomWord");
  const mask = $("#zoomMask");
  const r = word.getBoundingClientRect();
  const m = mask.getBoundingClientRect();
  const cs = getComputedStyle(word);
  const cv = document.createElement("canvas");
  const esc_ = .25;
  cv.width = Math.max(1, Math.ceil(r.width * esc_));
  cv.height = Math.max(1, Math.ceil(r.height * esc_));
  const g = cv.getContext("2d");
  g.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * esc_}px ${cs.fontFamily}`;
  const met = g.measureText(word.textContent);
  const inkW = met.actualBoundingBoxLeft + met.actualBoundingBoxRight;
  const inkH = met.actualBoundingBoxAscent + met.actualBoundingBoxDescent;
  g.fillStyle = "#fff";
  g.fillText(word.textContent, (cv.width - inkW) / 2 + met.actualBoundingBoxLeft, (cv.height - inkH) / 2 + met.actualBoundingBoxAscent);
  const px = g.getImageData(0, 0, cv.width, cv.height).data;

  // procura o pixel branco mais perto do centro (levemente à esquerda, fica mais bonito)
  const cx = cv.width * .47, cy = cv.height * .5;
  let melhor = null, dist = Infinity;
  for (let y = 0; y < cv.height; y += 2) {
    for (let x = 0; x < cv.width; x += 2) {
      if (px[(y * cv.width + x) * 4 + 3] > 200) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < dist) { dist = d; melhor = { x, y }; }
      }
    }
  }
  if (!melhor) melhor = { x: cx, y: cy };
  const ox = r.left - m.left + melhor.x / esc_;
  const oy = r.top - m.top + melhor.y / esc_;
  mask.style.setProperty("--ox", `${ox}px`);
  mask.style.setProperty("--oy", `${oy}px`);
}

function atualizarHero() {
  const sec = $("#topo");
  const mask = $("#zoomMask");
  const over = $("#zoomOver");
  const total = sec.offsetHeight - innerHeight;
  const p = clamp(-sec.getBoundingClientRect().top / total);

  // 0 → .62: atravessa a letra | .55 → .7: máscara some | .72 → .9: textos entram
  const z = easeInOut(clamp(p / .62));
  mask.style.setProperty("--ms", Math.pow(70, z).toFixed(3));
  mask.style.opacity = 1 - clamp((p - .55) / .15);
  $("#heroVideo").style.setProperty("--vs", (1.15 - z * .15).toFixed(3));
  const oo = clamp((p - .72) / .18);
  over.style.setProperty("--oo", oo.toFixed(3));
  over.classList.toggle("is-on", oo > .5);
  $("#zoomHint").style.setProperty("--ho", (1 - clamp(p / .08)).toFixed(3));
  $("#zoomKicker").style.setProperty("--ho", (1 - clamp(p / .08)).toFixed(3));
}

/* =========================================================
   TRABALHOS · painéis
   ========================================================= */
function renderFiltros() {
  const box = $("#filters");
  const n = estado.edicoes.length;
  $("#worksCount").textContent = `${pad(n)} ${n === 1 ? "projeto" : "projetos"}`;
  if (estado.clientes.length < 2) { box.hidden = true; return; }
  const itens = [{ id: "todos", nome: "Todos" }].concat(estado.clientes.map((c) => ({ id: c.id, nome: c.nome })));
  box.innerHTML = itens.map((f) => `<button class="filter" role="tab" data-id="${esc(f.id)}" aria-selected="${f.id === estado.filtro}">${esc(f.nome)}</button>`).join("");
  $$(".filter", box).forEach((b) => b.addEventListener("click", () => filtrar(b.dataset.id)));
}

function renderPaineis() {
  const stack = $("#stack");
  if (!estado.edicoes.length) {
    stack.innerHTML = `<p class="empty">Nenhum trabalho ainda. Crie uma pasta em clientes/&lt;cliente&gt;/edicoes/ com video.mp4 e info.js.</p>`;
    return;
  }
  stack.innerHTML = estado.edicoes.map((ed, i) => `
    <article class="panel" data-i="${i}" data-cliente="${esc(ed.cliente.id)}">
      <div class="panel-inner">
        <span class="panel-num" aria-hidden="true">${pad(i + 1)}</span>
        <div class="panel-media" data-cursor="Play">
          ${ed.youtubeId ? "" : `<video muted playsinline preload="metadata">${window.zalenVideo ? `<source src="${esc(zalenVideo.arquivo(ed.video, 480))}" type="video/mp4">` : ""}<source src="${esc(ed.video)}" type="video/mp4"></video>`}
          ${capaHTML(ed, "panel-poster", "this.remove()")}
          <span class="panel-dur" hidden><i></i><b></b></span>
          <div class="panel-timeline" aria-hidden="true">
            <div class="tl-ruler"></div>
            <div class="tl-track"><i class="tl-fill"></i></div>
            <div class="tl-head"><b>00:00:00:00</b></div>
            <span class="tl-hint">Arraste ↔</span>
          </div>
        </div>
        <div class="panel-info">
          <div class="panel-client">${avatarHTML(ed.cliente)}<span>${esc(ed.cliente.nome)}${ed.data ? `, ${esc(ed.data)}` : ""}</span></div>
          <h3 class="panel-title glitch" data-text="${esc(ed.titulo)}">${esc(ed.titulo)}</h3>
          ${ed.tipo ? `<p class="panel-type">${esc(ed.tipo)}</p>` : ""}
          ${ed.descricao ? `<p class="panel-desc">${esc(ed.descricao)}</p>` : ""}
          ${ed.tags && ed.tags.length ? `<div class="tags">${ed.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
          <button class="btn-mega" data-magnet data-cursor="Play"><span>Assistir</span></button>
        </div>
      </div>
    </article>`).join("");
  $$(".panel", stack).forEach(prepararPainel);
}

const painelYoutube = { ativo: null };

function prepararPainel(panel) {
  const i = +panel.dataset.i;
  const ed = estado.edicoes[i];
  const media = $(".panel-media", panel);
  const video = $("video", media);
  const timeline = $(".panel-timeline", media);
  const cabecaTc = $(".tl-head b", media);
  const dur = $(".panel-dur", media);
  const titulo = $(".panel-title", panel);

  let pronto = false, duracao = 0, yt = null, ytReady = null, arrastando = false, ultimoSeek = 0, posTeclado = 0;

  function atualizarUI(p, t) {
    timeline.style.setProperty("--p", p.toFixed(4));
    cabecaTc.textContent = timecode(t);
    cursorLabel(timecode(t));
  }

  function habilitar(segundos) {
    duracao = segundos || 0;
    ed.duracaoSeg = duracao;
    if (!duracao) return;
    $("b", dur).textContent = duracaoCurta(duracao);
    dur.hidden = false;
    pronto = true;
    media.dataset.scrubReady = "true";
  }

  function prepararYoutubePainel() {
    if (ytReady) return ytReady;
    if (painelYoutube.ativo && painelYoutube.ativo !== panel) {
      const anterior = painelYoutube.ativo;
      anterior._ytPanelPlayer?.destroy();
      anterior._ytPanelPlayer = null;
      anterior._resetYoutube?.();
      anterior.classList.remove("is-youtube-ready", "is-skimming");
      $(".panel-youtube", anterior)?.remove();
    }
    painelYoutube.ativo = panel;
    const holder = document.createElement("div");
    holder.id = `panelYoutube-${i}-${Date.now()}`;
    holder.className = "panel-youtube";
    media.insertBefore(holder, $(".panel-poster", media));
    ytReady = carregarYoutubeAPI().then(() => new Promise((ok, falha) => {
      let tentativas = 0;
      yt = new YT.Player(holder.id, {
        width: "100%", height: "100%",
        videoId: ed.youtubeId,
        playerVars: { autoplay: 0, mute: 1, playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin === "null" ? undefined : location.origin },
        events: {
          onReady: () => {
            document.getElementById(holder.id)?.classList.add("panel-youtube");
            yt.mute();
            panel._ytPanelPlayer = yt;
            const tentar = () => {
              const d = yt.getDuration();
              if (d > 0) { habilitar(d); panel.classList.add("is-youtube-ready"); ok(yt); }
              else if (++tentativas < 60) setTimeout(tentar, 120);
              else falha(new Error("vídeo do YouTube sem duração"));
            };
            tentar();
          },
          onError: () => falha(new Error("o YouTube recusou o vídeo " + ed.youtubeId))
        }
      });
      // A API troca o div pelo iframe: devolve a classe já, antes do onReady.
      document.getElementById(holder.id)?.classList.add("panel-youtube");
    }));
    // sem YouTube a capa continua no lugar; o painel só não faz o scrub
    ytReady.catch(() => {
      document.getElementById(holder.id)?.remove();
      panel.classList.remove("is-youtube-ready", "is-skimming");
    });
    return ytReady;
  }

  // chamado quando outro painel assume o único player do YouTube
  panel._resetYoutube = () => { yt = null; ytReady = null; };

  if (!ed.youtubeId) video.addEventListener("loadedmetadata", () => {
    habilitar(video.duration || 0);
    if (!$(".panel-poster", panel)) video.currentTime = Math.min(1, ed.duracaoSeg / 3);
  });

  $(".btn-mega", panel).addEventListener("click", () => abrirPlayer(i));
  media.setAttribute("role", "img");
  media.tabIndex = 0;
  media.setAttribute("aria-label", `Prévia de ${ed.titulo}. Use as setas para avançar e Enter para assistir.`);

  // glitch rápido quando o painel entra na tela
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !reduzMovimento) {
      titulo.classList.add("is-glitch");
      setTimeout(() => titulo.classList.remove("is-glitch"), 450);
    }
  }, { threshold: .6 }).observe(titulo);

  async function aplicarPonteiro(e, final = false) {
    const r = media.getBoundingClientRect();
    await irPara(clamp((e.clientX - r.left) / r.width), final);
  }

  async function irPara(p, final = false) {
    if (ed.youtubeId) {
      if (youtube.bloqueado && !yt) return;
      try { await prepararYoutubePainel(); } catch (_) { return; }
    }
    if (!pronto || !duracao) return;
    // o player do YouTube pode demorar: ignora se o mouse/foco já saiu
    if (!arrastando && !media.matches(":hover") && document.activeElement !== media) return;
    posTeclado = p;
    const t = p * duracao;
    panel.classList.add("is-skimming");
    atualizarUI(p, t);
    if (ed.youtubeId) {
      const agora = performance.now();
      if (final || agora - ultimoSeek > 140) {
        ultimoSeek = agora;
        // Sem tocar, o YouTube nunca baixa frames (fica preto). Toca mudo a partir do ponto.
        yt.mute();
        yt.seekTo(t, true);
        yt.playVideo();
      }
    } else if (video.readyState >= 1 && !video.seeking) {
      video.muted = true;
      video.currentTime = t;
    }
  }

  media.addEventListener("pointerdown", async (e) => {
    if (e.button != null && e.button !== 0) return;
    arrastando = true;
    media.setPointerCapture(e.pointerId);
    e.preventDefault();
    await aplicarPonteiro(e, true);
  });
  media.addEventListener("pointermove", (e) => {
    if (!arrastando && (!temHover || e.pointerType === "touch")) return;
    aplicarPonteiro(e);
  });
  media.addEventListener("pointerup", (e) => {
    if (!arrastando) return;
    arrastando = false;
    aplicarPonteiro(e, true);
    if (media.hasPointerCapture(e.pointerId)) media.releasePointerCapture(e.pointerId);
  });
  media.addEventListener("pointercancel", (e) => {
    arrastando = false;
    if (media.hasPointerCapture(e.pointerId)) media.releasePointerCapture(e.pointerId);
  });
  media.addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
  if (temHover) media.addEventListener("pointerenter", (e) => { aplicarPonteiro(e); });
  function sairDoScrub() {
    panel.classList.remove("is-skimming");
    cursorLabel("");
    if (yt && yt.pauseVideo) yt.pauseVideo();
  }
  media.addEventListener("pointerleave", () => { if (!arrastando) sairDoScrub(); });
  media.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirPlayer(i, posTeclado * duracao); return; }
    const passoTecla = { ArrowRight: .05, ArrowLeft: -.05, Home: -1, End: 1 }[e.key];
    if (passoTecla == null) return;
    e.preventDefault();
    irPara(clamp(posTeclado + passoTecla), true);
  });
  media.addEventListener("blur", sairDoScrub);
}

function atualizarPaineis() {
  if (innerWidth <= 960) return;
  const visiveisP = $$(".panel:not(.is-hidden)");
  visiveisP.forEach((panel, idx) => {
    const inner = $(".panel-inner", panel);
    const temProximo = idx < visiveisP.length - 1;
    if (!temProximo) { inner.style.setProperty("--ps", 1); inner.style.setProperty("--pb", 1); return; }
    const prox = visiveisP[idx + 1];
    // quanto o próximo painel já cobriu este
    const p = clamp(1 - prox.getBoundingClientRect().top / innerHeight);
    inner.style.setProperty("--ps", (1 - p * .12).toFixed(4));
    inner.style.setProperty("--pb", (1 - p * .75).toFixed(4));
  });
}

function filtrar(id) {
  estado.filtro = id;
  $$(".filter").forEach((f) => f.setAttribute("aria-selected", f.dataset.id === id));
  $$(".panel").forEach((p) => p.classList.toggle("is-hidden", !(id === "todos" || p.dataset.cliente === id)));
  $$(".panel:not(.is-hidden) .panel-num").forEach((n, i) => { n.textContent = pad(i + 1); });
}

/* =========================================================
   CLIENTES · letreiro guiado pela velocidade do scroll
   ========================================================= */
const letreiro = { x: 0, largura: 0, vel: 0, pausado: false };

function renderLetreiro() {
  if (!estado.pronto || $("#clientes").hidden) return;
  $("#clientsHint").hidden = true;
  const track = $("#marqueeTrack");
  if (!estado.clientes.length) {
    track.innerHTML = `<span class="mq-item">EM BREVE</span>`;
    $("#clientsHint").hidden = false;
    $("#clientsHint").textContent = "Nenhuma coleção ainda.";
    return;
  }

  const bloco = estado.clientes.map((c) => {
    const n = c.edicoes.length;
    return `<button class="mq-item" data-id="${esc(c.id)}" data-capa="${c.edicoes[0] ? esc(c.edicoes[0].capa) : ""}" data-cursor="Ver">
      ${avatarHTML(c)}<span>${esc(c.nome.toUpperCase())}</span><small>${n} ${n === 1 ? "projeto" : "projetos"}</small>
    </button><span class="mq-sep" aria-hidden="true">✦</span>`;
  }).join("");

  // repete o bloco até cobrir 2 telas (para o loop não ter buraco)
  track.innerHTML = bloco;
  const larguraBloco = track.scrollWidth || 1;
  const vezes = Math.max(2, Math.ceil((innerWidth * 2) / larguraBloco) + 1);
  track.innerHTML = bloco.repeat(vezes);
  letreiro.largura = larguraBloco;
  $$(".mq-item", track).forEach((b, k) => { if (k >= estado.clientes.length) b.setAttribute("tabindex", "-1"); });

  const peek = $("#peek");
  $$(".mq-item", track).forEach((item) => {
    item.addEventListener("click", (e) => {
      if (window.transicaoPara) { transicaoPara("#trabalhos", e, () => filtrar(item.dataset.id)); return; }
      filtrar(item.dataset.id);
      location.hash = "trabalhos";
      $("#trabalhos").scrollIntoView({behavior:reduzMovimento ? "auto" : "smooth"});
    });
    if (!temHover || !item.dataset.capa) return;
    const posicionar = (e) => {
      peek.style.setProperty("--x", `${e.clientX + 28}px`);
      peek.style.setProperty("--y", `${e.clientY - peek.offsetHeight - 10}px`);
    };
    item.addEventListener("pointerenter", (e) => {
      posicionar(e);
      letreiro.pausado = true;
      peek.style.backgroundImage = `url('${item.dataset.capa}')`;
      peek.classList.add("is-on");
    });
    item.addEventListener("pointermove", (e) => {
      posicionar(e);
      peek.style.setProperty("--r", `${(e.movementX || 0) * .6}deg`);
    });
    item.addEventListener("pointerleave", () => { letreiro.pausado = false; peek.classList.remove("is-on"); });
  });
}

function atualizarLetreiro(dt, velScroll) {
  const track = $("#marqueeTrack");
  if (!letreiro.largura || reduzMovimento) return;
  letreiro.vel = lerp(letreiro.vel, velScroll, .1);
  const base = letreiro.pausado ? 0 : 80;
  letreiro.x -= (base + Math.abs(letreiro.vel) * 1.2) * dt * (letreiro.vel < -2 ? -1 : 1);
  if (letreiro.x <= -letreiro.largura) letreiro.x += letreiro.largura;
  if (letreiro.x > 0) letreiro.x -= letreiro.largura;
  const skew = clamp(letreiro.vel * .04, -14, 14);
  track.style.transform = `translate3d(${letreiro.x}px,0,0) skewX(${-skew}deg)`;
}

/* =========================================================
   CONTATO · letras que fogem do cursor
   ========================================================= */
function prepararContato() {
  const titulo = $("#contactTitle");
  $$(".line", titulo).forEach((linha) => {
    linha.innerHTML = [...linha.textContent].map((ch) => `<span class="ch" aria-hidden="true">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("");
  });
  const fundo = estado.edicoes.find((e) => !e.youtubeId && e.video) || hero.ed;
  if (fundo) $("#contactBg").style.backgroundImage = `url('${fundo.capa}')`;
  const videoFundo = $("#contactBgVideo");
  if (videoFundo && fundo && fundo.video && !reduzMovimento && !window.ZALEN_LITE) {
    if (window.zalenVideo) zalenVideo.aplicar(videoFundo, fundo.video, { nivel: 480 });
    else videoFundo.src = fundo.video;
    videoFundo.muted = true;
    videoFundo.loop = true;
    videoFundo.playsInline = true;
    const sincronizar = ([entrada]) => {
      entrada.isIntersecting ? videoFundo.play().catch(() => {}) : videoFundo.pause();
    };
    new IntersectionObserver(sincronizar, { threshold: .2 }).observe($("#contato"));
    pausarComAba(videoFundo);
  }
  if (!temHover || reduzMovimento) return;

  const letras = $$(".ch", titulo);
  const sec = $("#contato");
  sec.addEventListener("pointermove", (e) => {
    letras.forEach((l) => {
      const r = l.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      const d = Math.hypot(dx, dy);
      const raio = 260;
      if (d < raio) {
        const f = (1 - d / raio) ** 2;
        l.style.transform = `translate(${(dx / d) * f * 90}px, ${(dy / d) * f * 90}px) rotate(${(dx / d) * f * 25}deg)`;
        l.classList.toggle("is-near", f > .25);
      } else {
        l.style.transform = "";
        l.classList.remove("is-near");
      }
    });
  });
  sec.addEventListener("pointerleave", () => letras.forEach((l) => { l.style.transform = ""; l.classList.remove("is-near"); }));
}

/* =========================================================
   PLAYER
   ========================================================= */
const player = $("#player");
const playerVideo = $("#playerVideo");
const playerYoutube = $("#playerYoutube");
const playerSource = $("#playerSource");

function visiveis() {
  if (location.hash === "#catalogo") return catalogo.visiveis.map(i => ({ ed:estado.edicoes[i], i }));
  return estado.edicoes.map((ed,i)=>({ed,i})).filter(({ed})=>estado.filtro === "todos" || ed.cliente.id === estado.filtro);
}

/* existe um video.mp4 na pasta desta edição do YouTube? (pergunta uma vez só) */
function videoLocal(ed) {
  if (!ed.pasta) return Promise.resolve("");
  if (!ed._local) {
    const src = ed.pasta + (ed.arquivoVideo || "video.mp4");
    ed._local = fetch(src, { method: "HEAD" }).then((r) => (r.ok ? src : ""), () => "");
  }
  return ed._local;
}

function abrirPlayer(i, inicio = 0) {
  const ed = estado.edicoes[i];
  if (!ed) return;
  estado.aberta = i;
  $("#heroVideo").pause();
  cursorLabel("");

  playerVideo.pause();
  playerVideo.removeAttribute("src");
  playerVideo.load();
  playerYoutube.removeAttribute("src");
  playerVideo.hidden = !!ed.youtubeId;
  playerYoutube.hidden = !ed.youtubeId;
  playerSource.hidden = !ed.youtubeId;
  if (ed.youtubeId && youtube.bloqueado && /^https?:$/.test(location.protocol)) {
    // YouTube bloqueado: tenta o video.mp4 da pasta; o link "Abrir no YouTube" continua
    playerYoutube.hidden = true;
    playerVideo.hidden = false;
    playerVideo.poster = ed.capa;
    playerSource.href = `https://www.youtube.com/watch?v=${ed.youtubeId}`;
    videoLocal(ed).then((src) => {
      if (!src || estado.aberta !== i || !player.open) return;
      playerVideo.src = src;
      playerVideo.play().catch(() => {});
    });
  } else if (ed.youtubeId) {
    if (/^https?:$/.test(location.protocol)) {
      const params = new URLSearchParams({autoplay:"1", playsinline:"1", origin:location.origin, start:String(Math.max(0, Math.floor(inicio)))});
      playerYoutube.src = `https://www.youtube.com/embed/${ed.youtubeId}?${params}`;
    } else { playerYoutube.hidden = true; document.getElementById("localNotice").hidden = false; }
    playerSource.href = `https://www.youtube.com/watch?v=${ed.youtubeId}`;
  } else {
    playerVideo.src = ed.video;
    playerVideo.poster = ed.capa;
    if (inicio) playerVideo.addEventListener("loadedmetadata", () => { playerVideo.currentTime = inicio; }, { once: true });
  }

  const t = $("#playerTitle");
  t.textContent = ed.titulo;
  t.dataset.text = ed.titulo;
  $("#playerDesc").textContent = ed.descricao || "";
  $("#playerDesc").hidden = !ed.descricao;
  $("#playerTags").innerHTML = (ed.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("");
  const linhas = [
    ["Coleção", ed.cliente.nome],
    ["Formato", ed.tipo],
    ["Duração", ed.duracaoSeg ? duracaoCurta(ed.duracaoSeg) : ""],
    ["Data", ed.data],
    ["Edição", estado.perfil.nome || "Zalen"]
  ].filter(([, v]) => v);
  $("#playerCredits").innerHTML = linhas.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");

  const lista = visiveis();
  const pos = lista.findIndex((x) => x.i === i);
  $("#playerCount").textContent = `${pad(pos + 1)} / ${pad(lista.length)}`;
  const ant = lista[pos - 1], prox = lista[pos + 1];
  $("#playerPrev").disabled = !ant;
  $("#playerNext").disabled = !prox;
  $("#playerPrev strong").textContent = ant ? ant.ed.titulo : "";
  $("#playerNext strong").textContent = prox ? prox.ed.titulo : "";

  if (!player.open) {
    // o player nasce como uma bola que cresce a partir do clique
    const r = Math.hypot(Math.max(ultimoToque.x, innerWidth - ultimoToque.x), Math.max(ultimoToque.y, innerHeight - ultimoToque.y));
    player.style.setProperty("--cx", `${ultimoToque.x}px`);
    player.style.setProperty("--cy", `${ultimoToque.y}px`);
    player.style.setProperty("--cr", `${Math.ceil(r) + 2}px`);
    player.classList.remove("is-closing");
    player.showModal();
    document.body.style.overflow = "hidden";
  }
  player.scrollTop = 0;
  if (!ed.youtubeId) playerVideo.play().catch(() => {});
  if (!reduzMovimento) { t.classList.add("is-glitch"); setTimeout(() => t.classList.remove("is-glitch"), 500); }
}

function passo(d) {
  const lista = visiveis();
  const pos = lista.findIndex((x) => x.i === estado.aberta);
  const alvo = lista[pos + d];
  if (alvo) abrirPlayer(alvo.i);
}

/* fecha encolhendo numa bola até o botão de fechar */
let fechando = null;
function fecharPlayer() {
  if (!player.open) return Promise.resolve();
  if (fechando) return fechando;
  if (reduzMovimento || !player.animate) { player.close(); return Promise.resolve(); }
  const b = $("#playerClose").getBoundingClientRect();
  const x = b.left + b.width / 2, y = b.top + b.height / 2;
  const r = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
  player.classList.add("is-closing");
  const anim = player.animate(
    { clipPath: [`circle(${r}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] },
    { duration: 620, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" }
  );
  fechando = anim.finished.catch(() => {}).then(() => {
    player.close();
    anim.cancel();
    player.classList.remove("is-closing");
    fechando = null;
  });
  return fechando;
}
window.fecharPlayer = fecharPlayer;
function prepararPlayer() {
  player.addEventListener("cancel", (e) => { e.preventDefault(); fecharPlayer(); });
  $("#playerClose").addEventListener("click", fecharPlayer);
  $("#playerPrev").addEventListener("click", () => passo(-1));
  $("#playerNext").addEventListener("click", () => passo(1));
  player.addEventListener("close", () => {
    playerYoutube.removeAttribute("src");
    playerVideo.pause();
    playerVideo.removeAttribute("src");
    playerVideo.load();
    document.body.style.overflow = "";
    if (!reduzMovimento && !$("#topo").hidden && !document.hidden) $("#heroVideo").play().catch(() => {});
  });
  player.addEventListener("keydown", (e) => {
    if (e.target === playerVideo) return;
    if (e.key === "ArrowRight") passo(1);
    if (e.key === "ArrowLeft") passo(-1);
  });
}

/* =========================================================
   NAV + LOOP PRINCIPAL
   ========================================================= */
function prepararNav() {
  const links = $$(".nav-links a");
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["trabalhos", "clientes", "contato"].forEach((id) => obs.observe(document.getElementById(id)));
}

function loopPrincipal() {
  let ultimoY = scrollY, ultimoT = performance.now();
  /* hero e painéis só recalculam quando a rolagem ou o tamanho mudam:
     ler getBoundingClientRect a cada quadro com a página parada travava tudo */
  let sujo = true, ultimoForcado = 0, letreiroVisivel = true;
  const marcar = () => { sujo = true; };
  addEventListener("resize", marcar, { passive: true });
  addEventListener("telachange", marcar);
  const topo = $("#topo"), clientes = $("#clientes");
  if (clientes && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { letreiroVisivel = en.isIntersecting; }, { rootMargin: "200px 0px" }).observe(clientes);
  }
  quadroAQuadro((t) => {
    const dt = clamp((t - ultimoT) / 1000, 0, .05);
    const vel = (scrollY - ultimoY) / Math.max(dt, .001) / 10;
    if (scrollY !== ultimoY || t - ultimoForcado > 600) sujo = true;
    ultimoY = scrollY; ultimoT = t;
    if (sujo) {
      sujo = false; ultimoForcado = t;
      if (!reduzMovimento && topo && !topo.hidden) atualizarHero();
      atualizarPaineis();
    }
    if (letreiroVisivel) atualizarLetreiro(dt, vel);
  });
}

/* =========================================================
   INÍCIO
   ========================================================= */
/* Ordem: dados (info.js) → telas renderizadas. O loader não depende de
   nada disso: fecha em no máximo ~3 s e as animações começam de qualquer jeito;
   se os dados chegarem depois, o conteúdo aparece quando chegar. */
(function iniciar() {
  etapaSync("aviso local", () => { $("#localNotice").hidden = location.protocol !== "file:"; });
  etapaSync("cursor", iniciarCursor);
  etapaSync("player", prepararPlayer);

  const fontes = etapa("fontes", () => document.fonts && document.fonts.ready, 2500);
  const conteudo = etapa("leitura dos info.js", carregarTudo, 60000).then(async () => {
    estado.pronto = true;
    etapaSync("zalenReady", () => window.__zalenResolveReady && window.__zalenResolveReady(estado));
    etapaSync("perfil", renderPerfil);
    if (typeof iniciarFundo === "function") etapaSync("fundo (YouTube)", () => iniciarFundo(estado.edicoes));
    const heroPronto = etapa("vídeo do hero", prepararHero, 2500);
    etapaSync("trabalhos", () => { renderFiltros(); renderPaineis(); });
    etapaSync("início", renderInicio);
    if (typeof montarCatalogo === "function") etapaSync("catálogo", montarCatalogo);
    etapaSync("motion", () => window.motionScan && window.motionScan());
    await fontes;
    etapaSync("coleções", renderLetreiro);
    etapaSync("contato", prepararContato);
    etapaSync("hero", calcularOrigem);
    etapaSync("magnetismo", iniciarMagnetismo);
    await heroPronto;
  });

  let telasProntas = false;
  const comecarAnimacoes = () => {
    if (telasProntas) return;
    telasProntas = true;
    etapaSync("magnetismo", iniciarMagnetismo);
    if (typeof inicializarTelas === "function") etapaSync("telas", inicializarTelas);
    etapaSync("loop principal", loopPrincipal);
    let pedido = 0;
    addEventListener("resize", () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        etapaSync("resize", () => { calcularOrigem(); renderLetreiro(); });
      });
    });
  };
  loader(conteudo).then(comecarAnimacoes, comecarAnimacoes);
})();
