#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: export_catalog_snapshot.py <base_url> <output_json>")
        return 1
    base_url = sys.argv[1].rstrip("/")
    output_path = Path(sys.argv[2]).expanduser()
    with urllib.request.urlopen(f"{base_url}/api/crm/catalog/items?tradeType=electro", timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    items = data.get("items", [])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(items)} items to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
