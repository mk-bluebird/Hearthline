# SPDX-License-Identifier: MIT OR Apache-2.0

from copy import deepcopy
from collections.abc import Callable, Mapping, Sequence
from typing import Any


def assert_prohibited_store_noninterference(
    select: Callable[
        [Mapping[str, Any], Mapping[str, Any]], Sequence[str]
    ],
    allowed_inputs: Mapping[str, Any],
    prohibited_store_variants: Sequence[Mapping[str, Any]],
) -> None:
    """
    Compare complete ordered outputs while varying only a prohibited store.
    This is a regression test, not demographic fairness measurement.
    """
    if len(prohibited_store_variants) < 2:
        raise ValueError("At least two test variants are required")

    def run(store: Mapping[str, Any]) -> tuple[str, ...]:
        output = select(
            deepcopy(dict(allowed_inputs)),
            deepcopy(dict(store)),
        )
        if isinstance(output, (str, bytes)) or not isinstance(
            output, Sequence
        ):
            raise AssertionError("Selection output must be a sequence")

        result = tuple(output)
        if any(not isinstance(ref, str) or not ref for ref in result):
            raise AssertionError("Invalid candidate reference")
        if len(set(result)) != len(result):
            raise AssertionError("Duplicate candidate reference")
        return result

    baseline = run(prohibited_store_variants[0])

    # A repeated baseline catches some nondeterminism before comparison.
    if run(prohibited_store_variants[0]) != baseline:
        raise AssertionError(
            "Use a deterministic test clock, ordering, and random seed"
        )

    for variant in prohibited_store_variants[1:]:
        if run(variant) != baseline:
            raise AssertionError(
                "Prohibited-store changes affected ordered selection"
            )
