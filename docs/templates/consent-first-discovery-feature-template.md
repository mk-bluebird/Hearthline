# Consent-First Discovery Feature Template

## 0. Artifact metadata

- Feature name:
- Internal identifier:
- Owner team:
- Product surface:
- Version:
- Status: draft | review | approved | retired
- Last reviewed:
- Next review due:
- Policy version:
- Accessibility review owner:
- Privacy review owner:
- Safety review owner:
- Data-retention review owner:
- Appeals and human-review owner:

---

## 1. Plain-language purpose

### Member-facing purpose

Describe the feature in plain language.

Example:

> This feature helps you find optional shared activities or conversation
> opportunities based only on settings you choose to share for that purpose.
> It does not use your contacts, exact location, past venue visits, private
> messages, profile views, live presence, or activity history.

### Problem being addressed

- What barrier to voluntary connection exists?
- Who experiences that barrier?
- Why is the feature preferable to a non-technical or simpler interface solution?
- What is the smallest capability that helps?

### Non-goals

List explicit non-goals.

Example:

- Does not determine whether someone is safe, trustworthy, compatible, or desirable.
- Does not predict whether a person will respond.
- Does not infer a member's identity, health, sexuality, disability, finances, housing, relationship status, or vulnerability.
- Does not reveal a person's location, routine, route, attendance, or current presence.
- Does not create a right to message, meet, receive media, receive a response, or obtain intimate access.
- Does not optimize for engagement, messages, dates, purchases, disclosure, or time spent.

---

## 2. Interaction class

Select all applicable interaction classes:

- [ ] Friendship discovery
- [ ] Conversation discovery
- [ ] Shared public activity
- [ ] Remote activity
- [ ] Dating discovery
- [ ] Romance discovery
- [ ] Consensual-intimacy discussion gateway
- [ ] Accessibility / communication preference alignment
- [ ] Public-first meeting planning
- [ ] Other:

### Required interaction boundary

State the narrowest interaction this feature can create.

Example:

> The feature may create an optional reciprocal-interest window for a shared
> activity. It cannot create a direct-message thread, disclose a venue, share
> media, enable calling, reveal location, or create a meeting plan without a
> later and separate consent action.

---

## 3. Member-authored inputs

### Permitted inputs

For each input, define its purpose, visibility, consent, retention, deletion, and correction.

| Field | Purpose | Who enters it | Visibility | Consent required | Retention | Correction / deletion |
|---|---|---|---|---|---|---|
| Connection intent | Establish current connection scope | Member | Per selected discovery scope | Explicit | Until changed, withdrawn, or expired | Immediate edit or withdrawal |
| Activity category | Find shared activities | Member | Matched candidates only | Explicit | Until card expiry | Immediate edit or withdrawal |
| Atmosphere preference | Support comfort and access preferences | Member | Matched candidates only | Explicit | Until card expiry | Immediate edit or withdrawal |
| Broad member-selected region | Limit discovery area without precise location | Member | Matched candidates only | Explicit | Until changed or expiry | Immediate edit or withdrawal |
| Future availability block | Find overlap in member-selected future windows | Member | Matched candidates only | Explicit | Short fixed window | Immediate edit or withdrawal |
| Pace preference | Set communication and escalation expectations | Member | Per selected visibility scope | Explicit | Until changed or withdrawn | Immediate edit or withdrawal |

### Forbidden inputs

The implementation, analytics, experimentation, support tooling, and ranking layer must not read, derive, retain, or use:

- Exact address, coordinates, GPS traces, routes, travel origin, destination, or live location.
- Location history, venue visits, public-place frequency, check-ins, attendance records, Wi-Fi, Bluetooth, nearby-device observations, or movement patterns.
- Contacts, mutual friends, social graph, uploaded address books, employer, school, group membership, profile views, tags, or third-party relationship data.
- Private messages, message sentiment, typing behavior, read receipts, response speed, online status, activity history, or time spent.
- Photo quality, image-derived traits, face, body, voice, gait, gaze, biometrics, or emotion inference.
- Health, disability, recovery, substance history, sexuality, gender identity, religion, race, immigration status, finances, income, debt, housing, employment, legal history, trauma, or vulnerability.
- Popularity, desirability, reputation, trustworthiness, compatibility, likelihood of response, or predicted relationship outcome.
- Advertising identifiers, data-broker profiles, or cross-site tracking signals.

