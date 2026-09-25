# HearthlineObjectBus Threat Model

## Purpose

This document defines the threats, controls, residual risks, primitive-selection
rules, correlation boundaries, observability limits, revocation ownership, and
audit process for Hearthline object-state transport.

It does not claim that internal transport is inherently safe, that scoped
platform permissions prove real-world consent, or that Hearthline can prevent
off-platform copying, device compromise, or external coercion.

## In-scope adversaries

- Compromised internal service.
- Over-privileged subscriber.
- Insider misuse of telemetry or operational data.
- Replay of stale notice or grant state.
- Unauthorized client event injection.
- Cross-object correlation through shared identifiers.
- Correlation through tracing, retry queues, logs, cache keys, or dead-letter
  queues.
- Unbounded subscriber retention.
- Automated agent aggregation.
- Misinterpretation of platform state as real-world consent.

## Out-of-scope adversaries

- A recipient who screenshots, copies, records, remembers, or shares content.
- Fully compromised endpoint device, browser, or operating system.
- Malicious browser extension.
- Nation-state metadata analysis.
- Off-platform coercion unknown to Hearthline.
- A lawful preservation or disclosure requirement subject to applicable law.

## Primitive selection

Use the least stateful primitive that can safely support the object:

- Local-only for private reflection.
- Request-response for ordinary feature commands.
- Session snapshot for current rendering.
- Object-local state for current object status.
- Scoped notice only when a minimum cross-object invalidation or expiry notice
  is necessary.
- Aggregate observation only for privacy-thresholded operational health.
- Governance correlation only through separately authorized exceptional process.

## Correlation rule

Routine cross-object correlation is prohibited.

Exceptional correlation is allowed only for:
- security incident review;
- appeal;
- retention audit;
- aggregate access audit.

Exceptional correlation requires:
- stated purpose;
- minimum object set;
- minimum time window;
- independent reviewer authorization;
- retention expiry;
- no discovery, ranking, advertising, analytics, or profile use;
- no external action without separate approval;
- correction/appeal path where a material decision affects a person.

## Revocation rule

A person may revoke their own scoped platform interaction grant or end their
participation in a shared platform context.

Revocation:
- ends ordinary access through the relevant object-local grant;
- does not alter another person's private self-authored record;
- does not reveal a reason;
- does not create a public event;
- does not reduce ordinary discovery eligibility;
- does not guarantee deletion of material retained outside Hearthline.

## Observability rule

Operational monitoring may retain only aggregate, purpose-bound service-health
signals. It must not retain raw notices, account identifiers, actor references,
counterparty references, cross-object trace IDs, sensitive categories, private
content, locations, devices, or relationship timelines.

## Verification

Before release, verify with synthetic fixtures that:
- local-only state never reaches the bus;
- unauthorized subscribers are rejected;
- invalid scopes are rejected;
- real-world-act claims are rejected;
- external action authority is rejected;
- expired grants cannot authorize access;
- revocation invalidates only relevant scoped access;
- traces, retries, logs, caches, and dead-letter queues contain no prohibited
  fields;
- exceptional correlation requires governance authorization;
- accessible grant, decline, revoke, expiry, inspection, correction, and
  appeal paths are available.
