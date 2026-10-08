# Vendored: UI UX Pro Max

This folder is a pinned copy of a third-party skill, not code we wrote.

- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  (folder `.claude/skills/ui-ux-pro-max/`)
- Commit: `1a2c459b35f2` (2026-10-08). Copied 2026-10-08.
- License: MIT, see `LICENSE` in this folder.
- Copied: everything the skill needs at run time (`SKILL.md`, `references/`,
  `data/`, `scripts/search.py`, `core.py`, `design_system.py`,
  `reasoning_contract.py`): 46 files, 3.3 MB, sizes checked against GitHub.
- Left out: the upstream test suite (`scripts/tests/`) and the maintainers'
  data checker (`scripts/validate_data.py`).
- Reviewed before adding: the run-time Python only imports the standard
  library (no network, no subprocesses, no installs); it writes files only with
  `--persist`, into `design-system/` (we don't use that: our
  `design-system/movie-night/MASTER.md` is maintained by hand).

How it's used here: see `.claude/skills/frontend-design/SKILL.md`. Run it from
the repo root:

    python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux

Updating: replace this folder from a newer commit in its own PR, re-run the
review above, and read the diff of `SKILL.md`. Don't edit files in here;
project-specific rules belong in the frontend-design skill.
