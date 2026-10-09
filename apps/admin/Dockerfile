FROM node:22-bookworm-slim AS build
WORKDIR /workspace
ENV HUSKY=0 CI=true NX_DAEMON=false NX_ISOLATE_PLUGINS=false NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.24.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/notifications-runtime/package.json ./packages/notifications-runtime/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build admin --configuration=production

FROM nginx:stable-alpine AS runtime
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/apps/admin/browser /usr/share/nginx/html
EXPOSE 80
