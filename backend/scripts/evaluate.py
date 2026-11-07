"""Evaluate Clai on the labelled question set (evaluations/questions.json).

    python -m scripts.evaluate [--llm] [--out ../evaluations/results/latest.json]

By default the LLM is disabled, so answers are extractive and the run is deterministic and free.
Pass --llm to use the OpenRouter model configured in backend/.env (spends free-tier quota).

Metrics
- retrieval hit@1 / hit@5: expected clause is the top / within the top 5 reranked passages
- citation accuracy: the cited passages include the expected clause
- answer correctness: every expect_text string appears in the answer
- grounding: answer marked grounded (for answerable questions)
- abstention: unanswerable questions marked insufficient; false abstentions on answerable ones
- latency: end-to-end server time per question (p50 / p95)
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import Settings, get_settings
from app.services import Clai

ROOT = Path(__file__).resolve().parents[2]


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    k = max(0, min(len(ordered) - 1, round(pct / 100 * (len(ordered) - 1))))
    return ordered[k]


def run(use_llm: bool) -> dict[str, Any]:
    spec = json.loads((ROOT / "evaluations" / "questions.json").read_text(encoding="utf-8"))
    base = get_settings()
    with tempfile.TemporaryDirectory() as tmp:
        settings = Settings(
            _env_file=None,  # type: ignore[call-arg]
            data_dir=Path(tmp),
            qdrant_mode="memory",
            openrouter_api_key=base.openrouter_api_key if use_llm else "",
            openrouter_model=base.openrouter_model,
        )
        clai = Clai(settings)
        docs = {
            key: clai.ingest(Path(path).name, (ROOT / path).read_bytes()) for key, path in spec["documents"].items()
        }
        conversations: dict[str, str] = {}
        rows: list[dict[str, Any]] = []
        clai.ask(docs["services"].id, "warm-up question about termination")  # load models before timing

        for item in spec["questions"]:
            doc = docs[item["doc"]]
            conversation = conversations.get(item["follow_up_of"]) if item.get("follow_up_of") else None
            answer = clai.ask(doc.id, item["q"], conversation)
            conversations[item["id"]] = answer.conversation_id
            ranked = [e.clause for e in answer.evidence]
            cited = [e.clause for e in answer.evidence if e.cited]
            row: dict[str, Any] = {
                "id": item["id"],
                "question": item["q"],
                "grounding": answer.grounding,
                "generation": answer.generation,
                "cited": cited,
                "top": ranked[:3],
                "ms": answer.timings_ms.get("total", 0.0),
                "answer": answer.answer,
            }
            if item.get("abstain"):
                row["abstained_correctly"] = answer.grounding == "insufficient"
            else:
                expected = item["expect_clause"]
                row.update(
                    hit1=bool(ranked) and ranked[0] == expected,
                    hit5=expected in ranked[:5],
                    citation_ok=expected in cited,
                    answer_ok=all(t.lower() in answer.answer.lower() for t in item["expect_text"]),
                    grounded=answer.grounding == "grounded",
                    false_abstain=answer.grounding == "insufficient",
                )
            rows.append(row)
        clai.close()

    answerable = [r for r in rows if "hit1" in r]
    unanswerable = [r for r in rows if "abstained_correctly" in r]
    rate = lambda key, rs: round(sum(bool(r[key]) for r in rs) / len(rs), 3)  # noqa: E731
    latencies = [r["ms"] for r in rows]
    return {
        "run_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "mode": "llm" if use_llm else "extractive",
        "llm_model": settings.openrouter_model if use_llm else None,
        "machine": f"{platform.system()} {platform.machine()}, Python {platform.python_version()}",
        "counts": {"questions": len(rows), "answerable": len(answerable), "unanswerable": len(unanswerable)},
        "metrics": {
            "retrieval_hit_at_1": rate("hit1", answerable),
            "retrieval_hit_at_5": rate("hit5", answerable),
            "citation_accuracy": rate("citation_ok", answerable),
            "answer_correctness": rate("answer_ok", answerable),
            "grounded_rate": rate("grounded", answerable),
            "false_abstention_rate": rate("false_abstain", answerable),
            "abstention_accuracy": rate("abstained_correctly", unanswerable),
            "latency_ms_p50": round(statistics.median(latencies), 1),
            "latency_ms_p95": round(percentile(latencies, 95), 1),
        },
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--llm", action="store_true", help="use the configured OpenRouter model")
    parser.add_argument("--out", type=Path, default=ROOT / "evaluations" / "results" / "latest.json")
    args = parser.parse_args()
    report = run(args.llm)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("mode", "counts", "metrics")}, indent=2))
    for r in report["rows"]:
        ok = r.get("abstained_correctly", r.get("citation_ok") and r.get("answer_ok"))
        if not ok:
            print(f"MISS {r['id']}: {r['question']} -> {r['grounding']} cited={r['cited']} top={r['top']}")


if __name__ == "__main__":
    main()
