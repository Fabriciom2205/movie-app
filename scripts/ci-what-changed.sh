#!/usr/bin/env bash
# Which parts of the CI/CD pipeline does this change need?
# Used by the "What changed" job in .github/workflows/ci.yml. Writes
#   database=true|false    run the migrations + RLS tests?
#   migrations=true|false  apply migrations to production?
# to $GITHUB_OUTPUT (or prints them when run locally).
#
# Compared against:
#   - a pull request: its base commit (BASE_SHA)
#   - a push to main: the commit of the last CI/CD run on main that fully
#     succeeded (tests passed, production migrated, app deployed). Not just the
#     previous commit: if a run failed, its changes get checked again next time.
# When anything is unclear (no earlier success, an API error, a commit that
# isn't in the checkout), the answer is "run everything".
#
# Try it locally: BASE_SHA=<commit> HEAD_SHA=<commit> bash scripts/ci-what-changed.sh

set -uo pipefail

out="${GITHUB_OUTPUT:-/dev/stdout}"
head="${HEAD_SHA:-HEAD}"

everything() {
  echo "$1 Running everything."
  echo "database=true" >>"$out"
  echo "migrations=true" >>"$out"
  exit 0
}

base="${BASE_SHA:-}"
if [ -z "$base" ]; then
  base=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=1" \
    --jq '.workflow_runs[0].head_sha // empty' 2>/dev/null) || base=""
fi
[ -n "$base" ] || everything "No earlier successful run to compare with."
git cat-file -e "$base^{commit}" 2>/dev/null || everything "Commit $base isn't in this checkout."

changed=$(git diff --name-only "$base" "$head") || everything "Couldn't compare with $base."
echo "Changed since $base:"
echo "${changed:-  (nothing)}" | sed 's/^/  /'

# The database checks matter when the schema or its tests change, or anything
# that runs them: the test runner, this script, the Supabase CLI version (in
# the package files) or the pipeline itself.
db_paths='^(supabase/|scripts/run-db-tests\.mjs$|scripts/ci-what-changed\.sh$|package(-lock)?\.json$|\.github/workflows/)'
if grep -qE "$db_paths" <<<"$changed"; then database=true; else database=false; fi
if grep -q '^supabase/migrations/' <<<"$changed"; then migrations=true; else migrations=false; fi

echo "database=$database" >>"$out"
echo "migrations=$migrations" >>"$out"
echo "Database checks: $database. Production migrations: $migrations."
