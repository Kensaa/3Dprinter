FROM node:latest as web_builder
WORKDIR /app/
RUN yarn global add turbo@1.10.16
RUN corepack enable
COPY .yarnrc.yml .yarnrc.yml
COPY . .
RUN turbo prune web --docker

WORKDIR /build/
COPY .yarnrc.yml .yarnrc.yml

RUN cp -r /app/out/json/* .
RUN yarn install
RUN cp -r /app/out/full/* .
RUN turbo build --filter=web

# ------------------------------------------------

FROM node:latest as server_builder
WORKDIR /app/
RUN yarn global add turbo@1.10.16 cargo-cp-artifact
RUN apt update
RUN apt-get install -y \
    build-essential \
    curl
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

RUN corepack enable
COPY .yarnrc.yml .yarnrc.yml
COPY . .
RUN turbo prune server --docker

WORKDIR /build/
COPY .yarnrc.yml .yarnrc.yml

RUN cp -r /app/out/json/* .
# copy manually the compression package beacuse turbo prune doesn't work with it (because it's rust)
COPY ./packages/compression/ ./packages/compression/ 
RUN yarn install
RUN cp -r /app/out/full/* .
RUN turbo build --filter=server
RUN yarn workspaces focus --all --production

# ------------------------------------------------

FROM node:latest as runner

WORKDIR /app
COPY --from=server_builder /build .
COPY --from=web_builder /build/apps/web/dist ./public
COPY ./apps/clients ./clients

ENV NODE_ENV="production"
ENV WEB_SERVER_PORT=9513
ENV DATA_FOLDER="/data"
ENV URL=""

CMD ["node","apps/server/dist/server.js"]