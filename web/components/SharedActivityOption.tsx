import { useId, useState } from "react";

export interface SharedActivityOptionProps {
  readonly cardId: string;
  readonly heading: string;
  readonly description: string;
  readonly explanation: string;
  readonly activityLabels: readonly string[];
  readonly broadAreaLabel: string;
  readonly paceLabels: readonly string[];
  readonly onExpressInterest: (cardId: string) => void;
  readonly onHide: (cardId: string) => void;
  readonly onOpenPreferences: () => void;
  readonly onBlockOrReport: (cardId: string) => void;
}

export function SharedActivityOption({
  cardId,
  heading,
  description,
  explanation,
  activityLabels,
  broadAreaLabel,
  paceLabels,
  onExpressInterest,
  onHide,
  onOpenPreferences,
  onBlockOrReport
}: SharedActivityOptionProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const explanationId = useId();

  if (hidden) {
    return (
      <p role="status">
        This shared-activity option is hidden. You can change discovery settings
        at any time.
      </p>
    );
  }

  function hideCard(): void {
    setHidden(true);
    onHide(cardId);
  }

  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="shared-activity-option"
    >
      <header>
        <p className="shared-activity-option__eyebrow">
          Shared activity possibility
        </p>

        <h2 id={titleId}>{heading}</h2>

        <p id={descriptionId}>{description}</p>
      </header>

      <section aria-label="Shared settings">
        <h3>Shared settings</h3>

        <dl>
          <div>
            <dt>Activities</dt>
            <dd>{activityLabels.join(", ")}</dd>
          </div>

          <div>
            <dt>Broad area</dt>
            <dd>{broadAreaLabel}</dd>
          </div>

          <div>
            <dt>Communication and pace</dt>
            <dd>{paceLabels.join(", ")}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Privacy boundary">
        <h3>Privacy boundary</h3>

        <p>
          This option does not reveal anyone’s exact location, venue visits,
          contacts, mutual friends, private messages, profile views, real-time
          presence, or response likelihood.
        </p>
      </section>

      <section aria-label="Actions">
        <button
          type="button"
          onClick={() => onExpressInterest(cardId)}
        >
          Express interest in this activity
        </button>

        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={explanationId}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          Why am I seeing this?
        </button>

        {detailsOpen ? (
          <div id={explanationId}>
            <p>{explanation}</p>
            <p>
              This is a current shared setting, not a promise, a compatibility
              score, or permission to contact, meet, disclose a location, or
              discuss intimate topics.
            </p>
          </div>
        ) : null}

        <button type="button" onClick={hideCard}>
          Hide this option
        </button>

        <button type="button" onClick={onOpenPreferences}>
          Change discovery settings
        </button>

        <button type="button" onClick={() => onBlockOrReport(cardId)}>
          Block or report
        </button>
      </section>
    </article>
  );
}
