import type { RightsAccessReview } from "./domain.js";
import { MemoryStore, newId, nowIso } from "./memoryStore.js";

export interface CreateRightsAccessReviewInput {
  readonly featureRef: string;
  readonly featureVersion: string;
  readonly dimensions: RightsAccessReview["dimensions"];
  readonly evidenceRefs: readonly string[];
  readonly outcome: RightsAccessReview["outcome"];
  readonly findingCodes?: readonly string[];
  readonly policyVersion: string;
}

export class RightsAccessReviewService {
  readonly #store = new MemoryStore<RightsAccessReview>("reviewId");

  create(
    input: CreateRightsAccessReviewInput
  ): RightsAccessReview {
    if (input.dimensions.length === 0) {
      throw new Error("review_dimensions_required");
    }

    if (input.evidenceRefs.length === 0) {
      throw new Error("review_evidence_required");
    }

    const review: RightsAccessReview = {
      reviewId: newId("rights_access_review"),
      featureRef: input.featureRef,
      featureVersion: input.featureVersion,
      dimensions: input.dimensions,
      evidenceRefs: input.evidenceRefs,
      outcome: input.outcome,
      findingCodes: input.findingCodes ?? [],
      reviewedAt: nowIso(),
      policyVersion: input.policyVersion
    };

    return this.#store.put(review);
  }

  get(reviewId: string): RightsAccessReview {
    const review = this.#store.get(reviewId);

    if (!review) {
      throw new Error("not_found");
    }

    return review;
  }

  list(featureRef?: string): readonly RightsAccessReview[] {
    return this.#store.list(
      (review) =>
        featureRef === undefined || review.featureRef === featureRef
    );
  }
}
