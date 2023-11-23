FROM node:latest as web_builder
WORKDIR /app/
RUN yarn global add turbo
COPY . .
RUN turbo prune web --docker

WORKDIR /build/
COPY /app/out/json/ .
COPY /app/out/yarn.lock ./yarn.lock
RUN yarn install
COPY /app/out/full/ .
RUN turbo build --filter=web
RUN yarn install --production

# ------------------------------------------------

FROM node:latest as server_builder
WORKDIR /app/
RUN yarn global add turbo
COPY . .
RUN turbo prune server --docker

WORKDIR /build/
COPY /app/out/json/ .
COPY /app/out/yarn.lock ./yarn.lock
RUN yarn install
COPY /app/out/full/ .
RUN turbo build --filter=server
RUN yarn install --production

# ------------------------------------------------

FROM gcr.io/distroless/nodejs20-debian11 as runner

WORKDIR /app
COPY --from=server_builder /build .
COPY --from=web_builder /build/apps/web/dist ./public
COPY ./apps/clients ./clients

ENV NODE_ENV="production"
ENV WEB_SERVER_PORT=9513
ENV BUILDS_FOLDER="/builds"
ENV URL=""

CMD ["apps/server/dist/server.js"]