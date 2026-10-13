# SPDX-License-Identifier: MIT OR Apache-2.0

from dataclasses import dataclass
from math import sqrt
from statistics import NormalDist
from typing import Iterable


METRICS = {
    "below_threshold_false_acceptance",
    "eligible_referral",
    "pad_attack_acceptance",
    "iad_attack_acceptance",
    "capture_failure",
}


@dataclass(frozen=True)
class EvaluationCell:
    dataset_ref: str
    configuration_ref: str
    protocol_ref: str
    population_ref: str
    subgroup_ref: str
    metric: str
    actual_age_lower: float
    actual_age_upper_exclusive: float
    membership_threshold: int
    challenge_threshold: float
    errors: int
    trials: int
    independent_binomial_trials: bool


def _nonempty(value: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Nonempty research references are required")


def _finite_number(value: float) -> None:
    from math import isfinite
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Expected a numeric value")
    if not isfinite(value):
        raise ValueError("Values must be finite")


def validate_cell(cell: EvaluationCell) -> None:
    for value in (
        cell.dataset_ref,
        cell.configuration_ref,
        cell.protocol_ref,
        cell.population_ref,
        cell.subgroup_ref,
    ):
        _nonempty(value)

    if cell.metric not in METRICS:
        raise ValueError("Unsupported evaluation metric")

    if (
        type(cell.membership_threshold) is not int
        or cell.membership_threshold < 18
    ):
        raise ValueError("Invalid adult membership threshold")

    for value in (
        cell.actual_age_lower,
        cell.actual_age_upper_exclusive,
        cell.challenge_threshold,
    ):
        _finite_number(value)

    if (
        cell.actual_age_lower < 0
        or cell.actual_age_upper_exclusive <= cell.actual_age_lower
        or cell.challenge_threshold < cell.membership_threshold
    ):
        raise ValueError("Invalid age band or challenge threshold")

    if (
        type(cell.errors) is not int
        or type(cell.trials) is not int
        or cell.trials <= 0
        or not 0 <= cell.errors <= cell.trials
        or type(cell.independent_binomial_trials) is not bool
    ):
        raise ValueError("Invalid evaluation counts")

    if (
        cell.metric == "below_threshold_false_acceptance"
        and cell.actual_age_upper_exclusive > cell.membership_threshold
    ):
        raise ValueError("False-acceptance population crosses the boundary")

    if (
        cell.metric == "eligible_referral"
        and cell.actual_age_lower < cell.membership_threshold
    ):
        raise ValueError("Referral population includes ineligible ages")


def wilson_interval(
    errors: int,
    trials: int,
    confidence: float,
) -> tuple[float, float]:
    if not 0 < confidence < 1:
        raise ValueError("Confidence must lie between zero and one")

    z = NormalDist().inv_cdf((1 + confidence) / 2)
    proportion = errors / trials
    denominator = 1 + z * z / trials
    center = (proportion + z * z / (2 * trials)) / denominator
    radius = z * sqrt(
        proportion * (1 - proportion) / trials
        + z * z / (4 * trials * trials)
    ) / denominator

    return max(0.0, center - radius), min(1.0, center + radius)


def build_evidence_report(
    cells: Iterable[EvaluationCell],
    approved_subgroup_refs: set[str],
    minimum_trials: int,
    confidence: float = 0.95,
) -> dict:
    if type(minimum_trials) is not int or minimum_trials <= 0:
        raise ValueError("minimum_trials must be positive")
    if not 0 < confidence < 1:
        raise ValueError("Invalid confidence")
    for subgroup in approved_subgroup_refs:
        _nonempty(subgroup)

    records = []
    seen = set()

    for cell in cells:
        validate_cell(cell)
        if cell.subgroup_ref not in approved_subgroup_refs:
            raise ValueError("Subgroup is not approved for this release")

        key = (
            cell.dataset_ref,
            cell.configuration_ref,
            cell.protocol_ref,
            cell.population_ref,
            cell.subgroup_ref,
            cell.metric,
            cell.actual_age_lower,
            cell.actual_age_upper_exclusive,
            cell.membership_threshold,
            cell.challenge_threshold,
        )
        if key in seen:
            raise ValueError("Duplicate evaluation cell")
        seen.add(key)

        base = {
            "dataset_ref": cell.dataset_ref,
            "configuration_ref": cell.configuration_ref,
            "protocol_ref": cell.protocol_ref,
            "population_ref": cell.population_ref,
            "subgroup_ref": cell.subgroup_ref,
            "metric": cell.metric,
            "age_band": [
                cell.actual_age_lower,
                cell.actual_age_upper_exclusive,
            ],
            "membership_threshold": cell.membership_threshold,
            "challenge_threshold": cell.challenge_threshold,
        }

        if cell.trials < minimum_trials:
            records.append({
                **base,
                "status": "suppressed_insufficient_trials",
            })
            continue

        interval = None
        if cell.independent_binomial_trials:
            low, high = wilson_interval(
                cell.errors, cell.trials, confidence
            )
            interval = {
                "method": "approximate_wilson",
                "confidence": confidence,
                "lower": low,
                "upper": high,
            }

        records.append({
            **base,
            "status": "reported",
            "errors": cell.errors,
            "trials": cell.trials,
            "observed_rate": cell.errors / cell.trials,
            "interval": interval,
            "uncertainty_note": (
                "Pointwise approximate interval; not simultaneous coverage"
                if interval is not None
                else "No binomial interval: dependence requires another method"
            ),
        })

    return {
        "schema": "hearthline.age-assurance-evidence.v1",
        "purpose": "independent_research_review",
        "automatic_release_approval": False,
        "minimum_trials_policy": minimum_trials,
        "records": records,
        "limitations": [
            "Does not infer demographic attributes",
            "Does not establish dataset representativeness",
            "Does not verify independence or provenance",
            "Does not account for multiple comparisons",
            "Does not select a production challenge threshold",
            "Does not establish PAD or IAD certification",
            "Does not establish legal acceptance",
        ],
    }
