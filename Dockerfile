# Multi-stage Dockerfile for RackScrape
# Optimized for production use with minimal image size

# Stage 1: Build stage
FROM node:20-slim AS builder

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
FROM node:20-slim

# Install Playwright dependencies and nginx
# This installs system dependencies needed for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    nginx \
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
COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/database ./database
COPY --from=builder /app/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Create directories for data persistence
RUN mkdir -p /app/database /app/storage /app/exports /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV DATABASE_PATH=/app/database/prices.db
ENV PORT=3000

# Expose volume mount points
VOLUME ["/app/database", "/app/storage", "/app/exports", "/app/logs"]

EXPOSE 80

# Health check
HEALTHCHECK --interval=1h --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "require('fs').accessSync('/app/database/prices.db')" || exit 1

# Start Nginx in daemon mode then start API (which owns scheduler)
CMD ["bash", "-lc", "nginx; npm run api"]
