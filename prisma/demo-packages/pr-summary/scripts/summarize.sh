#!/usr/bin/env bash
# Summarize a PR diff into a concise changelog entry.
set -euo pipefail

BASE="${1:-HEAD~1}"
git --no-pager diff "$BASE"...HEAD
