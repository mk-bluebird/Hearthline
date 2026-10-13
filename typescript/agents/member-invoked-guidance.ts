// SPDX-License-Identifier: MIT OR Apache-2.0

export type GuidanceTopic =
  | "conversation"
  | "boundaries"
  | "privacy"
  | "planning"
  | "pacing"
  | "consent_review"
  | "resources"
  | "reporting";

export type Guidance = Readonly<{
  topic: GuidanceTopic;
  explanation: string;
  choices: readonly string[];
  performsExternalAction: false;
}>;

const GUIDANCE: Record<GuidanceTopic, {
  explanation: string;
  choices: readonly string[];
}> = {
  conversation: {
    explanation: "You can prepare a message without sending it.",
    choices: ["Draft a starter", "Keep my wording", "Close"],
  },
  boundaries: {
    explanation: "You can state or revise a boundary without explaining why.",
    choices: ["Review my boundaries", "Draft wording", "Close"],
  },
  privacy: {
    explanation: "Review what you have chosen to share and with whom.",
    choices: ["Open privacy controls", "Read disclosure limits", "Close"],
  },
  planning: {
    explanation: "Public planning information does not guarantee safety.",
    choices: ["Browse public options", "Include remote options", "Close"],
  },
  pacing: {
    explanation: "You can use your own pace or pause participation.",
    choices: ["Open pacing controls", "Read pause options", "Close"],
  },
  consent_review: {
    explanation: "A previous choice does not authorize a different action.",
    choices: ["Review current permissions", "Read withdrawal options", "Close"],
  },
  resources: {
    explanation: "You may browse resources without declaring a personal need.",
    choices: ["Choose a resource category", "Close"],
  },
  reporting: {
    explanation: "Reporting requests review; blocking is a separate choice.",
    choices: ["Read reporting options", "Read block options", "Close"],
  },
};

export function memberInvokedGuidance(topic: GuidanceTopic): Guidance {
  if (!Object.prototype.hasOwnProperty.call(GUIDANCE, topic)) {
    throw new TypeError("Unsupported guidance topic");
  }

  const entry = GUIDANCE[topic];
  return Object.freeze({
    topic,
    explanation: entry.explanation,
    choices: Object.freeze([...entry.choices]),
    performsExternalAction: false,
  });
}
