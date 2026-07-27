// ============================================================================
// VECTUZ — portal.js
// Demo shell: login is intentionally a stand-in (any email/phone + password
// gets you in) so the whole flow can be reviewed before Firestore auth and
// the Daraja API are wired up. Every hook below (spinner state, greeting,
// plan display, payment card) is written so swapping in real Firestore
// calls later means replacing the inside of a function, not restructuring
// the page.
// ============================================================================

(function () {
  "use strict";

  var body = document.body;

  // ==========================================================================
  // Theme toggle (same behaviour as the landing page)
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
      try { window.localStorage.setItem("vectuz-theme", next); } catch (e) {}
    });
  }

  // ==========================================================================
  // Ripple (shared visual language with the landing page)
  // ==========================================================================
  function bindRipples() {
    document.addEventListener("pointerdown", function (e) {
      var target = e.target.closest(".ripple");
      if (!target || target.disabled) return;
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
      if (window.getComputedStyle(target).position === "static") target.style.position = "relative";
      target.appendChild(fx);
      window.setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 700);
    }, { passive: true });
  }

  // ==========================================================================
  // Mini-cube builder — same tile-face pattern as main.js's modal cube,
  // reused here so the login screen's cube isn't just a static shape.
  // ==========================================================================
  function buildMiniCube(cube) {
    if (!cube || cube.dataset.built) return;
    var faces = ["front", "back", "right", "left", "top", "bottom"];
    faces.forEach(function (name) {
      var face = document.createElement("div");
      face.className = "mface mface-" + name;
      for (var i = 0; i < 9; i++) {
        var tile = document.createElement("div");
        tile.className = "tile";
        tile.style.background = "#00e87a";
        face.appendChild(tile);
      }
      cube.appendChild(face);
    });
    cube.dataset.built = "1";
  }

  // ==========================================================================
  // Login flow (mock — swap the inside of submitLogin() for real Firestore
  // auth later; everything downstream already expects a resolved identity)
  // ==========================================================================
  function bindLogin() {
    var form = document.getElementById("loginForm");
    var card = document.querySelector(".login-card");
    var submitBtn = document.getElementById("loginSubmit");
    var loginScreen = document.getElementById("loginScreen");
    var dashboard = document.getElementById("dashboard");
    var idInput = document.getElementById("loginId");

    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var idVal = idInput.value.trim();
      var passVal = document.getElementById("loginPass").value;

      if (!idVal || !passVal) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        return;
      }

      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
      submitBtn.querySelector(".login-submit-label").textContent = "Signing in…";

      // Simulated auth round-trip — this is exactly where a Firestore
      // signInWithEmailAndPassword() (or phone-auth) call will go.
      window.setTimeout(function () {
        enterDashboard(idVal);
      }, 900);
    });

    function enterDashboard(identifier) {
      loginScreen.style.transition = "opacity .5s ease";
      loginScreen.style.opacity = "0";
      window.setTimeout(function () {
        loginScreen.hidden = true;
        dashboard.hidden = false;
        window.scrollTo(0, 0);
        setGreeting(identifier);
        bindRevealFresh();
      }, 500);
    }

    function setGreeting(identifier) {
      var name = identifier.indexOf("@") > -1 ? identifier.split("@")[0] : identifier;
      name = name.replace(/[^a-zA-Z0-9]/g, " ").trim();
      var display = name ? name.charAt(0).toUpperCase() + name.slice(1) : "there";
      var greetEl = document.getElementById("portalGreeting");
      if (greetEl) greetEl.textContent = "Welcome back, " + display + ".";
    }
  }

  function bindLogout() {
    var btn = document.getElementById("logoutBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      document.getElementById("dashboard").hidden = true;
      var loginScreen = document.getElementById("loginScreen");
      loginScreen.hidden = false;
      loginScreen.style.opacity = "";
      document.getElementById("loginForm").reset();
      var submitBtn = document.getElementById("loginSubmit");
      submitBtn.classList.remove("is-loading");
      submitBtn.disabled = false;
      submitBtn.querySelector(".login-submit-label").textContent = "Sign in";
    });
  }

  // ==========================================================================
  // Scroll reveal (dashboard content is hidden at load, so its .reveal
  // items are (re)observed only once it becomes visible)
  // ==========================================================================
  var revealObserver = null;
  function bindRevealFresh() {
    var items = document.querySelectorAll("#dashboard .reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    }
    items.forEach(function (el) { revealObserver.observe(el); });
  }

  // ==========================================================================
  // Plan accordion
  // ==========================================================================
  function bindAccordion() {
    var cards = document.querySelectorAll(".tier-card");
    cards.forEach(function (card) {
      var head = card.querySelector(".tier-head");
      head.addEventListener("click", function () {
        var isOpen = card.classList.contains("is-open");
        card.classList.toggle("is-open", !isOpen);
        head.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  // ==========================================================================
  // Easter egg 1 — type "mpesa" anywhere on the portal
  // (Different trigger and payoff from anything on the landing page: this
  // one is keyword-typed and payments-themed, not a click/tap gimmick.)
  // ==========================================================================
  function bindMpesaEasterEgg() {
    var buffer = "";
    var target = "mpesa";
    var rainField = document.getElementById("mpesaRain");
    var toast = document.getElementById("eggToast");
    var toastTimer = null;

    document.addEventListener("keydown", function (e) {
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
      if (buffer === target) {
        triggerCoinRain();
        showToast("Lipa Na M-Pesa mode unlocked 💚");
        buffer = "";
      }
    });

    function triggerCoinRain() {
      if (!rainField) return;
      var symbols = ["🟢", "💚", "KES"];
      var count = 34;
      for (var i = 0; i < count; i++) {
        (function () {
          var coin = document.createElement("span");
          coin.className = "mp-coin";
          coin.textContent = symbols[Math.floor(Math.random() * symbols.length)];
          coin.style.left = Math.random() * 100 + "vw";
          var duration = 2.6 + Math.random() * 1.8;
          coin.style.animationDuration = duration + "s";
          coin.style.animationDelay = Math.random() * 0.6 + "s";
          rainField.appendChild(coin);
          window.setTimeout(function () {
            if (coin.parentNode) coin.parentNode.removeChild(coin);
          }, (duration + 1) * 1000);
        })();
      }
    }

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("show");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 2600);
    }
  }

  // ==========================================================================
  // Easter egg 2 — tap the login screen's cube 5x fast to open a small
  // dev-console panel. Distinct trigger from egg 1, and only reachable
  // pre-login, so it never collides with the payments-themed one.
  // ==========================================================================
  function bindCubeTapEasterEgg() {
    var stage = document.getElementById("loginCubeStage");
    var panel = document.getElementById("devPanel");
    var closeBtn = document.getElementById("devPanelClose");
    if (!stage || !panel) return;

    var taps = 0;
    var tapTimer = null;

    stage.addEventListener("click", function () {
      taps++;
      window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(function () { taps = 0; }, 1400);
      if (taps >= 5) {
        taps = 0;
        panel.classList.add("open");
      }
    });

    function closePanel() { panel.classList.remove("open"); }
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
  }

  // ==========================================================================
  // Init
  // ==========================================================================
  document.addEventListener("DOMContentLoaded", function () {
    bindThemeToggle();
    bindRipples();
    buildMiniCube(document.getElementById("loginCube"));
    bindLogin();
    bindLogout();
    bindAccordion();
    bindMpesaEasterEgg();
    bindCubeTapEasterEgg();
  });
})();