### Input validation requirements

- Reject unknown fields at the API boundary.
- Reject prohibited data classes before storage.
- Preserve a member's ability to leave nonessential fields blank.
- Never infer a missing field.
- Never make profile completion a condition of discovery access.
- Do not convert broad region into coordinates or distance.
- Do not silently widen a member's visibility scope.
- Revalidate consent at every write and every candidate-generation request.

---

## 4. Discovery eligibility

### Eligibility equation

Define the feature as a constraint system, not a desirability score.

\[
E(a,b) =
A(a)
\land A(b)
\land C(a)
\land C(b)
\land R(a,b)
\land I(a,b)
\land X(a,b)
\land T(a,b)
\land P(a,b)
\land \neg B(a,b)
\]

Where:

- \(A(x)\): member \(x\)'s card is active and not expired.
- \(C(x)\): member \(x\) explicitly consented to eligibility matching.
- \(R(a,b)\): both chose the same broad member-selected region.
- \(I(a,b)\): connection-intent overlap exists.
- \(X(a,b)\): activity-context overlap exists.
- \(T(a,b)\): future availability overlap exists.
- \(P(a,b)\): selected pace and visibility boundaries do not conflict.
- \(B(a,b)\): a block, restriction, member-selected exclusion, or safety visibility boundary applies.

### Prohibited scoring

The feature must not calculate:

\[
score(a,b)
=
w_1 \cdot popularity
+
w_2 \cdot proximity
+
w_3 \cdot response\_likelihood
+
w_4 \cdot activity\_history
+
w_5 \cdot social\_graph
\]

No score, percentile, rank, desirability index, response prediction, profile quality measure, or conversion likelihood may be generated, stored, displayed, or used to order people.

### Presentation allocation

If more eligible options exist than display slots:

- Use transparent rotation among eligible options.
- Respect user-selected filters before allocation.
- Limit repeat presentation after disinterest.
- Allow chronological and self-directed browsing.
- Offer a “show fewer suggestions” option.
- Do not order by popularity, profile completeness, response speed, photo activity, money spent, platform engagement, or inferred likelihood of interaction.
- Document the allocation mechanism and test it for concentration of exposure.

---

## 5. Explanation contract

### Required explanation

Every presented option must provide an explanation using only allowed, member-authored inputs.

Template:

> Shown because you and this member independently selected [shared activity]
> in [broad area] during [overlapping future window], with [shared pace or
> atmosphere preference]. No contacts, mutual friends, profile views, private
> messages, exact location, location history, venue attendance, live presence,
> or popularity data was used.

### Explanation requirements

- Must be available before a response is requested.
- Must identify only categories the member already chose to share.
- Must not reveal a counterpart's hidden settings.
- Must not claim that two people know one another.
- Must not mention observed behavior, inferred traits, confidence, compatibility, or predicted outcome.
- Must include a direct route to modify or pause the inputs responsible for the suggestion.

---

## 6. Interaction state machine

### States

```text
DRAFT
ACTIVE
PAUSED_BY_OWNER
WITHDRAWN
EXPIRED
PRESENTED
ONE_SIDED_INTEREST
RECIPROCAL_INTEREST_WINDOW
MESSAGE_CONSENT_ACTIVE
SCOPED_ESCALATION_PENDING
SCOPED_INTERACTION_ACTIVE
CLOSED
BLOCKED
REPORTED
```

### Allowed transitions

| From | To | Initiated by | Required condition |
|---|---|---|---|
| DRAFT | ACTIVE | Card owner | Explicit matching consent and valid expiry |
| ACTIVE | PAUSED_BY_OWNER | Card owner | Immediate, no explanation required |
| ACTIVE | WITHDRAWN | Card owner | Immediate, no explanation required |
| ACTIVE | EXPIRED | System retention job | Expiry time reached |
| ACTIVE | PRESENTED | System | Eligibility constraints satisfied |
| PRESENTED | ONE_SIDED_INTEREST | Viewer | Viewer selects bounded interest action |
| ONE_SIDED_INTEREST | RECIPROCAL_INTEREST_WINDOW | Counterpart | Counterpart independently expresses interest |
| RECIPROCAL_INTEREST_WINDOW | MESSAGE_CONSENT_ACTIVE | Both members | Each opts into conversation |
| MESSAGE_CONSENT_ACTIVE | SCOPED_ESCALATION_PENDING | Either member | Requests a specific new interaction category |
| SCOPED_ESCALATION_PENDING | SCOPED_INTERACTION_ACTIVE | Both members | Separate affirmative permission for that category |
| Any non-terminal state | PAUSED_BY_OWNER | Either relevant member | Immediate |
| Any non-terminal state | CLOSED | Either relevant member | Immediate |
| Any non-terminal state | BLOCKED | Either relevant member | Immediate |
| Any non-terminal state | REPORTED | Either relevant member | Report action; no continued contact required |

