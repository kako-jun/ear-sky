import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const port = 4174;
const baseUrl = `http://127.0.0.1:${port}/`;

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
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

  let submittedPayload = null;
  await page.route("**/api/posts**", async (route) => {
    if (route.request().method() === "POST") {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "editor-ui-test-post" }),
      });
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ posts: [], total: 0, limit: 10, offset: 0 }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: /Post|投稿する/ }).click();
  await page.locator("#post-editor-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s");
  await page.locator("#post-editor-artist").waitFor();

  await page.locator("#post-editor-artist").fill("Rick Astley");
  await page.locator("#post-editor-song").fill("Never Gonna Give You Up");
  await page.locator("#post-editor-era").fill("1987");
  await page.locator("#post-editor-misheard-0").fill("Never gonna give you soup");
  await page.locator("#post-editor-original-0").fill("Never gonna give you up");
  await page.locator("#post-editor-comment").fill("A classic kitchen hallucination");
  await page.locator("#post-editor-nickname").fill("tester");
  await page.locator("#post-editor-delete-key").fill("secret");
  await page.getByRole("button", { name: /Anime|アニメ/ }).click();
  await page.getByRole("button", { name: /Pop|ポップ/ }).click();

  const submit = page.getByRole("button", { name: /Post|投稿する/ }).last();
  await submit.waitFor();
  if (await submit.isDisabled()) {
    throw new Error("Submit button stayed disabled after filling required editor fields");
  }

  await page.getByRole("button", { name: /Add subtitle|字幕を追加/ }).click();
  await page.locator("#post-editor-misheard-1").fill("Second cue text");
  await page.locator("#post-editor-original-1").fill("Second original text");
  await page.getByRole("button", { name: /Remove|削除/ }).last().click();
  const misheardCount = await page.locator("[id^='post-editor-misheard-']").count();
  if (misheardCount !== 1) {
    throw new Error(`Expected one cue after remove, got ${misheardCount}`);
  }

  await page.getByRole("button", { name: /Save draft|下書き保存/ }).click();
  await page.getByText(/Draft saved|下書き保存しました/).waitFor();
  await page.getByRole("button", { name: /Drafts|下書き一覧/ }).click();
  await page.getByRole("button", { name: /Never gonna give you soup/ }).waitFor();

  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (Math.max(overflow.docScrollWidth, overflow.bodyScrollWidth) > overflow.viewportWidth) {
    throw new Error(`Editor UI overflowed: ${JSON.stringify(overflow)}`);
  }
  await page.screenshot({ path: "test-results/editor-ui-390.png", fullPage: true });

  await submit.click();
  const submitDeadline = Date.now() + 5_000;
  while (!submittedPayload && Date.now() < submitDeadline) {
    await wait(50);
  }
  if (!submittedPayload) {
    throw new Error("Submitting the editor did not send POST /api/posts");
  }

  const expectedPayload = {
    platform: "youtube",
    videoId: "dQw4w9WgXcQ",
    startSec: 42,
    endSec: 47,
    misheardText: "Never gonna give you soup",
    originalText: "Never gonna give you up",
    artistName: "Rick Astley",
    songTitle: "Never Gonna Give You Up",
    era: "1987",
    comment: "A classic kitchen hallucination",
    nickname: "tester",
    deleteKey: "secret",
  };
  for (const [key, value] of Object.entries(expectedPayload)) {
    if (submittedPayload[key] !== value) {
      throw new Error(`Submitted payload mismatch for ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(submittedPayload[key])}`);
    }
  }
  if (!Array.isArray(submittedPayload.cues) || submittedPayload.cues.length !== 1) {
    throw new Error(`Expected one submitted cue, got ${JSON.stringify(submittedPayload.cues)}`);
  }
  const [cue] = submittedPayload.cues;
  if (cue.text !== "Never gonna give you soup" || cue.originalText !== "Never gonna give you up" || cue.showAt !== 42 || cue.duration !== 5) {
    throw new Error(`Submitted cue mismatch: ${JSON.stringify(cue)}`);
  }
  if (!Array.isArray(submittedPayload.tags) || submittedPayload.tags.join(",") !== "anime,pop") {
    throw new Error(`Submitted tags mismatch: ${JSON.stringify(submittedPayload.tags)}`);
  }

  await page.close();
  console.log("Editor UI check passed at 390px; screenshot: test-results/editor-ui-390.png");
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
