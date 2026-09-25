const VALUE_LINK_RULES = Object.freeze([
  Object.freeze({
    id: "money_for_intimacy_condition_v1",
    category: "money_for_intimacy",
    value: /\b(?:cash|money|pay|payment|paid|compensate|compensation)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|oral|anal)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required|owe|trade)\b/i,
    explanation: "The reported content appears to link money or payment to intimacy."
  }),
  Object.freeze({
    id: "price_or_rate_for_intimacy_v1",
    category: "price_or_rate_for_intimacy",
    value: /\b(?:rate|rates|price|pricing|fee|fees|tip|tips|deposit|donation)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|meetup)\b/i,
    link: /\b(?:for|per|required|minimum|upfront|before)\b/i,
    explanation: "The reported content appears to describe a price, rate, fee, tip, or deposit connected to intimacy."
  }),
  Object.freeze({
    id: "gift_for_intimacy_condition_v1",
    category: "gift_for_intimacy",
    value: /\b(?:gift|buy you|purchase|shopping|phone|clothes|goods?)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|do what i want)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required)\b/i,
    explanation: "The reported content appears to condition a gift or goods on intimacy."
  }),
  Object.freeze({
    id: "housing_for_intimacy_condition_v1",
    category: "housing_or_lodging_for_intimacy",
    value: /\b(?:rent|housing|house|stay here|room|lodging|hotel|shelter)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|sleep with me|do what i want)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required|unless)\b/i,
    explanation: "The reported content appears to condition housing or lodging on intimacy."
  }),
  Object.freeze({
    id: "transport_for_intimacy_condition_v1",
    category: "transport_for_intimacy",
    value: /\b(?:ride|drive you|pickup|pick you up|gas money|transport)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|do what i want)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required|unless)\b/i,
    explanation: "The reported content appears to condition transportation on intimacy."
  }),
  Object.freeze({
    id: "debt_or_work_for_intimacy_condition_v1",
    category: "debt_or_work_for_intimacy",
    value: /\b(?:debt|loan|forgive|job|work|hire|employment|shift)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|do what i want)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required|unless)\b/i,
    explanation: "The reported content appears to condition debt relief or work on intimacy."
  }),
  Object.freeze({
    id: "drugs_for_intimacy_condition_v1",
    category: "drugs_for_intimacy",
    value: /\b(?:drugs?|meth|cocaine|pills|weed|marijuana|alcohol)\b/i,
    intimacy: /\b(?:sex|sexual|hookup|intimacy|nudes?|do what i want)\b/i,
    link: /\b(?:for|in exchange for|if you|only if|then i(?:'ll| will)|required|unless)\b/i,
    explanation: "The reported content appears to condition substances on intimacy."
  })
]);

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function freezeClone(value) {
  return Object.freeze(structuredClone(value));
}

function firstMatch(pattern, text) {
  const match = text.match(pattern);
  return match ? match[0] : null;
}

function evaluateRule(rule, text) {
  const valueTerm = firstMatch(rule.value, text);
  const intimacyTerm = firstMatch(rule.intimacy, text);
  const linkTerm = firstMatch(rule.link, text);

  if (!valueTerm || !intimacyTerm || !linkTerm) {
    return null;
  }

  return Object.freeze({
    ruleId: rule.id,
    category: rule.category,
    matchedTerms: Object.freeze([
      valueTerm,
      intimacyTerm,
      linkTerm
    ]),
    explanation: rule.explanation,
    disposition: "human_review_required",
    legalConclusion: false,
    accountActionAuthorized: false
  });
}

export function detectReportedValueLinks(reportedText) {
  const text = assertNonEmptyString(reportedText, "reportedText");
  const findings = [];

  for (const rule of VALUE_LINK_RULES) {
    const finding = evaluateRule(rule, text);

    if (finding) {
      findings.push(finding);
    }
  }

  return freezeClone({
    detectorVersion: "value-link-rules-v1",
    contentSubmittedByReporter: true,
    reviewedContentScope: "reported_text_only",
    findings,
    reminder: findings.length > 0
      ? "Rule matches are triage signals for trained human review, not findings of illegality, coercion, trafficking, or user intent."
      : "No rule pattern matched the submitted text. This does not determine whether a policy concern exists."
  });
}
