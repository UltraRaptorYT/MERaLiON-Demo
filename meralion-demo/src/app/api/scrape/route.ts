import chromium from "@sparticuz/chromium";

let puppeteer: typeof import("puppeteer") | typeof import("puppeteer-core");

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "development") {
    const puppeteerModule = await import("puppeteer");
    puppeteer = puppeteerModule;
  } else {
    const puppeteerModule = await import("puppeteer-core");
    puppeteer = puppeteerModule;
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "https://meralion.org/demo/";

  let browser: any = null; // ✅ Relax the type to fix the error

  try {
    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === "development" ? [] : chromium.args,
      executablePath:
        process.env.NODE_ENV === "development"
          ? undefined
          : await chromium.executablePath(),
      headless: true,
    });

    if (browser == null) {
      throw Error("Browser Not Opened");
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector('[aria-label="Instruction..."]');
    await page.type('[aria-label="Instruction..."]', "What is ur name?");
    await page.keyboard.press("Enter");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.waitForSelector('[data-testid="stChatMessage"]');
    const messages = await page.$$('[data-testid="stChatMessage"]');

    if (messages.length === 0) {
      console.log("No chat messages found.");
      return new Response(
        JSON.stringify({ error: "No chat messages found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const lastMessageText = await page.evaluate(
      (el: HTMLElement) => el.innerText,
      messages[messages.length - 1]
    );

    console.log("Last chat message:", lastMessageText);

    return new Response(JSON.stringify({ lastMessage: lastMessageText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
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
