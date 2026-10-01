# ---------- Stage 1: build ----------
# Compiles TypeScript to JavaScript. Nothing from this stage ships except dist/.
FROM node:24-slim AS build
WORKDIR /app

# Copy only the dependency lists first. Docker caches each step, so as long as
# these two files don't change, the slow "npm ci" step is reused on the next build.
COPY package.json package-lock.json ./
# --ignore-scripts: skip install-time scripts. better-sqlite3 ships prebuilt Linux
# binaries and loads them at runtime, so its compile step (which needs Python and a
# C++ compiler that this slim image doesn't have) isn't needed.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: build the React board ----------
# Vite turns web/src into plain HTML, CSS, and JS files in web/dist.
# Only those files ship; React's build tools stay behind in this stage.
FROM node:24-slim AS web
WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ---------- Stage 3: runtime ----------
# A fresh image with only what's needed to run: no TypeScript, no tsx, no Vite.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
# connection.ts reads the schema from src/db/schema.sql (tsc doesn't copy .sql files)
COPY src/db/schema.sql ./src/db/schema.sql
# The built board, served by Express (see app.ts)
COPY --from=web /app/web/dist ./web/dist

# The database lives in /app/data, mounted from outside the container by compose.yaml.
# Create it owned by the non-root "node" user so the app can write there.
RUN mkdir -p data && chown node:node data
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
