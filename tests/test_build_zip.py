# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import json
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT_DIR: Path = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from tools.build_zip import build_all
from tools.fix_urls import get_canonical_urls, repair_repo_urls
from tools.generate_store_assets import generate_all


class TestBuildZip(unittest.TestCase):
    def test_build_chrome_and_firefox_packages(self) -> None:
        with tempfile.TemporaryDirectory(prefix="cb_dist_") as tmp_dir:
            outputs = build_all(root_dir=ROOT_DIR, dist_dir=Path(tmp_dir))
            chrome_zip = outputs["chrome"]
            firefox_zip = outputs["firefox"]
            self.assertTrue(chrome_zip.is_file())
            self.assertTrue(firefox_zip.is_file())

            with zipfile.ZipFile(chrome_zip, "r") as zf_cr:
                names_cr = set(zf_cr.namelist())
                self.assertIn("manifest.json", names_cr)
                self.assertIn("care_break_ui.js", names_cr)
                self.assertIn("care_break.js", names_cr)
                self.assertIn("_locales/fr/messages.json", names_cr)
                self.assertNotIn("tests/test_build_zip.py", names_cr)
                manifest_cr = json.loads(zf_cr.read("manifest.json").decode("utf-8"))
                self.assertEqual(manifest_cr["background"], {"service_worker": "background.js"})
                self.assertNotIn("browser_specific_settings", manifest_cr)

            with zipfile.ZipFile(firefox_zip, "r") as zf_ff:
                manifest_ff = json.loads(zf_ff.read("manifest.json").decode("utf-8"))
                self.assertEqual(manifest_ff["background"], {"scripts": ["background.js"]})
                gecko = manifest_ff["browser_specific_settings"]["gecko"]
                self.assertEqual(gecko["id"], "carebreak@iclore.fr")
                self.assertEqual(gecko["strict_min_version"], "109.0")

    def test_generate_store_assets_dimensions(self) -> None:
        with tempfile.TemporaryDirectory(prefix="cb_assets_") as tmp_dir:
            assets = generate_all(out_dir=Path(tmp_dir))
            logo_bytes = assets["edge_logo"].read_bytes()
            tile_bytes = assets["small_tile"].read_bytes()
            shot_bytes = assets["screenshot"].read_bytes()
            self.assertTrue(logo_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
            self.assertTrue(shot_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
            self.assertEqual(struct.unpack(">II", logo_bytes[16:24]), (300, 300))
            self.assertEqual(struct.unpack(">II", tile_bytes[16:24]), (440, 280))
            self.assertEqual(struct.unpack(">II", shot_bytes[16:24]), (1280, 800))

    def test_repair_repo_urls_markdown_and_json(self) -> None:
        repo_url, privacy_url, _, _ = get_canonical_urls()
        with tempfile.TemporaryDirectory(prefix="cb_urls_") as tmp_dir:
            tmp_root = Path(tmp_dir)
            gh_base = "https" + "://" + "github" + ".com"
            raw_base = "https" + "://" + "github" + "usercontent.com"
            (tmp_root / "manifest.json").write_text(
                json.dumps({"version": "1.2.2", "homepage_url": gh_base}),
                encoding="utf-8",
            )
            (tmp_root / "README.md").write_text(
                f"[![CI & Release Packages]({gh_base})]({gh_base})\n"
                f"git clone {gh_base}.git\n"
                f"**Version** : `1.2.0` — carebreak-chrome-v1.2.0.zip\n"
                f"Privacy: {raw_base}\n"
                f"End.\n### Detailed Description\n",
                encoding="utf-8",
            )

            first_run = repair_repo_urls(root_dir=tmp_root)
            self.assertEqual(first_run["manifest.json"], 1)
            self.assertEqual(first_run["README.md"], 1)

            manifest_data = json.loads((tmp_root / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest_data["homepage_url"], repo_url)

            readme_text = (tmp_root / "README.md").read_text(encoding="utf-8")
            self.assertIn(f"{repo_url}.git", readme_text)
            self.assertIn("carebreak-chrome-v1.2.2.zip", readme_text)
            self.assertIn("**Version** : `1.2.2`", readme_text)
            self.assertIn(privacy_url, readme_text)
            self.assertIn("End.\n\n### Detailed Description", readme_text)

            second_run = repair_repo_urls(root_dir=tmp_root)
            self.assertEqual(second_run["manifest.json"], 0)
            self.assertEqual(second_run["README.md"], 0)


if __name__ == "__main__":
    unittest.main()
