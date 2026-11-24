# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

ROOT_DIR: Path = Path(__file__).resolve().parent.parent
MD_FILES: List[str] = ["README.md", "STORE_LISTING.md", "STORE_LISTINGS_ALL.md"]
JSON_FILES: List[str] = ["manifest.json"]


def get_canonical_urls() -> Tuple[str, str, str, str]:
    scheme: str = "https" + "://"
    gh: str = scheme + "github" + ".com"
    raw_gh: str = scheme + "raw." + "github" + "usercontent.com"
    repo: str = gh + "/xylo2/CareBreakAI"
    privacy: str = raw_gh + "/xylo2/CareBreakAI/main/PRIVACY.md"
    badge: str = repo + "/actions/workflows/ci.yml/badge.svg"
    ci_url: str = repo + "/actions/workflows/ci.yml"
    return repo, privacy, badge, ci_url


def get_manifest_version(root_dir: Path = ROOT_DIR) -> str:
    manifest_path: Path = root_dir / "manifest.json"
    if not manifest_path.is_file():
        return "1.2.2"
    data: Dict[str, object] = json.loads(manifest_path.read_text(encoding="utf-8"))
    return str(data.get("version", "1.2.2"))


def repair_repo_urls(root_dir: Path = ROOT_DIR) -> Dict[str, int]:
    repo, privacy, badge, ci_url = get_canonical_urls()
    version: str = get_manifest_version(root_dir)
    scheme: str = "https" + "://"
    gh: str = scheme + "github" + ".com"
    updated: Dict[str, int] = {}

    for rel_path in MD_FILES:
        md_path: Path = root_dir / rel_path
        if not md_path.is_file():
            continue
        original: str = md_path.read_text(encoding="utf-8")
        content: str = original
        content = content.replace(f"[![CI & Release Packages]({gh})]({gh})", f"[![CI & Release Packages]({badge})]({ci_url})")
        content = re.sub(r"https://(?::/+)?(?:raw\.)?githubusercontent\.com(?:/xylo2/CareBreakAI/main/PRIVACY\.md)?", privacy, content)
        content = re.sub(r"https://github\.com(?:/xylo2/CareBreakAI)*(\.git|\)|`|\b)", rf"{repo}\1", content)
        content = content.replace(".\n### Detailed Description", ".\n\n### Detailed Description")
        content = re.sub(r"carebreak-(chrome|firefox)-v\d+\.\d+\.\d+\.zip", rf"carebreak-\1-v{version}.zip", content)
        content = re.sub(r"(\*\*Version\*\* : `)\d+\.\d+\.\d+(`)", rf"\g<1>{version}\2", content)
        if content != original:
            md_path.write_text(content, encoding="utf-8")
            updated[rel_path] = 1
        else:
            updated[rel_path] = 0

    for rel_json in JSON_FILES:
        json_path: Path = root_dir / rel_json
        if not json_path.is_file():
            continue
        original_json: str = json_path.read_text(encoding="utf-8")
        fixed_json: str = re.sub(r'"(https://github\.com)(?:/xylo2/CareBreakAI)*"', rf'"{repo}"', original_json)
        if fixed_json != original_json:
            json_path.write_text(fixed_json, encoding="utf-8")
            updated[rel_json] = 1
        else:
            updated[rel_json] = 0

    return updated


if __name__ == "__main__":
    for fname, changed in repair_repo_urls().items():
        print(f"[fix_urls] {fname} : {'mis à jour' if changed else 'OK'}")
