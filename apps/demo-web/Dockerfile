FROM node:20-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/demo-web ./apps/demo-web
COPY server ./server

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter demo-web build

FROM nginx:alpine

ENV OPENCHAT_BACKEND_UPSTREAM=http://host.docker.internal:8004

COPY apps/demo-web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/demo-web/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
