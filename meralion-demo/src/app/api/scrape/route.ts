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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

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

    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

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

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "development") {
    const puppeteerModule = await import("puppeteer");
    puppeteer = puppeteerModule;
  } else {
    const puppeteerModule = await import("puppeteer-core");
    puppeteer = puppeteerModule;
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return new Response(JSON.stringify({ error: "No valid file uploaded." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

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

    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

    await page.goto("https://meralion.org/demo/", {
      waitUntil: "domcontentloaded",
    });

    // ✅ Click the "add icon" button
    await page.waitForSelector('[aria-label="add icon"]');
    await page.click('[aria-label="add icon"]');

    // ✅ Click the file upload input
    await page.waitForSelector('[data-testid="stFileUploaderDropzoneInput"]');
    const inputUploadHandle = await page.$(
      '[data-testid="stFileUploaderDropzoneInput"]'
    );

    if (!inputUploadHandle) {
      throw Error("Upload input not found.");
    }

    // ✅ Create a temporary file and upload it
    const fs = await import("fs/promises");
    const tmp = await import("os");
    const path = await import("path");

    const tempFilePath = path.join(tmp.tmpdir(), `upload-${Date.now()}.mp3`);
    await fs.writeFile(tempFilePath, buffer);

    await inputUploadHandle.uploadFile(tempFilePath);

    // ✅ Type instruction
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await page.waitForSelector('[aria-label="Instruction..."]');
    await page.type(
      '[aria-label="Instruction..."]',
      "Please translate this speech to Mandarin"
    );
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
    return new Response(
      JSON.stringify({ error: "Error during file upload or interaction." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
