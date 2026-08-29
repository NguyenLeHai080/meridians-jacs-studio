#!/usr/bin/env python3
"""Export the current FastAPI contract for frontend/client generation."""

import json
from pathlib import Path

from app.main import app


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "openapi.json"
    target.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {target}")
