const talkButton = document.querySelector("#talk-button");
const topicSelect = document.querySelector("#topic-select");
const statusLabel = document.querySelector("[data-status-label]");
const responseText = document.querySelector("#assistant-response");
const topicTitle = document.querySelector("#topic-title");
const triggerReadout = document.querySelector("#trigger-readout");
const triggerButtons = document.querySelectorAll(".trigger");
const connectButton = document.querySelector("#connect-button");
const connectionStatus = document.querySelector("#connection-status");
const body = document.body;
const authGate = document.querySelector("#auth-gate");
const authForm = document.querySelector("#auth-form");
const authTokenInput = document.querySelector("#auth-token");
const authError = document.querySelector("#auth-error");
const voiceLaunchButton = document.querySelector("#voice-launch-button");
const launchStatus = document.querySelector("#launch-status");
const settingsButton = document.querySelector("#settings-button");
const closeSettingsButton = document.querySelector("#close-settings-button");
const settingsPanel = document.querySelector("#settings-panel");
const conversationList = document.querySelector("#conversation-list");
const transcriptLog = document.querySelector("#transcript-log");
const activeConversationTitle = document.querySelector("#active-conversation-title");
const newConversationButton = document.querySelector("#new-conversation-button");
const clearLocalDataButton = document.querySelector("#clear-local-data-button");
const assistantNameReadout = document.querySelector("#assistant-name-readout");
const voiceSummary = document.querySelector("#voice-summary");
const systemInstructionButton = document.querySelector("#system-instruction-button");
const imagePrompt = document.querySelector("#image-prompt");
const imageSize = document.querySelector("#image-size");
const imageQuality = document.querySelector("#image-quality");
const generateImageButton = document.querySelector("#generate-image-button");
const imageStatus = document.querySelector("#image-status");
const generatedImage = document.querySelector("#generated-image");

const settingInputs = {
  assistantName: document.querySelector("#setting-assistant-name"),
  orbColor: document.querySelector("#setting-orb-color"),
  voiceModel: document.querySelector("#setting-voice-model"),
  voiceName: document.querySelector("#setting-voice-name"),
  voiceStyle: document.querySelector("#setting-voice-style"),
  persona: document.querySelector("#setting-persona"),
  accent: document.querySelector("#setting-accent"),
  latency: document.querySelector("#setting-latency"),
  contextLength: document.querySelector("#setting-context-length"),
  responseLength: document.querySelector("#setting-response-length"),
  interruptionStyle: document.querySelector("#setting-interruption-style"),
  wakePhrase: document.querySelector("#setting-wake-phrase"),
  wakeMode: document.querySelector("#setting-wake-mode"),
  confirmationStyle: document.querySelector("#setting-confirmation-style"),
  actionAutonomy: document.querySelector("#setting-action-autonomy"),
  imageModeration: document.querySelector("#setting-image-moderation"),
  realtimeSafetyMode: document.querySelector("#setting-realtime-safety-mode"),
  moderationModel: document.querySelector("#setting-moderation-model"),
  moderationBehavior: document.querySelector("#setting-moderation-behavior"),
  systemInstruction: document.querySelector("#setting-system-instruction"),
  voiceChat: document.querySelector("#setting-voice-chat"),
  autoStart: document.querySelector("#setting-auto-start"),
  saveTranscripts: document.querySelector("#setting-save-transcripts"),
  tools: {
    web: document.querySelector("#tool-web"),
    memory: document.querySelector("#tool-memory"),
    clipboard: document.querySelector("#tool-clipboard"),
    calendar: document.querySelector("#tool-calendar"),
    image: document.querySelector("#tool-image")
  },
  actions: {
    draftMessage: document.querySelector("#action-draft-message"),
    summarizePage: document.querySelector("#action-summarize-page"),
    createReminder: document.querySelector("#action-create-reminder"),
    prepareCalendar: document.querySelector("#action-prepare-calendar"),
    generateImage: document.querySelector("#action-generate-image"),
    webResearch: document.querySelector("#action-web-research")
  }
};

