import json
import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import brief_sample as b  # noqa: E402

R = json.loads(b.RESULT.read_text(encoding="utf-8"))
BRIEF = b.ROOT / "docs/CAMPAIGN-BRIEF.md"


def test_mde_by_hand():
    # 0.5 기준, 발송 500명 미발송 500명: 2.8016 * sqrt(0.25 * (2 / 500))
    assert b.mde(0.5, 1000, 0.5) == pytest.approx(b.Z * math.sqrt(0.25 * 0.004))
    assert b.Z == pytest.approx(2.8016, abs=1e-4)


def test_more_rounds_or_balanced_split_detect_smaller_difference():
    assert b.mde(0.4, 666 * 4, 0.3) == pytest.approx(b.mde(0.4, 666, 0.3) / 2, rel=1e-2)
    assert b.mde(0.4, 666, 0.5) < b.mde(0.4, 666, 0.3) < b.mde(0.4, 666, 0.2)


def test_rounds_needed_is_first_round_below_target():
    k = b.rounds_needed(0.5, 666, 0.3, 0.05)
    assert b.mde(0.5, 666 * k, 0.3) <= 0.05 < b.mde(0.5, 666 * (k - 1), 0.3)


def test_result_file_is_up_to_date():
    retail = json.loads(b.RETAIL.read_text(encoding="utf-8"))
    hillstrom = json.loads(b.HILLSTROM.read_text(encoding="utf-8"))
    assert b.plan(retail, hillstrom) == R, "python -I analysis/brief_sample.py 를 다시 실행하세요"


def test_brief_uses_deduplicated_pilot_counts_for_sample_size():
    text = BRIEF.read_text(encoding="utf-8")
    rows = [line.split("|") for line in text.splitlines() if line.startswith("| 2011-")]
    assert len(rows) == 6
    candidates = sum(int(row[-3].strip().removesuffix("명")) for row in rows)
    repurchased = sum(int(row[-2].strip().removesuffix("명")) for row in rows)
    assert (candidates, repurchased) == (1345, 414)

    baseline = repurchased / candidates
    assert f"{baseline:.1%}" in text
    needed = next(n for n in range(100, 4000) if b.mde(baseline, n, 0.3) <= b.TARGET)
    assert needed == 3185
    assert f"{needed:,}명" in text
    assert f"{b.mde(baseline, candidates, 0.3) * 100:.1f}%p" in text
