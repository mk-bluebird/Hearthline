# Relationship Goals, Conversation Assistance, and Coordination Draft Tests

## Relationship Goals Canvas

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| RGC-001 | Member has no canvas | Uses core account and privacy controls | Full access remains available |
| RGC-002 | Member selects friendship and dating | Mutual-context display | Shows factual overlap only; no score |
| RGC-003 | Members differ on time horizon | Mutual-context display | Shows “different”; no negative ranking |
| RGC-004 | One member selects not discussing intimacy | Counterpart opens context | Shows “not discussing”; no escalation enabled |
| RGC-005 | Member revises goals | Discovery update | Future eligibility changes immediately; no penalty |
| RGC-006 | Member withdraws canvas | New candidate generation | Card excluded immediately |
| RGC-007 | Request includes relationship-readiness score | Schema validation | Rejected |
| RGC-008 | Intent is used to grant media or meeting access | Capability check | Denied; separate consent lifecycle required |

## Member-Invoked Conversation Safety Assistant

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| MCSA-001 | Member does not invoke assistant | Private conversation occurs | No assistant processing |
| MCSA-002 | Member selects text and requests boundary draft | Create assistance request | Advisory draft returned |
| MCSA-003 | Request contains full unselected chat history | Validate request | Rejected or minimized before processing |
| MCSA-004 | Assistant identifies possible pressure wording | Render output | Plain-language advisory, uncertainty, block/report options |
| MCSA-005 | Assistant output requests automatic report | Policy evaluation | Denied |
| MCSA-006 | Assistant output requests automatic block | Policy evaluation | Denied |
| MCSA-007 | Assistant output used for account restriction | Enforcement attempt | Denied pending human-reviewed report process |
| MCSA-008 | Member discards draft | Retention job | Ephemeral content deleted per selected retention class |

## Human-Directed Coordination Assistant

| ID | Preconditions | Action | Expected result |
|---|---|---|---|
| HDCA-001 | Member selects activity and public-first preference | Create coordination draft | Private editable draft created |
| HDCA-002 | Draft request includes calendar data | Validation | Rejected |
| HDCA-003 | Draft request includes exact location | Validation | Rejected |
| HDCA-004 | Assistant attempts to send draft | Policy enforcement | Denied; external action remains false |
| HDCA-005 | Assistant attempts agent-to-agent exchange | Policy enforcement | Denied |
| HDCA-006 | Draft includes a private-venue proposal | Validation | Rejected |
| HDCA-007 | Draft includes value-for-intimacy language | Validation | Rejected |
| HDCA-008 | Member manually edits a draft | Render confirmation | Shows exact final text and chosen recipient before ordinary send flow |