### Prohibited transitions

- PRESENTED → direct message without reciprocal choice.
- ONE_SIDED_INTEREST → venue disclosure.
- ONE_SIDED_INTEREST → media sharing.
- RECIPROCAL_INTEREST_WINDOW → sexual discussion without a separate consent checkpoint where the product supports that discussion.
- Any state → exact location disclosure by default.
- Any state → persistent live-location sharing.
- Any state → a platform-initiated message, invitation, reminder, or third-party contact without user authorization.
- Any withdrawal, decline, silence, or timeout → penalty, demotion, repeated resurfacing, or a demand for reasons.

---

## 7. Consent checkpoints

### Checkpoint catalog

| Requested capability | Default | Who must affirmatively approve | Scope | Expiry | Revocation effect |
|---|---|---|---|---|---|
| Direct conversation | Off | Both members | Named counterpart only | Interest-window duration | Close message channel |
| Voice or video call | Off | Both members | One call or selected period | Short duration | End access immediately |
| Media sharing | Off | Sender chooses to send; recipient chooses to view | Single item / recipient | Per media policy | Prevent new access where feasible |
| Sexual-topic discussion | Off | Both members | Named counterpart only | Recheck on material context change | Return to ordinary conversation |
| Named public venue | Off | Both members | Named counterpart only | Meeting-plan expiry | Remove future access |
| Meeting plan | Off | Both members | Named counterpart only | Plan expiry or cancellation | Cancel plan access |
| Optional trusted-contact share | Off | Plan owner | Selected trusted contact only | Chosen expiry | Remove access immediately |
| Recording | Off | Every affected participant | Single session | Session end | Stop recording / access immediately |
| AR camera / microphone / mapping | Off | Every affected participant, separately | Single named experience | Session end | End access immediately |

### Consent language requirements

- Use plain language.
- Name the exact capability requested.
- Name the recipient or audience.
- State the retention period.
- State how to revoke.
- State that declining, silence, delay, or a changed mind has no penalty.
- Do not bundle unrelated permissions.
- Do not use prechecked boxes, countdown pressure, guilt framing, or repeated prompts after a decline.

---

## 8. Location and public-place rules

### Permitted place-related contexts

- Broad member-selected region.
- General venue category, such as public library, coffee shop, public park, museum, or remote.
- Atmosphere preference, such as quiet, seated, outdoor, low-cost, or step-free preferred.
- A named public venue only after a separate mutual checkpoint.
- A time-limited public-first meeting plan.

### Prohibited place-related processing

- Frequent-place detection.
- Visit-history matching.
- Check-ins as matching signals.
- Co-location or crossed-path suggestions.
- GPS, Wi-Fi, Bluetooth, beacon, IP-derived, or nearby-device proximity matching.
- Route, commute, home, work, or routine inference.
- Live attendance, current presence, “nearby now,” or venue roster displays.
- Persistent location sharing.
- Location sharing as a prerequisite to messaging, dating, intimacy, activities, or safety tools.

### Venue disclosure flow

```text
Both members have reciprocal interest
  → one member proposes a venue category
  → both review public-first and independent-arrival options
  → both separately approve venue-level disclosure
  → named public venue is visible only to the selected counterpart
  → meeting plan expires or is cancelled
  → venue detail is deleted or access is revoked
```

---

## 9. Accessibility and communication parity

### Required access paths

- Keyboard-only navigation.
- Screen-reader-compatible semantics.
- Text-first mode.
- Reduced-motion mode.
- Low-bandwidth mode.
- No-camera path.
- No-microphone path.
- No-voice path.
- No-location-sharing path.
- Asynchronous response path.
- Plain-language explanation path.
- User-controlled notification cadence.