const storageKeys = {
  authToken: "eclipsis.authToken",
  settings: "eclipsis.settings",
  conversations: "eclipsis.conversations",
  activeConversationId: "eclipsis.activeConversationId"
};

const defaultSettings = {
  assistantName: "Eclipsis",
  orbColor: "#7f64ff",
  voiceModel: "gpt-realtime-1.5",
  voiceName: "marin",
  voiceStyle: "balanced",
  persona: "operator",
  accent: "neutral",
  latency: "balanced",
  contextLength: "medium",
  responseLength: "brief",
  interruptionStyle: "allow",
  wakePhrase: "hey ryan",
  wakeMode: "soft",
  confirmationStyle: "yes-nah-sure-explain",
  actionAutonomy: "confirm-before-action",
  imageModeration: "auto",
  realtimeSafetyMode: "openai-default",
  moderationModel: "omni-moderation-latest",
  moderationBehavior: "explain-and-confirm",
  systemInstruction:
    "You are a fast, useful voice assistant. Be concise, practical, and warm. Prefer action over explanation unless the user asks for detail.",
  voiceChat: true,
  autoStart: true,
  saveTranscripts: true,
  tools: {
    web: false,
    memory: true,
    clipboard: false,
    calendar: false,
    image: true
  },
  actions: {
    draftMessage: true,
    summarizePage: true,
    createReminder: false,
    prepareCalendar: false,
    generateImage: true,
    webResearch: false
  }
};

const responses = {
  energy: {
    title: "Renewable Energy Overview",
    prompt: "Explain renewable energy",
    response:
      "Renewable energy uses naturally replenished sources such as sunlight, wind, water, and geothermal heat."
  },
  ai: {
    title: "AI Article Summary",
    prompt: "Summarize the AI article",
    response:
      "The article explains how AI is reshaping work through machine learning, natural language interfaces, and automation."
  },
  meeting: {
    title: "Meeting Follow-Up",
    prompt: "Draft a meeting follow-up",
    response:
      "Here is a concise follow-up: thanks for the discussion, confirm owners, share decisions, and list next steps."
  }
};

const triggerAliases = {
  action: "Action Button",
  "action-button": "Action Button",
  actionbutton: "Action Button",
  backtap: "Back Tap",
  "back-tap": "Back Tap",
  siri: "Siri Shortcut",
  "siri-shortcut": "Siri Shortcut",
  control: "Control Center",
  "control-center": "Control Center"
};

let responseTimer;
let realtimeConnection;
let authRequired = false;
let settings = loadSettings();
let conversations = loadConversations();
let activeConversationId = localStorage.getItem(storageKeys.activeConversationId);
let pendingAssistantText = "";
let titleTimer;

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeys.settings) || "{}");
    return {
      ...defaultSettings,
      ...parsed,
      tools: {
        ...defaultSettings.tools,
        ...parsed.tools
      },
      actions: {
        ...defaultSettings.actions,
        ...parsed.actions
      }
    };
  } catch (error) {
    return defaultSettings;
  }
}

function saveSettings() {
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
}

function loadConversations() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKeys.conversations) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function saveConversations() {
  if (settings.saveTranscripts) {
    localStorage.setItem(storageKeys.conversations, JSON.stringify(conversations.slice(0, 24)));
    return;
  }

  localStorage.removeItem(storageKeys.conversations);
}

function getAuthToken() {
  return localStorage.getItem(storageKeys.authToken) || "";
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function moderationChecksEnabled() {
  return settings.realtimeSafetyMode !== "openai-default";
}

function effectiveModerationBehavior() {
  return settings.realtimeSafetyMode === "block-flagged" ? "block" : settings.moderationBehavior;
}

function summarizeFlaggedCategories(categories = {}) {
  return Object.entries(categories)
    .filter(([, flagged]) => flagged)
    .map(([name]) => name)
    .join(", ");
}

async function checkModeration(input) {
  if (!moderationChecksEnabled()) {
    return { flagged: false, categories: {} };
  }

  const response = await fetch("/api/moderations/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      input,
      model: settings.moderationModel
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Moderation check failed.");
  }

  return data;
}

async function shouldContinueAfterModeration(input, statusElement, label) {
  if (!moderationChecksEnabled()) {
    return true;
  }

  const result = await checkModeration(input);

  if (!result.flagged) {
    return true;
  }

  const categories = summarizeFlaggedCategories(result.categories) || "policy-sensitive content";
  const message = `${label} flagged by ${result.model}: ${categories}.`;
  const behavior = effectiveModerationBehavior();

  if (statusElement) {
    statusElement.textContent = message;
  }

  if (behavior === "warn") {
    return true;
  }

  if (behavior === "explain-and-confirm") {
    return window.confirm(`${message}\n\nContinue anyway?`);
  }

  return false;
}

function isVoiceLaunch() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") !== "showcase";
}

