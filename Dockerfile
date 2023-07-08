FROM node:latest




WORKDIR /app/server

COPY ./server/package.json ./

RUN yarn

COPY ./server/ .






WORKDIR /app/ui

COPY ./ui/package.json ./

RUN yarn

COPY ./ui/ .

RUN yarn build

RUN cp -r /app/ui/dist /app/server/public


RUN rm -rf /app/ui


EXPOSE 9513

WORKDIR /app/server

CMD ["yarn","start"]