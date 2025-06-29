import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "https://example.com";

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath:
        process.env.NODE_ENV === "development"
          ? undefined // use locally installed Chrome in dev
          : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const pageTitle = await page.title();

    return new Response(JSON.stringify({ title: pageTitle }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error scraping the page" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
