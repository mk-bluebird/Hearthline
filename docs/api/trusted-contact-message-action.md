# POST /trusted-contact-check-in-plans/{planId}/send-message

## Purpose

Sends a member-selected preset or member-written message to a trusted contact
already selected by the plan owner.

The endpoint must never trigger automatically from a timer, location event,
silence, device state, missed response, or counterpart behavior.

## Required request fields

```json
{
  "contactRef": "trusted_contact_P8q2sN7kR5vL3xM1",
  "messageKind": "please_contact_me",
  "memberConfirmedSend": true
}
```

## Allowed message kinds

- `neutral_check_in`
- `please_contact_me`
- `plan_cancelled`
- `member_written_message`

## Required response states

- `submitted_to_delivery_channel`
- `not_submitted`
- `delivery_channel_unavailable`
- `contact_not_authorized`
- `plan_inactive_or_expired`

## Member-facing delivery language

For `submitted_to_delivery_channel`:

> Your message was submitted to the selected delivery channel. This does not
> confirm that your contact saw it or can respond.

For `delivery_channel_unavailable`:

> Hearthline could not submit this message. You can try again, use another
> contact, or use your device's own communication or emergency options.
