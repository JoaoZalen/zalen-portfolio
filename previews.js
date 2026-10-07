/* Previews silenciosos para hover/focus em cards, tabela e painéis. */
(function () {
  const podeTocar = () => /^https?:$/.test(location.protocol) && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hoverFino = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let ativo = null;

  function edicaoDoAlvo(alvo) {
    const botao = alvo.closest("[data-preview]");
    if (botao) return { host: botao.querySelector(".card-cover, .thumb-button") || botao, indice: Number(botao.dataset.preview) };
    return null;
  }

  function criarVideo(ed) {
    const video = document.createElement("video");
    video.className = "hover-preview hover-preview--video";
    video.src = ed.video;
    video.poster = ed.capa;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-hidden", "true");
    video.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(video.duration) && video.duration > 6) video.currentTime = Math.min(2, video.duration / 3);
    }, { once: true });
    return video;
  }

  function criarYoutube(ed) {
    const iframe = document.createElement("iframe");
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      playsinline: "1",
      loop: "1",
      playlist: ed.youtubeId,
      rel: "0",
      modestbranding: "1",
      origin: location.origin
    });
    iframe.className = "hover-preview hover-preview--youtube";
    iframe.src = `https://www.youtube.com/embed/${ed.youtubeId}?${params}`;
    iframe.title = "";
    iframe.tabIndex = -1;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.setAttribute("aria-hidden", "true");
    return iframe;
  }

  function parar() {
    if (!ativo) return;
    ativo.host.classList.remove("has-hover-preview");
    ativo.media.remove();
    ativo = null;
  }

  function iniciar(alvo) {
    if (!hoverFino || !podeTocar() || !window.estado) return;
    const item = edicaoDoAlvo(alvo);
    if (!item || !item.host || !Number.isFinite(item.indice)) return;
    const ed = window.estado.edicoes[item.indice];
    if (!ed || ativo && ativo.host === item.host) return;
    parar();
    const media = ed.youtubeId ? criarYoutube(ed) : criarVideo(ed);
    item.host.appendChild(media);
    item.host.classList.add("has-hover-preview");
    ativo = { host: item.host, media };
    if (media.play) media.play().catch(() => {});
  }

  document.addEventListener("pointerover", (event) => iniciar(event.target));
  document.addEventListener("pointerout", (event) => {
    if (ativo && !ativo.host.contains(event.relatedTarget)) parar();
  });
  document.addEventListener("focusin", (event) => iniciar(event.target));
  document.addEventListener("focusout", parar);
  document.addEventListener("click", parar, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) parar(); });
})();
