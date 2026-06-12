FROM node:20-alpine

WORKDIR /app

COPY ./backend /app

RUN npm install

CMD ["node", "server.js"]