function shouldAutoStart() {
  const params = new URLSearchParams(window.location.search);
  return ["1", "true", "voice"].includes(params.get("start")) || params.get("autostart") === "1";
}

function updateLaunchStatus(message) {
  if (launchStatus) {
    launchStatus.textContent = message;
  }

  connectionStatus.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createConversation(title = "New voice chat") {
  const now = new Date().toISOString();
  const conversation = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };

  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  localStorage.setItem(storageKeys.activeConversationId, activeConversationId);
  saveConversations();
  renderConversations();
  renderTranscript();
  return conversation;
}

function getActiveConversation() {
  let conversation = conversations.find((item) => item.id === activeConversationId);

  if (!conversation) {
    conversation = createConversation();
  }

  return conversation;
}

function addMessage(role, text) {
  if (!text.trim()) {
    return;
  }

  const conversation = getActiveConversation();
  conversation.messages.push({
    id: crypto.randomUUID(),
    role,
    text: text.trim(),
    at: new Date().toISOString()
  });
  conversation.updatedAt = new Date().toISOString();
  saveConversations();
  renderTranscript();
  scheduleTitleGeneration();
}

function renderConversations() {
  if (!conversationList) {
    return;
  }

  if (!conversations.length) {
    conversationList.innerHTML = `<p class="empty-state">No voice chats yet.</p>`;
    return;
  }

  conversationList.innerHTML = conversations
    .map(
      (conversation) => `
        <button class="conversation-item ${conversation.id === activeConversationId ? "is-active" : ""}" type="button" data-conversation-id="${conversation.id}">
          <strong>${escapeHtml(conversation.title)}</strong>
          <span>${new Date(conversation.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        </button>`
    )
    .join("");
}

function renderTranscript() {
  if (!transcriptLog) {
    return;
  }

  const conversation = getActiveConversation();
  activeConversationTitle.textContent = conversation.title;

  if (!conversation.messages.length) {
    transcriptLog.innerHTML = `<p class="empty-state">Launch voice and start talking. Eclipsis will keep the transcript here when saving is enabled.</p>`;
    return;
  }

  transcriptLog.innerHTML = conversation.messages
    .map(
      (message) => `
        <article class="transcript-message transcript-message--${message.role}">
          <span>${message.role === "user" ? "You" : "Eclipsis"}</span>
          <p>${escapeHtml(message.text)}</p>
        </article>`
    )
    .join("");
  transcriptLog.scrollTop = transcriptLog.scrollHeight;
}

