# Optional Trusted-Contact Check-In Plan

## Purpose

The Optional Trusted-Contact Check-In Plan lets a member voluntarily share
selected, time-limited meeting details or a neutral check-in message with one or
more trusted contacts chosen by that member.

The feature supports member choice. It does not monitor a person, guarantee
help, determine an emergency, track location, or contact emergency services
automatically.

## Required member controls

A member must be able to:

- Create, edit, pause, cancel, and delete a plan.
- Add or remove a trusted contact.
- Choose whether a contact receives:
  - a neutral check-in request;
  - a chosen time window;
  - a broad activity category;
  - a venue category;
  - a mutually approved named public venue;
  - a member-written note.
- Choose an expiry time.
- Send a manual check-in message.
- Send a manual “please contact me” message.
- Open their device's own emergency-contact or emergency-call interface where
  supported.
- Use block, report, and quiet-exit controls without contacting a trusted contact.
- Use all core Hearthline features without creating a check-in plan.

## Prohibited behavior

The feature must not:

- Collect or continuously monitor live location.
- Collect routes, travel origin, destination, arrival, departure, or attendance.
- Infer an emergency from time, silence, device state, or lack of response.
- Automatically contact police, emergency services, family, employers, or any
  other third party.
- Tell a counterpart that a member created a check-in plan.
- Share counterpart profile information without the plan owner's explicit,
  per-field selection.
- Require an explanation for stopping a plan.
- Use plan creation, contact choice, check-in timing, response, or cancellation
  as a safety, risk, trust, reputation, matching, advertising, or moderation
  signal.
- Promise a trusted contact will respond or be able to help.

## Required member-facing statement

> This plan is optional. Hearthline does not track your location, route, arrival,
> departure, or activity. A trusted contact may not be available or able to
> respond. If you think you are in immediate danger, use your local emergency
> options when you can do so safely.

## Message-delivery statement

> A sent message means Hearthline submitted it to the selected delivery channel.
> It does not confirm that the recipient saw the message, understands the
> situation, or can respond.

## Privacy and deletion

- Trusted-contact references are private and never appear in discovery or
  matching.
- Plan details are recipient-scoped and expire automatically.
- Cancelling or expiry invalidates further access to plan details.
- Delivery metadata is retained only for the shortest operational period needed
  to explain a send result and investigate delivery failure.
- Plan content must not enter advertisements, analytics profiles, model training,
  or person-level safety systems.
