/* =========================================================
   MOTION · animações de entrada e microinterações
   [data-reveal]  sobe e aparece quando entra na tela (--d = atraso)
   [data-split]   título que sobe palavra por palavra
   [data-count]   número que conta do zero até o valor
   [data-tilt]    card que inclina e acende sob o mouse
   [data-scroll-top] volta ao topo da tela atual
   Barra de progresso da rolagem embaixo do menu.
   ========================================================= */
function zalenMotion() {
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hoverFino = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reduz) document.documentElement.classList.add("js-motion");

  function contar(el) {
    const alvo = Number(el.dataset.count) || 0;
    if (reduz || !alvo) { el.textContent = alvo; return; }
    const t0 = performance.now(), dur = 1400;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(passo);
    };
    el.textContent = "0";
    requestAnimationFrame(passo);
  }

  const observador = "IntersectionObserver" in window ? new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      en.target.querySelectorAll("[data-count]").forEach(contar);
      observador.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .12 }) : null;

  function dividir(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    el.setAttribute("aria-label", el.textContent.trim());
    const palavras = el.textContent.trim().split(/\s+/);
    el.innerHTML = palavras.map((p, k) => `<span class="w" aria-hidden="true"><span style="--i:${k}">${p.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</span></span>`).join(" ");
  }

  function inclinar(el) {
    if (el.dataset.tiltDone || !hoverFino || reduz) return;
    el.dataset.tiltDone = "1";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--rx", `${((.5 - y) * 7).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - .5) * 9).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  }

  function scan(raiz = document) {
    raiz.querySelectorAll("[data-split]").forEach(dividir);
    raiz.querySelectorAll("[data-tilt]").forEach(inclinar);
    raiz.querySelectorAll("[data-reveal], [data-split]").forEach((el) => {
      if (el.classList.contains("is-in")) return;
      if (!observador || reduz) { el.classList.add("is-in"); el.querySelectorAll("[data-count]").forEach(contar); return; }
      observador.observe(el);
    });
  }
  window.motionScan = scan;

  // barra de progresso de leitura da tela atual
  const barra = document.getElementById("navProgress");
  let pedido = 0;
  const atualizar = () => {
    pedido = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    document.body.classList.toggle("is-scrolled", scrollY > 40);
  };
  addEventListener("scroll", () => { if (!pedido) pedido = requestAnimationFrame(atualizar); }, { passive: true });
  addEventListener("resize", atualizar);
  addEventListener("telachange", () => requestAnimationFrame(atualizar));

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-scroll-top]")) window.scrollTo({ top: 0, behavior: reduz ? "auto" : "smooth" });
  });

  scan();
  atualizar();
}
try { zalenMotion(); } catch (erro) { console.warn("[zalen] motion:", erro); }
