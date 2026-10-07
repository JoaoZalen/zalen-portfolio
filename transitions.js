/* =========================================================
   TRANSIÇÕES · motion design entre telas
   1. Três bolas (vermelha, papel, preta) crescem a partir do clique
      e cobrem a tela, com faíscas saindo do ponto.
   2. O nome aparece no meio com o destino embaixo.
   3. A tela troca por baixo e uma íris abre do centro revelando.
   ========================================================= */
(function () {
  const wipe = document.getElementById("wipe");
  if (!wipe || !wipe.animate) return;
  const destino = document.getElementById("wipeDest");
  const rotulo = wipe.querySelector(".wipe-label");
  const nome = wipe.querySelector(".wipe-name");
  const bolas = [...wipe.querySelectorAll(".wipe-ball")];
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.76, 0, .24, 1)";
  const NOMES = { topo: "Início", trabalhos: "Trabalhos", catalogo: "Catálogo", clientes: "Coleções", contato: "Contato" };
  let rodando = false;

  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const raioAte = (x, y) => Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 4;

  function pontoDo(evento) {
    // clique real usa o ponteiro; Enter no teclado usa o centro do elemento
    if (evento && evento.detail !== 0 && evento.clientX != null && (evento.clientX || evento.clientY)) return { x: evento.clientX, y: evento.clientY };
    const el = evento && evento.currentTarget && evento.currentTarget.getBoundingClientRect ? evento.currentTarget : evento && evento.target;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r && r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return window.ultimoToque || { x: innerWidth / 2, y: innerHeight / 2 };
  }

  function faiscas(x, y) {
    const cores = ["var(--red)", "var(--paper)", "var(--red)", "var(--black)"];
    for (let k = 0; k < 16; k++) {
      const s = document.createElement("i");
      const tam = 8 + Math.random() * 26;
      const ang = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * Math.min(innerWidth, innerHeight) * .45;
      s.className = "wipe-spark";
      s.style.cssText = `left:${x}px;top:${y}px;width:${tam}px;height:${tam}px;background:${cores[k % cores.length]}`;
      wipe.appendChild(s);
      s.animate(
        [
          { transform: "translate(-50%, -50%) scale(0)" },
          { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * .7}px), calc(-50% + ${Math.sin(ang) * dist * .7}px)) scale(1.2)`, offset: .55 },
          { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0)` }
        ],
        { duration: 650 + Math.random() * 300, delay: Math.random() * 120, easing: "cubic-bezier(.22, 1, .36, 1)" }
      ).finished.then(() => s.remove(), () => s.remove());
    }
  }

  async function cobrir(x, y, texto) {
    const r = raioAte(x, y);
    wipe.style.setProperty("--x", `${x}px`);
    wipe.style.setProperty("--y", `${y}px`);
    wipe.style.setProperty("--r", `${r}px`);
    destino.textContent = texto;
    // popover = top layer: a transição fica acima até do player aberto
    if (wipe.showPopover) { try { wipe.showPopover(); } catch (_) {} }
    wipe.classList.add("is-on");

    if (reduz) {
      bolas[2].style.transform = "translate(-50%, -50%) scale(1)";
      rotulo.style.opacity = 1;
      await wipe.animate({ opacity: [0, 1] }, { duration: 180, fill: "forwards" }).finished;
      return;
    }

    faiscas(x, y);
    const anims = bolas.map((b, k) => b.animate(
      [{ transform: "translate(-50%, -50%) scale(0)" }, { transform: "translate(-50%, -50%) scale(1)" }],
      { duration: 640, delay: k * 95, easing: EASE, fill: "forwards" }
    ));
    // o nome sobe "de dentro" da bola preta, letra por letra
    rotulo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 560, fill: "forwards" });
    nome.animate(
      [
        { transform: "translateY(60%) scale(.9)", letterSpacing: ".25em", filter: "blur(10px)" },
        { transform: "translateY(0) scale(1)", letterSpacing: "0em", filter: "blur(0)" }
      ],
      { duration: 620, delay: 560, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" }
    );
    destino.animate(
      [{ transform: "translateY(120%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: 500, delay: 720, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" }
    );
    await anims[anims.length - 1].finished;
  }

  async function revelar() {
    if (reduz) {
      await wipe.animate({ opacity: [1, 0] }, { duration: 200, fill: "forwards" }).finished;
      return;
    }
    rotulo.animate(
      [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.15)", opacity: 0 }],
      { duration: 380, easing: "cubic-bezier(.55, 0, 1, .45)", fill: "forwards" }
    );
    await esperar(160);
    // íris: um buraco abre do centro da tela até cobrir tudo
    const r = raioAte(innerWidth / 2, innerHeight / 2);
    await wipe.animate({ "--hole": ["0px", `${r}px`] }, { duration: 700, easing: EASE, fill: "forwards" }).finished;
  }

  function limpar() {
    wipe.classList.remove("is-on");
    if (wipe.hidePopover) { try { wipe.hidePopover(); } catch (_) {} }
    wipe.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    bolas[2].style.transform = "";
    rotulo.style.opacity = "";
    wipe.querySelectorAll(".wipe-spark").forEach((s) => s.remove());
  }

  function trocar(hash) {
    const alvo = document.getElementById(hash.slice(1));
    if (location.hash === hash || (!location.hash && hash === "#topo")) {
      if (alvo && !alvo.hidden) alvo.scrollIntoView({ behavior: "instant" });
    } else {
      location.hash = hash;
    }
  }

  async function transicaoPara(hash, evento, antes) {
    if (rodando) return;
    rodando = true;
    const { x, y } = pontoDo(evento);
    try {
      await cobrir(x, y, NOMES[hash.slice(1)] || "");
      if (window.fecharPlayer && document.getElementById("player").open) {
        document.getElementById("player").close();
      }
      if (antes) antes();
      trocar(hash);
      // espera o layout da nova tela assentar (mostrar() usa requestAnimationFrame)
      await esperar(reduz ? 60 : 280);
      await revelar();
    } finally {
      limpar();
      rodando = false;
    }
  }
  window.transicaoPara = transicaoPara;

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains("skip")) return;
    const hash = a.getAttribute("href");
    if (hash.length < 2 || !document.getElementById(hash.slice(1))) return;
    e.preventDefault();
    transicaoPara(hash, { clientX: e.clientX, clientY: e.clientY, detail: e.detail, target: a });
  });
})();
