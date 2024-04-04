FROM node:alpine as web_builder
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

FROM node:alpine as server_builder
WORKDIR /app/
RUN yarn global add turbo cargo-cp-artifact
RUN apt update
RUN apt-get install -y \
    build-essential \
    curl
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

COPY . .
RUN turbo prune server --docker

WORKDIR /build/
RUN cp -r /app/out/json/* .
# copy manually the compression package beacuse turbo prune doesn't work with it (because it's rust)
COPY ./packages/compression/ ./packages/compression/ 
RUN yarn install
RUN cp -r /app/out/full/* .
RUN turbo build --filter=server
RUN yarn install --production

# ------------------------------------------------

FROM node:alpine as runner

WORKDIR /app
COPY --from=server_builder /build .
COPY --from=web_builder /build/apps/web/dist ./public
COPY ./apps/clients ./clients

ENV NODE_ENV="production"
ENV WEB_SERVER_PORT=9513
ENV DATA_FOLDER="/data"
ENV URL=""

CMD ["node","apps/server/dist/server.js"]