import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/`;
const SCREENSHOT_URL = `${BASE_URL}?mock=1`;
const ROOT_DIR = process.cwd();
const DIST_INDEX = path.join(ROOT_DIR, "dist", "index.html");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "screenshots");

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return;
    } catch {
      // Keep retrying until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureBuild() {
  try {
    await access(DIST_INDEX);
    return;
  } catch {
    // dist missing: build before previewing
  }

  const build = spawn("pnpm", ["build"], { stdio: "inherit", shell: false });
  await new Promise((resolve, reject) => {
    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm build failed with exit code ${code}`));
    });
    build.on("error", reject);
  });
}

async function run() {
  await ensureBuild();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const preview = spawn(
    "pnpm",
    ["preview", "--", "--port", String(PORT), "--strictPort"],
    { stdio: "inherit", shell: false }
  );

  const shutdown = () => {
    if (!preview.killed) preview.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    await page.goto(SCREENSHOT_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Networks" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "networks.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Settings" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "settings.png"),
      fullPage: true,
    });

    await browser.close();
  } finally {
    shutdown();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