function renderSettings() {
  settingInputs.assistantName.value = settings.assistantName;
  settingInputs.orbColor.value = settings.orbColor;
  settingInputs.voiceModel.value = settings.voiceModel;
  settingInputs.voiceName.value = settings.voiceName;
  settingInputs.voiceStyle.value = settings.voiceStyle;
  settingInputs.persona.value = settings.persona;
  settingInputs.accent.value = settings.accent;
  settingInputs.latency.value = settings.latency;
  settingInputs.contextLength.value = settings.contextLength;
  settingInputs.responseLength.value = settings.responseLength;
  settingInputs.interruptionStyle.value = settings.interruptionStyle;
  settingInputs.wakePhrase.value = settings.wakePhrase;
  settingInputs.wakeMode.value = settings.wakeMode;
  settingInputs.confirmationStyle.value = settings.confirmationStyle;
  settingInputs.actionAutonomy.value = settings.actionAutonomy;
  settingInputs.imageModeration.value = settings.imageModeration;
  settingInputs.realtimeSafetyMode.value = settings.realtimeSafetyMode;
  settingInputs.moderationModel.value = settings.moderationModel;
  settingInputs.moderationBehavior.value = settings.moderationBehavior;
  settingInputs.systemInstruction.value = settings.systemInstruction;
  settingInputs.voiceChat.checked = settings.voiceChat;
  settingInputs.autoStart.checked = settings.autoStart;
  settingInputs.saveTranscripts.checked = settings.saveTranscripts;
  assistantNameReadout.textContent = settings.assistantName;
  document.documentElement.style.setProperty("--orb-accent", settings.orbColor);
  voiceSummary.textContent = `${settings.voiceModel} · ${settings.voiceStyle} · ${settings.latency}`;
  Object.entries(settingInputs.tools).forEach(([name, input]) => {
    input.checked = settings.tools[name];
    document.querySelector(`[data-tool-chip="${name}"]`)?.classList.toggle("is-enabled", settings.tools[name]);
  });
  Object.entries(settingInputs.actions).forEach(([name, input]) => {
    input.checked = settings.actions[name];
  });
}

function buildInstructions() {
  const enabledTools = Object.entries(settings.tools)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(", ");
  const enabledActions = Object.entries(settings.actions)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(", ");

  return [
    `You are ${settings.assistantName}, a fast floating voice assistant for quick phone-triggered help.`,
    `Persona: ${settings.persona}.`,
    `Voice style: ${settings.voiceStyle}.`,
    `Accent target: ${settings.accent}.`,
    `Latency preference: ${settings.latency}. If fastest, answer with minimal deliberation. If thoughtful, take a beat for better structure.`,
    `Context length preference: ${settings.contextLength}. Use ${settings.contextLength === "short" ? "only the latest turn and immediate local transcript hints" : settings.contextLength === "long" ? "as much relevant local transcript context as available" : "recent relevant context"} when answering.`,
    `Response length preference: ${settings.responseLength}.`,
    `Interruption style: ${settings.interruptionStyle}.`,
    `Wake phrase mode: ${settings.wakeMode}. Wake phrase: "${settings.wakePhrase}". If mode is strict, only respond to actionable speech after the wake phrase. If soft, treat the wake phrase as preferred but continue naturally when the user's intent is clear.`,
    `Confirmation style: ${settings.confirmationStyle}. For yes-nah-sure-explain, offer choices as "yes", "nah", "sure", or "explain" when confirming actions.`,
    `Action autonomy: ${settings.actionAutonomy}.`,
    `Realtime safety mode: ${settings.realtimeSafetyMode}. OpenAI's realtime service applies its own safety handling; app-side transcript moderation is ${settings.realtimeSafetyMode === "openai-default" ? "off" : "on"}.`,
    enabledActions ? `Enabled agentic action intents: ${enabledActions}. Do not claim completion of actions that are not actually integrated. Prepare drafts, plans, or handoff payloads when execution is unavailable.` : "No agentic action intents are enabled.",
    settings.systemInstruction,
    "Start naturally as soon as the session connects. Keep spoken replies concise, practical, and warm.",
    "Ask one short clarifying question only when needed.",
    enabledTools ? `The user enabled these app-side tool intents: ${enabledTools}. If a tool is needed, say what you would do and what permission or integration is missing.` : "No app-side tools are enabled. Do not pretend to access external tools.",
    settings.saveTranscripts ? "The client may save a local transcript on this device." : "The client is not saving transcripts locally."
  ].join(" ");
}

function scheduleTitleGeneration() {
  clearTimeout(titleTimer);
  titleTimer = window.setTimeout(generateConversationTitle, 900);
}

function pulseSyllableLight() {
  body.classList.add("is-syllable-hit");
  window.clearTimeout(pulseSyllableLight.timer);
  pulseSyllableLight.timer = window.setTimeout(() => {
    body.classList.remove("is-syllable-hit");
  }, 140);
}

