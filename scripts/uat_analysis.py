# -*- coding: utf-8 -*-
"""Turn collected UAT responses into the Section 4.5.3 figures and numbers.

Usage:
    python uat_analysis.py            # reads uat-responses.csv beside this file
    python uat_analysis.py path.csv

Writes fig-uat-*.png into report-figures/ and prints every percentage the
report quotes, so nothing has to be counted by hand.

The CSV must carry the item IDs as column headers -- see
uat-responses-template.csv. Extra columns are ignored, so a Google Forms
export works as long as the ID appears at the start of each question title.
"""
import csv
import json
import os
import re
import sys
from collections import Counter

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
# Everything is written beside this script, so it runs wherever it is put.
OUT = os.environ.get("UAT_FIGURE_DIR", os.path.join(HERE, "figures"))
DEFAULT_CSV = os.path.join(HERE, "uat-responses.csv")

VIOLET, CYAN, RUST, GREY = "#6D28D9", "#0E7490", "#9A3412", "#9CA3AF"
LIKERT_COLORS = ["#C4B5FD", "#A78BFA", "#8B5CF6", "#6D28D9", "#0E7490"]
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10,
    "axes.edgecolor": "#D1D5DB", "axes.linewidth": 0.8,
    "axes.grid": True, "grid.color": "#E5E7EB", "grid.linewidth": 0.6,
    "axes.axisbelow": True, "figure.facecolor": "white",
    "savefig.facecolor": "white", "savefig.dpi": 200,
})

LIKERT_ITEMS = {
    "U-01": "Website was easy to navigate",
    "U-02": "Creating an account was straightforward",
    "U-03": "The ten questions were clear",
    "U-05": "Understood the result describes what\nsimilar students chose, not advice",
    "U-06": "Understood the sample size and\nconfidence label on each match",
    "U-07": "The explanation for a suppressed\nfield was clear",
    "P-01": "Results appeared quickly enough",
    "F-01": "The field explorer helped me\nunderstand my options",
    "F-02": "I would use this when deciding\nwhat to study after SPM",
    "A-01": "(Admin) Console gave me the\ninformation I needed",
    "A-02": "(Admin) Approving a contribution\nwas clear",
}
COMPREHENSION = ["U-05", "U-06", "U-07"]
USABILITY = ["U-01", "U-02", "U-03"]
OUTCOME = ["P-01", "F-01", "F-02"]


def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    # Accept either bare IDs or Google Forms titles that begin with the ID.
    remapped = []
    for row in rows:
        out = {}
        for key, value in row.items():
            if key is None:
                continue
            m = re.match(r"\s*([A-Z]-\d{2})", key)
            out[m.group(1) if m else key.strip()] = (value or "").strip()
        remapped.append(out)
    return remapped


def likert_values(rows, item):
    vals = []
    for r in rows:
        v = r.get(item, "")
        m = re.search(r"[1-5]", v)
        if m:
            vals.append(int(m.group()))
    return vals


def pct(n, total):
    return 0.0 if not total else round(n / total * 100, 1)


def save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    fig.savefig(os.path.join(OUT, name), bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)
    print("wrote", name)


def fig_participants(rows):
    roles = Counter(r.get("D-01", "Unstated") or "Unstated" for r in rows)
    conf = Counter(r.get("D-02", "Unstated") or "Unstated" for r in rows)
    fig, axes = plt.subplots(1, 2, figsize=(8.6, 3.8))
    for ax, data, title, colors in (
        (axes[0], roles, "Participants by role", [VIOLET, CYAN, RUST, GREY]),
        (axes[1], conf, "Participants by technical confidence", [CYAN, VIOLET, RUST, GREY]),
    ):
        labels = list(data.keys())
        vals = [data[k] for k in labels]
        total = sum(vals)
        bars = ax.bar(labels, vals, color=colors[:len(labels)], width=0.55)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + max(vals) * 0.03,
                    f"{v}  ({pct(v, total):.0f}%)", ha="center", fontsize=9, color="#374151")
        ax.set_ylim(0, max(vals) * 1.25)
        ax.set_ylabel("Participants")
        ax.set_title(title, fontsize=10.5, loc="left", pad=10)
        ax.grid(axis="x", visible=False)
        ax.tick_params(axis="x", labelsize=9)
    fig.suptitle(f"UAT participants (n = {len(rows)})", fontsize=11, x=0.02, ha="left")
    save(fig, "fig-uat-participants.png")


def fig_likert_group(rows, items, title, filename):
    items = [i for i in items if likert_values(rows, i)]
    if not items:
        print(f"skipped {filename} - no responses for {items}")
        return
    fig, ax = plt.subplots(figsize=(9.0, 0.62 * len(items) + 2.4))
    for idx, item in enumerate(items):
        vals = likert_values(rows, item)
        total = len(vals)
        left = 0
        for score in range(1, 6):
            n = vals.count(score)
            if not n:
                continue
            width = n / total * 100
            ax.barh(idx, width, left=left, height=0.6, color=LIKERT_COLORS[score - 1],
                    edgecolor="white", linewidth=0.8)
            if width >= 7:
                ax.text(left + width / 2, idx, f"{n}", ha="center", va="center",
                        fontsize=8.5, color="white" if score >= 3 else "#374151")
            left += width
        fav = sum(1 for v in vals if v >= 4)
        ax.text(101.5, idx, f"{pct(fav, total):.0f}% rated 4\u20135   (mean {sum(vals)/total:.1f})",
                va="center", fontsize=8.5, color="#374151")
    ax.set_yticks(range(len(items)))
    ax.set_yticklabels([f"{i}  {LIKERT_ITEMS[i]}" for i in items], fontsize=8.5)
    ax.invert_yaxis()
    ax.set_xlim(0, 100)
    ax.set_xlabel("Share of participants (%)")
    ax.grid(axis="y", visible=False)
    handles = [plt.Rectangle((0, 0), 1, 1, color=LIKERT_COLORS[i]) for i in range(5)]
    ax.legend(handles, ["1 strongly disagree", "2", "3", "4", "5 strongly agree"],
              frameon=False, fontsize=8, ncols=5, loc="upper left",
              bbox_to_anchor=(0, -0.22 - 0.02 * len(items)))
    ax.set_title(title, fontsize=11, loc="left", pad=12)
    save(fig, filename)


