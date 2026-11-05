FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY next.config.mjs ./
COPY src ./src
COPY scripts/build.js ./scripts/build.js
ARG BUILD_COMMIT=local
RUN npm run build

FROM node:24-alpine
ARG BUILD_COMMIT=local
LABEL org.opencontainers.image.revision=$BUILD_COMMIT
WORKDIR /app
# Docker sets HOSTNAME to the container ID, so the server has to be told to listen on all interfaces.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/dist ./
# A new Docker volume copies this folder's owner, which lets the app write to it.
RUN mkdir data && chown node:node data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res) => process.exit(res.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.js"]
