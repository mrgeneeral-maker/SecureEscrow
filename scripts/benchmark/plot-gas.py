"""Creates gas charts (PNG) from reports/gas-comparison.json.

Run from the project root after `npm run benchmark:gas`:
    pip install matplotlib
    python scripts/benchmark/plot-gas.py
"""
import json
from pathlib import Path

import matplotlib.pyplot as plt

BLUE, ORANGE = "#2E5BBA", "#E07B39"

root = Path(__file__).resolve().parents[2]
data = json.loads((root / "reports" / "gas-comparison.json").read_text())
out = root / "reports" / "figures"
out.mkdir(parents=True, exist_ok=True)


def rows(name):
    return {row["function"]: row["gasUsed"] for row in data[name]}


def annotate(ax, bars):
    for bar in bars:
        ax.annotate(
            f"{int(bar.get_height()):,}",
            (bar.get_x() + bar.get_width() / 2, bar.get_height()),
            ha="center",
            va="bottom",
            fontsize=8,
        )


def save(fig, name):
    fig.tight_layout()
    fig.savefig(out / name, dpi=200)
    plt.close(fig)


secure, vulnerable = rows("secure"), rows("vulnerable")

functions = {k: v for k, v in secure.items() if k != "deployment"}
fig, ax = plt.subplots(figsize=(8, 4.5))
annotate(ax, ax.bar(functions.keys(), functions.values(), color=BLUE))
ax.set_ylabel("Gas used")
ax.set_title("Gas cost per SecureEscrow function")
plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
save(fig, "fig_gas_secure.png")

common = [k for k in vulnerable if k in secure]
x = range(len(common))
fig, ax = plt.subplots(figsize=(8, 4.5))
annotate(ax, ax.bar([i - 0.2 for i in x], [vulnerable[k] for k in common], 0.4, label="VulnerableEscrow", color=ORANGE))
annotate(ax, ax.bar([i + 0.2 for i in x], [secure[k] for k in common], 0.4, label="SecureEscrow", color=BLUE))
ax.set_xticks(list(x))
ax.set_xticklabels(common)
ax.set_ylabel("Gas used")
ax.set_title("Gas cost: SecureEscrow vs VulnerableEscrow")
ax.legend()
save(fig, "fig_gas_secure_vs_vulnerable.png")

deployment = {"VulnerableEscrow": vulnerable["deployment"], "SecureEscrow": secure["deployment"]}
fig, ax = plt.subplots(figsize=(6, 4.5))
annotate(ax, ax.bar(deployment.keys(), deployment.values(), color=[ORANGE, BLUE]))
ax.set_ylabel("Gas used")
ax.set_title("Deployment gas cost")
save(fig, "fig_gas_deployment.png")

print("Saved charts to", out)
