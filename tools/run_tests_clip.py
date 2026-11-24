# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

ROOT_DIR: Path = Path(__file__).resolve().parent.parent


class ClipboardTestRunner:
    """
    Exécute la suite de tests Node.js de l'extension, calcule la couverture V8
    des lignes non couvertes, écrit les rapports optionnels et copie le bilan.
    """

    def __init__(self, project_root: Path, use_clipboard: bool = True) -> None:
        self.project_root: Path = project_root
        self.use_clipboard: bool = use_clipboard

    @staticmethod
    def find_node_binary(root_dir: Path) -> Optional[str]:
        venv_candidates: List[Path] = [
            Path(sys.executable).resolve().parent / "node.exe",
            root_dir / ".venv" / "Scripts" / "node.exe",
            root_dir / ".venv" / "bin" / "node",
        ]
        for path in venv_candidates:
            if path.is_file():
                return str(path)
        in_path: Optional[str] = shutil.which("node")
        if in_path:
            return in_path
        for env_var in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA", "APPDATA"):
            base: Optional[str] = os.environ.get(env_var)
            if base:
                root = Path(base)
                for sub in ("nodejs/node.exe", "Programs/nodejs/node.exe", "nvm/current/node.exe"):
                    cand = root / sub
                    if cand.is_file():
                        return str(cand)
        return None

    @staticmethod
    def copy_to_clipboard(text: str) -> bool:
        if not text:
            return False
        if os.name == "nt":
            ps_script: str = (
                "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; "
                "$txt = [Console]::In.ReadToEnd(); "
                "Set-Clipboard -Value $txt"
            )
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_script],
                input=text.encode("utf-8"),
                check=False,
            )
            return proc.returncode == 0
        cmd: List[str] = ["pbcopy"] if sys.platform == "darwin" else ["xclip", "-selection", "clipboard"]
        try:
            proc = subprocess.run(cmd, input=text, text=True, encoding="utf-8", check=False)
            return proc.returncode == 0
        except FileNotFoundError:
            return False

    @staticmethod
    def _format_line_ranges(lines: List[int]) -> str:
        if not lines:
            return ""
        sorted_lines: List[int] = sorted(set(lines))
        it = iter(sorted_lines)
        start: int = next(it)
        prev: int = start
        ranges: List[str] = []
        for num in it:
            if num == prev + 1:
                prev = num
            else:
                ranges.append(f"{start}-{prev}" if start != prev else str(start))
                start = prev = num
        ranges.append(f"{start}-{prev}" if start != prev else str(start))
        return ", ".join(ranges)
    def _parse_v8_coverage(self, cov_dir: str, ext_dir: Path) -> Tuple[List[str], str]:
        ext_real: str = os.path.normcase(os.path.realpath(str(ext_dir)))
        hit_by_file: Dict[str, Set[int]] = {}
        exec_by_file: Dict[str, Set[int]] = {}
        for entry in os.listdir(cov_dir):
            if not entry.endswith(".json"):
                continue
            try:
                data = json.loads(Path(cov_dir, entry).read_text(encoding="utf-8"))
            except Exception:
                continue
            for script in data.get("result", []):
                raw_url: str = str(script.get("url", ""))
                if not raw_url.startswith("file:///"):
                    continue
                local_p: str = os.path.normcase(os.path.realpath(raw_url[8:].replace("/", os.sep)))
                if not local_p.startswith(ext_real + os.sep) or f"{os.sep}tests{os.sep}" in local_p or not os.path.isfile(local_p):
                    continue
                text: str = Path(local_p).read_text(encoding="utf-8", errors="replace")
                line_starts: List[int] = list((0,)) + [m.end() for m in re.finditer(r"\n", text)]
                all_code_lines: Set[int] = set()
                missed_in_script: Set[int] = set()
                for idx, off in enumerate(line_starts):
                    end_off: int = line_starts[idx + 1] if idx + 1 < len(line_starts) else len(text)
                    ln_txt: str = text[off:end_off].strip()
                    if ln_txt and not ln_txt.startswith(("//", "/*", "*")) and ln_txt not in ("{", "}", "});"):
                        all_code_lines.add(idx + 1)
                exec_by_file.setdefault(local_p, set()).update(all_code_lines)
                for fn_cov in script.get("functions", []):
                    for rng in fn_cov.get("ranges", []):
                        if rng.get("count", 0) == 0:
                            s_off, e_off = rng.get("startOffset", 0), rng.get("endOffset", 0)
                            for ln_no in all_code_lines:
                                off = line_starts[ln_no - 1]
                                end_off = line_starts[ln_no] if ln_no < len(line_starts) else len(text)
                                if end_off > s_off and off < e_off:
                                    missed_in_script.add(ln_no)
                hit_by_file.setdefault(local_p, set()).update(all_code_lines - missed_in_script)
        uncov_out: List[str] = []
        tot_lines: int = sum(len(s) for s in exec_by_file.values())
        tot_missed: int = 0
        for norm_p, all_set in sorted(exec_by_file.items()):
            missed_set: Set[int] = all_set - hit_by_file.get(norm_p, set())
            tot_missed += len(missed_set)
            rel_p: str = os.path.relpath(norm_p, str(ext_dir)).replace("\\", "/")
            pct: int = int(round(100 * (len(all_set) - len(missed_set)) / max(1, len(all_set))))
            if missed_set:
                uncov_out.append(f"- {rel_p} ({pct}%) : lignes {self._format_line_ranges(sorted(missed_set))}")
            else:
                uncov_out.append(f"- {rel_p} (100%)")
        global_pct: int = int(round(100 * (tot_lines - tot_missed) / max(1, tot_lines))) if tot_lines else 0
        return uncov_out, f"Couverture : {global_pct}%"

    def _stream_subprocess(self, cmd: List[str], cwd: Path, env: dict) -> Tuple[int, str]:
        proc = subprocess.Popen(cmd, cwd=str(cwd), env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        lines_out: List[str] = []
        assert proc.stdout is not None
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            lines_out.append(line)
        return proc.wait(), "".join(lines_out).strip()

    def _run_python_tests(self) -> Tuple[int, str]:
        py_tests: List[Path] = sorted((self.project_root / "tests").glob("test_*.py"))
        if not py_tests:
            return 0, ""
        cmd: List[str] = [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py", "-v"]
        rc, out = self._stream_subprocess(cmd, cwd=self.project_root, env=dict(os.environ))
        summary: List[str] = [ln.strip() for ln in out.splitlines() if ln.strip().startswith(("Ran ", "OK"))]
        return rc, f"[Python] {' | '.join(summary) if summary else 'OK'}" if rc == 0 else f"[Python] ÉCHEC :\n{out}"

    def run(self, report_file: str = "", coverage_file: str = "") -> int:
        node_exe: Optional[str] = self.find_node_binary(self.project_root)
        if not node_exe:
            print("Node.js introuvable (.venv ou PATH).", file=sys.stderr)
            return 1
        test_files: List[str] = [str(p) for p in sorted((self.project_root / "tests").glob("*.test.js"))]
        if not test_files:
            print("Aucun fichier de test trouvé dans tests/.", file=sys.stderr)
            return 1
        py_rc, py_report = self._run_python_tests()
        with tempfile.TemporaryDirectory(prefix="cov_v8_") as cov_dir:
            env = {**os.environ, "NODE_V8_COVERAGE": cov_dir}
            rc, combined = self._stream_subprocess([node_exe, "--test", *test_files], cwd=self.project_root, env=env)
            uncovered, cov_badge = self._parse_v8_coverage(cov_dir, self.project_root)
        summary: List[str] = [ln.strip() for ln in combined.splitlines() if ln.strip().startswith("# ")]
        js_report: str = (
            f"[CareBreakAI] {' | '.join(summary) if summary else 'OK'} ({cov_badge})"
            if rc == 0 else f"[CareBreakAI] ÉCHEC :\n{combined}"
        )
        final_output: str = "\n".join(part for part in (py_report, js_report) if part).strip()
        overall_rc: int = py_rc or rc
        print(f"\n{final_output}")
        if uncovered:
            print("\n".join(uncovered))
        if report_file:
            Path(report_file).write_text(final_output, encoding="utf-8")
        if coverage_file:
            Path(coverage_file).write_text("\n".join(uncovered).strip(), encoding="utf-8")
        if self.use_clipboard and self.copy_to_clipboard(final_output):
            print("[PRESSE-PAPIERS] Résumé copié.", flush=True)
        return overall_rc


def main() -> int:
    use_clip: bool = "--no-clipboard" not in sys.argv
    report_file: str = ""
    coverage_file: str = ""
    if "--report-file" in sys.argv:
        idx_arg: int = sys.argv.index("--report-file")
        if idx_arg + 1 < len(sys.argv):
            report_file = sys.argv[idx_arg + 1]
    if "--coverage-file" in sys.argv:
        idx_cov: int = sys.argv.index("--coverage-file")
        if idx_cov + 1 < len(sys.argv):
            coverage_file = sys.argv[idx_cov + 1]
    return ClipboardTestRunner(project_root=ROOT_DIR, use_clipboard=use_clip).run(report_file=report_file, coverage_file=coverage_file)


if __name__ == "__main__":
    raise SystemExit(main())
