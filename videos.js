/* =========================================================
   VÍDEOS · qualidade certa para cada aparelho
   Cada edição pode ter, além do video.mp4 (qualidade cheia, usado no player):
     video-720.mp4  video-480.mp4  video-360.mp4   (sem áudio)
   Gere com:  npm run videos   (precisa do ffmpeg instalado)
   Se a cópia não existir, o navegador cai sozinho no video.mp4.
   O vídeo do topo desce de qualidade se começar a engasgar e lembra
   disso na próxima visita.
   ========================================================= */
(function () {
  var NIVEIS = [1080, 720, 480, 360];
  var CHAVE = "zalen_nivel_video";

  /* a qualidade reduzida vale por 2 dias; depois o site tenta a melhor de novo */
  var VALIDADE = 2 * 24 * 60 * 60 * 1000;
  function lerSalvo() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      return s && Date.now() - s.em < VALIDADE ? +s.nivel || 0 : 0;
    } catch (_) { return 0; }
  }
  function salvar(n) { try { localStorage.setItem(CHAVE, JSON.stringify({ nivel: n, em: Date.now() })); } catch (_) {} }

  function nivelInicial() {
    var n = navigator, c = n.connection || {}, tipo = c.effectiveType || "4g";
    var nucleos = n.hardwareConcurrency || 8, memoria = n.deviceMemory || 8;
    var tela = Math.max(screen.width, screen.height) * Math.min(window.devicePixelRatio || 1, 2);
    var nivel;
    if (c.saveData || /2g/.test(tipo) || nucleos <= 2 || memoria <= 2) nivel = 360;
    else if (window.ZALEN_LITE || tipo === "3g") nivel = 480;
    else if (nucleos >= 8 && tela >= 1700 && !(c.downlink && c.downlink < 5)) nivel = 1080;
    else nivel = 720;
    var salvo = lerSalvo();
    return salvo && salvo < nivel ? salvo : nivel;
  }
  var atual = nivelInicial();

  function arquivo(base, nivel) {
    return nivel >= 1080 ? base : base.replace(/(\.mp4)?$/i, "-" + nivel + ".mp4");
  }

  /* troca as fontes do <video>: primeiro a cópia, depois o original como reserva */
  function trocarFontes(video, base, nivel) {
    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);
    var lista = nivel >= 1080 ? [base] : [arquivo(base, nivel), base];
    lista.forEach(function (src) {
      var s = document.createElement("source");
      s.src = src; s.type = "video/mp4";
      video.appendChild(s);
    });
    video.load();
  }

  function mudo(video) {
    video.muted = true; video.defaultMuted = true;
    video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
  }

  /* aplica num <video>. opcoes: { nivel (máximo), minimo, adaptar, deveTocar() } */
  function aplicar(video, base, opcoes) {
    opcoes = opcoes || {};
    mudo(video);
    var nivel = opcoes.nivel ? Math.min(opcoes.nivel, atual) : atual;
    if (opcoes.minimo) { nivel = Math.max(nivel, opcoes.minimo); video.dataset.minimo = opcoes.minimo; }
    video.dataset.nivel = nivel;
    trocarFontes(video, base, nivel);
    if (opcoes.deveTocar) manterTocando(video, opcoes.deveTocar);
    if (opcoes.adaptar) adaptar(video, base, opcoes.deveTocar || function () { return true; });
  }

  function descer(video, base, deveTocar) {
    var nivel = +video.dataset.nivel || atual;
    var prox = NIVEIS[NIVEIS.indexOf(nivel) + 1];
    if (!prox || prox < (+video.dataset.minimo || 0)) return false;
    atual = Math.min(atual, prox);
    salvar(atual);
    var t = video.currentTime, tocava = !video.paused || deveTocar();
    video.dataset.nivel = prox;
    trocarFontes(video, base, prox);
    video.addEventListener("loadedmetadata", function () {
      try { video.currentTime = t; } catch (_) {}
      if (tocava) video.play().catch(function () {});
    }, { once: true });
    console.info("[zalen] vídeo engasgando: descendo para " + prox + "p");
    return true;
  }

  /* engasgou 2x em 15 s, ou perdeu mais de 20% dos quadros → desce um nível */
  function adaptar(video, base, deveTocar) {
    var travadas = [], tocou = false, ultimoQ = null;
    video.addEventListener("playing", function () { tocou = true; });
    video.addEventListener("waiting", function () {
      if (!tocou || !deveTocar()) return;
      var agora = performance.now();
      travadas = travadas.filter(function (t) { return agora - t < 15000; });
      travadas.push(agora);
      if (travadas.length >= 2 && descer(video, base, deveTocar)) { travadas = []; tocou = false; ultimoQ = null; }
    });
    if (!video.getVideoPlaybackQuality) return;
    setInterval(function () {
      if (video.paused || document.hidden || !deveTocar()) { ultimoQ = null; return; }
      var q = video.getVideoPlaybackQuality();
      if (ultimoQ) {
        var total = q.totalVideoFrames - ultimoQ.totalVideoFrames;
        var perdidos = q.droppedVideoFrames - ultimoQ.droppedVideoFrames;
        if (total > 30 && perdidos / total > .2 && descer(video, base, deveTocar)) { ultimoQ = null; return; }
      }
      ultimoQ = q;
    }, 4000);
  }

  /* garante que o vídeo volte a tocar: depois de um bloqueio de autoplay,
     de uma aba oculta, de um travamento ou de qualquer pausa sem motivo */
  function manterTocando(video, deveTocar) {
    var ultimoT = -1, parado = 0;
    function tentar() {
      if (!deveTocar()) return;
      mudo(video);
      if (video.paused && video.readyState >= 2) video.play().catch(function () {});
    }
    ["loadeddata", "canplay"].forEach(function (ev) { video.addEventListener(ev, tentar); });
    video.addEventListener("ended", function () { if (deveTocar()) { video.currentTime = 0; tentar(); } });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tentar(); });
    /* navegador que bloqueia autoplay libera no primeiro toque, clique ou tecla */
    ["pointerdown", "touchstart", "keydown", "wheel"].forEach(function (ev) {
      addEventListener(ev, tentar, { passive: true, capture: true });
    });
    setInterval(function () {
      if (!deveTocar() || document.hidden) { parado = 0; return; }
      if (video.paused) { tentar(); return; }
      /* tocando mas o tempo não anda: cutuca o vídeo */
      if (video.currentTime === ultimoT) {
        if (++parado >= 3) { parado = 0; try { video.currentTime = video.currentTime + .05; } catch (_) {} video.play().catch(function () {}); }
      } else parado = 0;
      ultimoT = video.currentTime;
    }, 1000);
  }

  window.zalenVideo = {
    nivel: function () { return atual; },
    arquivo: arquivo,
    aplicar: aplicar,
    manterTocando: manterTocando
  };
})();
