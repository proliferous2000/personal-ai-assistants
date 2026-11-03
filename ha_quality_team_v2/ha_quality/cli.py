"""Usage: python -m ha_quality.cli examples/ortho_vte.json
          python -m ha_quality.cli --survey examples/internal_survey_ortho_vte.json
"""
import json
import sys
from pathlib import Path
from .workflow import create_quality_plan, PrivacyReviewRequired
from .survey import create_survey_plan


def main() -> int:
    args = sys.argv[1:]
    if len(args) == 1:
        mode, filename = "quality", args[0]
    elif len(args) == 2 and args[0] == "--survey":
        mode, filename = "survey", args[1]
    else:
        print("Usage: python -m ha_quality.cli [--survey] <deidentified-case.json>",file=sys.stderr)
        return 2
    try:
        data = json.loads(Path(filename).read_text(encoding="utf-8"))
        result = create_survey_plan(data) if mode == "survey" else create_quality_plan(data)
    except (ValueError, TypeError, OSError, PrivacyReviewRequired) as exc:
        print(f"Input/review error: {exc}",file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
