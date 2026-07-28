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
  // UI states — one reusable overlay covering all 10 states from the
  // checklist. Real triggers (form validation, loading, success) already
  // route through this; the rest are demo-only until there's a backend
  // that can actually go offline, deny permission, expire a session, etc.
  // ==========================================================================
  var STATE_CONFIG = {
    loading:        { icon: "◐", title: "Loading",              message: "One moment while we fetch that…",              tone: "neutral", anim: "anim-spin" },
    empty:          { icon: "📭", title: "Nothing here yet",     message: "Once you have projects or invoices, they'll show up here.", tone: "neutral", anim: "anim-fade" },
    error:          { icon: "⚠️", title: "Something went wrong", message: "That didn't go through. No changes were saved.", tone: "error",   anim: "anim-shake", actions: [{ label: "Try again", primary: true }, { label: "Dismiss" }] },
    offline:        { icon: "📡", title: "No internet connection", message: "You're offline — we'll retry automatically once you're back.", tone: "error", anim: "anim-shake", actions: [{ label: "Retry now", primary: true }] },
    slow:           { icon: "🐢", title: "Slow network",         message: "This is taking longer than usual. Still working on it…", tone: "warn", anim: "anim-pulse" },
    noResults:      { icon: "🔍", title: "No results found",     message: "Nothing matched that search. Try a different term.", tone: "neutral", anim: "anim-drift" },
    denied:         { icon: "🔒", title: "Permission denied",    message: "Your account doesn't have access to this yet — ask your admin to upgrade your role.", tone: "error", anim: "anim-shake", actions: [{ label: "Close" }] },
    sessionExpired: { icon: "⏰", title: "Session expired",       message: "For your security, you've been signed out. Please log in again.", tone: "warn", anim: "anim-pop", actions: [{ label: "Log in again", primary: true, action: "logout" }] },
    validation:     { icon: "✏️", title: "Check your details",   message: "One or more fields need a second look before we can continue.", tone: "warn", anim: "anim-shake" },
    success:        { icon: "✅", title: "Success",               message: "That went through cleanly.",                   tone: "success", anim: "anim-pop" }
  };

  function bindStateOverlay() {
    var overlay = document.getElementById("stateOverlay");
    var card = document.getElementById("stateCard");
    var iconEl = document.getElementById("stateIcon");
    var titleEl = document.getElementById("stateTitle");
    var msgEl = document.getElementById("stateMessage");
    var actionsEl = document.getElementById("stateActions");
    if (!overlay) return;

    var autoHideTimer = null;

    function showState(key, overrides) {
      var cfg = STATE_CONFIG[key];
      if (!cfg) return;
      var merged = Object.assign({}, cfg, overrides || {});

      card.className = "state-card tone-" + merged.tone;
      iconEl.className = "state-icon " + merged.anim;
      // Force the icon animation to replay even if the same state fires twice in a row.
      void iconEl.offsetWidth;
      iconEl.textContent = merged.icon;
      titleEl.textContent = merged.title;
      msgEl.textContent = merged.message;

      actionsEl.innerHTML = "";
      var actions = merged.actions || [{ label: "Close" }];
      actions.forEach(function (a) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn ripple " + (a.primary ? "btn-primary" : "btn-ghost");
        btn.textContent = a.label;
        btn.addEventListener("click", function () {
          if (a.action === "logout") {
            hideState();
            var logoutBtn = document.getElementById("logoutBtn");
            if (logoutBtn) logoutBtn.click();
          } else {
            hideState();
          }
        });
        actionsEl.appendChild(btn);
      });

      overlay.classList.add("open");
      window.clearTimeout(autoHideTimer);
      if (merged.autoHideMs) {
        autoHideTimer = window.setTimeout(hideState, merged.autoHideMs);
      }
    }

    function hideState() {
      overlay.classList.remove("open");
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) hideState();
    });

    document.querySelectorAll(".state-trigger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showState(btn.dataset.state);
      });
    });

    // Exposed so login logic (outside this closure) can trigger states too.
    window.__vectuzShowState = showState;
    window.__vectuzHideState = hideState;
  }

  function showState(key, overrides) {
    if (window.__vectuzShowState) window.__vectuzShowState(key, overrides);
  }

  // ==========================================================================
  // Mini-cube builder — same tile-face pattern as main.js's modal cube,
  // reused here so the login screen's cube isn't just a static shape.
  // ==========================================================================
  function buildMiniCube(cube) {
    if (!cube || cube.dataset.built) return;
    try {
      var colors = {
        "mface-front": "#00e87a",
        "mface-back": "#f5c842",
        "mface-right": "#e84444",
        "mface-left": "#3a8fe8",
        "mface-top": "#f0ece4",
        "mface-bottom": "#6b7585"
      };
      Object.keys(colors).forEach(function (cls) {
        var face = document.createElement("div");
        face.className = "mface " + cls;
        for (var i = 0; i < 9; i++) {
          var tile = document.createElement("div");
          tile.className = "tile";
          tile.style.background = colors[cls];
          face.appendChild(tile);
        }
        cube.appendChild(face);
      });
      cube.dataset.built = "1";
      // Smooth entrance instead of popping in fully-formed.
      cube.style.opacity = "0";
      cube.style.transform += " scale(.6)";
      requestAnimationFrame(function () {
        cube.style.transition = "opacity .5s var(--spring), transform .5s var(--spring)";
        cube.style.opacity = "1";
      });
    } catch (err) {
      // If this ever throws, fail visibly instead of leaving a blank square.
      showState("error", { message: "The cube animation couldn't load, but sign-in still works." });
    }
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
        showState("validation", {
          message: !idVal && !passVal
            ? "Enter both your email/phone and your password to sign in."
            : (!idVal ? "Enter your email or phone number." : "Enter your password.")
        });
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
      showState("success", { title: "Signed in", message: "Loading your portal…", autoHideMs: 900 });
      loginScreen.classList.add("is-leaving");
      window.setTimeout(function () {
        loginScreen.hidden = true;
        loginScreen.classList.remove("is-leaving");
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
      loginScreen.classList.remove("is-leaving");
      loginScreen.hidden = false;
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
    bindStateOverlay();
    buildMiniCube(document.getElementById("loginCube"));
    bindLogin();
    bindLogout();
    bindAccordion();
    bindMpesaEasterEgg();
    bindCubeTapEasterEgg();
  });
})();
