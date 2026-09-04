FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY FE/admin-portal/package.json FE/admin-portal/package.json
COPY FE/desktop-app/package.json FE/desktop-app/package.json
COPY packages packages

RUN pnpm install --frozen-lockfile
COPY FE/admin-portal FE/admin-portal
ARG VITE_API_URL=
ARG VITE_ADMIN_EMAIL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ADMIN_EMAIL=$VITE_ADMIN_EMAIL
RUN pnpm --dir FE/admin-portal build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/FE/admin-portal/dist /usr/share/nginx/html
EXPOSE 80