### Required interface behavior

- Use semantic HTML before ARIA.
- Provide visible focus states.
- Use native buttons for actions.
- Ensure dialogs return focus to the invoking control.
- Do not use color as the only state indicator.
- Do not auto-play media or animate consent prompts.
- Give every critical action a text label.
- Make “hide,” “pause,” “block,” “report,” “leave,” and “change settings” available without completing a social action.
- Keep time limits generous or offer no-time-limit alternatives.
- Do not interpret access preferences as a health, competence, or identity signal.

---

## 10. Safety and exit controls

### Required member controls

- Hide one suggestion.
- Hide a category of suggestions.
- Pause all discovery visibility.
- Withdraw an activity card.
- Mute an interaction.
- Restrict future contact.
- Block immediately.
- Report without continued communication.
- Preserve a member-controlled copy of relevant interaction material where permitted.
- Request human review.
- Appeal an action that affects the member.
- Delete or correct member-authored discovery data.

### Non-retaliation requirements

- A decline does not reduce a member's visibility.
- A block does not require an explanation.
- A withdrawal does not notify the other member with a private reason.
- A pause does not trigger streaks, urgency prompts, or re-engagement messaging.
- A report does not force the reporter to communicate with the reported person.
- A person can leave a consent flow at any time.

---

## 11. Data handling and retention

### Data inventory

| Data class | Purpose | Storage zone | Encryption / access | Retention | Deletion |
|---|---|---|---|---|---|
| Discovery card | Member-selected discovery context | Connection zone | Least privilege; owner-controlled | Until expiry, pause, or withdrawal | Immediate eligibility removal; deletion job |
| Consent receipt | Prove current scope and policy version | Consent zone | Limited service access | Short policy-defined period | Delete or minimize after legal/policy need |
| Eligibility decision | Debugging and explanation integrity | Governance zone | Pseudonymous, content-minimized | Short operational window | Automatic deletion |
| Block / restriction state | Enforce member boundaries | Integrity zone | Strict access control | Until changed or account closure policy | Delete under documented safety policy |
| Report record | Safety review and appeal | Integrity / governance zone | Restricted human-review access | Defined review schedule | Delete/minimize after closure |
| Venue capsule | Mutual, named meeting detail | Ephemeral scoped store | Recipient-scoped | Meeting-plan expiry | Cryptographic or verified deletion |

### Retention rules

- Do not retain raw candidate lists longer than operationally required.
- Do not build historical venue, activity, or availability profiles from expired cards.
- Do not use expired or withdrawn data in analytics, training, marketing, experimentation, or future matching.
- Do not use sensitive interaction data as advertising inventory or default model-training data.
- Make deletion effects visible to the member in plain language.

---

## 12. Analytics and evaluation

### Permitted aggregated measures

Measure only when aggregation protects individual privacy and the measure serves autonomy, clarity, accessibility, or safety.

- Percentage of members who can accurately identify why an option appeared.
- Percentage of members who can find and use pause, hide, block, and settings controls.
- Accessibility task completion across keyboard, screen-reader, text-first, reduced-motion, and low-bandwidth paths.
- Consent checkpoint comprehension.
- Rate of stale-card expiry enforcement.
- Rate of successful revocation propagation.
- Distribution of presentation rotation across eligible cards.
- Report-resolution and appeal-response timeliness.
- Member-reported sense of control, clarity, and pressure reduction.

### Forbidden metrics

- Swipes.
- Time spent.
- Number of messages.
- Reply rate.
- Read rate.
- Number of meetings.
- Exact-location disclosure.
- Venue-selection rate.
- Photo sharing.
- Sexual-topic disclosure.
- Conversion to intimacy.
- Revenue per user.
- “High-value user” status.
- Predicted loneliness, vulnerability, desirability, or likelihood of response.

### Evaluation question

> Does this feature help adults make a clearer, more voluntary, more accessible
> decision about whether to explore a bounded connection opportunity while
> reducing unnecessary personal-data disclosure?

---

## 13. Threat model

### Assets to protect

- Identity presentation.
- Broad-area selection.
- Activity and intent settings.
- Communication preferences.
- Boundaries and pace choices.
- Exact venue details.
- Meeting-plan details.
- Reports, blocks, and safety actions.
- Any optional sensitive disclosure.

