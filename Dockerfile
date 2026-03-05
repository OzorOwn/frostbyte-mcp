FROM node:20-slim

LABEL org.opencontainers.image.source="https://github.com/OzorOwn/frostbyte-mcp"
LABEL org.opencontainers.image.description="MCP server providing 40+ developer APIs to AI agents"
LABEL org.opencontainers.image.licenses="MIT"
LABEL io.modelcontextprotocol.server.name="io.github.OzorOwn/frostbyte"
LABEL io.modelcontextprotocol.server.version="1.0.0"

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

ENTRYPOINT ["node", "src/index.js"]
