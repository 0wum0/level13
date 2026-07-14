FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node . .

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "server.js"]
