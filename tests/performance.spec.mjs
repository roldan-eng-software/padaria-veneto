import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Orçamento de eficiência (performance budget).
 *
 * Mede o carregamento da página em condições reais de rede (fontes e fotos
 * externas incluídas) e grava um relatório em reports/performance-<projeto>.json.
 */

const BUDGET = {
  domContentLoadedMs: 3_000,
  loadMs: 15_000,
  ttfbMs: 1_500,
  domNodes: 2_500,
  layoutShift: 0.1,
  consoleErrors: 0,
  pageErrors: 0,
};

test("eficiência: carregamento dentro do orçamento", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__layoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__layoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const startedAt = Date.now();
  await page.goto("/", { waitUntil: "load" });
  const wallClockMs = Date.now() - startedAt;
  await page.waitForTimeout(700); // permite o observer de layout shift acumular

  const metrics = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation");
    const resources = performance.getEntriesByType("resource");
    const externalResources = resources.filter((entry) => {
      try {
        return new URL(entry.name).host !== location.host;
      } catch {
        return false;
      }
    });

    return {
      ttfbMs: Math.round(navigation.responseStart),
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      domNodes: document.querySelectorAll("*").length,
      resourceCount: resources.length,
      externalResourceCount: externalResources.length,
      scriptCount: document.querySelectorAll("script[src]").length,
      stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
      imageCount: document.images.length,
      lazyImageCount: document.querySelectorAll('img[loading="lazy"]').length,
      layoutShift: Number(window.__layoutShift.toFixed(4)),
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    project: testInfo.project.name,
    baseUrl: testInfo.project.use.baseURL,
    wallClockMs,
    ...metrics,
    consoleErrors,
    pageErrors,
    budget: BUDGET,
    passed:
      metrics.domContentLoadedMs < BUDGET.domContentLoadedMs &&
      metrics.loadMs < BUDGET.loadMs &&
      metrics.ttfbMs < BUDGET.ttfbMs &&
      metrics.domNodes < BUDGET.domNodes &&
      metrics.layoutShift < BUDGET.layoutShift &&
      consoleErrors.length === BUDGET.consoleErrors &&
      pageErrors.length === BUDGET.pageErrors,
  };

  const reportsDir = resolve("reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(
    resolve(reportsDir, `performance-${testInfo.project.name}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  console.log(`[perf:${testInfo.project.name}]`, JSON.stringify(report, null, 2));

  expect(metrics.ttfbMs).toBeLessThan(BUDGET.ttfbMs);
  expect(metrics.domContentLoadedMs).toBeLessThan(BUDGET.domContentLoadedMs);
  expect(metrics.loadMs).toBeLessThan(BUDGET.loadMs);
  expect(metrics.domNodes).toBeLessThan(BUDGET.domNodes);
  expect(metrics.layoutShift).toBeLessThan(BUDGET.layoutShift);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("eficiência: recursos locais respondem sem erro", async ({ page }) => {
  const localFailures = [];

  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.host === "127.0.0.1:4173" && response.status() >= 400) {
      localFailures.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(localFailures).toEqual([]);
});