### Adversaries and harms

| Threat | Example harm | Required mitigation |
|---|---|---|
| Stalker or harasser | Infers routine from public activity choices | No history, frequency, proximity, or live-presence data |
| Coercive counterpart | Pressures for faster escalation or location disclosure | Separate checkpoints, quiet exit, block, no penalty for refusal |
| Data broker or advertiser | Uses social/relationship data for profiling | No advertising use; purpose limitation; no cross-site tracking |
| Overreaching internal service | Joins data across zones | Explicit contracts, least privilege, audit controls |
| Automated ranking system | Privileges popular or highly engaged members | No desirability/engagement score; transparent rotation |
| Malicious user | Creates spam invitations | Rate limits that do not become identity or worth scores; action-integrity review |
| Accessibility exclusion | Makes controls unusable without voice, camera, or fine motor interaction | Text-first, keyboard, screen-reader, reduced-motion, no-camera alternatives |
| Safety-system overreach | Creates hidden risk labels | Narrow, reviewable, explainable safety workflows; no vulnerability scoring |

---

## 14. Test plan

### Required functional tests

- [ ] A member can create, edit, pause, withdraw, and delete their card.
- [ ] Withdrawal removes eligibility immediately.
- [ ] Expiry removes eligibility automatically.
- [ ] A person cannot match with themselves.
- [ ] A block prevents future presentation and contact.
- [ ] A direct message cannot open before reciprocal interest.
- [ ] A venue cannot be disclosed before the relevant mutual checkpoint.
- [ ] A denied consent request does not advance the interaction state.
- [ ] A revoked permission immediately removes the associated capability.
- [ ] Unknown fields are rejected at the service boundary.

### Required privacy tests

- [ ] Exact-location fields are rejected.
- [ ] Coordinates cannot enter candidate generation.
- [ ] Contact-book fields are rejected.
- [ ] Social-graph fields are rejected.
- [ ] Venue history is rejected.
- [ ] Private messages cannot enter eligibility or ordering.
- [ ] No response-time, popularity, or profile-view fields are read.
- [ ] No inferred identity, health, finance, or vulnerability fields are accepted.
- [ ] Explanation text contains only permitted, member-authored inputs.
- [ ] Expired and withdrawn cards cannot enter analytics or training datasets.

### Required accessibility tests

- [ ] Full keyboard path works without pointer input.
- [ ] Screen-reader labels identify every action and state.
- [ ] Focus order is stable and dialogs restore focus.
- [ ] Reduced-motion path contains no required animation.
- [ ] Text-first path offers all core actions.
- [ ] No-camera, no-microphone, no-voice, and no-location paths retain full discovery access.
- [ ] Error messages are programmatically associated with fields.
- [ ] Pause, withdraw, block, and report controls are as discoverable as interest actions.

### Required governance tests

- [ ] Data-retention job deletes/cryptographically erases expired scoped data.
- [ ] Audit logs do not contain sensitive card content unnecessarily.
- [ ] Human-review and appeal workflow is documented and reachable.
- [ ] Feature-flag rollout cannot bypass consent checks.
- [ ] Material policy changes trigger a member-readable review path.
- [ ] Release evidence includes privacy, accessibility, safety, and deletion test outcomes.

---

## 15. Launch decision

### Required approvals

- [ ] Product owner
- [ ] Privacy review
- [ ] Accessibility review
- [ ] Safety and abuse review
- [ ] Security review
- [ ] Data-retention review
- [ ] Human-review / appeals review
- [ ] Member research review
- [ ] Release engineering review

### Launch blockers

The feature must not launch if any of the following is true:

- It requires live location, camera, microphone, voice, headset, gesture, travel, or exact venue disclosure.
- It uses or can access contacts, social graphs, profile views, past locations, venue history, device proximity, private messages, activity history, or engagement metrics.
- It cannot explain each suggestion truthfully.
- It cannot be paused or withdrawn immediately.
- It lacks a full text-first and keyboard-accessible path.
- It does not provide blocking, reporting, deletion, and appeal mechanisms.
- It creates public popularity, desirability, reputation, trust, or compatibility scores.
- It treats an earlier interaction as consent to a later escalation.
- It permits any exchange of money, housing, employment, debt relief, transportation dependency, drugs, or basic needs for social or sexual access.
