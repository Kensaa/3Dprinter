FROM node:latest as build_env

WORKDIR /app/server
COPY ./server/package.json ./
RUN yarn
COPY ./server/ .
RUN yarn build
RUN yarn install --production

WORKDIR /app/ui
COPY ./ui/package.json ./
RUN yarn
COPY ./ui/ .
RUN yarn build

FROM gcr.io/distroless/nodejs20-debian11
COPY --from=build_env /app/server /app/server
COPY --from=build_env /app/ui/dist /app/server/public

WORKDIR /app/server
EXPOSE 9513
ENV buildsFolder=/builds/

CMD ["dist/server.js"]