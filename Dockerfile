FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

ENTRYPOINT ["node", "src/index.js"]
