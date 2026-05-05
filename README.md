# Eclipsis

Interactive prototype for a floating voice assistant App Clip powered by OpenAI Realtime.

The prototype is based on the provided concept board: a small assistant window that floats over any app, supports push-to-talk triggers, streams voice plus text responses, and connects to OpenAI Realtime through a small server-side token broker.

## Architecture

Eclipsis uses the current OpenAI Realtime pattern:

1. The App Clip or browser client asks your server for an ephemeral Realtime client secret.
2. The Ubuntu server uses `OPENAI_API_KEY` to call OpenAI's Realtime client secret endpoint.
3. The client uses that ephemeral secret to negotiate a WebRTC session directly with OpenAI Realtime.
4. OpenAI streams audio and transcript events back to the floating UI.

Default model: `gpt-realtime-1.5`

Cost fallback: `gpt-realtime-mini`

## Run

Create an environment file:

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`, then run the server:

```bash
npm run dev
```

Then visit `http://localhost:5173`.

Without `OPENAI_API_KEY`, the UI still works as a visual prototype, but the Realtime connection button will report that the server is not configured.

## Ubuntu 24.04 VM Deployment

This app can run on either EC2 or an Azure VM.

```bash
sudo apt update
sudo apt install -y nodejs npm
git clone <your-repo-url> eclipsis
cd eclipsis
npm install
cp .env.example .env
nano .env
npm start
```

For production, run it behind Caddy or Nginx with HTTPS. Browser microphone access and WebRTC should be served from `https://` except during local development.

## App Clip Screenshots

Generate cropped App Clip/iPhone state shots:

```bash
npm run screenshot
```

The generator starts the local Node server when needed and saves:

- `screenshots/appclips/eclipsis-appclip-usage-board.png`
- `screenshots/appclips/eclipsis-appclip-listening-over-article.png`
- `screenshots/appclips/eclipsis-appclip-ready-home-screen.png`
- `screenshots/appclips/eclipsis-appclip-realtime-response.png`

Full-page captures are still available:

```bash
npm run screenshot:desktop
npm run screenshot:mobile
```

## What Is Included

- Floating App Clip assistant UI with three phone states.
- Push-to-talk interaction with listening and answering states.
- OpenAI Realtime WebRTC connection flow.
- Express token broker for ephemeral Realtime sessions.
- Trigger selector for Action Button, Back Tap, Siri Shortcut, and Control Center.
- Prompt selector with three sample response modes.
- Architecture section covering iPhone App Clip, Ubuntu token broker, OpenAI Realtime, tools, and storage.
- Rationale and roadmap sections from the concept board.

## Project Shape

```text
eclipsis/
  index.html
  package.json
  README.md
  server/
    index.js
  scripts/
    screenshot.js
  screenshots/
    appclips/
  src/
    main.js
    styles.css
```
