# SPDX-License-Identifier: MIT OR Apache-2.0

from dataclasses import dataclass
from math import isfinite, sqrt
from statistics import NormalDist


@dataclass(frozen=True)
class ArmSummary:
    protocol_ref: str
    instrument_ref: str
    endpoint_ref: str
    analysis_ref: str
    arm: str
    randomized_n: int
    observed_change_n: int
    mean_change: float
    change_variance: float

    def validate(self) -> None:
        for value in (
            self.protocol_ref,
            self.instrument_ref,
            self.endpoint_ref,
            self.analysis_ref,
            self.arm,
        ):
            if not isinstance(value, str) or not value.strip():
                raise ValueError("Nonempty analysis references required")

        if (
            type(self.randomized_n) is not int
            or type(self.observed_change_n) is not int
            or self.randomized_n <= 0
            or not 2 <= self.observed_change_n <= self.randomized_n
        ):
            raise ValueError("Invalid arm counts")

        for value in (self.mean_change, self.change_variance):
            if isinstance(value, bool) or not isinstance(
                value, (int, float)
            ):
                raise ValueError("Expected numeric aggregate")
            if not isfinite(value):
                raise ValueError("Aggregate must be finite")

        if self.change_variance < 0:
            raise ValueError("Variance must be nonnegative")


def aggregate_change_report(
    treatment: ArmSummary,
    comparison: ArmSummary,
    minimum_release_n: int,
    confidence: float = 0.95,
    independent_individual_randomization: bool = False,
) -> dict:
    treatment.validate()
    comparison.validate()

    if type(minimum_release_n) is not int or minimum_release_n < 2:
        raise ValueError("Invalid release threshold")
    if not 0 < confidence < 1:
        raise ValueError("Invalid confidence")
    if type(independent_individual_randomization) is not bool:
        raise ValueError("Explicit design declaration required")

    for field in (
        "protocol_ref",
        "instrument_ref",
        "endpoint_ref",
        "analysis_ref",
    ):
        if getattr(treatment, field) != getattr(comparison, field):
            raise ValueError(f"{field} mismatch")

    if treatment.arm == comparison.arm:
        raise ValueError("Distinct treatment and comparison arms required")

    base = {
        "protocol_ref": treatment.protocol_ref,
        "instrument_ref": treatment.instrument_ref,
        "endpoint_ref": treatment.endpoint_ref,
        "analysis_ref": treatment.analysis_ref,
        "automatic_effectiveness_claim": False,
    }

    if min(
        treatment.observed_change_n,
        comparison.observed_change_n,
    ) < minimum_release_n:
        return {
            **base,
            "status": "suppressed_insufficient_release_sample",
        }

    contrast = treatment.mean_change - comparison.mean_change
    interval = None

    if independent_individual_randomization:
        standard_error = sqrt(
            treatment.change_variance / treatment.observed_change_n
            + comparison.change_variance / comparison.observed_change_n
        )
        z = NormalDist().inv_cdf((1 + confidence) / 2)
        interval = {
            "method": "large_sample_normal_observed_case",
            "confidence": confidence,
            "standard_error": standard_error,
            "lower": contrast - z * standard_error,
            "upper": contrast + z * standard_error,
        }

    return {
        **base,
        "status": "reported",
        "contrast": contrast,
        "contrast_definition": "treatment_change_minus_comparison_change",
        "observed_case_interval": interval,
        "treatment_observed_fraction": (
            treatment.observed_change_n / treatment.randomized_n
        ),
        "comparison_observed_fraction": (
            comparison.observed_change_n / comparison.randomized_n
        ),
        "limitations": [
            "Not a substitute for the preregistered primary analysis",
            "Observed-case contrast does not resolve missing-data bias",
            "No cluster or participant-interference adjustment",
            "No instrument-validity or provenance verification",
            "No clinical-significance threshold is assumed",
            "Release threshold alone does not guarantee anonymity",
        ],
    }
