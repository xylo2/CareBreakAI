# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR: Path = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from tools.fix_urls import repair_repo_urls

DIST_DIR: Path = ROOT_DIR / "dist"

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

INCLUDE_DIRS: List[str] = [
    "icons",
    "_locales",
]


def load_base_manifest(root_dir: Path = ROOT_DIR) -> Dict[str, Any]:
    manifest_path = root_dir / "manifest.json"
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def make_firefox_manifest(base_manifest: Dict[str, Any]) -> Dict[str, Any]:
    ff_manifest: Dict[str, Any] = json.loads(json.dumps(base_manifest))
    ff_manifest["background"] = {"scripts": ["background.js"]}
    ff_manifest["browser_specific_settings"] = {
        "gecko": {
            "id": "carebreak@iclore.fr",
            "strict_min_version": "109.0",
        }
    }
    return ff_manifest


def write_extension_zip(zip_path: Path, manifest_data: Dict[str, Any], root_dir: Path = ROOT_DIR) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest_data, ensure_ascii=False, indent=2) + "\n")
        for rel_file in INCLUDE_FILES:
            src_file = root_dir / rel_file
            if src_file.is_file():
                zf.write(src_file, arcname=rel_file)
        for rel_dir in INCLUDE_DIRS:
            src_dir = root_dir / rel_dir
            if not src_dir.is_dir():
                continue
            for item in sorted(src_dir.rglob("*")):
                if item.is_file():
                    zf.write(item, arcname=item.relative_to(root_dir).as_posix())


def build_all(root_dir: Path = ROOT_DIR, dist_dir: Path = DIST_DIR) -> Dict[str, Path]:
    repair_repo_urls(root_dir)
    base_manifest = load_base_manifest(root_dir)
    version = str(base_manifest.get("version", "1.0.0"))

    chrome_zip = dist_dir / f"carebreak-chrome-v{version}.zip"
    firefox_zip = dist_dir / f"carebreak-firefox-v{version}.zip"

    write_extension_zip(chrome_zip, base_manifest, root_dir)
    write_extension_zip(firefox_zip, make_firefox_manifest(base_manifest), root_dir)

    return {"chrome": chrome_zip, "firefox": firefox_zip}


if __name__ == "__main__":
    outputs = build_all()
    for target, path in outputs.items():
        print(f"[{target}] Archive générée : {path}")