def fig_stability(rows):
    q = Counter(r.get("P-02", "") for r in rows if r.get("P-02"))
    u4 = Counter(r.get("U-04", "") for r in rows if r.get("U-04"))
    fig, axes = plt.subplots(1, 2, figsize=(8.6, 3.8))
    for ax, data, title, colors in (
        (axes[0], q, "P-02  Encountered no errors or broken pages", [CYAN, RUST]),
        (axes[1], u4, "U-04  Number of questions felt\u2026", [GREY, VIOLET, RUST]),
    ):
        if not data:
            ax.axis("off")
            continue
        labels = list(data.keys())
        vals = [data[k] for k in labels]
        total = sum(vals)
        bars = ax.bar(labels, vals, color=colors[:len(labels)], width=0.5)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v + max(vals) * 0.03,
                    f"{v}  ({pct(v, total):.0f}%)", ha="center", fontsize=9, color="#374151")
        ax.set_ylim(0, max(vals) * 1.25)
        ax.set_ylabel("Participants")
        ax.set_title(title, fontsize=10, loc="left", pad=10)
        ax.grid(axis="x", visible=False)
        ax.tick_params(axis="x", labelsize=9)
    save(fig, "fig-uat-stability.png")


def summarise(rows):
    n = len(rows)
    print(f"\n{'='*66}\nUAT SUMMARY  (n = {n})\n{'='*66}")
    print("\nParticipants")
    for key, label in (("D-01", "role"), ("D-02", "technical confidence")):
        c = Counter(r.get(key, "") for r in rows if r.get(key))
        for k, v in c.most_common():
            print(f"  {label:22s} {k:28s} {v:3d}  ({pct(v, n):.1f}%)")
    print("\nLikert items  (n responding, mean, % rating 4-5, % rating 3+)")
    stats = {}
    for item, label in LIKERT_ITEMS.items():
        vals = likert_values(rows, item)
        if not vals:
            continue
        t = len(vals)
        fav = sum(1 for v in vals if v >= 4)
        ok = sum(1 for v in vals if v >= 3)
        stats[item] = {"n": t, "mean": round(sum(vals) / t, 2),
                       "pct_4_5": pct(fav, t), "pct_3_plus": pct(ok, t)}
        print(f"  {item}  n={t:3d}  mean={stats[item]['mean']:.2f}  "
              f"4-5={stats[item]['pct_4_5']:5.1f}%  3+={stats[item]['pct_3_plus']:5.1f}%   "
              f"{label.replace(chr(10), ' ')}")
    for key in ("U-04", "P-02"):
        c = Counter(r.get(key, "") for r in rows if r.get(key))
        if c:
            print(f"\n{key}")
            for k, v in c.most_common():
                print(f"  {k:34s} {v:3d}  ({pct(v, n):.1f}%)")
    for key in ("O-01", "O-02"):
        answers = [r.get(key, "").strip() for r in rows if r.get(key, "").strip()]
        if answers:
            print(f"\n{key}  ({len(answers)} open responses)")
            for a in answers:
                print(f"  - {a}")

    def group_mean(items):
        vals = [v for i in items for v in likert_values(rows, i)]
        return round(sum(vals) / len(vals), 2) if vals else None

    print("\nGroup means")
    print(f"  usability      (U-01,02,03): {group_mean(USABILITY)}")
    print(f"  comprehension  (U-05,06,07): {group_mean(COMPREHENSION)}")
    print(f"  outcome        (P-01,F-01,F-02): {group_mean(OUTCOME)}")

    with open(os.path.join(HERE, "uat-summary.json"), "w", encoding="utf-8") as f:
        json.dump({"n": n, "items": stats,
                   "group_means": {"usability": group_mean(USABILITY),
                                   "comprehension": group_mean(COMPREHENSION),
                                   "outcome": group_mean(OUTCOME)}}, f, indent=1)
    print("\nwrote uat-summary.json")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    if not os.path.exists(path):
        print(f"No responses file at {path}.\n"
              f"Collect responses first, then save them as uat-responses.csv "
              f"using the headers in uat-responses-template.csv.")
        return
    rows = load(path)
    if not rows:
        print("The responses file is empty.")
        return
    fig_participants(rows)
    fig_likert_group(rows, USABILITY, "Usability ratings", "fig-uat-usability.png")
    fig_likert_group(rows, COMPREHENSION,
                     "Comprehension \u2014 did participants read the result correctly?",
                     "fig-uat-comprehension.png")
    fig_likert_group(rows, OUTCOME + ["A-01", "A-02"],
                     "Performance and perceived usefulness", "fig-uat-outcome.png")
    fig_stability(rows)
    summarise(rows)


if __name__ == "__main__":
    main()
