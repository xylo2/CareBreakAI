# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Dict, List

ROOT_DIR: Path = Path(__file__).resolve().parent.parent
DIST_DIR: Path = ROOT_DIR / "dist"
GECKO_ID: str = "carebreak@iclore.fr"
GECKO_MIN_VERSION: str = "109.0"

INCLUDE_FILES: List[str] = [
    "background.js",
    "care_break_ui.js",
    "care_break.js",
    "content.js",
    "popup.html",
    "popup.js",
    "styles.css",
    "LICENSE",
]


def build_firefox_manifest(base_manifest: Dict[str, object]) -> Dict[str, object]:
    ff_manifest: Dict[str, object] = dict(base_manifest)
    ff_manifest["background"] = {"scripts": ["background.js"]}
    ff_manifest["browser_specific_settings"] = {
        "gecko": {
            "id": GECKO_ID,
            "strict_min_version": GECKO_MIN_VERSION,
        }
    }
    return ff_manifest


def collect_extension_assets(root_dir: Path) -> List[Path]:
    assets: List[Path] = []
    for rel in INCLUDE_FILES:
        fpath = root_dir / rel
        if fpath.is_file():
            assets.append(fpath)
    for folder in ("icons", "_locales"):
        base = root_dir / folder
        if base.is_dir():
            for p in sorted(base.rglob("*")):
                if p.is_file():
                    assets.append(p)
    return assets


def write_zip(zip_path: Path, root_dir: Path, manifest_obj: Dict[str, object]) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    assets = collect_extension_assets(root_dir)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest_obj, indent=2, ensure_ascii=False) + "\n")
        for asset in assets:
            arcname = asset.relative_to(root_dir).as_posix()
            zf.write(asset, arcname)


def build_all(root_dir: Path = ROOT_DIR, dist_dir: Path = DIST_DIR) -> Dict[str, Path]:
    manifest_path = root_dir / "manifest.json"
    base_manifest: Dict[str, object] = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = str(base_manifest.get("version", "1.0.0"))

    chrome_zip = dist_dir / f"carebreak-chrome-v{version}.zip"
    firefox_zip = dist_dir / f"carebreak-firefox-v{version}.zip"

    write_zip(chrome_zip, root_dir, base_manifest)
    write_zip(firefox_zip, root_dir, build_firefox_manifest(base_manifest))
    return {"chrome": chrome_zip, "firefox": firefox_zip}


if __name__ == "__main__":
    outputs = build_all()
    for target, out_path in outputs.items():
        print(f"[{target}] Package généré : {out_path}")
