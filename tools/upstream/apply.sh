#!/bin/bash
# apply.sh PATCH — 3-way apply of a renamed upstream patch from the repo root; files that cannot apply are retried
# with --reject (a .rej is left to port by hand). Prints conflicts and leftovers.
set -u
cd "$(git rev-parse --show-toplevel)"
P="$1"
X=(--exclude=CHANGELOG.md --exclude='packaging/*' --exclude='docs/*' --exclude=README.md --exclude=setup.ps1 --exclude=setup.sh
   --exclude=CONTRIBUTING.md --exclude=ROADMAP.md --exclude='.github/*')
out=$(git apply --3way "${X[@]}" "$P" 2>&1)
bad=$(echo "$out" | grep -oE "error: ([^:]+): (patch does not apply|does not exist in index)" | sed -E 's/error: ([^:]+): .*/\1/' | sort -u)
if [ -n "$bad" ]; then
  ex=(); for b in $bad; do ex+=(--exclude="$b"); done
  git apply --3way "${X[@]}" "${ex[@]}" "$P" 2>&1 | grep -E "conflicts|error"
  for b in $bad; do if [ -f "$b" ]; then git apply --reject --include="$b" "$P" 2>&1 | grep -E "Rejected|Applied hunk"; else echo "MISSING $b"; fi; done
else echo "$out" | grep -E "conflicts|error"; fi
git status --short | grep -E "^(UU|U |.U)"
git ls-files --others --exclude-standard | grep "\.rej$" || true
