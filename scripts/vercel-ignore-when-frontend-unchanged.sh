#!/usr/bin/env sh
# Vercel "Ignored Build Step": exit 0 = skip deployment, exit 1 = build.
# https://vercel.com/docs/project-configuration#ignorecommand
#
# Skips the SPA build when the commit only touches paths outside the frontend
# workspace (e.g. server-only changes).

if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  exit 1
fi

prev="${VERCEL_GIT_PREVIOUS_SHA}"
cur="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if git diff --quiet "${prev}" "${cur}" -- \
  package.json \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  vercel.json \
  index.html \
  vite.config.ts \
  postcss.config.mjs \
  tsconfig.json \
  src \
  public \
  packages
then
  exit 0
fi

exit 1
