FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /workspace
ENV HUSKY=0 CI=true NX_DAEMON=false NX_ISOLATE_PLUGINS=false NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.24.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/notifications-runtime/package.json ./packages/notifications-runtime/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build api --configuration=production && pnpm exec nx build worker
RUN pnpm --filter @pettly/api deploy --prod --legacy /runtime
RUN node -e "const fs=require('fs'),path=require('path');const source=path.dirname(require.resolve('.prisma/client/default',{paths:[path.dirname(require.resolve('@prisma/client'))]}));const target=path.resolve(path.dirname(require.resolve('@prisma/client',{paths:['/runtime']})),'../../.prisma/client');fs.cpSync(source,target,{recursive:true})"

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=node:node /runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=build --chown=node:node /workspace/apps/worker/dist/main.js ./dist/worker.js
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./prisma
COPY --from=build --chown=node:node /workspace/scripts/ops ./scripts/ops
USER node
EXPOSE 3000
CMD ["sh", "-c", "if [ \"${RUN_DATABASE_MIGRATIONS:-true}\" = \"true\" ]; then node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma || exit 1; fi; exec node dist/main.js"]
