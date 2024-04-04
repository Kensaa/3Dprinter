FROM node:latest as web_builder
WORKDIR /app/
RUN yarn global add turbo
COPY . .
RUN turbo prune web --docker

WORKDIR /build/
RUN cp -r /app/out/json/* .
RUN yarn install
RUN cp -r /app/out/full/* .
RUN turbo build --filter=web
RUN yarn install --production

# ------------------------------------------------

FROM node:latest as server_builder
WORKDIR /app/
RUN yarn global add turbo
RUN apt install cargo -y
COPY . .
RUN turbo prune server --docker

WORKDIR /build/
RUN cp -r /app/out/json/* .
RUN yarn install
RUN cp -r /app/out/full/* .
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
ENV DATA_FOLDER="/data"
ENV URL=""

CMD ["apps/server/dist/server.js"]