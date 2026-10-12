# SPDX-License-Identifier: MIT OR Apache-2.0

from dataclasses import dataclass
from math import isfinite, sqrt
from typing import Sequence


@dataclass(frozen=True)
class AggregateEstimate:
    protocol_ref: str
    instrument_ref: str
    population_ref: str
    period_ref: str
    source_ref: str
    sample_n: int
    mean: float

    def validate(self) -> None:
        references = (
            self.protocol_ref,
            self.instrument_ref,
            self.population_ref,
            self.period_ref,
            self.source_ref,
        )
        if any(not isinstance(x, str) or not x.strip()
               for x in references):
            raise ValueError("Nonempty references are required")
        if type(self.sample_n) is not int or self.sample_n <= 0:
            raise ValueError("sample_n must be a positive integer")
        if not isfinite(self.mean):
            raise ValueError("mean must be finite")


def _validate_covariance(matrix: Sequence[Sequence[float]]) -> None:
    if len(matrix) != 4 or any(len(row) != 4 for row in matrix):
        raise ValueError("Expected a 4 by 4 covariance matrix")
    if any(not isfinite(x) for row in matrix for x in row):
        raise ValueError("Covariance entries must be finite")

    scale = max(1.0, max(abs(x) for row in matrix for x in row))
    tolerance = 1e-10 * scale

    for i in range(4):
        if matrix[i][i] < 0:
            raise ValueError("Negative variance")
        for j in range(4):
            if abs(matrix[i][j] - matrix[j][i]) > tolerance:
                raise ValueError("Covariance must be symmetric")

    # Validate positive semidefiniteness with an LDL-style factorization.
    lower = [[0.0] * 4 for _ in range(4)]
    diagonal = [0.0] * 4
    for i in range(4):
        lower[i][i] = 1.0
        for j in range(i):
            residual = matrix[i][j] - sum(
                lower[i][k] * diagonal[k] * lower[j][k]
                for k in range(j)
            )
            if abs(diagonal[j]) <= tolerance:
                if abs(residual) > tolerance:
                    raise ValueError("Covariance is not semidefinite")
                lower[i][j] = 0.0
            else:
                lower[i][j] = residual / diagonal[j]

        pivot = matrix[i][i] - sum(
            lower[i][k] ** 2 * diagonal[k] for k in range(i)
        )
        if pivot < -tolerance:
            raise ValueError("Covariance is not semidefinite")
        diagonal[i] = max(0.0, pivot)


def aggregate_contrast(
    intervention_pre: AggregateEstimate,
    intervention_post: AggregateEstimate,
    comparison_pre: AggregateEstimate,
    comparison_post: AggregateEstimate,
    covariance: Sequence[Sequence[float]],
    uncertainty_method_ref: str,
    minimum_sample: int,
) -> dict:
    estimates = (
        intervention_pre,
        intervention_post,
        comparison_pre,
        comparison_post,
    )
    for estimate in estimates:
        estimate.validate()

    if type(minimum_sample) is not int or minimum_sample <= 0:
        raise ValueError("minimum_sample must be positive")
    if not uncertainty_method_ref.strip():
        raise ValueError("Uncertainty method reference is required")

    if len({x.protocol_ref for x in estimates}) != 1:
        raise ValueError("Protocol mismatch")
    if len({x.instrument_ref for x in estimates}) != 1:
        raise ValueError("Instrument mismatch")
    if intervention_pre.population_ref != intervention_post.population_ref:
        raise ValueError("Intervention population mismatch")
    if comparison_pre.population_ref != comparison_post.population_ref:
        raise ValueError("Comparison population mismatch")
    if intervention_pre.population_ref == comparison_pre.population_ref:
        raise ValueError("Comparison population must be distinct")
    if intervention_pre.period_ref != comparison_pre.period_ref:
        raise ValueError("Pre-period mismatch")
    if intervention_post.period_ref != comparison_post.period_ref:
        raise ValueError("Post-period mismatch")
    if intervention_pre.period_ref == intervention_post.period_ref:
        raise ValueError("Pre and post periods must differ")

    if any(x.sample_n < minimum_sample for x in estimates):
        return {
            "status": "suppressed",
            "reason": "minimum_sample_policy_not_met",
        }

    _validate_covariance(covariance)

    weights = (-1.0, 1.0, 1.0, -1.0)
    contrast = sum(w * x.mean for w, x in zip(weights, estimates))
    variance = sum(
        weights[i] * covariance[i][j] * weights[j]
        for i in range(4) for j in range(4)
    )

    return {
        "status": "computed",
        "interpretation": "aggregate_contrast_not_causal_proof",
        "contrast": contrast,
        "standard_error": sqrt(max(0.0, variance)),
        "protocol_ref": intervention_pre.protocol_ref,
        "instrument_ref": intervention_pre.instrument_ref,
        "uncertainty_method_ref": uncertainty_method_ref,
        "source_refs": [x.source_ref for x in estimates],
    }
