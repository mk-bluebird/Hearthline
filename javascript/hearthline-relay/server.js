"use strict";

import crypto from "node:crypto";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { WebSocketServer } from "ws";

const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_CONNECTIONS_PER_ORIGIN = 32;
const MAX_REQUESTS_PER_MINUTE = 12;
const REQUEST_WINDOW_MS = 60_000;
const CONNECTION_IDLE_TIMEOUT_MS = 120_000;

const requiredEnvironment = [
  "HEARTHLINE_TLS_KEY_FILE",
  "HEARTHLINE_TLS_CERT_FILE",
  "HEARTHLINE_ALLOWED_ORIGINS",
  "HEARTHLINE_HUMAN_FALLBACK_URL"
];

function requireEnvironment(name) {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be configured.`);
  }

  return value.trim();
}

function requireProductionTransport() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      "This relay is production-only. Use a separate local test adapter for development."
    );
  }

  if (process.env.HEARTHLINE_PUBLIC_SCHEME !== "wss") {
    throw new Error(
      "HEARTHLINE_PUBLIC_SCHEME must be exactly 'wss' to prevent insecure production deployment."
    );
  }
}

function parseAllowedOrigins(serializedOrigins) {
  const allowed = new Set();

  for (const rawOrigin of serializedOrigins.split(",")) {
    const candidate = rawOrigin.trim();
    if (!candidate) {
      continue;
    }

    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      throw new Error(
        `Allowed origin ${candidate} must use https: in production.`
      );
    }

    allowed.add(parsed.origin);
  }

  if (allowed.size === 0) {
    throw new Error("At least one allowed origin is required.");
  }

  return allowed;
}

function sha256Prefix(value) {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex")
    .slice(0, 24);
}

function createAuditEvent(event, details = {}) {
  const safeDetails = {};

  for (const [key, value] of Object.entries(details)) {
    if (
      key === "message" ||
      key === "participantSelectedText" ||
      key === "authorization" ||
      key === "cookie" ||
      key === "identity" ||
      key === "ipAddress"
    ) {
      continue;
    }

    safeDetails[key] = value;
  }

  return JSON.stringify({
    event,
    at: new Date().toISOString(),
    ...safeDetails
  });
}

function emitAuditEvent(event, details) {
  process.stdout.write(`${createAuditEvent(event, details)}\n`);
}

function safeClose(socket, code, message) {
  if (socket.readyState === socket.OPEN || socket.readyState === socket.CLOSING) {
    socket.close(code, message);
  }
}

function isValidRequestEnvelope(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return (
    value.type === "ai-assistance-request" &&
    typeof value.requestId === "string" &&
    value.requestId.length >= 16 &&
    typeof value.action === "string" &&
    typeof value.purpose === "string" &&
    value.purpose.trim().length >= 16 &&
    typeof value.participantSelectedText === "string" &&
    value.participantSelectedText.length > 0 &&
    value.participantSelectedText.length <= 20_000 &&
    value.decisionUseProhibited === true &&
    value.personLevelInferenceProhibited === true &&
    value.participantReviewRequired === true &&
    typeof value.consent === "object" &&
    value.consent !== null &&
    value.consent.scope === "single-request" &&
    value.consent.revocable === true &&
    value.consent.informed === true &&
    typeof value.retention === "object" &&
    value.retention !== null &&
    value.retention.trainingUseAllowed === false &&
    typeof value.retention.deletionRoute === "string" &&
    value.retention.deletionRoute.trim().length >= 8
  );
}

function rateLimitAllows(connectionState) {
  const now = Date.now();

  connectionState.requestTimes = connectionState.requestTimes.filter(
    (timestamp) => now - timestamp < REQUEST_WINDOW_MS
  );

  if (connectionState.requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  connectionState.requestTimes.push(now);
  return true;
}

function createDemonstrationDraft(request) {
  const actionLabel = {
    clarify: "a clearer wording draft",
    translate: "a translation request draft",
    consent_summary: "a consent-based summary request draft"
  }[request.action];

  return {
    type: "ai-assistance-draft",
    requestId: request.requestId,
    reviewRequired: true,
    decisionUseProhibited: true,
    personLevelInferenceProhibited: true,
    content:
      `Demonstration-only relay response: prepare ${actionLabel ?? "a reviewable draft"} ` +
      "for the requesting participant. Do not send this content to another participant " +
      "until the requester has reviewed and deliberately chosen to share it.",
    humanFallback: humanFallbackUrl
  };
}

requireProductionTransport();

for (const name of requiredEnvironment) {
  requireEnvironment(name);
}

const tlsKeyFile = requireEnvironment("HEARTHLINE_TLS_KEY_FILE");
const tlsCertFile = requireEnvironment("HEARTHLINE_TLS_CERT_FILE");
const humanFallbackUrl = requireEnvironment("HEARTHLINE_HUMAN_FALLBACK_URL");
const allowedOrigins = parseAllowedOrigins(
  requireEnvironment("HEARTHLINE_ALLOWED_ORIGINS")
);

const originConnectionCounts = new Map();

const httpsServer = https.createServer({
  key: fs.readFileSync(path.resolve(tlsKeyFile)),
  cert: fs.readFileSync(path.resolve(tlsCertFile)),
  minVersion: "TLSv1.3"
});

const webSocketServer = new WebSocketServer({
  noServer: true,
  maxPayload: MAX_MESSAGE_BYTES,
  perMessageDeflate: false
});

httpsServer.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;

  if (typeof origin !== "string" || !allowedOrigins.has(origin)) {
    emitAuditEvent("relay_upgrade_rejected", {
      reason: "origin_not_allowlisted",
      originHash: typeof origin === "string" ? sha256Prefix(origin) : "missing"
    });

    socket.write(
      "HTTP/1.1 403 Forbidden\r\n" +
        "Connection: close\r\n" +
        "Content-Length: 0\r\n\r\n"
    );
    socket.destroy();
    return;
  }

  const currentConnections = originConnectionCounts.get(origin) ?? 0;

  if (currentConnections >= MAX_CONNECTIONS_PER_ORIGIN) {
    emitAuditEvent("relay_upgrade_rejected", {
      reason: "origin_connection_limit",
      originHash: sha256Prefix(origin)
    });

    socket.write(
      "HTTP/1.1 429 Too Many Requests\r\n" +
        "Connection: close\r\n" +
        "Content-Length: 0\r\n\r\n"
    );
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (websocket) => {
    webSocketServer.emit("connection", websocket, request, origin);
  });
});

webSocketServer.on("connection", (socket, request, origin) => {
  originConnectionCounts.set(origin, (originConnectionCounts.get(origin) ?? 0) + 1);

  const connectionState = {
    requestTimes: [],
    idleTimer: null
  };

  const resetIdleTimer = () => {
    if (connectionState.idleTimer !== null) {
      clearTimeout(connectionState.idleTimer);
    }

    connectionState.idleTimer = setTimeout(() => {
      emitAuditEvent("relay_connection_closed", {
        reason: "idle_timeout",
        originHash: sha256Prefix(origin)
      });
      safeClose(socket, 1008, "Idle timeout.");
    }, CONNECTION_IDLE_TIMEOUT_MS);
  };

  emitAuditEvent("relay_connection_opened", {
    originHash: sha256Prefix(origin),
    upgradeProtocol: request.headers["sec-websocket-protocol"] ?? "none"
  });

  resetIdleTimer();

  socket.on("message", (buffer, isBinary) => {
    resetIdleTimer();

    if (isBinary) {
      emitAuditEvent("relay_request_rejected", {
        reason: "binary_messages_not_supported",
        originHash: sha256Prefix(origin)
      });
      safeClose(socket, 1003, "Binary messages are not supported.");
      return;
    }

    if (buffer.byteLength > MAX_MESSAGE_BYTES) {
      emitAuditEvent("relay_request_rejected", {
        reason: "message_too_large",
        originHash: sha256Prefix(origin),
        messageBytes: buffer.byteLength
      });
      safeClose(socket, 1009, "Message exceeds the size limit.");
      return;
    }

    if (!rateLimitAllows(connectionState)) {
      emitAuditEvent("relay_request_rejected", {
        reason: "rate_limit_exceeded",
        originHash: sha256Prefix(origin)
      });
      safeClose(socket, 1013, "Please wait before making another request.");
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch {
      emitAuditEvent("relay_request_rejected", {
        reason: "invalid_json",
        originHash: sha256Prefix(origin)
      });
      socket.send(
        JSON.stringify({
          type: "error",
          code: "invalid_json",
          message: "The request must be valid JSON."
        })
      );
      return;
    }

    if (!isValidRequestEnvelope(parsed)) {
      emitAuditEvent("relay_request_rejected", {
        reason: "rights_constraints_or_input_validation_failed",
        originHash: sha256Prefix(origin),
        requestIdHash:
          typeof parsed?.requestId === "string"
            ? sha256Prefix(parsed.requestId)
            : "missing"
      });

      socket.send(
        JSON.stringify({
          type: "error",
          code: "request_rejected",
          message:
            "The request is missing required consent, purpose, retention, review, or rights constraints.",
          humanFallback: humanFallbackUrl
        })
      );
      return;
    }

    emitAuditEvent("relay_request_accepted", {
      originHash: sha256Prefix(origin),
      requestIdHash: sha256Prefix(parsed.requestId),
      action: parsed.action,
      textLength: parsed.participantSelectedText.length,
      retentionMode: parsed.retention.mode
    });

    const response = createDemonstrationDraft(parsed);
    socket.send(JSON.stringify(response));
  });

  socket.on("close", () => {
    if (connectionState.idleTimer !== null) {
      clearTimeout(connectionState.idleTimer);
    }

    const remaining = Math.max((originConnectionCounts.get(origin) ?? 1) - 1, 0);

    if (remaining === 0) {
      originConnectionCounts.delete(origin);
    } else {
      originConnectionCounts.set(origin, remaining);
    }

    emitAuditEvent("relay_connection_closed", {
      reason: "peer_closed_or_server_closed",
      originHash: sha256Prefix(origin)
    });
  });

  socket.on("error", () => {
    emitAuditEvent("relay_connection_error", {
      originHash: sha256Prefix(origin)
    });
  });
});

httpsServer.listen(8443, "0.0.0.0", () => {
  emitAuditEvent("relay_started", {
    transport: "wss",
    allowedOriginCount: allowedOrigins.size,
    humanFallbackConfigured: true,
    messageContentLogging: false
  });
});
