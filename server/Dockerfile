FROM node:latest

WORKDIR /app

COPY package.json ./

RUN yarn

COPY . .

EXPOSE 9513

CMD ["yarn","start"]