async function generateConversationTitle() {
  const conversation = getActiveConversation();
  if (conversation.messages.length < 2 || conversation.title !== "New voice chat") {
    return;
  }

  const transcript = conversation.messages.map((message) => `${message.role}: ${message.text}`).join("\n");

  try {
    const response = await fetch("/api/conversations/title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ transcript })
    });

    const data = await response.json();

    if (response.ok && data.title) {
      conversation.title = data.title;
      saveConversations();
      renderConversations();
      renderTranscript();
    }
  } catch (error) {
    conversation.title = conversation.messages[0]?.text.slice(0, 42) || "Voice chat";
    saveConversations();
    renderConversations();
    renderTranscript();
  }
}

function setTopic(value) {
  const selected = responses[value];
  if (!selected) {
    return;
  }

  topicSelect.value = value;
  topicTitle.textContent = selected.title;
  responseText.textContent = selected.response;
}

function setTrigger(value) {
  const normalized = value.toLowerCase().trim();
  const label = triggerAliases[normalized] || value;
  const selectedButton = Array.from(triggerButtons).find(
    (button) => button.dataset.trigger.toLowerCase() === label.toLowerCase()
  );

  if (!selectedButton) {
    return;
  }

  triggerButtons.forEach((candidate) => candidate.classList.remove("is-active"));
  selectedButton.classList.add("is-active");
  triggerReadout.textContent = `${selectedButton.dataset.trigger} armed`;
}

function applyAppClipLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic") || params.get("prompt");
  const trigger = params.get("trigger") || params.get("source");
  const listening = params.get("listen") || params.get("listening");

  if (topic) {
    setTopic(topic);
  }

  if (trigger) {
    setTrigger(trigger);
  }

  if (listening === "1" || listening === "true") {
    setListening(true);
  }
}

function setListening(isListening) {
  clearTimeout(responseTimer);
  body.classList.toggle("is-listening", isListening);
  talkButton.setAttribute("aria-pressed", String(isListening));
  talkButton.lastChild.textContent = isListening ? " Listening" : " Hold to Talk";
  statusLabel.textContent = isListening ? "Listening..." : "Ready";

  if (!isListening) {
    body.classList.add("is-answering");
    statusLabel.textContent = "Answering...";
    responseTimer = window.setTimeout(() => {
      body.classList.remove("is-answering");
      statusLabel.textContent = "Listening...";
    }, 1600);
  }
}

topicSelect.addEventListener("change", (event) => {
  setTopic(event.target.value);
});

talkButton.addEventListener("pointerdown", () => setListening(true));
talkButton.addEventListener("pointerup", () => setListening(false));
talkButton.addEventListener("pointerleave", () => {
  if (talkButton.getAttribute("aria-pressed") === "true") {
    setListening(false);
  }
});
talkButton.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    setListening(true);
  }
});
talkButton.addEventListener("keyup", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    setListening(false);
  }
});

triggerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTrigger(button.dataset.trigger);
  });
});

function endRealtimeSession(message = "Voice session ended.") {
  if (!realtimeConnection) {
    return;
  }

  realtimeConnection.peerConnection.close();
  realtimeConnection.localStream.getTracks().forEach((track) => track.stop());
  realtimeConnection.remoteAudio.remove();
  realtimeConnection = null;
  connectButton.textContent = "Connect Realtime";
  connectionStatus.textContent = "Disconnected.";
  voiceLaunchButton.textContent = "Start Voice";
  updateLaunchStatus(message);
  body.classList.remove("is-connected");
  body.classList.remove("is-listening");
}

async function moderateRealtimeTranscript(transcript) {
  if (!transcript.trim() || !moderationChecksEnabled()) {
    return;
  }

  try {
    const allowed = await shouldContinueAfterModeration(transcript, connectionStatus, "Realtime transcript");

    if (!allowed) {
      endRealtimeSession("Voice session paused by safety check.");
    }
  } catch (error) {
    updateLaunchStatus(error.message);
  }
}

