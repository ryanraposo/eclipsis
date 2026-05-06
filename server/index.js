require("dotenv").config({ quiet: true });

const path = require("node:path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");

const app = express();
const port = Number(process.env.PORT || 5173);
const publicRoot = path.join(__dirname, "..");

const realtimeModel = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-1.5";
const realtimeVoice = process.env.OPENAI_REALTIME_VOICE || "marin";
const openaiBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com";
const appClipAppId = process.env.APPCLIP_APP_ID || "";
const appClipPath = process.env.APPCLIP_PATH || "/appclip";
const shortcutName = process.env.SHORTCUT_NAME || "Eclipsis";
const authToken = process.env.ECLIPSIS_AUTH_TOKEN || process.env.ECLIPSIS_AUTH_PASSWORD || "";
const titleModel = process.env.OPENAI_TITLE_MODEL || "gpt-5.4";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const allowedRealtimeModels = new Set(["gpt-realtime-1.5", "gpt-realtime-mini"]);
const allowedRealtimeVoices = new Set(["marin", "cedar"]);
const allowedImageModeration = new Set(["auto", "low"]);
const allowedModerationModels = new Set(["omni-moderation-latest", "text-moderation-latest"]);

app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json());
app.use(express.static(publicRoot));

function getPublicOrigin(req) {
  return process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`;
}

function getAppClipInvocationUrl(req) {
  const url = new URL("/voice", getPublicOrigin(req));
  url.searchParams.set("trigger", "action-button");
  url.searchParams.set("topic", "ai");
  url.searchParams.set("start", "1");
  return url.toString();
}

function getShortcutRunUrl(req) {
  const url = new URL("shortcuts://run-shortcut");
  url.searchParams.set("name", shortcutName);
  url.searchParams.set("input", "text");
  url.searchParams.set("text", getAppClipInvocationUrl(req));
  return url.toString();
}

function isAuthorized(req) {
  if (!authToken) {
    return true;
  }

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === authToken;
}

function requireAuth(req, res, next) {
  if (isAuthorized(req)) {
    next();
    return;
  }

  res.status(401).json({
    error: "Eclipsis auth required."
  });
}

function readOutputText(data) {
  return (
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .find((part) => part.type === "output_text")?.text ||
    ""
  ).trim();
}

function renderShortcutPage(req) {
  const origin = getPublicOrigin(req);
  const launches = [
    ["Action Button", `/voice?trigger=action-button&topic=ai&start=1`],
    ["Back Tap", `/voice?trigger=back-tap&topic=meeting&start=1`],
    ["Siri", `/voice?trigger=siri&topic=energy&start=1`],
    ["Control Center", `/voice?trigger=control-center&topic=ai&start=1`]
  ].map(([label, href]) => [label, new URL(href, origin).toString()]);

  const cards = launches
    .map(
      ([label, href]) => `
        <article>
          <h2>${label}</h2>
          <p>${href}</p>
          <a href="${href}">Open</a>
        </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Eclipsis Shortcut Launcher</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #071015;
        color: #f7fbff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-width: 320px;
        background:
          radial-gradient(circle at 20% 10%, rgba(95, 156, 255, 0.24), transparent 24rem),
          linear-gradient(150deg, #071015, #0b151e 52%, #05080c);
      }
      main {
        width: min(920px, 100%);
        margin: 0 auto;
        padding: 28px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: clamp(2.4rem, 8vw, 5rem);
        line-height: 0.95;
        letter-spacing: 0;
      }
      p, li { color: #a8b8ca; line-height: 1.55; }
      .panel, article {
        border: 1px solid rgba(118, 160, 232, 0.42);
        border-radius: 8px;
        background: rgba(8, 18, 29, 0.72);
      }
      .panel {
        padding: 20px;
        margin: 22px 0;
      }
      .launch-visual {
        display: grid;
        gap: 14px;
      }
      .launch-visual img {
        display: block;
        width: 100%;
        height: auto;
        border: 1px solid rgba(118, 160, 232, 0.42);
        border-radius: 8px;
        background: #071015;
      }
      .status-strip {
        display: grid;
        gap: 10px;
      }
      .status-row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        color: #d8e7ff;
        font-size: 0.9rem;
        font-weight: 850;
      }
      .progress-track {
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }
      .progress-fill {
        width: 0;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #18a384, #42d7e9, #7f64ff);
        transition: width 420ms ease;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      article {
        padding: 16px;
      }
      h2 {
        margin: 0 0 10px;
        font-size: 1.05rem;
      }
      article p {
        min-height: 4.5rem;
        padding: 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        color: #d8e7ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.82rem;
        overflow-wrap: anywhere;
      }
      a, button {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 0 14px;
        border: 1px solid rgba(118, 217, 255, 0.65);
        border-radius: 8px;
        background: linear-gradient(135deg, #247bd7, #7f64ff);
        color: #fff;
        font: inherit;
        font-weight: 800;
        text-decoration: none;
      }
      code {
        color: #d8e7ff;
        overflow-wrap: anywhere;
      }
      @media (max-width: 680px) {
        main { padding: 20px; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <p>Eclipsis launcher</p>
      <h1>Shortcut setup</h1>
      <section class="panel launch-visual" aria-labelledby="visual-title">
        <h2 id="visual-title">Block Chain</h2>
        <img src="/screenshots/shortcuts-block-chain.svg" alt="Shortcuts block chain showing Eclipsis, URL, Open URLs, and live status" />
        <div class="status-strip" role="status" aria-live="polite">
          <div class="status-row">
            <span data-live-step>Preparing Shortcut block chain</span>
            <span data-live-percent>0%</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" data-progress-fill></div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2>Shortcut</h2>
        <ol>
          <li>Create a Shortcut named <strong>${shortcutName}</strong>.</li>
          <li>Add a <strong>URL</strong> action using the Action Button URL below.</li>
          <li>Add the <strong>Open URLs</strong> action after it.</li>
          <li>Bind that Shortcut to Action Button, Back Tap, Siri, or Control Center.</li>
        </ol>
      </section>
      <section class="panel">
        <h2>Action Button URL</h2>
        <p><code>${launches[0][1]}</code></p>
        <a href="${launches[0][1]}">Open Action Button URL</a>
      </section>
      <section class="panel">
        <h2>External run URL</h2>
        <p>For QR, NFC, or another app that can pass text into Shortcuts, set the Shortcut's URL value to <strong>Shortcut Input</strong> and launch it with this run URL:</p>
        <p><code>${getShortcutRunUrl(req)}</code></p>
        <a href="${getShortcutRunUrl(req)}">Run ${shortcutName}</a>
      </section>
      <section class="grid" aria-label="Launch URLs">
        ${cards}
      </section>
    </main>
    <script>
      const liveSteps = [
        ["Shortcut named ${shortcutName}", 24],
        ["URL action loaded", 48],
        ["Open URLs connected", 72],
        ["Ready for Action Button", 100]
      ];
      const stepLabel = document.querySelector("[data-live-step]");
      const percentLabel = document.querySelector("[data-live-percent]");
      const progressFill = document.querySelector("[data-progress-fill]");
      let stepIndex = 0;

      function setLiveStep() {
        const [label, percent] = liveSteps[stepIndex];
        stepLabel.textContent = label;
        percentLabel.textContent = percent + "%";
        progressFill.style.width = percent + "%";
        stepIndex = (stepIndex + 1) % liveSteps.length;
      }

      setLiveStep();
      window.setInterval(setLiveStep, 1400);
    </script>
  </body>
</html>`;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    realtimeModel,
    realtimeVoice,
    imageModel,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    authRequired: Boolean(authToken)
  });
});

app.get("/api/appclip", (req, res) => {
  res.json({
    invocationUrl: getAppClipInvocationUrl(req),
    shortcutName,
    shortcutRunUrl: getShortcutRunUrl(req),
    associatedDomains: [`appclips:${req.hostname}`],
    appClipAppId: appClipAppId || null,
    aasaPath: "/.well-known/apple-app-site-association"
  });
});

app.get(["/shortcut", "/shortcuts"], (req, res) => {
  res.type("html").send(renderShortcutPage(req));
});

app.get(["/.well-known/apple-app-site-association", "/apple-app-site-association"], (req, res) => {
  res
    .type("application/json")
    .set("Cache-Control", "public, max-age=3600")
    .send(
      JSON.stringify({
        appclips: {
          apps: appClipAppId ? [appClipAppId] : []
        }
      })
    );
});

app.get(appClipPath, (req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.get("/voice", (req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.post("/api/conversations/title", requireAuth, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return;
  }

  const transcript = String(req.body?.transcript || "").slice(0, 3000);

  if (!transcript.trim()) {
    res.json({ title: "New voice chat" });
    return;
  }

  try {
    const response = await fetch(`${openaiBaseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: titleModel,
        input: `Create a concise 2-5 word chat title for this voice conversation. Return only the title.\n\n${transcript}`,
        max_output_tokens: 18,
        store: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: data.error?.message || "Conversation title generation failed.",
        details: data
      });
      return;
    }

    const title = readOutputText(data).replace(/^["']|["']$/g, "") || "Voice chat";
    res.json({ title: title.slice(0, 64) });
  } catch (error) {
    console.error("Conversation title error:", error);
    res.status(500).json({
      error: "Could not generate a conversation title."
    });
  }
});

app.post("/api/images/generate", requireAuth, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return;
  }

  const prompt = String(req.body?.prompt || "").trim();
  const moderation = String(req.body?.moderation || "auto").trim();

  if (!prompt) {
    res.status(400).json({ error: "Image prompt is required." });
    return;
  }

  if (!allowedImageModeration.has(moderation)) {
    res.status(400).json({ error: "Image moderation must be auto or low." });
    return;
  }

  try {
    const response = await fetch(`${openaiBaseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        n: 1,
        size: req.body?.size || "1024x1024",
        quality: req.body?.quality || "low",
        moderation
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: data.error?.message || "Image generation failed.",
        details: data
      });
      return;
    }

    res.json({
      model: imageModel,
      moderation,
      image: data.data?.[0]?.b64_json || null,
      usage: data.usage || null
    });
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({
      error: "Could not generate an image."
    });
  }
});

app.post("/api/moderations/check", requireAuth, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return;
  }

  const input = String(req.body?.input || "").trim();
  const requestedModel = String(req.body?.model || "omni-moderation-latest").trim();
  const model = allowedModerationModels.has(requestedModel) ? requestedModel : "omni-moderation-latest";

  if (!input) {
    res.status(400).json({ error: "Moderation input is required." });
    return;
  }

  try {
    const response = await fetch(`${openaiBaseUrl}/v1/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: data.error?.message || "Moderation check failed.",
        details: data
      });
      return;
    }

    const result = data.results?.[0] || {};
    res.json({
      model: data.model || model,
      flagged: Boolean(result.flagged),
      categories: result.categories || {},
      category_scores: result.category_scores || {}
    });
  } catch (error) {
    console.error("Moderation check error:", error);
    res.status(500).json({
      error: "Could not check content moderation."
    });
  }
});

app.post("/api/realtime/session", requireAuth, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return;
  }

  const instructions =
    req.body?.instructions ||
    "You are Eclipsis, a fast, concise floating voice assistant. Answer naturally, keep responses brief unless asked, and favor actionable help.";
  const requestedModel = allowedRealtimeModels.has(req.body?.model) ? req.body.model : realtimeModel;
  const requestedVoice = allowedRealtimeVoices.has(req.body?.voice) ? req.body.voice : realtimeVoice;

  try {
    const response = await fetch(`${openaiBaseUrl}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: requestedModel,
          instructions,
          audio: {
            input: {
              transcription: {
                model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
                language: "en"
              }
            },
            output: {
              voice: requestedVoice
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: data.error?.message || "OpenAI Realtime session creation failed.",
        details: data
      });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error("Realtime session error:", error);
    res.status(500).json({
      error: "Could not create an OpenAI Realtime session."
    });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Eclipsis listening on http://0.0.0.0:${port}`);
  console.log(`Realtime model: ${realtimeModel}`);
});
