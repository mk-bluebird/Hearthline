# Identity Disclosure and Non-Disclosure Test Cases

## Identity Disclosure Ladder

| ID | Preconditions | Action | Expected outcome |
|---|---|---|---|
| IDL-001 | Member has no optional identity claims | Use discovery | Discovery remains available |
| IDL-002 | Member declines a Level 2 disclosure | Continue reciprocal-interest interaction | No penalty, repeat prompt, or visibility change |
| IDL-003 | Level 3 disclosure is active | Recipient attempts to read selected claim | Read succeeds only for named recipient before expiry |
| IDL-004 | Recipient differs from disclosure recipient | Attempt claim read | Denied |
| IDL-005 | Disclosure is withdrawn | Recipient refreshes claim projection | Denied immediately |
| IDL-006 | Disclosure expires | Cached profile/card refresh occurs | Field absent; no prior value shown |
| IDL-007 | A block is placed | Recipient attempts disclosure read | Denied |
| IDL-008 | Member has only adult-platform eligibility | Attempts casual encounter discovery | No legal name, document, photo, voice, or public identity is required |

## Non-Disclosure Protection

| ID | Preconditions | Action | Expected outcome |
|---|---|---|---|
| NIDP-001 | Protected claim exists | Run matching candidate query | Claim absent from candidate-generation input |
| NIDP-002 | Protected claim exists | Run discovery ordering | Claim absent from ordering input |
| NIDP-003 | Protected claim exists | Run advertising export | Export denied |
| NIDP-004 | Protected claim exists | Run model-training export | Export denied |
| NIDP-005 | Member omits a protected category | Render profile | No “missing,” “unverified,” or “incomplete” marker |
| NIDP-006 | Member withdraws claim | Query cache/index | Claim removed from projections and index |
| NIDP-007 | Claim is self-stated | UI render | No verification badge, truth score, or confidence marker |
| NIDP-008 | Credential is presented for 30+ eligibility | Discovery response | Only eligibility outcome exposed; no DOB, issuer, credential, or document shown |
| NIDP-009 | Protected claim disclosure is active | Unrelated staff/service requests access | Denied by least-privilege policy |
| NIDP-010 | Raw claim value appears in log payload | Logging test | Build/test fails; raw value redacted or rejected |
