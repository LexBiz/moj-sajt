#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

from pypdf import PdfReader


PHASE_ORDER = {
    "grooves": 10,
    "boxes": 20,
    "cables": 30,
    "switchboards": 40,
    "outlets": 50,
    "other": 60,
    "completion": 70,
    "revision": 80,
    "demolition": 90,
    "hourly": 100,
    "systems": 110,
}


def normalize_price(raw: str) -> float:
    text = raw.replace("Kč", "").replace(" ", "").replace("\xa0", "").replace(",", ".").strip()
    if text.startswith("2."):
        # Broken extraction for m2 prices like "2 25,30 Kč" -> "225,30"
        text = text.replace(".", "", 1)
    return round(float(text), 2)


def classify_item(description: str, unit: str) -> tuple[bool, str, str]:
    text = description.lower()
    text = text.replace("ﬂ", "fl").replace("ﬁ", "fi")
    if unit == "hod" or "hodinová sazba" in text:
        return True, "hourly", "Hodinové sazby"
    if "demontáž" in text:
        return True, "demolition", "Demontážní práce"
    if any(x in text for x in ["sekání", "dráž", "výřez", "vrtání", "vykrouž", "fréz", "kapsy pro", "rozměření", "prostup", "vývrt", "otvor"]):
        return True, "grooves", "Sekání, drážky a kapsy"
    if any(x in text for x in ["krabice", "rozvodka"]):
        return True, "boxes", "Krabice a rozvodky"
    if any(x in text for x in ["kabel", "vodič", "utp", "koax", "trubka", "hadice", "lišta", "kanál", "žlab", "ochranná", "páska", "uchycení kabel", "protahování", "zemnící", "zemnicí"]):
        return True, "cables", "Tahání kabelů a trasy"
    if any(x in text for x in ["rozvadě", "rozvodnice", "jistič", "chránič", "svodič", "stykač", "relé", "transform", "napáječ", "pojist", "sběrnic", "svorkovnic"]):
        return True, "switchboards", "Rozvaděče a jištění"
    if any(x in text for x in ["zásuv", "vypína", "přepína", "stmíva", "termostat", "spínač", "ovladač", "tlačítk", "tv+sat", "datová", "rj45", "čidlo pohybu", "detektor"]):
        return True, "outlets", "Zásuvky, vypínače a ovladače"
    if any(x in text for x in ["svítid", "osvět", "led", "nouzové světlo", "rámeček", "kryt", "štítek", "popis", "zakrytí", "odkrytí", "sádrování kabel"]):
        return True, "completion", "Kompletace a dokončení"
    if any(x in text for x in ["revize", "měření", "zkouš", "kontrola", "oživení", "nastavení"]):
        return True, "revision", "Revize a měření"
    if unit in {"soubor", "sada", "komplet"} or any(x in text for x in ["systém", "celek", "soubor", "sada", "komplet"]):
        return True, "systems", "Elektrikářské celky"
    return True, "other", "Ostatní elektro práce"


def parse_pdf_items(pdf_path: Path) -> list[dict]:
    reader = PdfReader(str(pdf_path))
    text = " ".join((page.extract_text() or "") for page in reader.pages)
    text = re.sub(r"--\s*\d+\s*of\s*\d+\s*--", " ", text)
    text = re.sub(r"Kód\s+Popis\s+MJ\s+Cena", " ", text)
    text = re.sub(r"\s+", " ", text)
    pattern = re.compile(r"(741\d{6})\s+(.*?)\s+(m|kus|ks|soubor|sada|komplet|pár|hod|kpl|mj)\s+([\d\s]+,\d{2}\s*Kč)")

    items: list[dict] = []
    for idx, match in enumerate(pattern.finditer(text), start=1):
        code, description, unit, price = match.groups()
        is_active, nav_key, subcategory = classify_item(description, unit.strip())
        items.append(
            {
                "sourceCode": code,
                "tradeType": "electro",
                "buildingType": None,
                "phaseKey": nav_key,
                "categoryKey": nav_key,
                "subcategoryKey": subcategory,
                "itemName": description.strip(),
                "itemDescription": f"Import z elektro katalogu PDF · kód {code}",
                "unit": unit.strip(),
                "basePrice": normalize_price(price),
                "currency": "CZK",
                "sortOrder": PHASE_ORDER[nav_key] * 100000 + idx,
                "isActive": is_active,
                "metadata": {
                    "source": "pdf_full_electro_catalog",
                    "code": code,
                    "importTag": "electro_master_catalog_v1",
                    "navCategory": nav_key,
                },
            }
        )
    return items


def post_json(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: import_electro_catalog_from_pdf.py <pdf_path> <base_url>")
        return 1
    pdf_path = Path(sys.argv[1]).expanduser()
    base_url = sys.argv[2].rstrip("/")
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        return 1

    items = parse_pdf_items(pdf_path)
    print(f"Parsed items: {len(items)}")
    if not items:
        return 1

    batch_size = 250
    imported = 0
    for i in range(0, len(items), batch_size):
      batch = items[i:i + batch_size]
      result = post_json(f"{base_url}/api/crm/catalog/import", {"source": "electro_pdf", "tradeType": "electro", "items": batch})
      imported += int(result.get("count", 0))
      print(f"Imported batch {i // batch_size + 1}: {result.get('count', 0)}")

    print(f"Imported total: {imported}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
