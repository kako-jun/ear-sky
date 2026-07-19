import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const port = 4173;
const baseUrl = `http://127.0.0.1:${port}/`;
const widths = [320, 375, 390, 430];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(process) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) break;
    try {
      const res = await fetch(baseUrl, { cache: "no-store" });
      if (res.ok) return;
    } catch {
      // Server is still starting.
    }
    await wait(250);
  }
  throw new Error(`Vite preview did not start at ${baseUrl}`);
}

const preview = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: "inherit" },
);

let browser;
try {
  await waitForServer(preview);
  browser = await chromium.launch();

  const failures = [];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const viewportWidth = window.innerWidth;
      const overflowers = [...document.querySelectorAll("body *")]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            className: typeof el.className === "string" ? el.className : "",
            left: Math.floor(rect.left),
            right: Math.ceil(rect.right),
            width: Math.ceil(rect.width),
          };
        })
        .filter((item) => item.right > viewportWidth + 1 || item.left < -1)
        .slice(0, 10);
      return {
        viewportWidth,
        docScrollWidth: doc.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
        overflowers,
      };
    });
    await page.close();

    const maxScrollWidth = Math.max(result.docScrollWidth, result.bodyScrollWidth);
    if (maxScrollWidth > result.viewportWidth) {
      failures.push({ width, ...result, maxScrollWidth });
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Mobile overflow check passed: ${widths.join(", ")}px`);
  }
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
