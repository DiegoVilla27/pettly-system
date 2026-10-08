FROM node:22-bookworm-slim AS build
WORKDIR /workspace
ENV HUSKY=0 CI=true NX_DAEMON=false NX_ISOLATE_PLUGINS=false NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.24.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build api --configuration=production
RUN pnpm --filter @pettly/api deploy --prod --legacy /runtime

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=node:node /runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
