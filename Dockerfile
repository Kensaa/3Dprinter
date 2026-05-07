FROM node:20-alpine AS base
WORKDIR /app
RUN yarn global add corepack
RUN corepack enable
COPY .yarnrc.yml .yarnrc.yml

# PRUNE
FROM base AS prune
WORKDIR /app
COPY . .
RUN yarn dlx turbo prune server web --docker

# INSTALL 
FROM base AS build
RUN apk add git curl bash build-base
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/yarn.lock ./yarn.lock
RUN yarn
COPY --from=prune /app/out/full/ .
# BUILD
RUN yarn turbo build --filter=server --filter=web

# RUNTIME
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN yarn global add corepack
RUN corepack enable

COPY --from=build /app .

ENV WEB_SERVER_PORT=9513
ENV DATA_FOLDER="/data"
ENV URL=""

# Keep only production deps for server
RUN yarn workspaces focus server --production

# Copy UI build into server public dir
RUN mkdir -p apps/server/public && \
    cp -r apps/web/dist/* apps/server/public/

USER node
CMD ["node", "/app/apps/server/dist/server.js"]