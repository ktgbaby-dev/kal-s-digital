/* Kal’s Digital — site behaviour.
   No dependencies. Every page works without this file: navigation falls back to
   the footer links and all content is visible. */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "2348088812532"; // 0808 881 2532, the confirmed WhatsApp line
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initMenu();
    initReveal();
    initContactForm();
  });

  /* ---------- Header: hairline once the page scrolls ---------- */

  function initHeader() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    update();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------- Small-screen menu ---------- */

  function initMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var menu = document.querySelector("[data-menu]");
    if (!toggle || !menu) return;
    var label = toggle.querySelector("[data-menu-label]");
    var outside = [document.querySelector("main"), document.querySelector("footer")].filter(Boolean);

    function setOpen(open, returnFocus) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (label) label.textContent = open ? "Close the menu" : "Open the menu";
      menu.hidden = !open;
      document.documentElement.classList.toggle("menu-open", open);
      outside.forEach(function (el) {
        if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert");
      });
      if (open) {
        var first = menu.querySelector("a");
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true", true);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setOpen(false, true);
    });
    // Keep focus inside the open menu (the header bar and the menu panel).
    document.addEventListener("focusin", function (e) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (!menu.contains(e.target) && e.target !== toggle) toggle.focus();
    });
    var wide = window.matchMedia("(min-width: 1100px)");
    var onWide = function () { if (wide.matches) setOpen(false, false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }

  /* ---------- Reveal on scroll ----------
     Nothing is hidden up front. The observer's first report decides: an element already
     on screen stays as it is; one below the fold is hidden (while out of sight) and fades
     in when it arrives. If the observer never reports, everything simply stays visible. */

  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length || reduceMotion.matches || !("IntersectionObserver" in window)) return;
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (!seen.has(el)) {
          seen.add(el);
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) { io.unobserve(el); return; }
          el.classList.add("reveal-pending", "reveal-armed");
          return;
        }
        if (entry.isIntersecting) {
          el.classList.remove("reveal-pending");
          io.unobserve(el);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Contact form ----------
     Two honest modes:
     - email: /api/contact reports that email delivery is configured, so the form posts there.
     - whatsapp: otherwise. The form opens WhatsApp with the message filled in; nothing is
       sent until the visitor presses send in WhatsApp. */

  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var submit = form.querySelector("[data-submit]");
    var submitText = form.querySelector("[data-submit-text]");
    var note = form.querySelector("[data-mode-note]");
    var status = document.querySelector("[data-form-status]");
    var mode = "whatsapp";

    presetInterest(form);
    setMode("whatsapp");

    if (window.fetch && location.protocol !== "file:") {
      fetch("/api/contact", { method: "GET", headers: { Accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { if (data && data.email === true) setMode("email"); })
        .catch(function () { /* static preview or offline: stay on WhatsApp */ });
    }

    function setMode(next) {
      mode = next;
      form.setAttribute("data-mode", next);
      if (next === "email") {
        submitText.textContent = "Send enquiry";
        note.textContent = "Your message comes straight to the Kal’s Digital inbox. We reply by email, or on WhatsApp if you leave a number.";
      } else {
        submitText.textContent = "Continue on WhatsApp";
        note.textContent = "This opens WhatsApp with your message filled in, addressed to Kal’s Digital on 0808 881 2532. Nothing is sent until you press send there.";
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideStatus();
      if (form.querySelector('[name="company_website"]').value) return; // bot trap
      var data = collect(form);
      var errors = validate(data);
      showErrors(form, errors);
      if (Object.keys(errors).length) return;
      if (mode === "email") sendEmail(data); else openWhatsApp(data);
    });

    function sendEmail(data) {
      busy(true);
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; }); })
        .then(function (res) {
          busy(false);
          if (res.status === 200 && res.body.ok) {
            form.reset();
            presetInterest(form);
            showStatus("success", [
              "Thank you. Your enquiry reached our inbox.",
              "We will reply as soon as we can, by email or on WhatsApp if you left a number."
            ]);
          } else if (res.status === 400 && res.body.errors) {
            showErrors(form, res.body.errors);
          } else if (res.status === 429) {
            showStatus("error", ["You have sent several messages in a short time. Please wait a few minutes, or message us on WhatsApp."], data);
          } else {
            showStatus("error", ["Your message could not be sent, and nothing reached us. You can send the same message on WhatsApp instead."], data);
          }
        })
        .catch(function () {
          busy(false);
          showStatus("error", ["We could not reach our server, so nothing was sent. You can send the same message on WhatsApp instead."], data);
        });
    }

    function openWhatsApp(data) {
      var url = whatsappUrl(data);
      var win = window.open(url, "_blank", "noopener");
      showStatus("info", [
        win ? "WhatsApp has opened in a new tab with your message filled in." : "Your message is ready in WhatsApp.",
        "Press send in WhatsApp to reach us. Until you do, nothing has been sent."
      ], null, url);
    }

    function busy(on) {
      submit.disabled = on;
      submit.setAttribute("aria-busy", on ? "true" : "false");
      if (on) submitText.textContent = "Sending…"; else setMode(mode);
    }

    function hideStatus() { if (status) { status.hidden = true; status.innerHTML = ""; } }

    function showStatus(kind, lines, fallbackData, link) {
      if (!status) return;
      status.className = "form-status" + (kind === "error" ? " form-status--error" : "");
      status.innerHTML = "";
      lines.forEach(function (line) {
        var p = document.createElement("p");
        p.textContent = line;
        status.appendChild(p);
      });
      var href = link || (fallbackData ? whatsappUrl(fallbackData) : null);
      if (href) {
        var p2 = document.createElement("p");
        var a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "text-link";
        a.textContent = link ? "Open WhatsApp again" : "Send it on WhatsApp";
        p2.appendChild(a);
        status.appendChild(p2);
      }
      status.hidden = false;
      status.focus();
    }
  }

  var INTERESTS = {
    general: "General digital services",
    kard: "KARD",
    slotu: "Slotù",
    other: "Something else"
  };

  function presetInterest(form) {
    var wanted = new URLSearchParams(location.search).get("interest");
    if (!wanted || !INTERESTS[wanted]) return;
    var input = form.querySelector('input[name="interest"][value="' + wanted + '"]');
    if (input) input.checked = true;
  }

  function collect(form) {
    var get = function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : "";
    };
    var interest = form.querySelector('input[name="interest"]:checked');
    return {
      name: get("name"),
      business: get("business"),
      email: get("email"),
      phone: get("phone"),
      interest: interest ? interest.value : "",
      message: get("message"),
      company_website: ""
    };
  }

  function validate(d) {
    var e = {};
    if (!d.name) e.name = "Please tell us your name.";
    if (!d.email) e.email = "Please add an email address so we can reply.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.email = "That email address doesn’t look complete. Check it and try again.";
    if (d.phone && !/^[+\d][\d\s()-]{6,}$/.test(d.phone)) e.phone = "Use digits only, for example 0803 123 4567 or +234 803 123 4567.";
    if (!d.interest) e.interest = "Choose what you’re interested in.";
    if (!d.message || d.message.length < 10) e.message = "Tell us a little about the project, in a sentence or two.";
    if (d.message.length > 4000) e.message = "Please keep the message under 4,000 characters.";
    return e;
  }

  function showErrors(form, errors) {
    var first = null;
    ["name", "email", "phone", "interest", "message"].forEach(function (field) {
      var msg = errors[field];
      var box = form.querySelector('[data-error-for="' + field + '"]');
      var inputs = form.querySelectorAll('[name="' + field + '"]');
      if (box) { box.textContent = msg || ""; box.hidden = !msg; }
      inputs.forEach(function (input) {
        if (input.type === "radio") return;
        if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      });
      var group = form.querySelector('[data-group="' + field + '"]');
      if (group) { if (msg) group.setAttribute("aria-invalid", "true"); else group.removeAttribute("aria-invalid"); }
      if (msg && !first) first = inputs[0];
    });
    if (first) first.focus();
  }

  function whatsappUrl(d) {
    var lines = [
      "Hello Kal’s Digital, I’d like to talk about a project.",
      "",
      "Name: " + d.name
    ];
    if (d.business) lines.push("Business: " + d.business);
    lines.push("Email: " + d.email);
    if (d.phone) lines.push("Phone/WhatsApp: " + d.phone);
    lines.push("Interested in: " + (INTERESTS[d.interest] || d.interest));
    lines.push("", d.message);
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
  }
})();
