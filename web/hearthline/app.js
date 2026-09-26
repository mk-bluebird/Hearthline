"use strict";

const MAX_MESSAGE_LENGTH = 2000;
const DRAFT_STORAGE_KEY = "hearthline.demo.draft.v1";
const CONSENT_STORAGE_KEY = "hearthline.demo.ai-consent.v1";
const APPEARANCE_STORAGE_KEY = "hearthline.demo.appearance.v1";

const messageForm = document.querySelector("#message-composer");
const messageText = document.querySelector("#message-text");
const messageCount = document.querySelector("#message-count");
const messageLog = document.querySelector("#message-log");
const clearDraftButton = document.querySelector("#clear-draft");
const aiConsent = document.querySelector("#ai-consent");
const aiResponse = document.querySelector("#ai-response");
const quietModeButton = document.querySelector("#quiet-mode-toggle");
const appearanceToggle = document.querySelector("#appearance-toggle");

let announcementsPaused = false;

function getSafeStorageValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSafeStorageValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return false;
  }

  return true;
}

function removeSafeStorageValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return false;
  }

  return true;
}

function formatTime(date) {
  return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function updateMessageCount() {
  messageCount.value = `${messageText.value.length} / ${MAX_MESSAGE_LENGTH}`;
}

function saveDraft() {
  setSafeStorageValue(DRAFT_STORAGE_KEY, messageText.value);
}

function createMessageElement(text, date = new Date()) {
  const article = document.createElement("article");
  article.className = "message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "Y";

  const content = document.createElement("div");
  content.className = "message-content";

  const header = document.createElement("header");
  const sender = document.createElement("strong");
  sender.textContent = "You";

  const time = document.createElement("time");
  time.dateTime = date.toISOString();
  time.textContent = formatTime(date);

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  header.append(sender, time);
  content.append(header, paragraph);
  article.append(avatar, content);

  return article;
}

function appendLocalMessage(text) {
  const message = createMessageElement(text);
  messageLog.append(message);
  messageLog.scrollTop = messageLog.scrollHeight;

  if (announcementsPaused) {
    const previousLiveSetting = messageLog.getAttribute("aria-live");
    messageLog.setAttribute("aria-live", "off");

    window.setTimeout(() => {
      messageLog.setAttribute("aria-live", previousLiveSetting || "polite");
    }, 0);
  }
}

function setAiResponse(message) {
  aiResponse.value = message;
}

function requireAiConsent() {
  if (aiConsent.checked) {
    return true;
  }

  setAiResponse(
    "AI assistance remains off. Review the consent statement and choose whether to enable it for this browser session."
  );
  aiConsent.focus();
  return false;
}

function handleAiAction(action) {
  if (!requireAiConsent()) {
    return;
  }

  const draft = messageText.value.trim();

  if (!draft) {
    setAiResponse(
      "Write or paste the text you want help with first. This demonstration will not transmit it anywhere."
    );
    messageText.focus();
    return;
  }

  const messages = {
    clarify:
      "Demonstration request prepared: ask an approved future relay for a clearer, plain-language version. Review the result before sharing.",
    translate:
      "Demonstration request prepared: choose a target language and send only the text you intentionally want translated through an approved future relay.",
    summary:
      "Demonstration request prepared: obtain consent from the contributors whose messages would be included before creating or sharing a summary."
  };

  setAiResponse(messages[action] ?? "No demonstration action is available.");
}

function setAppearance(mode) {
  document.documentElement.dataset.colorScheme = mode;
  const isHighContrast = mode === "high-contrast";

  appearanceToggle.setAttribute("aria-pressed", String(isHighContrast));
  appearanceToggle.textContent = isHighContrast
    ? "Use standard contrast"
    : "Use high contrast";

  setSafeStorageValue(APPEARANCE_STORAGE_KEY, mode);
}

function restoreState() {
  const storedDraft = getSafeStorageValue(DRAFT_STORAGE_KEY);
  if (storedDraft !== null) {
    messageText.value = storedDraft.slice(0, MAX_MESSAGE_LENGTH);
  }

  aiConsent.checked = getSafeStorageValue(CONSENT_STORAGE_KEY) === "granted";

  const storedAppearance = getSafeStorageValue(APPEARANCE_STORAGE_KEY);
  if (storedAppearance === "high-contrast") {
    setAppearance("high-contrast");
  } else {
    setAppearance("system");
  }

  updateMessageCount();
}

messageText.addEventListener("input", () => {
  if (messageText.value.length > MAX_MESSAGE_LENGTH) {
    messageText.value = messageText.value.slice(0, MAX_MESSAGE_LENGTH);
  }

  updateMessageCount();
  saveDraft();
});

messageText.addEventListener("keydown", (event) => {
  const submitShortcut = (event.ctrlKey || event.metaKey) && event.key === "Enter";

  if (submitShortcut) {
    event.preventDefault();
    messageForm.requestSubmit();
  }
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = messageText.value.trim();
  if (!text) {
    messageText.focus();
    return;
  }

  appendLocalMessage(text);
  messageText.value = "";
  updateMessageCount();
  removeSafeStorageValue(DRAFT_STORAGE_KEY);
  setAiResponse(
    "Your message was added locally in this demonstration. No network request was made."
  );
});

clearDraftButton.addEventListener("click", () => {
  messageText.value = "";
  updateMessageCount();
  removeSafeStorageValue(DRAFT_STORAGE_KEY);
  setAiResponse("The local draft was cleared from this browser.");
  messageText.focus();
});

aiConsent.addEventListener("change", () => {
  setSafeStorageValue(
    CONSENT_STORAGE_KEY,
    aiConsent.checked ? "granted" : "not-granted"
  );

  setAiResponse(
    aiConsent.checked
      ? "AI assistance controls are now available for this browser. They remain demonstrations and do not transmit content."
      : "AI assistance is disabled. No future request should be sent unless you choose to enable it again."
  );
});

quietModeButton.addEventListener("click", () => {
  announcementsPaused = !announcementsPaused;
  quietModeButton.textContent = announcementsPaused
    ? "Resume message announcements"
    : "Pause message announcements";

  setAiResponse(
    announcementsPaused
      ? "New local messages will not be announced automatically until you resume announcements."
      : "New local messages can again be announced politely to assistive technologies."
  );
});

appearanceToggle.addEventListener("click", () => {
  const currentMode = document.documentElement.dataset.colorScheme;
  setAppearance(currentMode === "high-contrast" ? "system" : "high-contrast");
});

document.querySelectorAll("[data-ai-action]").forEach((button) => {
  button.addEventListener("click", () => {
    handleAiAction(button.dataset.aiAction);
  });
});

restoreState();
