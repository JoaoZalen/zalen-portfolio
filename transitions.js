/* =========================================================
   TRANSIÇÕES · motion design entre telas
   1. Três bolas (vermelha, papel, preta) explodem a partir do clique,
      com faíscas saindo do ponto.
   2. O nome da tela de destino entra letra por letra com quique,
      enquanto uma linha de "render" corre por baixo.
   3. A tela troca por baixo e persianas pretas e vermelhas saem em
      direções alternadas, revelando a nova tela.
   ========================================================= */
(function () {
  const wipe = document.getElementById("wipe");
  if (!wipe || !wipe.animate) return;
  const palavra = document.getElementById("wipeDest");
  const indice = document.getElementById("wipeIndex");
  const listras = document.getElementById("wipeStripes");
  const rotulo = wipe.querySelector(".wipe-label");
  const meta = wipe.querySelector(".wipe-meta");
  const linha = wipe.querySelector(".wipe-line");
  const bolas = [...wipe.querySelectorAll(".wipe-ball")];
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.76, 0, .24, 1)";
  const SAIDA = "cubic-bezier(.22, 1, .36, 1)";
  const QUIQUE = "cubic-bezier(.34, 1.56, .64, 1)";
  const NOMES = { topo: "Início", trabalhos: "Trabalhos", catalogo: "Catálogo", clientes: "Coleções", contato: "Contato" };
  const ORDEM = Object.keys(NOMES);
  let rodando = false;

  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const raioAte = (x, y) => Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 4;
  const pad = (n) => String(n).padStart(2, "0");

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
        { duration: 600 + Math.random() * 250, delay: Math.random() * 100, easing: SAIDA }
      ).finished.then(() => s.remove(), () => s.remove());
    }
  }

  // persianas: cada coluna tem uma faixa vermelha embaixo e uma preta em cima
  function montarListras() {
    const n = innerWidth < 700 ? 4 : 7;
    if (listras.childElementCount === n) return;
    listras.innerHTML = Array.from({ length: n }, () => `<div class="wipe-col"><i class="wipe-col-red"></i><i class="wipe-col-black"></i></div>`).join("");
  }

  function escreverPalavra(texto) {
    palavra.setAttribute("aria-label", texto);
    palavra.innerHTML = [...texto.toUpperCase()].map((l) => `<span class="wipe-letter">${l === " " ? "&nbsp;" : l}</span>`).join("");
    return [...palavra.querySelectorAll(".wipe-letter")];
  }

  async function cobrir(x, y, hash) {
    const r = raioAte(x, y);
    const tela = hash.slice(1);
    wipe.style.setProperty("--x", `${x}px`);
    wipe.style.setProperty("--y", `${y}px`);
    wipe.style.setProperty("--r", `${r}px`);
    const letras = escreverPalavra(NOMES[tela] || "");
    indice.textContent = ORDEM.includes(tela) ? `${pad(ORDEM.indexOf(tela) + 1)} / ${pad(ORDEM.length)}` : "";
    montarListras();
    // popover = top layer: a transição fica acima até do player aberto
    if (wipe.showPopover) { try { wipe.showPopover(); } catch (_) {} }
    wipe.classList.add("is-on");

    if (reduz) {
      wipe.classList.add("is-covered");
      rotulo.style.opacity = 1;
      await wipe.animate({ opacity: [0, 1] }, { duration: 180, fill: "forwards" }).finished;
      return;
    }

    faiscas(x, y);
    const anims = bolas.map((b, k) => b.animate(
      [{ transform: "translate(-50%, -50%) scale(0)" }, { transform: "translate(-50%, -50%) scale(1)" }],
      { duration: 520, delay: k * 75, easing: EASE, fill: "forwards" }
    ));

    // letras caem de baixo, girando, com quique; cada uma um pouco depois
    rotulo.style.opacity = 1;
    const inicio = 380;
    letras.forEach((l, k) => l.animate(
      [
        { transform: "translateY(115%) rotate(12deg) scale(.6)", opacity: 0 },
        { transform: "translateY(0) rotate(0) scale(1)", opacity: 1 }
      ],
      { duration: 620, delay: inicio + k * 38, easing: QUIQUE, fill: "both" }
    ));
    meta.animate(
      [{ transform: "translateY(-12px)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 420, delay: inicio + 80, easing: SAIDA, fill: "both" }
    );
    // linha de "render" correndo por baixo da palavra
    linha.animate(
      [{ transform: "scaleX(0)", transformOrigin: "left" }, { transform: "scaleX(1)", transformOrigin: "left" }],
      { duration: 700, delay: inicio + 120, easing: EASE, fill: "both" }
    );
    await anims[anims.length - 1].finished;
    // a bola preta já cobre tudo: troca pelas persianas (mesma cor, sem emenda)
    wipe.classList.add("is-covered");
  }

  async function revelar() {
    if (reduz) {
      await wipe.animate({ opacity: [1, 0] }, { duration: 200, fill: "forwards" }).finished;
      return;
    }
    const letras = [...palavra.querySelectorAll(".wipe-letter")];
    // a palavra sai para cima, letra por letra, com um leve skew
    letras.forEach((l, k) => l.animate(
      [{ transform: "translateY(0) skewY(0)", opacity: 1 }, { transform: "translateY(-120%) skewY(-8deg)", opacity: 0 }],
      { duration: 420, delay: k * 22, easing: "cubic-bezier(.55, 0, 1, .45)", fill: "forwards" }
    ));
    meta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
    linha.animate(
      [{ transform: "scaleX(1)", transformOrigin: "right" }, { transform: "scaleX(0)", transformOrigin: "right" }],
      { duration: 400, easing: EASE, fill: "forwards" }
    );
    await esperar(200);

    // persianas: pretas saem primeiro, as vermelhas vêm logo atrás
    const cols = [...listras.children];
    const meio = (cols.length - 1) / 2;
    const anims = [];
    cols.forEach((col, k) => {
      const dir = k % 2 ? 1 : -1;
      const atraso = Math.abs(k - meio) * 55;
      anims.push(col.lastElementChild.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(${dir * 101}%)` }],
        { duration: 680, delay: atraso, easing: EASE, fill: "forwards" }
      ));
      anims.push(col.firstElementChild.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(${dir * 101}%)` }],
        { duration: 680, delay: atraso + 110, easing: EASE, fill: "forwards" }
      ));
    });
    await Promise.all(anims.map((a) => a.finished));
  }

  function limpar() {
    wipe.classList.remove("is-on", "is-covered");
    if (wipe.hidePopover) { try { wipe.hidePopover(); } catch (_) {} }
    wipe.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    rotulo.style.opacity = "";
    wipe.querySelectorAll(".wipe-spark").forEach((s) => s.remove());
  }

  function trocar(hash) {
    // cada link é uma tela: na mesma tela, só volta para o topo dela
    if (location.hash === hash || (!location.hash && hash === "#topo")) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      location.hash = hash;
    }
  }

  async function transicaoPara(hash, evento, antes) {
    if (rodando) return;
    rodando = true;
    const { x, y } = pontoDo(evento);
    try {
      await cobrir(x, y, hash);
      if (window.fecharPlayer && document.getElementById("player").open) {
        document.getElementById("player").close();
      }
      if (antes) antes();
      trocar(hash);
      // segura a palavra na tela enquanto a nova tela se monta por baixo
      await esperar(reduz ? 60 : 420);
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
