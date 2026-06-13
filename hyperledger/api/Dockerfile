FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 4000

CMD ["npx", "ts-node", "src/server.ts"]
