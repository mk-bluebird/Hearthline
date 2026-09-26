# Public Meeting Options, Transit Information, and Consent Lifecycle Tests

## Public Meeting Options Index

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| PMI-001 | Official venue source exists | Create public meeting option | Source URL, retrieval date, review date, and status required |
| PMI-002 | Request includes `verifiedSafe` | Validate schema | Rejected |
| PMI-003 | Request includes safety score | Validate schema | Rejected |
| PMI-004 | Request includes member attendance | Validate schema | Rejected |
| PMI-005 | Venue information becomes stale | Render index entry | Marked outdated; no safety inference |
| PMI-006 | Member reports a broken official link | Submit source issue | Routed to source-maintenance review, not venue score |
| PMI-007 | Member opens venue list | Inspect API payload | No member location, proximity, or attendance data included |

## Member-Directed Transit Information Planner

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| TPL-001 | Member has denied location permission | Open transit information | Full source-link and planning access remains available |
| TPL-002 | Request includes home address | Create meeting plan | Rejected |
| TPL-003 | Request includes route geometry | Create meeting plan | Rejected |
| TPL-004 | Request includes `lateNightSafe` | Validate transit reference | Rejected |
| TPL-005 | Both members propose plan | Accept plan | Mutual acceptance required |
| TPL-006 | Either member cancels | Read plan | Plan becomes cancelled immediately |
| TPL-007 | Named public venue not mutually approved | Read meeting plan | Venue remains category-only |
| TPL-008 | Transport is conditioned on intimacy | Create plan | Denied and offers no transport-for-intimacy workflow |

## Capability-Scoped Consent Lifecycle

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| CSL-001 | State is `unknown` | Request direct conversation | Moves to `requested` |
| CSL-002 | State is `requested` | Recipient declines | Moves to `declined`; no explanation required |
| CSL-003 | State is `requested` | Recipient grants | Moves to `granted` only with explicit grant |
| CSL-004 | State is `granted` | Start capability | Moves to `active` only with scope/recipient match |
| CSL-005 | State is `active` | Grantor withdraws | Moves to `withdrawn`; tokens/caches/queues invalidated |
| CSL-006 | State is `active` | Either person pauses | Moves to `paused`; capability unavailable |
| CSL-007 | State is `paused` | Resume attempted without fresh scope check | Denied |
| CSL-008 | State is `active` | Expiry reached | Moves to `expired`; action denied |
| CSL-009 | Direct conversation is active | Request media sharing | Separate media lifecycle required |
| CSL-010 | Media lifecycle is withdrawn | Conversation lifecycle remains active | Only media capability stops |
| CSL-011 | Block occurs in any state | Submit block | Moves to `blocked_or_reviewable` immediately |
| CSL-012 | Capability completes | Open reflection | Optional; may be skipped and cannot create rating |
