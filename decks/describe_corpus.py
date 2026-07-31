# Descriptive statistics for the deck's Descriptive Analysis slides.
#
# The deck must not carry hand-typed numbers. This reads the same survey the
# model trains on and writes decks/descriptive-stats.json, which
# system-overview.js loads. Re-run it after any change to the corpus:
#
#     python decks/describe_corpus.py
#
# Reads ml/data/survey.csv — the file ml/train.py reads — rather than the
# convenience copy in datasets/, so the deck and the model can never be
# describing two different files.

import csv
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SURVEY = ROOT / "ml" / "data" / "survey.csv"
OUT = Path(__file__).resolve().parent / "descriptive-stats.json"

# The k-anonymity threshold the product enforces. Fields below it publish no
# statistics at all; the deck says which fields those are rather than quietly
# charting them.
K_THRESHOLD = 10

# Long survey headings, shortened for axis labels. The full text stays in the
# CSV; only the display name is trimmed.
SHORT = {
    "Business & Management (Accounting, Finance, Marketing etc)": "Business & Management",
    "Computer Science, Software & Data (Cybersecurity, Data Analytics etc)": "Computer Science & Data",
    "Engineering (Mechanical, Civil, Electrical etc)": "Engineering",
    "Architecture & Built Environment": "Architecture",
    "Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)": "Health & Medical",
    "Media & Communication": "Media & Communication",
    "Law & Legal Studies": "Law",
    "Science & Mathematics (Biology, Chemistry, Mathematics etc)": "Science & Mathematics",
    "Creative Art (Fashion Design, Interior Design etc)": "Creative Art",
    "Humanities & Social Sciences (Philosophy, Language etc)": "Humanities",
}


def column(rows, fragment):
    """Find a column by a fragment of its heading.

    The survey export carries stray leading and trailing spaces in several
    headings — matching on a fragment survives that without editing the CSV.
    """
    for name in rows[0]:
        if fragment.lower() in name.lower().strip():
            return name
    raise KeyError(fragment)


def quartiles(values):
    ordered = sorted(values)
    n = len(ordered)
    return {
        "min": ordered[0],
        "q1": ordered[n // 4],
        "median": statistics.median(ordered),
        "q3": ordered[(3 * n) // 4],
        "max": ordered[-1],
        "mean": round(statistics.mean(ordered), 2),
        "n": n,
    }


def main():
    with SURVEY.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    field_col = column(rows, "major / field")
    sat_col = column(rows, "How satisfied")
    related_col = column(rows, "related to your stream")
    route_col = column(rows, "pre-university")
    results_col = column(rows, "What was your SPM results")
    school_col = column(rows, "type of secondary school")

    def satisfaction(row):
        try:
            return int(row[sat_col])
        except (TypeError, ValueError):
            return None

    # Field distribution — the class balance the model has to work with.
    field_counts = Counter(row[field_col].strip() for row in rows)
    fields = [
        {
            "field": SHORT.get(name, name),
            "n": count,
            "suppressed": count < K_THRESHOLD,
        }
        for name, count in field_counts.most_common()
    ]

    # Satisfaction by field — mean, and the share who rated 4 or 5.
    by_field = defaultdict(list)
    for row in rows:
        value = satisfaction(row)
        if value:
            by_field[row[field_col].strip()].append(value)

    satisfaction_by_field = [
        {
            "field": SHORT.get(name, name),
            "n": len(values),
            "mean": round(statistics.mean(values), 2),
            "satisfiedShare": round(
                100 * sum(1 for v in values if v >= 4) / len(values)
            ),
            "suppressed": len(values) < K_THRESHOLD,
        }
        for name, values in sorted(
            by_field.items(), key=lambda item: -statistics.mean(item[1])
        )
    ]

    # Satisfaction against whether the field matched the SPM stream. This is
    # the finding that justifies not simply routing students down their stream.
    by_related = defaultdict(list)
    for row in rows:
        value = satisfaction(row)
        if value:
            by_related[row[related_col].strip()].append(value)

    relatedness = [
        {
            "related": key,
            "n": len(values),
            "mean": round(statistics.mean(values), 2),
            "distribution": [
                round(100 * sum(1 for v in values if v == score) / len(values))
                for score in (1, 2, 3, 4, 5)
            ],
            "satisfiedShare": round(
                100 * sum(1 for v in values if v >= 4) / len(values)
            ),
        }
        for key, values in sorted(by_related.items(), key=lambda item: -len(item[1]))
    ]

    # Satisfaction spread by pre-U route — the five-number summary a box plot
    # would draw, which is why the deck can draw one without a plotting library.
    by_route = defaultdict(list)
    for row in rows:
        value = satisfaction(row)
        if value:
            by_route[row[route_col].strip()].append(value)

    routes = [
        {"route": name, **quartiles(values)}
        for name, values in sorted(by_route.items(), key=lambda item: -len(item[1]))
    ]

    all_satisfaction = [s for s in (satisfaction(r) for r in rows) if s]

    stats = {
        "source": "ml/data/survey.csv",
        "generatedBy": "decks/describe_corpus.py",
        "n": len(rows),
        "kThreshold": K_THRESHOLD,
        "fields": fields,
        "satisfactionByField": satisfaction_by_field,
        "relatedness": relatedness,
        "routes": routes,
        "results": [
            {"band": name, "n": count}
            for name, count in Counter(
                row[results_col].strip() for row in rows
            ).most_common()
        ],
        "schools": [
            {"school": name, "n": count}
            for name, count in Counter(
                row[school_col].strip() for row in rows
            ).most_common()
        ],
        "overallSatisfaction": round(statistics.mean(all_satisfaction), 2),
        "satisfactionDistribution": [
            round(
                100
                * sum(1 for v in all_satisfaction if v == score)
                / len(all_satisfaction)
            )
            for score in (1, 2, 3, 4, 5)
        ],
    }

    OUT.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {stats['n']} rows, {len(fields)} fields")
    suppressed = [f["field"] for f in fields if f["suppressed"]]
    if suppressed:
        print(f"below the k={K_THRESHOLD} threshold: {', '.join(suppressed)}")


if __name__ == "__main__":
    main()
