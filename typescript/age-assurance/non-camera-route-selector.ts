// SPDX-License-Identifier: MIT OR Apache-2.0

export type Requirement = "required" | "not_required" | "unknown";

export type ReviewedRoute = Readonly<{
  routeRef: string;
  configurationRef: string;
  reviewRef: string;
  thresholdYears: number;
  approved: boolean;
  reviewExpiresAt: number;
  enrollmentCamera: Requirement;
  presentationCamera: Requirement;
  recoveryCamera: Requirement;
  requiredReverificationCamera: Requirement;
}>;

export type RouteRequest = Readonly<{
  thresholdYears: number;
  mode: "presentation_only" | "end_to_end";
  configurationRef: string;
  now: number;
}>;

export type RouteChoice = Readonly<{
  routeRef: string;
  reviewRef: string;
  claim: "non_camera_presentation" | "end_to_end_non_camera";
}>;

const REQUIREMENTS = new Set<string>([
  "required",
  "not_required",
  "unknown",
]);

function validateRoute(route: ReviewedRoute): void {
  for (const ref of [
    route.routeRef,
    route.configurationRef,
    route.reviewRef,
  ]) {
    if (typeof ref !== "string" || !ref.trim()) {
      throw new TypeError("Nonempty route references required");
    }
  }

  if (
    !Number.isSafeInteger(route.thresholdYears) ||
    route.thresholdYears < 18 ||
    typeof route.approved !== "boolean" ||
    !Number.isSafeInteger(route.reviewExpiresAt) ||
    route.reviewExpiresAt < 0
  ) {
    throw new TypeError("Invalid route review");
  }

  for (const requirement of [
    route.enrollmentCamera,
    route.presentationCamera,
    route.recoveryCamera,
    route.requiredReverificationCamera,
  ]) {
    if (!REQUIREMENTS.has(requirement)) {
      throw new TypeError("Invalid camera requirement");
    }
  }
}

export function selectNonCameraRoutes(
  routes: readonly ReviewedRoute[],
  request: RouteRequest,
): readonly RouteChoice[] {
  if (
    !Number.isSafeInteger(request.thresholdYears) ||
    request.thresholdYears < 18 ||
    !Number.isSafeInteger(request.now) ||
    request.now < 0 ||
    typeof request.configurationRef !== "string" ||
    !request.configurationRef.trim() ||
    (
      request.mode !== "presentation_only" &&
      request.mode !== "end_to_end"
    )
  ) {
    throw new TypeError("Invalid route request");
  }

  const seen = new Set<string>();
  const choices: RouteChoice[] = [];

  for (const route of routes) {
    validateRoute(route);

    if (seen.has(route.routeRef)) {
      throw new TypeError("Duplicate route reference");
    }
    seen.add(route.routeRef);

    const reviewed =
      route.approved &&
      route.configurationRef === request.configurationRef &&
      route.thresholdYears === request.thresholdYears &&
      request.now < route.reviewExpiresAt;

    if (
      !reviewed ||
      route.presentationCamera !== "not_required"
    ) {
      continue;
    }

    const endToEnd = [
      route.enrollmentCamera,
      route.recoveryCamera,
      route.requiredReverificationCamera,
    ].every((requirement) => requirement === "not_required");

    if (request.mode === "end_to_end" && !endToEnd) {
      continue;
    }

    choices.push(Object.freeze({
      routeRef: route.routeRef,
      reviewRef: route.reviewRef,
      claim: request.mode === "end_to_end"
        ? "end_to_end_non_camera"
        : "non_camera_presentation",
    }));
  }

  return Object.freeze(choices);
}
