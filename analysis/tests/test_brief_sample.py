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


def test_brief_uses_result_numbers():
    text = BRIEF.read_text(encoding="utf-8")
    for row in R["by_holdout"]:
        assert f"{row['mde_1_autumn'] * 100:.1f}%p" in text
        assert f"{row['rounds_target']}회차" in text
