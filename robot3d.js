// ============================================================================
// VECTUZ — robot3d.js
// A real (lightweight) 3D robot holding a rotating, brand-coloured cube in
// each pricing card, built with Three.js loaded straight from a CDN — no
// build step, no Node, works from a phone.
//
// This is a *progressive enhancement*: if Three.js fails to load (offline,
// CDN blocked, very old browser), every function here silently does
// nothing and the plain-CSS robot icon already in the page (see style.css
// `.price-bot`) stays visible instead. Nothing in main.js depends on this
// file existing.
// ============================================================================

import * as THREE from "three";

var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Brand palette — kept in sync with the CSS custom properties in style.css.
var BRAND = {
  green: "#00e87a",
  gold: "#f5c842",
  red: "#e84444",
  blue: "#3a8fe8",
  cream: "#f0ece4",
  gray: "#6b7585"
};

var SOLVED_FACES = {
  px: BRAND.green,  // right
  nx: BRAND.blue,   // left
  py: BRAND.cream,  // top
  ny: BRAND.gray,   // bottom
  pz: BRAND.gold,   // front
  nz: BRAND.red     // back
};

var FACE_ORDER = ["px", "nx", "py", "ny", "pz", "nz"];

// A single shared circular-glow sprite texture, reused by every burst
// particle across every card (built once, cheap).
var sharedGlowTexture = null;
function getGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture;
  var size = 64;
  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext("2d");
  var grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  return sharedGlowTexture;
}

