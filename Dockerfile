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
WORKDIR /app
# Docker sets HOSTNAME to the container ID, so the server has to be told to listen on all interfaces.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/dist ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res) => process.exit(res.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.js"]