async function connectRealtime() {
  if (realtimeConnection) {
    endRealtimeSession();
    return;
  }

  if (authRequired && !getAuthToken()) {
    authGate.hidden = false;
    updateLaunchStatus("Unlock Eclipsis to start voice.");
    return;
  }

  if (!settings.voiceChat) {
    updateLaunchStatus("Voice chat is off in settings.");
    return;
  }

  connectButton.disabled = true;
  voiceLaunchButton.disabled = true;
  updateLaunchStatus("Requesting secure Realtime session...");

  try {
    const tokenResponse = await fetch("/api/realtime/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        instructions: buildInstructions(),
        model: settings.voiceModel,
        voice: settings.voiceName
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      if (tokenResponse.status === 401) {
        authGate.hidden = false;
      }
      throw new Error(tokenData.error || "Could not create a Realtime session.");
    }

    const ephemeralKey = tokenData.value;
    const peerConnection = new RTCPeerConnection();
    const remoteAudio = document.createElement("audio");
    const events = peerConnection.createDataChannel("oai-events");

    remoteAudio.autoplay = true;
    document.body.append(remoteAudio);

    peerConnection.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    events.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "conversation.item.input_audio_transcription.completed") {
        const transcript = payload.transcript || "";
        addMessage("user", transcript);
        moderateRealtimeTranscript(transcript);
      }

      if (payload.type === "response.output_audio_transcript.delta") {
        pendingAssistantText += payload.delta;
        responseText.textContent += payload.delta;
        pulseSyllableLight();
      }

      if (payload.type === "response.created") {
        pendingAssistantText = "";
        responseText.textContent = "";
        statusLabel.textContent = "Answering...";
        updateLaunchStatus("Eclipsis is answering...");
      }

      if (payload.type === "response.done") {
        addMessage("assistant", pendingAssistantText);
        pendingAssistantText = "";
        statusLabel.textContent = "Ready";
        updateLaunchStatus("Listening. Ask another thing.");
      }
    };

    updateLaunchStatus("Requesting microphone access...");
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      throw new Error("OpenAI Realtime WebRTC negotiation failed.");
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await sdpResponse.text()
    });

    realtimeConnection = { peerConnection, remoteAudio, localStream };
    connectButton.textContent = "Disconnect";
    voiceLaunchButton.textContent = "End Voice";
    updateLaunchStatus("Connected. Start speaking.");
    body.classList.add("is-connected");
    setListening(true);
  } catch (error) {
    endRealtimeSession(error.message);
    updateLaunchStatus(error.message);
  } finally {
    connectButton.disabled = false;
    voiceLaunchButton.disabled = false;
  }
}

connectButton.addEventListener("click", connectRealtime);
voiceLaunchButton.addEventListener("click", connectRealtime);

async function loadServerStatus() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    authRequired = Boolean(data.authRequired);

    if (authRequired && !getAuthToken()) {
      authGate.hidden = false;
      updateLaunchStatus("Unlock Eclipsis to use voice.");
      return;
    }

    if (data.hasOpenAIKey) {
      updateLaunchStatus(`Server ready for ${data.realtimeModel} with ${data.realtimeVoice} voice.`);
      return;
    }

    updateLaunchStatus("Demo mode. Add OPENAI_API_KEY on the server to connect.");
  } catch (error) {
    updateLaunchStatus("Demo mode. Start the Node server to enable Realtime.");
  }
}

