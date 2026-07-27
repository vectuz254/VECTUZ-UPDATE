// ============================================================================
// VECTUZ — main.js
// Wrapped defensively: any failure inside init() must never leave the page
// hidden behind the loader. finishLoader() is guaranteed to run.
// ============================================================================

(function () {
  "use strict";

  var body = document.body;
  var loaderFinished = false;

  function finishLoader() {
    if (loaderFinished) return;
    loaderFinished = true;
    body.classList.remove("is-loading");
    body.classList.add("is-loaded");
  }

  // Hard safety net: no matter what happens above, the page reveals itself.
  var HARD_TIMEOUT_MS = 4800;
  window.setTimeout(finishLoader, HARD_TIMEOUT_MS);

  // ==========================================================================
  // Loader: scramble -> solve -> shatter -> reveal
  // ==========================================================================
  function buildCubeLoader() {
    var palette = ["#00e87a", "#f5c842", "#e84444", "#3a8fe8", "#f0ece4", "#6b7585"];
    var faces = document.querySelectorAll("#cube .face");
    if (!faces.length) { finishLoader(); return; }

    var solidColorForFace = {
      "face-front": "#00e87a",
      "face-back": "#f5c842",
      "face-right": "#e84444",
      "face-left": "#3a8fe8",
      "face-top": "#f0ece4",
      "face-bottom": "#6b7585"
    };

    var allTiles = [];

    faces.forEach(function (face) {
      var className = Array.prototype.slice.call(face.classList).filter(function (c) {
        return c.indexOf("face-") === 0;
      })[0];
      var solid = solidColorForFace[className] || "#00e87a";

      for (var i = 0; i < 9; i++) {
        var tile = document.createElement("div");
        tile.className = "tile";
        var randomColor = palette[Math.floor(Math.random() * palette.length)];
        tile.style.background = randomColor;
        face.appendChild(tile);
        allTiles.push({ el: tile, solid: solid });
      }
    });

    // Shuffle the solve order so tiles resolve in a scattered, satisfying way
      for (var s = allTiles.length - 1; s > 0; s--) {
        var j = Math.floor(Math.random() * (s + 1));
        var tmp = allTiles[s]; allTiles[s] = allTiles[j]; allTiles[j] = tmp;
      }

    var subEl = document.getElementById("loaderSub");
    var messages = ["scrambling ideas…", "aligning pixels…", "solving the cube…", "almost there…"];
    var msgIndex = 0;
    var msgInterval = window.setInterval(function () {
      msgIndex = (msgIndex + 1) % messages.length;
      if (subEl) subEl.textContent = messages[msgIndex];
    }, 700);

    // Begin "solving" shortly after scramble is visible
    window.setTimeout(function () {
      allTiles.forEach(function (t, idx) {
        window.setTimeout(function () {
          t.el.style.background = t.solid;
        }, idx * 22);
      });
    }, 1000);

    // Once solved, pause, then shatter into particles and reveal the page
    var solveDuration = 1000 + allTiles.length * 22 + 250;
    window.setTimeout(function () {
      window.clearInterval(msgInterval);
      if (subEl) subEl.textContent = "welcome to VECTUZ";
      shatterAndReveal();
    }, solveDuration);
  }

  function shatterAndReveal() {
    try {
      var field = document.getElementById("particleField");
      var cubeStage = document.querySelector(".cube-stage");
      var loaderLabel = document.querySelector(".loader-inner");
      var palette = ["#00e87a", "#f5c842", "#e84444", "#3a8fe8", "#f0ece4"];

      if (field) {
        var rect = cubeStage ? cubeStage.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var count = 60;
        for (var i = 0; i < count; i++) {
          var p = document.createElement("span");
          p.className = "particle";
          var angle = Math.random() * Math.PI * 2;
          var dist = 120 + Math.random() * 260;
          var dx = Math.cos(angle) * dist;
          var dy = Math.sin(angle) * dist;
          p.style.left = cx + "px";
          p.style.top = cy + "px";
          p.style.background = palette[i % palette.length];
          p.style.setProperty("--dx", dx + "px");
          p.style.setProperty("--dy", dy + "px");
          field.appendChild(p);
          /* eslint-disable no-loop-func */
          (function (el, delay) {
            window.setTimeout(function () { el.classList.add("go"); }, delay);
          })(p, Math.random() * 120);
        }
      }

      if (loaderLabel) {
        loaderLabel.style.transition = "opacity .5s ease, transform .5s ease";
        loaderLabel.style.opacity = "0";
        loaderLabel.style.transform = "scale(.92)";
      }

      window.setTimeout(finishLoader, 620);
    } catch (e) {
      finishLoader();
    }
  }

  // ==========================================================================
  // Ripple tap/click feedback
  // ==========================================================================
  function bindRipples() {
    document.addEventListener("pointerdown", function (e) {
      var target = e.target.closest(".ripple");
      if (!target) return;

      var rect = target.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.6;
      var x = (e.clientX != null ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
      var y = (e.clientY != null ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;

      var fx = document.createElement("span");
      fx.className = "ripple-fx";
      fx.style.width = size + "px";
      fx.style.height = size + "px";
      fx.style.left = x + "px";
      fx.style.top = y + "px";

      var computedPosition = window.getComputedStyle(target).position;
      if (computedPosition === "static") {
        target.style.position = "relative";
      }

      target.appendChild(fx);
      window.setTimeout(function () {
        if (fx.parentNode) fx.parentNode.removeChild(fx);
      }, 700);
    }, { passive: true });
  }

  // ==========================================================================
  // Dark / light theme toggle
  // ==========================================================================
  function bindThemeToggle() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;

    function updateLabel(theme) {
      btn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    }
    updateLabel(document.documentElement.getAttribute("data-theme") || "dark");

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || "dark";
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      updateLabel(next);
      try { window.localStorage.setItem("vectuz-theme", next); } catch (e) { /* ignore */ }
    });
  }

  // ==========================================================================
  // Dust burst on pricing cards — tinted to each card's own --glow colour
  // ==========================================================================
  function spawnDustBurst(x, y, color) {
    var count = 26;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "dust-particle";
      var angle = Math.random() * Math.PI * 2;
      var dist = 40 + Math.random() * 150;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = color;
      p.style.setProperty("--dx", dx + "px");
      p.style.setProperty("--dy", dy + "px");
      document.body.appendChild(p);

      /* eslint-disable no-loop-func */
      (function (el) {
        window.requestAnimationFrame(function () { el.classList.add("go"); });
        window.setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 750);
      })(p);
    }
  }

  // ==========================================================================
  // Pricing card activation: the held cube emits an energy pulse + ring,
  // the card's toy figure disintegrates into dust of the same colour, then
  // the modal opens — continuing the motif with its own rotating cube.
  // ==========================================================================
  function triggerCardEnergyEffect(card) {
    var stage = card.querySelector(".bot-cube-stage");
    var cube = card.querySelector(".bot-cube");
    var glow = card.style.getPropertyValue("--glow") || "var(--green)";
    var modalId = card.getAttribute("data-modal");

    if (cube) cube.classList.add("energy-burst");
    if (stage) {
      stage.classList.add("energy-ring");
      var rect = stage.getBoundingClientRect();
      spawnDustBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, glow);
    }
    card.classList.add("disintegrating");

    // Optional: if the Three.js robot scene loaded successfully for this
    // card, let it play its own burst too. No-op if it isn't present.
    if (window.VectuzBot3D && typeof window.VectuzBot3D.burst === "function") {
      try { window.VectuzBot3D.burst(modalId); } catch (e) { /* ignore */ }
    }

    window.setTimeout(function () {
      if (cube) cube.classList.remove("energy-burst");
      if (stage) stage.classList.remove("energy-ring");
    }, 650);
  }

  function resetCardVisual(card) {
    if (!card) return;
    card.classList.remove("disintegrating");
    var modalId = card.getAttribute("data-modal");
    if (window.VectuzBot3D && typeof window.VectuzBot3D.reset === "function") {
      try { window.VectuzBot3D.reset(modalId); } catch (e) { /* ignore */ }
    }
  }

  // ==========================================================================
  // Mini modal cube — loops scramble -> solve -> scramble while a pricing
  // modal is open. Timers are tracked per-modal so they can be cleared the
  // instant the modal closes (no wasted work in the background).
  // ==========================================================================
  var modalCubeTimers = {};

  function stopModalCube(modalId) {
    var timers = modalCubeTimers[modalId];
    if (timers) {
      timers.forEach(function (t) { window.clearTimeout(t); });
    }
    modalCubeTimers[modalId] = [];
  }

  function startModalCube(modalEl) {
    if (!modalEl) return;
    var cube = modalEl.querySelector(".mini-cube");
    if (!cube) return;

    var modalId = modalEl.id;
    stopModalCube(modalId);
    modalCubeTimers[modalId] = [];

    var palette = ["#00e87a", "#f5c842", "#e84444", "#3a8fe8", "#f0ece4", "#6b7585"];
    var solidColorForFace = {
      "mface-front": "#00e87a",
      "mface-back": "#f5c842",
      "mface-right": "#e84444",
      "mface-left": "#3a8fe8",
      "mface-top": "#f0ece4",
      "mface-bottom": "#6b7585"
    };

    if (!cube.dataset.built) {
      Object.keys(solidColorForFace).forEach(function (cls) {
        var face = document.createElement("div");
        face.className = "mface " + cls;
        for (var i = 0; i < 9; i++) {
          var tile = document.createElement("div");
          tile.className = "tile";
          face.appendChild(tile);
        }
        cube.appendChild(face);
      });
      cube.dataset.built = "1";
    }

    var tiles = [];
    cube.querySelectorAll(".mface").forEach(function (face) {
      var faceClass = Array.prototype.slice.call(face.classList).filter(function (c) {
        return c.indexOf("mface-") === 0;
      })[0];
      var solid = solidColorForFace[faceClass] || "#00e87a";
      face.querySelectorAll(".tile").forEach(function (tile) {
        tiles.push({ el: tile, solid: solid });
      });
    });

    function cycle() {
      // Scramble every tile to a random colour…
      tiles.forEach(function (t) {
        t.el.style.background = palette[Math.floor(Math.random() * palette.length)];
      });

      var order = tiles.slice();
      for (var s = order.length - 1; s > 0; s--) {
        var j = Math.floor(Math.random() * (s + 1));
        var tmp = order[s]; order[s] = order[j]; order[j] = tmp;
      }

      // …then, shortly after, solve it back tile-by-tile.
      var solveStart = window.setTimeout(function () {
        order.forEach(function (t, idx) {
          var id = window.setTimeout(function () {
            t.el.style.background = t.solid;
          }, idx * 16);
          modalCubeTimers[modalId].push(id);
        });
      }, 450);
      modalCubeTimers[modalId].push(solveStart);

      var totalCycle = 450 + order.length * 16 + 1200;
      var loopId = window.setTimeout(cycle, totalCycle);
      modalCubeTimers[modalId].push(loopId);
    }

    cycle();
  }

  // ==========================================================================
  // Mobile hamburger nav
  // ==========================================================================
  function bindNav() {
    var btn = document.getElementById("hamburgerBtn");
    var links = document.getElementById("navLinks");
    var scrim = document.getElementById("navScrim");
    if (!btn || !links || !scrim) return;

    function openMenu() {
      links.classList.add("open");
      scrim.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Close menu");
      body.style.overflow = "hidden";
    }
    function closeMenu() {
      links.classList.remove("open");
      scrim.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
      body.style.overflow = "";
    }
    function toggleMenu() {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      if (isOpen) closeMenu(); else openMenu();
    }

    btn.addEventListener("click", toggleMenu);
    scrim.addEventListener("click", closeMenu);
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  // ==========================================================================
  // Scroll reveal
  // ==========================================================================
  function bindReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    items.forEach(function (el) { observer.observe(el); });
  }

  // ==========================================================================
  // Modals
  // ==========================================================================
  function bindModals() {
    var backdrop = document.getElementById("modalBackdrop");
    var openModalEl = null;
    var activeCard = null;

    function openModal(id) {
      var modal = document.getElementById(id);
      if (!modal) return;
      closeModal();
      modal.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
      body.style.overflow = "hidden";
      openModalEl = modal;
      startModalCube(modal);
    }

    function closeModal() {
      if (openModalEl) {
        openModalEl.classList.remove("open");
        stopModalCube(openModalEl.id);
      }
      if (backdrop) backdrop.classList.remove("open");
      body.style.overflow = "";
      openModalEl = null;
      if (activeCard) {
        resetCardVisual(activeCard);
        activeCard = null;
      }
    }

    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-modal]");
      if (opener) {
        e.preventDefault();
        var targetId = opener.getAttribute("data-modal");

        if (opener.classList.contains("price-card")) {
          // Let the cube emit its energy burst and the toy figure
          // disintegrate first, then bring the modal in — same colour,
          // same motif, just picked up by the modal's own rotating cube.
          activeCard = opener;
          triggerCardEnergyEffect(opener);
          window.setTimeout(function () { openModal(targetId); }, 260);
        } else {
          openModal(targetId);
        }
        return;
      }
      var closer = e.target.closest("[data-close]");
      if (closer) {
        var pkg = closer.getAttribute("data-package");
        if (pkg) {
          var select = document.getElementById("fPackage");
          if (select) select.value = pkg;
        }
        closeModal();
        return;
      }
      if (e.target === backdrop) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  // ==========================================================================
  // FAQ accordion
  // ==========================================================================
  function bindAccordion() {
    var triggers = document.querySelectorAll(".accordion-trigger");
    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var item = trigger.closest(".accordion-item");
        var isOpen = item.classList.contains("open");

        item.parentElement.querySelectorAll(".accordion-item").forEach(function (other) {
          other.classList.remove("open");
          var t = other.querySelector(".accordion-trigger");
          if (t) t.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  // ==========================================================================
  // Contact form (placeholder submit handler — wire up a real endpoint later)
  // ==========================================================================
  function bindForm() {
    var form = document.getElementById("contactForm");
    var status = document.getElementById("formStatus");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) {
        status.textContent = "Sending…";
        status.className = "form-status";
      }

      var formData = new FormData(form);
      var payload = {};
      formData.forEach(function (value, key) { payload[key] = value; });

      // Placeholder endpoint — replace FORM_ENDPOINT_URL with a real form
      // handler (e.g. Formspree, Getform, or your own backend) when ready.
      var FORM_ENDPOINT_URL = "https://example.com/api/contact-placeholder";

      fetch(FORM_ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function () {
          if (status) {
            status.textContent = "Thanks — we'll be in touch on WhatsApp or email shortly.";
            status.className = "form-status ok";
          }
          form.reset();
        })
        .catch(function () {
          if (status) {
            status.textContent = "Couldn't send automatically — message us directly on WhatsApp instead.";
            status.className = "form-status err";
          }
        });
    });
  }

  // ==========================================================================
  // Misc
  // ==========================================================================
  function setYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    setYear();
    bindThemeToggle();
    bindNav();
    bindRipples();
    bindReveal();
    bindModals();
    bindAccordion();
    bindForm();
    buildCubeLoader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try { init(); } catch (e) { finishLoader(); }
    });
  } else {
    try { init(); } catch (e) { finishLoader(); }
  }
})();
