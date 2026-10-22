import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Testes de segurança para uma página estática.
 *
 * Cobrem os riscos reais deste projeto: links externos sem rel="noopener"
 * (tabnabbing), URLs javascript:, handlers inline, conteúdo misto (HTTP) e
 * envio silencioso de dados do formulário para terceiros.
 */

const SOURCE_FILES = ["index.html", "styles.css", "scripts.js"];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("links que abrem nova aba usam noopener/noreferrer", async ({ page }) => {
  const unsafeLinks = await page.$$eval("a[target='_blank']", (links) =>
    links.filter((link) => !/\b(noopener|noreferrer)\b/.test(link.rel)).map((link) => link.href)
  );

  expect(unsafeLinks).toEqual([]);
});

test("não existem URLs javascript: nem handlers inline", async ({ page }) => {
  const javascriptUrls = await page.$$eval("a[href]", (links) =>
    links
      .filter((link) => link.getAttribute("href").trim().toLowerCase().startsWith("javascript:"))
      .map((link) => link.outerHTML)
  );
  expect(javascriptUrls).toEqual([]);

  const inlineHandlers = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*")).flatMap((element) =>
      Array.from(element.attributes)
        .filter((attribute) => /^on/i.test(attribute.name))
        .map((attribute) => `${element.tagName.toLowerCase()}[${attribute.name}]`)
    )
  );
  expect(inlineHandlers).toEqual([]);
});

test("todos os recursos externos usam HTTPS", async ({ page }) => {
  const insecureResources = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img[src], script[src], link[href]"))
      .map((element) => element.getAttribute("src") || element.getAttribute("href"))
      .filter((url) => url && url.startsWith("http://"))
  );

  expect(insecureResources).toEqual([]);
});

test("formulário não envia dados para servidor e o JS não usa eval/fetch", async () => {
  const formSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  expect(formSource).not.toMatch(/<form[^>]+\baction=/i);

  const scriptSource = readFileSync(new URL("../scripts.js", import.meta.url), "utf8");
  expect(scriptSource).not.toMatch(/\beval\s*\(/);
  expect(scriptSource).not.toMatch(/new\s+Function/);
  expect(scriptSource).not.toMatch(/\bfetch\s*\(/);
  expect(scriptSource).not.toMatch(/XMLHttpRequest/);
  expect(scriptSource).not.toMatch(/document\.write\s*\(/);
});

test("JSON-LD de SEO é válido e declara o tipo Bakery", async ({ page }) => {
  const structuredData = await page.$eval('script[type="application/ld+json"]', (script) =>
    JSON.parse(script.textContent)
  );

  expect(structuredData["@context"]).toBe("https://schema.org");
  expect(structuredData["@type"]).toBe("Bakery");
  expect(structuredData.telephone).toBe("+5516993685099");
});

test("nenhum segredo ou credencial está exposto no código-fonte", () => {
  const secretPattern = /(api[_-]?key|secret|password|private[_-]?key|bearer\s+[a-z0-9])/i;

  for (const file of SOURCE_FILES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    expect(source, `${file} não deve conter credenciais`).not.toMatch(secretPattern);
  }
});
