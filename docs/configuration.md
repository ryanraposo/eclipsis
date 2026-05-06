# Eclipsis Configuration Schema

The canonical configuration inventory lives at:

```text
config.schema.json
```

It is intentionally more descriptive than a pure validation schema. Each setting includes its type, default, enum values when applicable, persistence/API mapping, and expected UI location.

## UI Locations

`main-chat-module`
: The compact center assistant module. This is where the orb, assistant name, collapsed `voice model · style`, system-instruction button, transcript, and enabled tool chips appear.

`settings.assistant`
: Assistant identity and voice configuration: name, persona, accent, orb color, Realtime model, voice, voice style, latency, context length, response length, interruption behavior, wake phrase, confirmation style, and action autonomy.

`settings.agentic-actions`
: Action intents the assistant may prepare or execute once integrations exist. Each action in `agenticActions` has a risk level, required permission, current capability, default, and UI id.

`settings.behavior`
: Runtime behavior toggles: voice chat, auto-start launch URLs, and local transcript saving.

`settings.system-instruction`
: Editable instruction text passed into the Realtime session.

`settings.tools`
: Tool intent toggles. Some are currently instruction hints only; `image` maps to the GPT Image 2 generation endpoint.

`settings.gpt-image-2`
: Prompt, size, and quality controls for `POST /api/images/generate`.

`settings.safety`
: API-side safety controls. GPT Image 2 moderation maps to the supported `moderation` request parameter. Realtime safety uses OpenAI's built-in Realtime enforcement plus optional app-side Moderations API transcript checks; no unsupported Realtime content-filter field is sent.

`auth-gate`
: Password-style local token entry. The token is stored client-side and sent as a bearer token to protected API routes.

## Config Groups

`clientSettings`
: Persisted in `localStorage:eclipsis.settings`. These control the assistant name, orb color, voice choices, behavior toggles, and system instruction.

`toolSettings`
: Also persisted under `localStorage:eclipsis.settings.tools`. These determine enabled tool chips and tool intent text passed into the assistant instructions.

`imageGeneration`
: Request-time UI values for GPT Image 2 generation plus persisted image moderation strictness.

`safetyControls`
: Persisted controls for GPT Image 2 moderation and optional Moderations API guardrails for Realtime transcripts and image prompts.

`serverEnvironment`
: `.env` and deployment-time settings. Secrets stay server-side except the user-entered auth token stored locally in the browser.

## Notes

- The live public host is intentionally not encoded in this schema; use `PUBLIC_ORIGIN`.
- `OPENAI_REALTIME_MODEL` and `OPENAI_REALTIME_VOICE` are server defaults, but the client can override them with `voiceModel` and `voiceName`.
- `gpt-image-2` supports configurable size, quality, and `moderation` strictness (`auto` or `low`).
- Realtime 1.5 does not expose a session-level content-filter strictness parameter in this app; the UI uses `/api/moderations/check` for optional transcript/prompt guardrails instead.
- Clipboard, calendar, and web toggles are currently assistant intent hints. They do not execute native integrations yet.
