/**
 * Padaria Veneto — scripts.js
 * -----------------------------------------------------------------------------
 * Toda a interatividade da landing page, sem dependências e sem build.
 *
 * Princípios aplicados:
 * - Uma responsabilidade por função (funções pequenas e previsíveis).
 * - Lógica de negócio pura (horário de funcionamento, mensagem do pedido)
 *   separada da manipulação de DOM.
 * - Nenhum estado global implícito: cada módulo inicializa o que é seu.
 * - Dados do negócio centralizados em CONFIG.
 *
 * Módulos:
 *  01. Configuração
 *  02. Utilidades
 *  03. Links de WhatsApp
 *  04. Analytics
 *  05. Faixa de delivery
 *  06. Status "aberto agora"
 *  07. Cabeçalho e menu mobile
 *  08. Formulário de encomenda
 *  09. Animação de entrada
 *  10. Mapa sob demanda
 *  11. Galeria (lightbox)
 *  12. Fallback de imagens
 *  13. Ano do rodapé
 * -----------------------------------------------------------------------------
 */

(() => {
  "use strict";

  /* ==========================================================================
     01. Configuração
     Edite apenas este bloco para atualizar dados do negócio.
     ========================================================================== */
  const CONFIG = {
    nome: "Padaria Veneto",
    telefone: "+5516993685099", // formato internacional, só números
    telefoneExibicao: "(16) 99368-5099",
    endereco: "Av. João Orlando Ruggiero, 105 - Jardim Embaré, São Carlos - SP",
    mapsRota:
      "https://www.google.com/maps/dir/?api=1&destination=Padaria+Veneto,+Av.+Jo%C3%A3o+Orlando+Ruggiero,+105,+S%C3%A3o+Carlos,+SP",
    mapsEmbed:
      "https://www.google.com/maps?q=Padaria+Veneto,+Av.+Jo%C3%A3o+Orlando+Ruggiero,+105,+Jardim+Embar%C3%A9,+S%C3%A3o+Carlos+-+SP&z=17&output=embed&hl=pt-BR",
    timezone: "America/Sao_Paulo",

    // Horário de funcionamento (domingo = 0)
    hours: [
      { day: 1, label: "Segunda", open: "06:00", close: "19:00" },
      { day: 2, label: "Terça", open: "06:00", close: "19:00" },
      { day: 3, label: "Quarta", open: "06:00", close: "19:00" },
      { day: 4, label: "Quinta", open: "06:00", close: "19:00" },
      { day: 5, label: "Sexta", open: "06:00", close: "19:00" },
      { day: 6, label: "Sábado", open: "06:00", close: "14:00" },
      { day: 0, label: "Domingo", open: "06:30", close: "12:00" },
    ],

    // Delivery: preencha os links. A faixa só aparece se houver pelo menos um.
    delivery: {
      ifood: "",
      anotaai: "",
      propria: "",
    },

    // Mensuração (opcional)
    ga4: "",
    pixel: "",

    // Mensagens pré-preenchidas do WhatsApp
    mensagens: {
      padrao: "Olá, Padaria Veneto! Vi o site e gostaria de falar com vocês.",
      hero: "Olá, Padaria Veneto! Vi o site e gostaria de fazer um pedido. 🥖",
      paes: "Olá! Gostaria de encomendar pães. Podem me ajudar?",
      bolos: "Olá! Gostaria de encomendar um bolo/torta. Podem me ajudar?",
      roscas: "Olá! Gostaria de encomendar roscas e pães doces.",
      doces: "Olá! Gostaria de encomendar doces e bolachas.",
      entrega: "Olá! Gostaria de saber sobre entrega na minha região.",
      faq: "Olá! Tenho uma dúvida sobre a Padaria Veneto.",
    },
  };

  const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const HOURS_BY_DAY = Object.fromEntries(CONFIG.hours.map((hours) => [hours.day, hours]));

  /* ==========================================================================
     02. Utilidades
     ========================================================================== */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /** Converte "HH:MM" em minutos desde a meia-noite. */
  const timeToMinutes = (time) => {
    const [hours, minutes] = String(time).split(":").map(Number);
    return hours * 60 + minutes;
  };

  /** Converte minutos desde a meia-noite em "HH:MM". */
  const minutesToTime = (totalMinutes) => {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  /** "06:00" -> "6h" | "06:30" -> "6:30" (usado no hero). */
  const formatFriendlyTime = (time) => String(time).replace(/^0/, "").replace(":00", "h");

  /** Mantém apenas dígitos — útil para montar links de telefone. */
  const digitsOnly = (value) => String(value).replace(/\D/g, "");

  const createPlaceholderImage = () =>
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#EFE3CC"/><stop offset="1" stop-color="#D9C29A"/>' +
        "</linearGradient></defs>" +
        '<rect width="800" height="800" fill="url(#g)"/>' +
        '<text x="400" y="410" font-family="Georgia,serif" font-size="42" fill="#8A6A3E" text-anchor="middle">Padaria Veneto</text>' +
        "</svg>"
    );

  const PLACEHOLDER_IMAGE = createPlaceholderImage();

  /**
   * Envia um evento para as ferramentas de mensuração configuradas.
   * Nunca lança erro: analytics não pode quebrar a página.
   */
  const track = (eventName, params = {}) => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...params });

      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", eventName, params);
      }
    } catch {
      /* silêncio intencional: mensuração é acessória */
    }
  };

  /** Monta um link wa.me com a mensagem já codificada. */
  const whatsappUrl = (message = CONFIG.mensagens.padrao) =>
    `https://wa.me/${digitsOnly(CONFIG.telefone)}?text=${encodeURIComponent(message)}`;

  /* ==========================================================================
     03. Links de WhatsApp
     Qualquer elemento com [data-wa] vira um link pronto para o WhatsApp.
     ========================================================================== */
  const initWhatsAppLinks = () => {
    $$("[data-wa]").forEach((element) => {
      const key = element.dataset.wa;
      const message = element.dataset.msg || CONFIG.mensagens[key] || CONFIG.mensagens.padrao;

      element.href = whatsappUrl(message);
      element.target = "_blank";
      element.rel = "noopener";
    });
  };

  /* ==========================================================================
     04. Analytics (carregado apenas se configurado)
     ========================================================================== */
  const loadGoogleAnalytics = (measurementId) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });
  };

  const loadMetaPixel = (pixelId) => {
    if (window.fbq) return;

    const fbq = function fbq() {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  };

  const initAnalytics = () => {
    if (CONFIG.ga4) loadGoogleAnalytics(CONFIG.ga4);
    if (CONFIG.pixel) loadMetaPixel(CONFIG.pixel);
  };

  const initClickTracking = () => {
    $$("[data-track]").forEach((element) => {
      element.addEventListener("click", () => {
        // O envio do formulário tem um evento próprio (encomenda_enviada).
        if (element.tagName === "BUTTON" && element.type === "submit") return;

        const eventName = element.dataset.track;
        const section = element.closest("section");
        track(`${eventName}_click`, {
          origem: element.dataset.wa || element.getAttribute("href") || eventName,
          local: section ? section.id : "topo",
        });
      });
    });
  };

  /* ==========================================================================
     05. Faixa de delivery
     ========================================================================== */
  const DELIVERY_PLATFORMS = [
    { key: "ifood", label: "Pedir no iFood" },
    { key: "anotaai", label: "Pedir no Anota AI" },
    { key: "propria", label: "Pedir entrega própria" },
  ];

  const initDeliveryBand = () => {
    const available = DELIVERY_PLATFORMS.filter((platform) =>
      (CONFIG.delivery[platform.key] || "").trim()
    );
    if (available.length === 0) return;

    const band = $("#deliveryBand");
    const links = $("#deliveryLinks");
    if (!band || !links) return;

    available.forEach((platform) => {
      const link = document.createElement("a");
      link.href = CONFIG.delivery[platform.key];
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = platform.label;
      link.addEventListener("click", () => track("delivery_click", { plataforma: platform.key }));
      links.appendChild(link);
    });

    band.hidden = false;
    band.classList.add("on");
  };

  /* ==========================================================================
     06. Status "aberto agora"
     Funções puras: recebem o dia e os minutos e devolvem o estado.
     ========================================================================== */
  const getOpenState = (weekday, minutes) => {
    const today = HOURS_BY_DAY[weekday];

    if (today) {
      const opens = timeToMinutes(today.open);
      const closes = timeToMinutes(today.close);
      const isOpen = minutes >= opens && minutes < closes;

      if (isOpen) {
        return {
          isOpen: true,
          label: `Aberto · fecha ${today.close}`,
        };
      }
    }

    // Procura a próxima abertura nos próximos 7 dias.
    for (let offset = 0; offset < 8; offset += 1) {
      const day = (weekday + offset) % 7;
      const hours = HOURS_BY_DAY[day];
      if (!hours) continue;

      const opens = timeToMinutes(hours.open);
      // Se é hoje e a padaria ainda não abriu, "hoje" é a próxima abertura.
      if (offset === 0 && minutes >= opens) continue;

      const when = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : WEEKDAYS[day];
      return {
        isOpen: false,
        label: `Fechado · abre ${when} ${hours.open}`,
      };
    }

    return { isOpen: false, label: "Fechado" };
  };

  /** Lê o relógio no fuso da padaria, independentemente do visitante. */
  const getBakeryNow = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CONFIG.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const part = (type) => parts.find((item) => item.type === type)?.value || "";
    const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(part("hour")) % 24;

    return {
      weekday: weekdays[part("weekday")],
      minutes: hour * 60 + Number(part("minute")),
    };
  };

  const renderOpeningStatus = () => {
    const now = getBakeryNow();
    const state = getOpenState(now.weekday, now.minutes);

    const dot = $("#statusDot");
    const text = $("#statusText");
    if (dot) dot.classList.toggle("closed", !state.isOpen);
    if (text) text.textContent = state.label;

    // Linha do hero: "Hoje: 6h às 19h"
    const todayHours = HOURS_BY_DAY[now.weekday];
    const heroHours = $("#heroHours");
    if (heroHours) {
      heroHours.textContent = todayHours
        ? `Hoje: ${formatFriendlyTime(todayHours.open)} às ${formatFriendlyTime(todayHours.close)}`
        : "Hoje: fechado";
    }

    // Tabela de horários: destaca o dia de hoje.
    $$("#hoursTable [data-day]").forEach((row) => {
      row.classList.toggle("today", Number(row.dataset.day) === now.weekday);
    });
  };

  /* ==========================================================================
     07. Cabeçalho e menu mobile
     ========================================================================== */
  const MENU_ICONS = {
    open: '<svg aria-hidden="true"><use href="#i-menu"/></svg>',
    close: '<svg aria-hidden="true"><use href="#i-close"/></svg>',
  };

  const initHeaderMenu = () => {
    const header = $(".site-header");
    const button = $("#burger");
    const menu = $("#mNav");

    if (header) {
      const updateShadow = () => header.classList.toggle("is-stuck", window.scrollY > 8);
      updateShadow();
      window.addEventListener("scroll", updateShadow, { passive: true });
    }

    if (!button || !menu) return;

    const setMenuState = (isOpen) => {
      menu.hidden = !isOpen;
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
      button.innerHTML = isOpen ? MENU_ICONS.close : MENU_ICONS.open;
    };

    button.addEventListener("click", () => setMenuState(menu.hidden));
    $$("#mNav a").forEach((link) => link.addEventListener("click", () => setMenuState(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) setMenuState(false);
    });
  };

  /* ==========================================================================
     08. Formulário de encomenda
     ========================================================================== */
  const formatDatePtBr = (isoDate) => {
    const [year, month, day] = String(isoDate).split("-");
    return year && month && day ? `${day}/${month}/${year}` : isoDate;
  };

  /** Monta a mensagem enviada ao WhatsApp (função pura, testável). */
  const buildOrderMessage = ({ product, quantity, date, time, name, notes = "" }) => {
    const pickup = formatDatePtBr(date) + (time ? ` às ${time}` : "");
    const lines = [
      "Olá, Padaria Veneto! Gostaria de fazer uma encomenda:",
      "",
      `• Produto: ${product}`,
      `• Quantidade: ${quantity}`,
      `• Retirada: ${pickup}`,
      `• Nome: ${name.trim()}`,
    ];

    if (notes.trim()) lines.push(`• Observações: ${notes.trim()}`);
    lines.push("", "Podem confirmar a disponibilidade?");

    return lines.join("\n");
  };

  const initOrderForm = () => {
    const form = $("#orderForm");
    if (!form) return;

    const fields = form.elements;
    const dateInput = fields.namedItem("data");

    // Impede datas passadas no seletor (sempre no fuso da padaria).
    if (dateInput) {
      dateInput.min = new Intl.DateTimeFormat("en-CA", {
        timeZone: CONFIG.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    }

    const setFieldError = (field, isInvalid) => {
      field.closest(".field")?.classList.toggle("invalid", isInvalid);
    };

    const validate = () => {
      const invalidFields = [];
      const isBlank = (field) => !String(field.value || "").trim();

      ["produto", "data", "nome"].forEach((name) => {
        const field = fields.namedItem(name);
        const invalid = isBlank(field);
        setFieldError(field, invalid);
        if (invalid) invalidFields.push(field);
      });

      const quantityField = fields.namedItem("qtd");
      const quantity = Number.parseInt(quantityField.value, 10);
      const invalidQuantity = !quantity || quantity < 1;
      setFieldError(quantityField, invalidQuantity);
      if (invalidQuantity) invalidFields.push(quantityField);

      return invalidFields;
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const invalidFields = validate();
      if (invalidFields.length > 0) {
        invalidFields[0].focus();
        return;
      }

      const order = {
        product: fields.namedItem("produto").value,
        quantity: Number.parseInt(fields.namedItem("qtd").value, 10),
        date: fields.namedItem("data").value,
        time: fields.namedItem("hora").value,
        name: fields.namedItem("nome").value,
        notes: fields.namedItem("obs").value,
      };

      track("encomenda_enviada", {
        produto: order.product,
        quantidade: order.quantity,
        data: order.date,
        horario: order.time,
        local: "encomenda",
      });

      window.open(whatsappUrl(buildOrderMessage(order)), "_blank", "noopener");
    });

    // Erros desaparecem assim que o visitante corrige o campo.
    $$("input, select, textarea", form).forEach((field) => {
      const clearError = () => setFieldError(field, false);
      field.addEventListener("input", clearError);
      field.addEventListener("change", clearError);
    });
  };

  /* ==========================================================================
     09. Animação de entrada
     ========================================================================== */
  const initScrollReveal = () => {
    const items = $$(".reveal");

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach((item) => observer.observe(item));
  };

  /* ==========================================================================
     10. Mapa sob demanda (evita carregar o iframe no primeiro acesso)
     ========================================================================== */
  const initMap = () => {
    const button = $("#loadMap");
    const shell = $("#mapShell");
    if (!button || !shell) return;

    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = CONFIG.mapsEmbed;
      iframe.title = "Mapa com a localização da Padaria Veneto";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;

      shell.appendChild(iframe);
      button.remove();
      track("mapa_aberto", { local: "localizacao" });
    });
  };

  /* ==========================================================================
     11. Galeria (lightbox)
     ========================================================================== */
  const initLightbox = () => {
    const dialog = $("#lightbox");
    const image = $("#lbImg");
    const closeButton = $("#lbClose");
    if (!dialog || !image || !closeButton) return;

    let lastFocusedElement = null;

    const open = (link) => {
      lastFocusedElement = link;
      image.src = link.dataset.full;
      image.alt = link.dataset.alt || "Foto da Padaria Veneto";
      dialog.hidden = false;
      document.body.style.overflow = "hidden";
      closeButton.focus();
      track("galeria_ampliada", { foto: link.dataset.alt });
    };

    const close = () => {
      dialog.hidden = true;
      image.src = "";
      document.body.style.overflow = "";
      lastFocusedElement?.focus();
    };

    $$("#gallery a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        open(link);
      });
    });

    closeButton.addEventListener("click", close);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dialog.hidden) close();
    });
  };

  /* ==========================================================================
     12. Fallback de imagens
     Se uma foto do Google sair do ar, mostramos um cartão da padaria.
     ========================================================================== */
  const initImageFallback = () => {
    $$("img[data-fb]").forEach((image) => {
      image.addEventListener("error", function handleError() {
        image.removeEventListener("error", handleError);
        image.src = PLACEHOLDER_IMAGE;
        image.style.objectFit = "cover";
      });
    });
  };

  /* ==========================================================================
     13. Ano do rodapé
     ========================================================================== */
  const initFooterYear = () => {
    const element = $("#year");
    if (element) element.textContent = String(new Date().getFullYear());
  };

  /* ==========================================================================
     Bootstrap
     ========================================================================== */
  const init = () => {
    initWhatsAppLinks();
    initAnalytics();
    initClickTracking();
    initDeliveryBand();
    renderOpeningStatus();
    initHeaderMenu();
    initOrderForm();
    initScrollReveal();
    initMap();
    initLightbox();
    initImageFallback();
    initFooterYear();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  /* API mínima para testes automatizados e integrações. */
  window.PadariaVeneto = Object.freeze({
    getOpenState,
    buildOrderMessage,
    whatsappUrl,
    timeToMinutes,
    minutesToTime,
    config: CONFIG,
  });
})();