function bindAppEvents() {
  conversationList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-conversation-id]");
    if (!item) {
      return;
    }

    activeConversationId = item.dataset.conversationId;
    localStorage.setItem(storageKeys.activeConversationId, activeConversationId);
    renderConversations();
    renderTranscript();
  });

  newConversationButton.addEventListener("click", () => {
    createConversation();
    updateLaunchStatus("New voice chat ready.");
  });

  settingsButton.addEventListener("click", () => {
    settingsPanel.hidden = false;
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsPanel.hidden = true;
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    localStorage.setItem(storageKeys.authToken, authTokenInput.value.trim());
    authGate.hidden = true;
    authError.textContent = "";
    await loadServerStatus();

    if (isVoiceLaunch() && settings.autoStart && shouldAutoStart()) {
      connectRealtime();
    }
  });

  clearLocalDataButton.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.conversations);
    localStorage.removeItem(storageKeys.activeConversationId);
    conversations = [];
    activeConversationId = "";
    createConversation();
    updateLaunchStatus("Local conversations cleared.");
  });

  settingInputs.voiceChat.addEventListener("change", () => {
    settings.voiceChat = settingInputs.voiceChat.checked;
    saveSettings();
  });

  settingInputs.autoStart.addEventListener("change", () => {
    settings.autoStart = settingInputs.autoStart.checked;
    saveSettings();
  });

  settingInputs.saveTranscripts.addEventListener("change", () => {
    settings.saveTranscripts = settingInputs.saveTranscripts.checked;
    saveSettings();
    saveConversations();
  });

  Object.entries(settingInputs.tools).forEach(([name, input]) => {
    input.addEventListener("change", () => {
      settings.tools[name] = input.checked;
      saveSettings();
      renderSettings();
    });
  });

  Object.entries(settingInputs.actions).forEach(([name, input]) => {
    input.addEventListener("change", () => {
      settings.actions[name] = input.checked;
      saveSettings();
      renderSettings();
    });
  });

  [
    "assistantName",
    "orbColor",
    "voiceModel",
    "voiceName",
    "voiceStyle",
    "persona",
    "accent",
    "latency",
    "contextLength",
    "responseLength",
    "interruptionStyle",
    "wakePhrase",
    "wakeMode",
    "confirmationStyle",
    "actionAutonomy",
    "imageModeration",
    "realtimeSafetyMode",
    "moderationModel",
    "moderationBehavior",
    "systemInstruction"
  ].forEach((name) => {
    settingInputs[name].addEventListener("input", () => {
      settings[name] = settingInputs[name].value;
      saveSettings();
      renderSettings();
    });
  });

  systemInstructionButton.addEventListener("click", () => {
    settingsPanel.hidden = false;
    settingInputs.systemInstruction.closest("details").open = true;
    settingInputs.systemInstruction.focus();
  });

  generateImageButton.addEventListener("click", generateImage);
}

async function generateImage() {
  if (!settings.tools.image) {
    imageStatus.textContent = "Turn on GPT Image 2 in Tools first.";
    return;
  }

  const prompt = imagePrompt.value.trim();

  if (!prompt) {
    imageStatus.textContent = "Add an image prompt.";
    return;
  }

  generateImageButton.disabled = true;
  imageStatus.textContent = moderationChecksEnabled() ? "Checking prompt safety..." : "Generating with GPT Image 2...";
  generatedImage.hidden = true;

  try {
    const canGenerate = await shouldContinueAfterModeration(prompt, imageStatus, "Image prompt");

    if (!canGenerate) {
      imageStatus.textContent = "Image generation blocked by safety settings.";
      return;
    }

    imageStatus.textContent = "Generating with GPT Image 2...";
    const response = await fetch("/api/images/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        prompt,
        size: imageSize.value,
        quality: imageQuality.value,
        moderation: settings.imageModeration
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Image generation failed.");
    }

    generatedImage.src = `data:image/png;base64,${data.image}`;
    generatedImage.hidden = false;
    imageStatus.textContent = `Generated with ${data.model} (${data.moderation} moderation).`;
  } catch (error) {
    imageStatus.textContent = error.message;
  } finally {
    generateImageButton.disabled = false;
  }
}

async function initializeApp() {
  const voiceMode = isVoiceLaunch();

  if (voiceMode) {
    body.classList.add("is-voice-app");
    settingsPanel.hidden = false;
    createConversation();
    setTrigger(new URLSearchParams(window.location.search).get("trigger") || "action-button");
  }

  renderSettings();
  renderConversations();
  if (voiceMode || conversations.length) {
    renderTranscript();
  }
  bindAppEvents();
  applyAppClipLaunchParams();
  await loadServerStatus();

  if (voiceMode && settings.autoStart && shouldAutoStart()) {
    window.setTimeout(connectRealtime, 350);
  }
}

setTopic(topicSelect.value);
initializeApp();
