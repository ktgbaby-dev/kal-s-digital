// Kal's Digital — site behavior + scroll experience
// Note: no element is hidden by default in CSS. Every "starts hidden" state
// below is set at runtime by GSAP, so if the CDN fails to load, the page
// still renders complete and readable, just without motion.

document.addEventListener("DOMContentLoaded", function () {
  initNav();
  initContactForm();

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      initHero();
      initProblem();
      initApproach();
      initSystems();
      initProcess();
      initMission();
    }
  }
});

// ---------- Nav ----------

function initNav() {
  var header = document.getElementById("site-header");
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");

  function onScroll() {
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function closeMenu() {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", function () {
    var isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
}

// ---------- Contact form (front-end only, mailto fallback) ----------

function initContactForm() {
  var form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var business = document.getElementById("business").value.trim();
    var message = document.getElementById("message").value.trim();
    var status = document.getElementById("form-status");

    var subject = "New enquiry — " + (business || name || "Kal's Digital website");
    var body =
      "Name: " + name + "\n" +
      "Email: " + email + "\n" +
      "Business: " + business + "\n\n" +
      message;

    window.location.href =
      "mailto:connect@kalsdigital.com" +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    if (status) {
      status.textContent = "Opening your email app...";
      status.classList.add("visible");
    }
  });
}

// ---------- 01 Hero ----------

function initHero() {
  var lines = document.querySelectorAll("#hero .split-line > span");
  var drawLines = document.querySelectorAll("#hero-grid .draw-line");
  var drawNodes = document.querySelectorAll("#hero-grid .draw-node");

  gsap.set(lines, { yPercent: 110 });
  gsap.set(drawNodes, { scale: 0, transformOrigin: "center" });

  drawLines.forEach(function (path) {
    var len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  });

  var tl = gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } });

  tl.to(drawLines, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: "power2.inOut" })
    .to(drawNodes, { scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(2)" }, "-=0.6")
    .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.3)
    .from(".hero .eyebrow", { opacity: 0, y: 10, duration: 0.7 }, 0.1)
    .from(".hero-lede .lede", { opacity: 0, y: 16, duration: 0.8 }, 0.9)
    .from(".hero-actions", { opacity: 0, y: 16, duration: 0.8 }, 1.05)
    .from(".scroll-cue", { opacity: 0, duration: 0.8 }, 1.3);

  // subtle parallax on the architectural grid as the hero scrolls away
  gsap.to("#hero-grid", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
  });
}

// ---------- 02 Problem: cards scatter -> reorganize while pinned ----------

function initProblem() {
  var stage = document.getElementById("problem-stage");
  var cards = document.querySelectorAll(".friction-card");
  if (!stage || !cards.length) return;

  var isDesktop = window.matchMedia("(min-width: 901px)").matches;

  if (!isDesktop) {
    // Simple staggered reveal on mobile/tablet, where cards stack in normal flow.
    gsap.from(cards, {
      opacity: 0,
      y: 24,
      duration: 0.7,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: { trigger: stage, start: "top 85%" }
    });
    return;
  }

  var cols = 3;
  var cardW = 240;
  var gapX = (stage.clientWidth - cardW * cols) / (cols - 1);
  var rowH = 210;

  var scatter = [
    { x: -60, y: -40, r: -9 },
    { x: 420, y: 30, r: 6 },
    { x: 160, y: 190, r: -5 },
    { x: 640, y: -30, r: 8 },
    { x: 40, y: 140, r: 5 },
    { x: 520, y: 160, r: -7 }
  ];

  // One shared pinned timeline for the whole stage — every card is a child
  // tween inside it. (Giving each card its own pinning ScrollTrigger on the
  // same element corrupts the others' start/end math — always pin once.)
  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".problem-pin",
      start: "top top",
      end: "+=110%",
      scrub: 0.6,
      pin: true,
      anticipatePin: 1
    }
  });

  cards.forEach(function (card, i) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var targetX = col * (cardW + gapX);
    var targetY = row * rowH;
    var s = scatter[i % scatter.length];

    gsap.set(card, { x: s.x, y: s.y, rotate: s.r, opacity: 0 });

    var pos = i * 0.12;
    tl.to(card, { opacity: 1, duration: 0.1 }, pos)
      .to(card, { x: targetX, y: targetY, rotate: 0, duration: 0.5, ease: "power2.out" }, pos + 0.02);
  });
}

// ---------- 03 Approach: flow line draws, nodes light up ----------

function initApproach() {
  var path = document.getElementById("flow-path");
  var nodes = document.querySelectorAll("[data-flow-node]");
  if (!path || !nodes.length) return;

  var len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(nodes, { opacity: 0, y: 20 });

  var tl = gsap.timeline({
    scrollTrigger: { trigger: "#flow", start: "top 75%", end: "bottom 60%", scrub: 0.6 }
  });

  tl.to(path, { strokeDashoffset: 0, ease: "none", duration: nodes.length })
    .to(nodes, { opacity: 1, y: 0, duration: 0.6, stagger: 1 }, 0);

  nodes.forEach(function (node) {
    ScrollTrigger.create({
      trigger: node,
      start: "top 70%",
      onEnter: function () { node.classList.add("is-active"); },
      onLeaveBack: function () { node.classList.remove("is-active"); }
    });
  });
}

// ---------- 04 Systems: cards reveal with slight perspective ----------

function initSystems() {
  var cards = document.querySelectorAll("#systems [data-reveal]");
  if (!cards.length) return;

  gsap.set(cards, { opacity: 0, y: 36, rotateX: 6, transformOrigin: "top center" });

  ScrollTrigger.batch(cards, {
    start: "top 85%",
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
    },
    once: true
  });
}

// ---------- 05 Process: rail fills, steps activate ----------

function initProcess() {
  var list = document.getElementById("process-list");
  var fill = document.getElementById("process-rail-fill");
  var steps = document.querySelectorAll("[data-process-step]");
  if (!list || !fill) return;

  gsap.to(fill, {
    height: "100%",
    ease: "none",
    scrollTrigger: { trigger: list, start: "top 60%", end: "bottom 70%", scrub: 0.4 }
  });

  gsap.set(steps, { opacity: 0.35 });

  steps.forEach(function (step) {
    ScrollTrigger.create({
      trigger: step,
      start: "top 65%",
      end: "bottom 35%",
      onEnter: function () { step.classList.add("is-active"); gsap.to(step, { opacity: 1, duration: 0.4 }); },
      onLeave: function () { step.classList.remove("is-active"); gsap.to(step, { opacity: 0.35, duration: 0.4 }); },
      onEnterBack: function () { step.classList.add("is-active"); gsap.to(step, { opacity: 1, duration: 0.4 }); },
      onLeaveBack: function () { step.classList.remove("is-active"); gsap.to(step, { opacity: 0.35, duration: 0.4 }); }
    });
  });
}

// ---------- 06 Mission: quote mask reveal ----------

function initMission() {
  var quote = document.querySelector(".mission blockquote");
  var byline = document.querySelector(".mission-byline");
  if (!quote) return;

  gsap.from(quote, {
    opacity: 0,
    y: 24,
    duration: 1,
    ease: "power2.out",
    scrollTrigger: { trigger: ".mission", start: "top 70%" }
  });

  if (byline) {
    gsap.from(byline, {
      opacity: 0,
      y: 14,
      duration: 0.8,
      delay: 0.25,
      ease: "power2.out",
      scrollTrigger: { trigger: ".mission", start: "top 70%" }
    });
  }
}
