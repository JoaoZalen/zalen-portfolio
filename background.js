/* Fundo decorativo. Um player externo por vez; fallback MP4 local. */
function iniciarFundo(edicoes) {
  const box = document.getElementById("motionBg");
  const local = document.getElementById("motionFallback");
  const modal = document.getElementById("player");
  if (!box || !local || !modal) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  local.muted = true;
  local.loop = true;
  local.playsInline = true;
  const locais = edicoes.filter(e => !e.youtubeId && e.video);
  const externos = /^https?:$/.test(location.protocol) ? edicoes.filter(e => e.youtubeId && e.tipo !== "Ao vivo") : [];
  let yt, atual = null, ultimoId = "", proximaTroca = 0, falhas = 0, buscarTrecho = false;
  const podeRodar = () => !document.hidden && !modal.open;
  function trecho(duracao) {
    const max = Math.max(0, duracao - 9);
    return Math.floor(Math.random() * max);
  }
  function trocarLocal() {
    if (!locais.length) return;
    const e = locais[Math.floor(Math.random() * locais.length)];
    if (local.getAttribute("src") !== e.video) local.src = e.video;
    const tocar = () => {
      if (Number.isFinite(local.duration)) local.currentTime = trecho(local.duration);
      local.muted = true;
      if (podeRodar()) local.play().catch(() => {});
    };
    if (local.readyState >= 1) tocar();
    else local.addEventListener("loadedmetadata", tocar, { once: true });
  }
  function trocarYoutube() {
    if (!yt || !externos.length || !podeRodar() || falhas >= externos.length) return;
    box.classList.remove("is-youtube");
    const opcoes = externos.filter(e => e.youtubeId !== ultimoId);
    atual = (opcoes.length ? opcoes : externos)[Math.floor(Math.random() * (opcoes.length || externos.length))];
    ultimoId = atual.youtubeId;
    buscarTrecho = true;
    proximaTroca = performance.now() + 12000;
    yt.mute();
    yt.loadVideoById({ videoId:atual.youtubeId, startSeconds:Math.floor(Math.random()*8), suggestedQuality:"small" });
  }
  function sincronizar() {
    try {
      if (!podeRodar()) { local.pause(); if (yt && yt.pauseVideo) yt.pauseVideo(); }
      else if (yt && box.classList.contains("is-youtube")) { yt.mute(); yt.playVideo(); }
      else local.play().catch(() => {});
    } catch (erro) { console.warn("[zalen] fundo:", erro); }
  }
  trocarLocal();
  document.addEventListener("visibilitychange", sincronizar);
  new MutationObserver(sincronizar).observe(modal, {attributes:true, attributeFilter:["open"]});
  setInterval(() => {
    if (!podeRodar()) return;
    try {
      if (yt && externos.length && falhas < externos.length) {
        if (performance.now() >= proximaTroca) trocarYoutube();
      } else trocarLocal();
    } catch (erro) { console.warn("[zalen] fundo:", erro); falhas = externos.length; trocarLocal(); }
  }, 9000);
  function montar() {
    if (yt || !window.YT || !YT.Player) return;
    try { criarPlayer(); } catch (erro) { console.warn("[zalen] fundo do YouTube falhou:", erro); yt = null; falhas = externos.length; }
  }
  function criarPlayer() {
    yt = new YT.Player("motionYoutube", {
      width:"100%", height:"100%",
      playerVars:{autoplay:1, mute:1, playsinline:1, controls:0, disablekb:1, origin:location.origin === "null" ? undefined : location.origin},
      events:{
        onReady:trocarYoutube,
        onStateChange:event => {
          if (event.data === YT.PlayerState.PLAYING) {
            yt.mute();
            if (!podeRodar()) { yt.pauseVideo(); return; }
            const duracao = yt.getDuration();
            if (buscarTrecho && duracao > 0) {
              buscarTrecho = false;
              yt.seekTo(trecho(duracao), true);
            }
            box.classList.add("is-youtube"); local.pause();
          } else if (event.data === YT.PlayerState.ENDED) trocarYoutube();
        },
        onError:() => { falhas++; box.classList.remove("is-youtube"); trocarLocal(); proximaTroca=0; }
      }
    });
    // O API substitui o div pelo iframe: restaura a classe de posicionamento.
    const frame = document.getElementById("motionYoutube");
    if (frame) frame.classList.add("motion-youtube");
  }
  if (externos.length && window.carregarYoutubeAPI) {
    // carga única da API (script.js): se for bloqueada, o fundo fica só com MP4 local
    window.carregarYoutubeAPI().then(montar, () => { falhas = externos.length; });
  } else if (externos.length) {
    const antes = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (antes) antes(); montar(); };
    if (window.YT && YT.Player) montar();
    else { const s=document.createElement("script"); s.src="https://www.youtube.com/iframe_api"; s.onerror=()=>{falhas=externos.length;}; document.head.appendChild(s); }
  }
}
