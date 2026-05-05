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

let responseTimer;
let realtimeConnection;

function setTopic(value) {
  const selected = responses[value];
  topicTitle.textContent = selected.title;
  responseText.textContent = selected.response;
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
    triggerButtons.forEach((candidate) => candidate.classList.remove("is-active"));
    button.classList.add("is-active");
    triggerReadout.textContent = `${button.dataset.trigger} armed`;
  });
});

async function connectRealtime() {
  if (realtimeConnection) {
    realtimeConnection.peerConnection.close();
    realtimeConnection.localStream.getTracks().forEach((track) => track.stop());
    realtimeConnection.remoteAudio.remove();
    realtimeConnection = null;
    connectButton.textContent = "Connect Realtime";
    connectionStatus.textContent = "Disconnected.";
    body.classList.remove("is-connected");
    return;
  }

  connectButton.disabled = true;
  connectionStatus.textContent = "Requesting ephemeral OpenAI Realtime session...";

  try {
    const tokenResponse = await fetch("/api/realtime/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instructions:
          "You are Eclipsis, a fast floating voice assistant. Keep spoken answers concise, practical, and friendly."
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
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

      if (payload.type === "response.output_audio_transcript.delta") {
        responseText.textContent += payload.delta;
      }

      if (payload.type === "response.created") {
        responseText.textContent = "";
        statusLabel.textContent = "Answering...";
      }

      if (payload.type === "response.done") {
        statusLabel.textContent = "Ready";
      }
    };

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
    connectionStatus.textContent = "Connected to OpenAI Realtime.";
    body.classList.add("is-connected");
  } catch (error) {
    if (realtimeConnection) {
      realtimeConnection.peerConnection.close();
      realtimeConnection.localStream.getTracks().forEach((track) => track.stop());
      realtimeConnection.remoteAudio.remove();
      realtimeConnection = null;
    }
    connectionStatus.textContent = error.message;
  } finally {
    connectButton.disabled = false;
  }
}

connectButton.addEventListener("click", connectRealtime);

async function loadServerStatus() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    if (data.hasOpenAIKey) {
      connectionStatus.textContent = `Server ready for ${data.realtimeModel} with ${data.realtimeVoice} voice.`;
      return;
    }

    connectionStatus.textContent = "Demo mode. Add OPENAI_API_KEY on the server to connect.";
  } catch (error) {
    connectionStatus.textContent = "Demo mode. Start the Node server to enable Realtime.";
  }
}

setTopic(topicSelect.value);
loadServerStatus();
