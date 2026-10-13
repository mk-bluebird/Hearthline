// SPDX-License-Identifier: MIT OR Apache-2.0

export type VisibleProfile = Readonly<{
  profileRef: string;
  displayName: string;
  authoredDescription: string | null;
  declaredInterests: readonly string[];
  sharedCommunicationPreferences: readonly string[];
}>;

export type PublicPlace = Readonly<{
  placeRef: string;
  title: string;
  sourceUrl: string;
  facts: readonly Readonly<{
    label: string;
    description: string;
    status: "reported" | "unknown" | "stale" | "conflicting";
  }>[];
}>;

export type AuthorizedPanelSnapshot = Readonly<{
  revision: number;
  profile: VisibleProfile | null;
  places: readonly PublicPlace[];
}>;

export type PanelDependencies = Readonly<{
  currentSnapshot: () => AuthorizedPanelSnapshot | null;
  reviewPublicPlace: (placeRef: string) => void;
}>;

function text(value: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Nonempty display text required");
  }
}

export class ConnectionAndPlacePanel {
  #disposed = false;
  #viewListeners = new AbortController();
  #lifecycleListeners = new AbortController();

  constructor(
    private readonly root: HTMLElement,
    private readonly dependencies: PanelDependencies,
  ) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") this.clear();
    }, { signal: this.#lifecycleListeners.signal });

    window.addEventListener("pagehide", () => {
      this.clear();
    }, { signal: this.#lifecycleListeners.signal });
  }

  #paragraph(value: string): HTMLParagraphElement {
    const paragraph = document.createElement("p");
    paragraph.dir = "auto";
    paragraph.textContent = value;
    return paragraph;
  }

  #list(values: readonly string[]): HTMLUListElement {
    const list = document.createElement("ul");
    for (const value of values) {
      text(value);
      const item = document.createElement("li");
      item.dir = "auto";
      item.textContent = value;
      list.append(item);
    }
    return list;
  }

  refresh(): void {
    if (this.#disposed) throw new Error("Panel disposed");
    this.clear();

    if (document.visibilityState !== "visible") return;

    const snapshot = this.dependencies.currentSnapshot();
    if (snapshot === null) {
      this.root.append(this.#paragraph(
        "No currently permitted content is available in this view.",
      ));
      return;
    }

    if (
      !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 0
    ) {
      throw new TypeError("Invalid authorized snapshot");
    }

    const fragment = document.createDocumentFragment();
    const heading = document.createElement("h2");
    heading.textContent = "Connection and public-place information";
    fragment.append(heading);

    fragment.append(this.#paragraph(
      "These are declared preferences and public-source facts. " +
      "They do not establish consent, personal safety, or attendance.",
    ));

    if (snapshot.profile !== null) {
      const profile = snapshot.profile;
      text(profile.profileRef);
      text(profile.displayName);

      const profileHeading = document.createElement("h3");
      profileHeading.dir = "auto";
      profileHeading.textContent = profile.displayName;
      fragment.append(profileHeading);

      if (profile.authoredDescription !== null) {
        text(profile.authoredDescription);
        fragment.append(
          this.#paragraph("Description supplied by the member:"),
          this.#paragraph(profile.authoredDescription),
        );
      } else {
        fragment.append(this.#paragraph(
          "No member-authored description is shared in this view.",
        ));
      }

      fragment.append(
        this.#paragraph("Declared interests:"),
        this.#list(profile.declaredInterests),
        this.#paragraph("Shared communication preferences:"),
        this.#list(profile.sharedCommunicationPreferences),
      );
    }

    const placeHeading = document.createElement("h3");
    placeHeading.textContent = "Public-place options";
    fragment.append(placeHeading);

    const seen = new Set<string>();

    for (const place of snapshot.places) {
      text(place.placeRef);
      text(place.title);
      if (seen.has(place.placeRef)) {
        throw new TypeError("Duplicate public-place reference");
      }
      seen.add(place.placeRef);

      const url = new URL(place.sourceUrl);
      if (
        url.protocol !== "https:" ||
        url.username !== "" ||
        url.password !== ""
      ) {
        throw new TypeError("Invalid public-source URL");
      }

      const section = document.createElement("section");
      const title = document.createElement("h4");
      title.textContent = place.title;
      section.append(title);

      const facts = document.createElement("dl");
      for (const fact of place.facts) {
        text(fact.label);
        text(fact.description);
        if (!["reported", "unknown", "stale", "conflicting"]
          .includes(fact.status)) {
          throw new TypeError("Invalid fact status");
        }

        const term = document.createElement("dt");
        term.textContent = fact.label;
        const description = document.createElement("dd");
        description.textContent =
          `${fact.description} — status: ${fact.status}.`;
        facts.append(term, description);
      }
      section.append(facts);

      const source = document.createElement("a");
      source.href = url.href;
      source.rel = "noopener noreferrer";
      source.referrerPolicy = "no-referrer";
      source.textContent = `Read the public source for ${place.title}`;
      section.append(source);

      const review = document.createElement("button");
      review.type = "button";
      review.textContent = `Review ${place.title}`;

      review.addEventListener("click", () => {
        const current = this.dependencies.currentSnapshot();
        if (
          this.#disposed ||
          document.visibilityState !== "visible" ||
          current === null ||
          current.revision !== snapshot.revision ||
          !current.places.some(
            (candidate) => candidate.placeRef === place.placeRef,
          )
        ) {
          this.clear();
          return;
        }

        // Opens a review interface; it must not book, send, or RSVP.
        this.dependencies.reviewPublicPlace(place.placeRef);
      }, { signal: this.#viewListeners.signal });

      section.append(review);
      fragment.append(section);
    }

    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "Close and clear this view";
    clear.addEventListener("click", () => {
      this.clear();
    }, { signal: this.#viewListeners.signal });

    fragment.append(clear);
    this.root.replaceChildren(fragment);
  }

  clear(): void {
    this.#viewListeners.abort();
    this.#viewListeners = new AbortController();
    this.root.replaceChildren();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#lifecycleListeners.abort();
    this.clear();
    this.#viewListeners.abort();
  }
}
