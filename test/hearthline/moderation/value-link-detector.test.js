import assert from "node:assert/strict";
import { detectReportedValueLinks } from "../../../src/hearthline/moderation/value-link-detector.js";

const positiveCases = [
  {
    text: "I will give you cash if you hook up with me.",
    category: "money_for_intimacy"
  },
  {
    text: "My rate is $200 for a sexual meetup.",
    category: "price_or_rate_for_intimacy"
  },
  {
    text: "You can stay here if you sleep with me.",
    category: "housing_or_lodging_for_intimacy"
  },
  {
    text: "I will drive you home only if you hook up with me.",
    category: "transport_for_intimacy"
  },
  {
    text: "I can get you a job if you do what I want sexually.",
    category: "debt_or_work_for_intimacy"
  }
];

const negativeCases = [
  "I prefer public dates and independent travel.",
  "I can drive myself to a coffee shop.",
  "I need a ride to a community event.",
  "I am looking for a casual encounter but I do not exchange money for intimacy.",
  "I prefer a low-cost date and will manage my own expenses.",
  "I do not use drugs and I want clear boundaries.",
  "I would like to discuss sexual boundaries before meeting."
];

for (const testCase of positiveCases) {
  const result = detectReportedValueLinks(testCase.text);

  assert.equal(
    result.findings.some((finding) => finding.category === testCase.category),
    true,
    `Expected ${testCase.category} for: ${testCase.text}`
  );

  assert.equal(
    result.findings.every((finding) => finding.accountActionAuthorized === false),
    true
  );

  assert.equal(
    result.findings.every((finding) => finding.legalConclusion === false),
    true
  );
}

for (const text of negativeCases) {
  const result = detectReportedValueLinks(text);

  assert.equal(
    result.findings.length,
    0,
    `Expected no value-link rule match for: ${text}`
  );
}
