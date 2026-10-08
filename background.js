/* Fundo decorativo. Vídeo MP4 local desenhado num canvas minúsculo e esticado
   na tela: o próprio esticamento deixa a imagem desfocada, sem filter: blur()
   (que travava o site redesenhando a tela inteira a cada quadro). */
function iniciarFundo(edicoes) {
  const box = document.getElementById("motionBg");
  const local = document.getElementById("motionFallback");
  const modal = document.getElementById("player");
  if (!box || !local || !modal) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const locais = edicoes.filter(e => !e.youtubeId && e.video);
  if (!locais.length) return;

  const cv = document.createElement("canvas");
  cv.className = "motion-canvas";
  cv.width = 64; cv.height = 36;
  cv.setAttribute("aria-hidden", "true");
  box.insertBefore(cv, box.firstChild);
  const g = cv.getContext("2d", { alpha: false });

  local.muted = true;
  local.loop = true;
  local.playsInline = true;
  const podeRodar = () => !document.hidden && !modal.open && !document.body.classList.contains("is-catalog");

  function trecho(duracao) { return Math.floor(Math.random() * Math.max(0, duracao - 9)); }
  function trocar() {
    const e = locais[Math.floor(Math.random() * locais.length)];
    if (local.getAttribute("src") !== e.video) local.src = e.video;
    const tocar = () => {
      if (Number.isFinite(local.duration)) local.currentTime = trecho(local.duration);
      if (podeRodar()) local.play().catch(() => {});
    };
    if (local.readyState >= 1) tocar();
    else local.addEventListener("loadedmetadata", tocar, { once: true });
  }

  /* ~12 quadros por segundo bastam para um fundo desfocado */
  let ultimo = 0, id = 0;
  function desenhar(t) {
    id = 0;
    if (!podeRodar()) return;
    if (t - ultimo > 80 && local.readyState >= 2) {
      ultimo = t;
      try { g.drawImage(local, 0, 0, cv.width, cv.height); box.classList.add("is-ready"); } catch (_) {}
    }
    id = requestAnimationFrame(desenhar);
  }
  function sincronizar() {
    if (!podeRodar()) { local.pause(); if (id) { cancelAnimationFrame(id); id = 0; } return; }
    local.play().catch(() => {});
    if (!id) id = requestAnimationFrame(desenhar);
  }

  trocar();
  sincronizar();
  document.addEventListener("visibilitychange", sincronizar);
  addEventListener("telachange", sincronizar);
  new MutationObserver(sincronizar).observe(modal, { attributes: true, attributeFilter: ["open"] });
  setInterval(() => { if (podeRodar()) trocar(); }, 9000);
}
