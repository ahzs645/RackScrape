# Multi-stage Dockerfile for RackScrape
# Optimized for production use with minimal image size

# Stage 1: Build stage
# Using bullseye-slim to avoid systemd dependency chain issues in Debian 12 (bookworm)
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tailwind.config.cjs ./
COPY web web

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY src ./src
COPY nginx ./nginx
COPY database ./database

# Build frontend assets
RUN npm run build:web

# Stage 2: Production stage
# Using bullseye-slim to avoid systemd dependency chain issues in Debian 12 (bookworm)
FROM node:20-bullseye-slim

# Install Playwright dependencies and tzdata for timezone support
# Note: nginx runs as a separate container (nginx:alpine) to avoid systemd dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    tzdata \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tailwind.config.cjs ./

# Install production dependencies only
RUN npm install --only=production

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Install Playwright browsers (Chromium only)
RUN npx playwright install chromium

# Copy application code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/database ./database

# Create directories for data persistence
RUN mkdir -p /app/database /app/storage /app/exports /app/logs /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV DATABASE_PATH=/app/database/prices.db
ENV PORT=3000

# Expose volume mount points
VOLUME ["/app/database", "/app/storage", "/app/exports", "/app/logs"]

EXPOSE 3000

# Start API server (nginx runs as separate container)
CMD ["npm", "run", "api"]
