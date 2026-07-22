# Mail Tracker API — Node.js 20 LTS
FROM node:20-slim

# Prisma needs OpenSSL present at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all workspace dependencies (includes prisma + @prisma/client).
RUN npm install --legacy-peer-deps

# Copy source.
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate the Prisma client, then build shared + api TypeScript.
# (apps/api build script runs `prisma generate` before tsc.)
RUN npm run build

EXPOSE 5080

# docker-compose overrides this to run migrations first; this is the prod default.
CMD ["npm", "run", "start", "--prefix", "apps/api"]
