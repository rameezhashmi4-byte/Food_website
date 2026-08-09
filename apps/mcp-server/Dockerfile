# BiteJoy MCP server - production image.
#
# This is an npm-workspaces monorepo, so @bitejoy/core and @bitejoy/database
# must be present (and built to their own dist/) for this app's compiled
# output to resolve them at runtime - see their package.json "main"/"exports"
# fields. That means the build context MUST be the REPO ROOT, not this
# directory:
#
#   docker build -f apps/mcp-server/Dockerfile -t bitejoy-mcp-server .
#
# Railway/Fly.io monorepo support both handle this the same way: point the
# platform's "Dockerfile path" at apps/mcp-server/Dockerfile while leaving
# the build context/root at the repo root (see fly.toml and railway.json
# at the repo root, which are already wired up this way).
#
# Not build/live-tested against a real Docker daemon in the environment
# this was written in (Docker Desktop wasn't running) - reviewed carefully
# against this repo's actual build/runtime resolution, but worth watching
# the first real build log closely.

FROM node:24-slim AS build
WORKDIR /repo

COPY . .
RUN npm ci

# Built in dependency order, not via `--workspaces`, so a resolution
# failure points at exactly one package instead of an ambiguous batch.
RUN npm run build -w @bitejoy/core
RUN npm run build -w @bitejoy/database
RUN npm run build -w @bitejoy/mcp-server

FROM node:24-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
# Deliberately not a hand-pruned node_modules (workspace hoisting makes
# that fiddly to get right) - copies the whole built repo forward. Bigger
# than a minimal image, correct by construction.
COPY --from=build /repo /repo

WORKDIR /repo/apps/mcp-server
EXPOSE 3333
CMD ["node", "dist/http.js"]
