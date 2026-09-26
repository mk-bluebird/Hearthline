# Trusted-Contact Check-In, Mutuality Receipts, and Intent Card Tests

## Optional Trusted-Contact Check-In Plan

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| TCP-001 | Member has no plan | Uses discovery or meeting plan | Full core access remains available |
| TCP-002 | Plan is active | Timer reaches reminder time | Member receives optional reminder only; no automatic message |
| TCP-003 | Member manually sends check-in | Delivery provider accepts request | State is `submitted_to_delivery_channel`; no claim recipient saw it |
| TCP-004 | Delivery provider unavailable | Member sends check-in | State is `delivery_channel_unavailable`; no emergency inference |
| TCP-005 | Member cancels plan | Trusted contact attempts to view plan detail | Access denied |
| TCP-006 | Request includes coordinates or route | Create plan | Rejected |
| TCP-007 | Counterpart requests plan data | Read check-in plan | Denied |
| TCP-008 | Member uses check-in plan | Run matching/allocation | No matching, safety, trust, or reputation effect |

## Privacy-Preserving Mutuality Receipts

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| PMR-001 | Reciprocal interest window active | Issue receipt | Predicate limited to reciprocal-interest state and expiry |
| PMR-002 | Consent receipt expires | Verify receipt | Returns expired |
| PMR-003 | Consent is withdrawn | Verify receipt | Returns withdrawn immediately |
| PMR-004 | Request asks for reputation predicate | Issue receipt | Rejected |
| PMR-005 | Request asks for “no reports” proof | Issue receipt | Rejected |
| PMR-006 | Receipt used in discovery ordering | Evaluate policy | Denied |
| PMR-007 | Member chooses non-cryptographic path | Use mutual interaction feature | Full functional access retained |
| PMR-008 | Receipt contains persistent public identifier | Validate schema | Rejected |

## Current Connection Intent Card

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| CIC-001 | Member selects casual connection | View card | Reminder states this is not consent |
| CIC-002 | Two members share casual connection intent | Discovery eligibility | May create an option, not direct messaging |
| CIC-003 | One member has `ask_before_sexual_topics` | Other requests sexual-topic feature | Separate consent lifecycle required |
| CIC-004 | Request includes `stress_relief` | Validate card | Rejected |
| CIC-005 | Request includes financial need | Validate card | Rejected |
| CIC-006 | Member pauses card | Candidate generation | Card immediately excluded |
| CIC-007 | Member withdraws card | Discovery UI refresh | Card removed; no visibility penalty |
| CIC-008 | Intent data requested for advertising | Policy evaluation | Denied |
| CIC-009 | Intent is used to compute a numeric score | Test | Build or policy test fails |
