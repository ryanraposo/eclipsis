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

app.disable("x-powered-by");
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json());
app.use(express.static(publicRoot));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    realtimeModel,
    realtimeVoice,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/realtime/session", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return;
  }

  const instructions =
    req.body?.instructions ||
    "You are Eclipsis, a fast, concise floating voice assistant. Answer naturally, keep responses brief unless asked, and favor actionable help.";

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
          model: realtimeModel,
          instructions,
          audio: {
            output: {
              voice: realtimeVoice
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