// ---------------------------------------------------------------------------
// One 3x3 tile texture per cube face, redrawn on demand for the
// scramble -> resolve flourish that plays during a burst.
// ---------------------------------------------------------------------------
function makeFaceTexture(colors) {
  var size = 180;
  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101319";
  ctx.fillRect(0, 0, size, size);
  var cell = size / 3;
  var gap = 7;
  for (var r = 0; r < 3; r++) {
    for (var c = 0; c < 3; c++) {
      ctx.fillStyle = colors[r * 3 + c];
      ctx.fillRect(c * cell + gap / 2, r * cell + gap / 2, cell - gap, cell - gap);
    }
  }
  var tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function solidTileSet(hex) {
  var out = [];
  for (var i = 0; i < 9; i++) out.push(hex);
  return out;
}

function randomTileSet() {
  var palette = [BRAND.green, BRAND.gold, BRAND.red, BRAND.blue, BRAND.cream, BRAND.gray];
  var out = [];
  for (var i = 0; i < 9; i++) out.push(palette[Math.floor(Math.random() * palette.length)]);
  return out;
}

// ---------------------------------------------------------------------------
// Registry — one controller per pricing card, keyed by its modal id
// (e.g. "pkg-starter"), so main.js can call burst()/reset() by id without
// needing to know anything about Three.js.
// ---------------------------------------------------------------------------
var registry = {};

function mountBot(canvas, glowHex, botId) {
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return null; // No WebGL — leave the CSS fallback icon in place.
  }

  var width = canvas.clientWidth || 120;
  var height = canvas.clientHeight || 130;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50);
  camera.position.set(0, 0.35, 4.4);
  camera.lookAt(0, 0.15, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  var glowColor = new THREE.Color(glowHex);
  var glowLight = new THREE.PointLight(glowColor, 1.1, 6);
  glowLight.position.set(0.5, 0.1, 1.1);
  scene.add(glowLight);

  // --- Robot rig -----------------------------------------------------------
  var metal = function () {
    return new THREE.MeshStandardMaterial({
      color: 0x394251,
      metalness: 0.55,
      roughness: 0.42,
      transparent: true,
      opacity: 1
    });
  };

  var robotGroup = new THREE.Group();

  var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.46), metal());
  head.position.set(0, 1.02, 0);
  robotGroup.add(head);

  var visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.08, 0.05),
    new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 1.1, transparent: true, opacity: 1 })
  );
  visor.position.set(0, 1.03, 0.24);
  robotGroup.add(visor);

  var torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.5), metal());
  torso.position.set(0, 0.52, 0);
  robotGroup.add(torso);

  var chestLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 1.3, transparent: true, opacity: 1 })
  );
  chestLight.position.set(0, 0.68, 0.27);
  robotGroup.add(chestLight);

  var armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), metal());
  armLeft.position.set(-0.46, 0.42, 0);
  armLeft.rotation.z = 0.18;
  robotGroup.add(armLeft);

  var armRight = new THREE.Group();
  var armRightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), metal());
  armRightMesh.position.set(0, -0.05, 0);
  armRight.add(armRightMesh);
  armRight.position.set(0.46, 0.62, 0.12);
  armRight.rotation.z = -0.65;
  robotGroup.add(armRight);

  scene.add(robotGroup);

  // --- Held cube -------------------------------------------------------------
  var faceTex = {};
  FACE_ORDER.forEach(function (f) { faceTex[f] = makeFaceTexture(solidTileSet(SOLVED_FACES[f])); });

  var materialOrder = ["px", "nx", "py", "ny", "pz", "nz"]; // BoxGeometry material order
  var cubeMaterials = materialOrder.map(function (f) {
    return new THREE.MeshStandardMaterial({
      map: faceTex[f],
      emissive: glowColor,
      emissiveIntensity: 0.22,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 1
    });
  });

  var cubeGroup = new THREE.Group();
  var cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), cubeMaterials);
  cubeGroup.add(cubeMesh);
  cubeGroup.position.set(0.62, 0.62, 0.32);
  cubeGroup.rotation.set(-0.3, 0.5, 0);
  robotGroup.add(cubeGroup);

  // ---------------------------------------------------------------------------
  // Idle animation (gentle bob + continuous cube spin), paused off-screen.
  // Also advances any active burst particles.
  // ---------------------------------------------------------------------------
  var rafId = null;
  var visible = true;
  var t = 0;
  var lastT = performance.now();
  var particles = [];

  function frame() {
    rafId = window.requestAnimationFrame(frame);
    var now = performance.now();
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    if (!visible) return;

    t += reduceMotion ? 0 : 0.016;
    cubeGroup.rotation.y += reduceMotion ? 0 : 0.012;
    robotGroup.position.y = Math.sin(t * 1.4) * 0.03;
    if (particles.length) updateParticles(dt);
    renderer.render(scene, camera);
  }

  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible = entry.isIntersecting; });
    }, { threshold: 0.05 });
    io.observe(canvas);
  }
  document.addEventListener("visibilitychange", function () {
    visible = visible && !document.hidden;
  });

  // ---------------------------------------------------------------------------
  // Burst: energy pulse on the cube + light, a quick scramble/resolve
  // flourish, a handful of glowing particles, then the robot fades out
  // (the CSS layer handles the matching dust-particle burst on the DOM side).
  // ---------------------------------------------------------------------------
  var activeTimers = [];

  function clearTimers() {
    activeTimers.forEach(function (id) { window.clearTimeout(id); });
    activeTimers = [];
  }

  function spawnParticles() {
    var count = reduceMotion ? 0 : 14;
    var worldPos = new THREE.Vector3();
    cubeGroup.getWorldPosition(worldPos);

    for (var i = 0; i < count; i++) {
      var mat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: glowColor,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var sprite = new THREE.Sprite(mat);
      var s = 0.06 + Math.random() * 0.08;
      sprite.scale.set(s, s, s);
      sprite.position.copy(worldPos);
      scene.add(sprite);

      var dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.3) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.6 + Math.random() * 1.1);

      particles.push({ sprite: sprite, dir: dir, life: 0, maxLife: 0.55 + Math.random() * 0.25 });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life += dt;
      var pct = p.life / p.maxLife;
      if (pct >= 1) {
        scene.remove(p.sprite);
        p.sprite.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.sprite.position.addScaledVector(p.dir, dt);
      p.sprite.material.opacity = 0.95 * (1 - pct);
    }
  }

  frame();

  function setFaces(colors) {
    FACE_ORDER.forEach(function (f, idx) {
      var tex = makeFaceTexture(colors[f]);
      cubeMaterials[idx].map.dispose();
      cubeMaterials[idx].map = tex;
      cubeMaterials[idx].needsUpdate = true;
    });
  }

  function burst() {
    clearTimers();

    glowLight.intensity = 3.2;
    cubeMaterials.forEach(function (m) { m.emissiveIntensity = 0.9; });
    visor.material.emissiveIntensity = 2.2;
    chestLight.material.emissiveIntensity = 2.4;

    spawnParticles();

    // Quick scramble…
    var scrambled = {};
    FACE_ORDER.forEach(function (f) { scrambled[f] = randomTileSet(); });
    setFaces(scrambled);

    // …then resolve back, one face at a time.
    FACE_ORDER.forEach(function (f, idx) {
      var id = window.setTimeout(function () {
        var solved = {};
        solved[f] = solidTileSet(SOLVED_FACES[f]);
        var texMap = {};
        texMap[f] = makeFaceTexture(solved[f]);
        var materialIdx = FACE_ORDER.indexOf(f);
        cubeMaterials[materialIdx].map.dispose();
        cubeMaterials[materialIdx].map = texMap[f];
        cubeMaterials[materialIdx].needsUpdate = true;
      }, 260 + idx * 70);
      activeTimers.push(id);
    });

    // Fade the light/emissive back down, and fade the whole robot out —
    // the DOM/CSS side is doing the matching card disintegration.
    var fadeId = window.setTimeout(function () {
      glowLight.intensity = 1.1;
      cubeMaterials.forEach(function (m) { m.emissiveIntensity = 0.22; });
      visor.material.emissiveIntensity = 1.1;
      chestLight.material.emissiveIntensity = 1.3;

      var steps = 10;
      for (var i = 1; i <= steps; i++) {
        var stepId = window.setTimeout(function (iCopy) {
          return function () {
            var op = 1 - iCopy / steps;
            robotGroup.traverse(function (obj) {
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.opacity = op; });
                else obj.material.opacity = op;
              }
            });
          };
        }(i), 700 + i * 25);
        activeTimers.push(stepId);
      }
    }, 650);
    activeTimers.push(fadeId);
  }

  function reset() {
    clearTimers();
    glowLight.intensity = 1.1;
    visor.material.emissiveIntensity = 1.1;
    chestLight.material.emissiveIntensity = 1.3;
    setFaces(SOLVED_FACES_AS_TILES());
    cubeMaterials.forEach(function (m) { m.emissiveIntensity = 0.22; });
    robotGroup.traverse(function (obj) {
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.opacity = 1; });
        else obj.material.opacity = 1;
      }
    });
  }

  function SOLVED_FACES_AS_TILES() {
    var out = {};
    FACE_ORDER.forEach(function (f) { out[f] = solidTileSet(SOLVED_FACES[f]); });
    return out;
  }

  function dispose() {
    clearTimers();
    if (io) io.disconnect();
    window.cancelAnimationFrame(rafId);
    renderer.dispose();
  }

  return { burst: burst, reset: reset, dispose: dispose };
}

// ---------------------------------------------------------------------------
// Boot: find every `.price-bot-canvas` in the page and mount a scene onto
// it. If anything here throws (CDN blocked, WebGL unsupported, etc.) it's
// caught and the plain CSS robot icon already in the markup stays visible.
// ---------------------------------------------------------------------------
function boot() {
  var canvases = document.querySelectorAll(".price-bot-canvas");
  canvases.forEach(function (canvas) {
    try {
      var glowHex = canvas.getAttribute("data-glow-hex") || "#00e87a";
      var botId = canvas.getAttribute("data-bot-id");
      var controller = mountBot(canvas, glowHex, botId);
      if (!controller) return;

      registry[botId] = controller;
      canvas.classList.add("is-active");
      var wrap = canvas.closest(".price-bot");
      if (wrap) wrap.classList.add("has-3d-bot");
    } catch (e) {
      // Silently leave the CSS fallback icon visible for this card.
    }
  });

  window.VectuzBot3D = {
    burst: function (id) { if (registry[id]) registry[id].burst(); },
    reset: function (id) { if (registry[id]) registry[id].reset(); }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
