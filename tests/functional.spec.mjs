import { test, expect } from "@playwright/test";

const WHATSAPP_NUMBER = "5516993685099";

test.describe("Conteúdo, interações e acessibilidade", () => {
  test.beforeEach(async ({ page }) => {
    // Evita abrir uma aba real ao enviar o formulário e permite inspecionar a URL.
    await page.addInitScript(() => {
      window.__openedUrls = [];
      window.open = (url) => {
        window.__openedUrls.push(String(url));
        return null;
      };
    });

    await page.goto("/");
  });

  test("HTML, CSS e JS são arquivos separados e carregam", async ({ page }) => {
    await expect(page).toHaveTitle(/Padaria Veneto/);
    await expect(page.locator("h1")).toContainText("Pão quentinho");

    const assets = await page.evaluate(() => ({
      inlineStyles: document.querySelectorAll("style").length,
      stylesheet: document.querySelector('link[rel="stylesheet"]')?.getAttribute("href"),
      script: document.querySelector('script[src$="scripts.js"]')?.getAttribute("src"),
      jsLoaded: typeof window.PadariaVeneto,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    }));

    expect(assets.inlineStyles).toBe(0);
    expect(assets.stylesheet).toBe("styles.css");
    expect(assets.script).toBe("scripts.js");
    expect(assets.jsLoaded).toBe("object");
    // Prova de que o CSS externo foi aplicado (cor de fundo da paleta).
    expect(assets.bodyBackground).toBe("rgb(250, 245, 236)");
  });

  test("todos os CTAs de WhatsApp apontam para o número correto", async ({ page }) => {
    const links = page.locator("[data-wa]");
    expect(await links.count()).toBeGreaterThan(5);

    const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.href));
    for (const href of hrefs) {
      expect(href.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    }

    const heroHref = await page.locator('[data-wa="hero"]').first().getAttribute("href");
    const message = new URL(heroHref).searchParams.get("text");
    expect(message).toContain("Padaria Veneto");
  });

  test("status de aberto/fechado é calculado e exibido", async ({ page }) => {
    const statusText = page.locator("#statusText");
    await expect(statusText).not.toHaveText("Verificando horário…");
    await expect(statusText).toHaveText(/Aberto|Fechado/);

    const state = await page.evaluate(() => ({
      openMondayMorning: window.PadariaVeneto.getOpenState(1, 10 * 60),
      closedMondayNight: window.PadariaVeneto.getOpenState(1, 20 * 60),
      closedSundayAfternoon: window.PadariaVeneto.getOpenState(0, 13 * 60),
      closedSaturdayAfternoon: window.PadariaVeneto.getOpenState(6, 15 * 60),
    }));

    expect(state.openMondayMorning).toEqual({ isOpen: true, label: "Aberto · fecha 19:00" });
    expect(state.closedMondayNight.label).toBe("Fechado · abre amanhã 06:00");
    expect(state.closedSundayAfternoon.label).toBe("Fechado · abre amanhã 06:00");
    expect(state.closedSaturdayAfternoon.label).toBe("Fechado · abre amanhã 06:30");
  });

  test("menu mobile abre, fecha e devolve o foco acessível", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const burger = page.locator("#burger");
    const menu = page.locator("#mNav");
    await expect(burger).toBeVisible();
    await expect(menu).toBeHidden();

    await burger.click();
    await expect(menu).toBeVisible();
    await expect(burger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(burger).toHaveAttribute("aria-expanded", "false");
  });

  test("formulário valida campos e monta a mensagem do pedido", async ({ page }) => {
    await page.locator("#orderForm button[type='submit']").click();

    // Produto, data e nome são obrigatórios.
    await expect(page.locator(".field.invalid")).toHaveCount(3);
    await expect(page.locator("#produto")).toBeFocused();

    const tomorrow = await page.evaluate(() =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(Date.now() + 86_400_000))
    );

    await page.selectOption("#produto", "Bolo");
    await page.fill("#qtd", "2");
    await page.fill("#data", tomorrow);
    await page.fill("#hora", "15:30");
    await page.fill("#nome", "Ana");
    await page.fill("#obs", "Sem nozes");
    await page.locator("#orderForm button[type='submit']").click();

    const [openedUrl] = await page.evaluate(() => window.__openedUrls);
    expect(openedUrl).toContain(`https://wa.me/${WHATSAPP_NUMBER}`);

    const message = new URL(openedUrl).searchParams.get("text");
    const [year, month, day] = tomorrow.split("-");
    expect(message).toContain("• Produto: Bolo");
    expect(message).toContain("• Quantidade: 2");
    expect(message).toContain(`• Retirada: ${day}/${month}/${year} às 15:30`);
    expect(message).toContain("• Nome: Ana");
    expect(message).toContain("• Observações: Sem nozes");
  });

  test("mensagem do pedido é gerada por uma função pura", async ({ page }) => {
    const message = await page.evaluate(() =>
      window.PadariaVeneto.buildOrderMessage({
        product: "Torta",
        quantity: 1,
        date: "2026-11-01",
        time: "",
        name: "  Carlos  ",
        notes: "",
      })
    );

    expect(message).toContain("• Retirada: 01/11/2026");
    expect(message).toContain("• Nome: Carlos");
    expect(message).not.toContain("Observações");
  });

  test("galeria abre o lightbox e fecha com Esc", async ({ page }) => {
    await page.locator("#gallery a").first().click();

    const lightbox = page.locator("#lightbox");
    await expect(lightbox).toBeVisible();
    await expect(page.locator("#lbImg")).toHaveAttribute("src", /w1600/);

    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
  });

  test("mapa só carrega o iframe depois do clique", async ({ page }) => {
    await expect(page.locator("#mapShell iframe")).toHaveCount(0);

    await page.locator("#loadMap").click();
    await expect(page.locator("#mapShell iframe")).toHaveCount(1);
    await expect(page.locator("#mapShell iframe")).toHaveAttribute("src", /google\.com\/maps/);
    await expect(page.locator("#loadMap")).toHaveCount(0);
  });

  test("faixa de delivery permanece oculta sem links configurados", async ({ page }) => {
    await expect(page.locator("#deliveryBand")).toBeHidden();
  });

  test("acessibilidade básica: um h1, imagens com alt e labels", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".skip")).toHaveAttribute("href", "#conteudo");

    const missingAlt = await page.$$eval("img", (images) =>
      images.filter((image) => !image.getAttribute("alt")?.trim()).map((image) => image.src)
    );
    expect(missingAlt).toEqual([]);

    const fieldsWithoutLabel = await page.$$eval("input, select, textarea", (fields) =>
      fields
        .filter((field) => !field.id || !document.querySelector(`label[for="${field.id}"]`))
        .map((field) => field.id || field.tagName)
    );
    expect(fieldsWithoutLabel).toEqual([]);
  });

  test("ano do rodapé é atualizado pelo JavaScript", async ({ page }) => {
    await expect(page.locator("#year")).toHaveText(String(new Date().getFullYear()));
  });
});
