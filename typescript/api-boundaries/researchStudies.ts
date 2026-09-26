import type { ResearchStudy } from "./domain.js";
import { MemoryStore } from "./memoryStore.js";

export interface ResearchParticipation {
  readonly studyId: string;
  readonly memberRef: string;
  readonly state: "opted_in" | "withdrawn";
  readonly futureCollectionStops: boolean;
}

export class ResearchStudyService {
  readonly #studies = new MemoryStore<ResearchStudy>("studyId");
  readonly #participations =
    new MemoryStore<ResearchParticipation>("studyId");

  seedStudy(study: ResearchStudy): ResearchStudy {
    if (study.reviewRefs.length < 2) {
      throw new Error("research_review_refs_required");
    }

    return this.#studies.put(study);
  }

  listOpenStudies(): readonly ResearchStudy[] {
    return this.#studies.list(
      (study) =>
        study.state === "open_for_opt_in" ||
        study.state === "active"
    );
  }

  getStudy(studyId: string): ResearchStudy {
    const study = this.#studies.get(studyId);

    if (!study) {
      throw new Error("not_found");
    }

    return study;
  }

  optIn(
    memberRef: string,
    studyId: string
  ): ResearchParticipation {
    const study = this.getStudy(studyId);

    if (study.state !== "open_for_opt_in") {
      throw new Error("study_not_open");
    }

    const participation: ResearchParticipation = {
      studyId,
      memberRef,
      state: "opted_in",
      futureCollectionStops: false
    };

    return this.#participations.put(participation);
  }

  withdraw(
    memberRef: string,
    studyId: string
  ): ResearchParticipation {
    const study = this.getStudy(studyId);

    if (
      study.state !== "open_for_opt_in" &&
      study.state !== "active"
    ) {
      throw new Error("study_not_withdrawable");
    }

    const participation: ResearchParticipation = {
      studyId,
      memberRef,
      state: "withdrawn",
      futureCollectionStops: true
    };

    return this.#participations.put(participation);
  }

  listOwnParticipation(
    memberRef: string
  ): readonly ResearchParticipation[] {
    return this.#participations.list(
      (participation) =>
        participation.memberRef === memberRef
    );
  }
}
