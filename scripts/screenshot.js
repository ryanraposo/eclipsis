const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT || 5173);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join("screenshots", "appclips");

const captures = {
  board: {
    selector: ".demo-stage",
    output: "eclipsis-appclip-usage-board.png",
    padding: 28
  },
  listening: {
    selector: ".phone--article",
    output: "eclipsis-appclip-listening-over-article.png",
    padding: 24
  },
  ready: {
    selector: ".phone--home",
    output: "eclipsis-appclip-ready-home-screen.png",
    padding: 24
  },
  response: {
    selector: ".phone--answer",
    output: "eclipsis-appclip-realtime-response.png",
    padding: 24
  },
  desktop: {
    fullPage: true,
    output: "../eclipsis-desktop.png"
  },
  mobile: {
    viewport: { width: 390, height: 1400 },
    isMobile: true,
    fullPage: true,
    output: "../eclipsis-mobile.png"
  }
};

const defaultModes = ["board", "listening", "ready", "response"];
const requested = process.argv[2] ? [process.argv[2]] : defaultModes;
const unknownMode = requested.find((mode) => !captures[mode]);

if (unknownMode) {
  console.error(`Unknown screenshot mode: ${unknownMode}`);
  console.error(`Valid modes: ${Object.keys(captures).join(", ")}`);
  process.exit(1);
}

async function isServerReady() {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 8000;

  while (Date.now() < deadline) {
    if (await isServerReady()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not become ready at ${baseUrl}`);
}

async function startServerIfNeeded() {
  if (await isServerReady()) {
    return null;
  }

  const child = spawn("node", ["server/index.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: "inherit"
  });

  await waitForServer();
  return child;
}

async function screenshotElement(page, selector, output, padding = 0) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`Could not find screenshot target: ${selector}`);
  }

  const clip = {
    x: Math.max(0, box.x - padding),
    y: Math.max(0, box.y - padding),
    width: box.width + padding * 2,
    height: box.height + padding * 2
  };

  await page.screenshot({
    path: path.join(outputDir, output),
    clip
  });
  console.log(path.join(outputDir, output));
}

async function capture(mode, options) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: options.viewport || { width: 1440, height: 1100 },
    isMobile: Boolean(options.isMobile)
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  if (options.fullPage) {
    await page.screenshot({
      path: path.join(outputDir, options.output),
      fullPage: true
    });
    console.log(path.join(outputDir, options.output));
  } else {
    await screenshotElement(page, options.selector, options.output, options.padding);
  }

  await browser.close();
}

(async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const server = await startServerIfNeeded();

  try {
    for (const mode of requested) {
      await capture(mode, captures[mode]);
    }
  } finally {
    if (server) {
      server.kill("SIGTERM");
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
