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

    function openModal(id) {
      var modal = document.getElementById(id);
      if (!modal) return;
      closeModal();
      modal.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
      body.style.overflow = "hidden";
      openModalEl = modal;
    }

    function closeModal() {
      if (openModalEl) openModalEl.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
      body.style.overflow = "";
      openModalEl = null;
    }

    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-modal]");
      if (opener) {
        e.preventDefault();
        openModal(opener.getAttribute("data-modal"));
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
