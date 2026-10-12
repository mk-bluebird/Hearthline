# SPDX-License-Identifier: MIT OR Apache-2.0

import argparse
import csv
import json
import math
from datetime import date
from pathlib import Path


FIELDS = (
    "area_id",
    "period_start",
    "period_end",
    "source_uri",
    "method_ref",
    "population_universe",
    "minimum_age",
    "sample_n",
    "adult_population_estimate",
    "living_alone_estimate",
    "share_ci_low",
    "share_ci_high",
)


def integer(value, name):
    try:
        result = int(value)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"{name}: expected integer") from exc
    if result < 0:
        raise ValueError(f"{name}: must be nonnegative")
    return result


def number(value, name):
    try:
        result = float(value)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"{name}: expected number") from exc
    if not math.isfinite(result):
        raise ValueError(f"{name}: must be finite")
    return result


def required(row, name):
    value = row[name].strip()
    if not value:
        raise ValueError(f"{name}: required")
    return value


def validate(row, minimum_sample):
    area = required(row, "area_id")
    start = date.fromisoformat(required(row, "period_start"))
    end = date.fromisoformat(required(row, "period_end"))
    if start > end:
        raise ValueError("period_start exceeds period_end")

    source = required(row, "source_uri")
    method = required(row, "method_ref")
    universe = required(row, "population_universe")

    if universe != "resident_persons_age_30_plus":
        raise ValueError("Population universe must be persons aged 30+")

    if integer(row["minimum_age"], "minimum_age") != 30:
        raise ValueError("minimum_age must be exactly 30")

    sample = integer(row["sample_n"], "sample_n")
    denominator = number(
        row["adult_population_estimate"],
        "adult_population_estimate",
    )
    numerator = number(
        row["living_alone_estimate"],
        "living_alone_estimate",
    )
    low = number(row["share_ci_low"], "share_ci_low")
    high = number(row["share_ci_high"], "share_ci_high")

    if denominator <= 0:
        raise ValueError("Population estimate must be positive")
    if not 0 <= numerator <= denominator:
        raise ValueError("Living-alone estimate outside population")
    share = numerator / denominator
    if not 0 <= low <= share <= high <= 1:
        raise ValueError("Invalid share confidence interval")

    base = {
        "area_id": area,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "source_uri": source,
        "method_ref": method,
        "interpretation": "living_arrangement_not_loneliness",
    }

    if sample < minimum_sample:
        return {**base, "status": "suppressed_insufficient_sample"}

    return {
        **base,
        "status": "published",
        "living_alone_percent": round(100 * share, 2),
        "confidence_interval_percent": [
            round(100 * low, 2),
            round(100 * high, 2),
        ],
    }


def build_report(input_path, minimum_sample):
    records = []
    seen = set()

    with input_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if (
            reader.fieldnames is None
            or len(reader.fieldnames) != len(FIELDS)
            or set(reader.fieldnames) != set(FIELDS)
        ):
            raise ValueError("CSV must contain exactly the defined fields")

        for line, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Line {line}: malformed CSV row")
            try:
                record = validate(row, minimum_sample)
                key = (
                    record["area_id"],
                    record["period_start"],
                    record["period_end"],
                )
                if key in seen:
                    raise ValueError("Duplicate area and reporting period")
                seen.add(key)
                records.append(record)
            except ValueError as exc:
                raise ValueError(f"Line {line}: {exc}") from exc

    return {
        "schema": "hearthline.connection-access-research.v1",
        "purpose": "aggregate_research_only",
        "permitted_destination": "research_report",
        "not_for": [
            "candidate_ranking",
            "individual_loneliness_inference",
            "member_eligibility",
            "integrity_scoring",
        ],
        "minimum_sample_policy": minimum_sample,
        "records": records,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("--minimum-sample", type=int, required=True)
    args = parser.parse_args()

    if args.minimum_sample <= 0:
        parser.error("--minimum-sample must be positive")

    try:
        report = build_report(args.input_csv, args.minimum_sample)
    except (ValueError, OSError) as exc:
        parser.exit(2, f"Research input rejected: {exc}\n")

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    with args.output_json.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, allow_nan=False)
        handle.write("\n")


if __name__ == "__main__":
    main()
