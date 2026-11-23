# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
FROM ${NODE_IMAGE} AS build
ENV CI=true ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends musl-tools && rm -rf /var/lib/apt/lists/*
WORKDIR /source
COPY . .
ARG DSH_BUILD_COMMIT
ENV DSH_CLIENT_COMMIT_HASH=${DSH_BUILD_COMMIT} DSH_GATE_CONCURRENCY=1
RUN corepack enable && corepack prepare pnpm@11.28.5 --activate
RUN --mount=type=cache,id=hqzy-team-pnpm,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile
RUN pnpm exec tsx native/system/scripts/build.ts && pnpm run build:artifacts && pnpm run build:check
RUN pnpm --filter dsh-python-runtime-closure deploy --prod --legacy --config.allow-unused-patches=true --config.node-linker=hoisted --config.auto-install-peers=false --config.link-workspace-packages=true --config.hoist-workspace-packages=false /opt/dsh
RUN pnpm install --offline --frozen-lockfile --prod=false --ignore-scripts && node --import tsx/esm deployments/team/stage.ts && chmod -R a+rX /opt/dsh
RUN DSH_HOME=/tmp/team-image-smoke node /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile team-worker --help && DSH_HOME=/tmp/team-image-smoke node /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile team --help

FROM ${NODE_IMAGE} AS worker
RUN apt-get update && apt-get install -y --no-install-recommends bash git curl ca-certificates ripgrep procps python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=build /opt/dsh /opt/dsh
COPY deployments/team/worker-entrypoint.sh /usr/local/bin/hqzy-worker
RUN mkdir -p /home/node/.dsh /workspace && chown node:node /home/node/.dsh /workspace && chmod 755 /usr/local/bin/hqzy-worker
USER node
WORKDIR /workspace
ENV DSH_HOME=/home/node/.dsh NODE_ENV=production NARB_DISABLE_NATIVE_CACHE=1
RUN node --input-type=module -e 'await import("/opt/dsh/node_modules/@deepseek-ai/cordis/lib/index.js")' \
  && DSH_HOME=/tmp/team-worker-image-smoke node /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile team-worker --help \
  && rm -rf /tmp/team-worker-image-smoke
ENTRYPOINT ["/usr/local/bin/hqzy-worker"]

FROM docker:29.6.2-cli AS docker-cli
FROM ${NODE_IMAGE} AS gateway
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=build /opt/dsh /opt/dsh
COPY deployments/team/gateway-entrypoint.sh /usr/local/bin/hqzy-gateway
RUN chmod 755 /usr/local/bin/hqzy-gateway
ENV DSH_HOME=/var/lib/hqzy/profile NODE_ENV=production NARB_DISABLE_NATIVE_CACHE=1
ENTRYPOINT ["/usr/local/bin/hqzy-gateway"]
