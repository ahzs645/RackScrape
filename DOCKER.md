# Docker Deployment Guide

Complete guide for running RackScrape in Docker containers.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the scheduler (runs daily at 3:30 AM)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Docker Run

```bash
# Build image
docker build -t rackscrape .

# Run scheduler
docker run -d \
  --name rackscrape \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/exports:/app/exports \
  -v $(pwd)/logs:/app/logs \
  rackscrape

# View logs
docker logs -f rackscrape
```

## Detailed Usage

### 1. Building the Image

```bash
# Build with default settings
docker build -t rackscrape:latest .

# Build with custom tag
docker build -t rackscrape:v1.0.0 .

# Build without cache
docker build --no-cache -t rackscrape .
```

Image details:
- Base: `node:20-slim`
- Size: ~800MB (includes Chromium)
- Multi-stage build for optimization

### 2. Running Containers

#### A. Scheduled Scraping (Default)

Runs the scheduler that scrapes daily at 3:30 AM EST:

```bash
docker-compose up -d
```

Or with docker run:
```bash
docker run -d \
  --name rackscrape-scheduler \
  --restart unless-stopped \
  -e SCRAPE_SCHEDULE="30 3 * * *" \
  -e TIMEZONE="America/New_York" \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/storage:/app/storage \
  -v $(pwd)/exports:/app/exports \
  -v $(pwd)/logs:/app/logs \
  rackscrape
```

#### B. One-Time Scrape

Run scraper once and exit:

```bash
# Using docker-compose with profile
docker-compose run --rm rackscrape-once

# Using docker run
docker run --rm \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/exports:/app/exports \
  rackscrape \
  npm run scrape
```

#### C. Export Data

Export existing data to CSV/Excel:

```bash
# Using docker-compose
docker-compose run --rm rackscrape-export

# Using docker run
docker run --rm \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/exports:/app/exports \
  rackscrape \
  npm run export
```

#### D. Query Database

```bash
# Check statistics
docker run --rm \
  -v $(pwd)/database:/app/database \
  rackscrape \
  npm run query stats

# Get latest prices
docker run --rm \
  -v $(pwd)/database:/app/database \
  rackscrape \
  npm run query latest "Toronto, ON" daily
```

### 3. Environment Variables

Configure via `docker-compose.yml` or `-e` flags:

```yaml
environment:
  NODE_ENV: production
  HEADLESS: "true"
  DATABASE_PATH: /app/database/prices.db
  SCRAPE_SCHEDULE: "30 3 * * *"
  TIMEZONE: America/New_York
  MAX_RETRIES: 3
  TIMEOUT_SECONDS: 60
  LOG_LEVEL: info
  RUN_ON_STARTUP: "false"
```

### 4. Volume Mounts

Persist data by mounting volumes:

```yaml
volumes:
  - ./database:/app/database    # SQLite database
  - ./storage:/app/storage      # Crawlee datasets
  - ./exports:/app/exports      # CSV/Excel exports
  - ./logs:/app/logs           # Application logs
```

## Docker Compose Configurations

### Basic Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  rackscrape:
    build: .
    container_name: rackscrape
    restart: unless-stopped
    environment:
      SCRAPE_SCHEDULE: "30 3 * * *"
      TIMEZONE: America/New_York
    volumes:
      - ./database:/app/database
      - ./exports:/app/exports
      - ./logs:/app/logs
```

### Advanced Configuration

```yaml
version: '3.8'

services:
  rackscrape:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: rackscrape
    restart: unless-stopped

    environment:
      NODE_ENV: production
      HEADLESS: "true"
      SCRAPE_SCHEDULE: "30 3 * * *"
      TIMEZONE: America/Toronto
      LOG_LEVEL: info

    volumes:
      # Named volumes for better management
      - rackscrape-db:/app/database
      - rackscrape-exports:/app/exports
      - rackscrape-logs:/app/logs

    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  rackscrape-db:
  rackscrape-exports:
  rackscrape-logs:
```

## Common Tasks

### View Logs

```bash
# All logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs rackscrape
```

### Check Container Status

```bash
# List running containers
docker-compose ps

# Detailed info
docker inspect rackscrape

# Resource usage
docker stats rackscrape
```

### Restart Container

```bash
# Using docker-compose
docker-compose restart

# Using docker
docker restart rackscrape
```

### Update Container

```bash
# Rebuild and restart
docker-compose up -d --build

# Pull latest code and rebuild
git pull
docker-compose up -d --build
```

### Access Container Shell

```bash
# Interactive shell
docker-compose exec rackscrape sh

# Run commands inside container
docker-compose exec rackscrape npm run query stats
```

### Backup Data

```bash
# Backup database
docker cp rackscrape:/app/database/prices.db ./backups/prices-$(date +%Y%m%d).db

# Backup exports
docker cp rackscrape:/app/exports ./backups/exports-$(date +%Y%m%d)
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes too (WARNING: deletes data)
docker-compose down -v

# Remove images
docker rmi rackscrape

# Full cleanup
docker-compose down -v
docker system prune -a
```

## Scheduling Options

### 1. Change Schedule

Edit `docker-compose.yml`:

```yaml
environment:
  SCRAPE_SCHEDULE: "0 */6 * * *"  # Every 6 hours
  SCRAPE_SCHEDULE: "0 9,17 * * *" # 9 AM and 5 PM
  SCRAPE_SCHEDULE: "30 3 * * 1-5" # 3:30 AM weekdays only
```

Then restart:
```bash
docker-compose up -d
```

### 2. Run on Startup

Start scraping immediately when container starts:

```yaml
environment:
  RUN_ON_STARTUP: "true"
```

### 3. Manual Trigger

Trigger a scrape manually without restarting:

```bash
docker-compose exec rackscrape npm run scrape
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Verify environment
docker-compose config

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Scraper Failing

```bash
# View error logs
docker-compose logs | grep ERROR

# Check inside container
docker-compose exec rackscrape npm test

# Run in non-headless mode (debugging)
docker-compose down
docker run --rm \
  -e HEADLESS=false \
  -v $(pwd)/database:/app/database \
  rackscrape \
  npm run scrape
```

### Database Issues

```bash
# Check database exists
docker-compose exec rackscrape ls -la /app/database/

# Run query test
docker-compose exec rackscrape npm run query stats

# Reset database (WARNING: deletes data)
rm database/prices.db
docker-compose restart
```

### Memory Issues

If container runs out of memory:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G
```

### Playwright Issues

```bash
# Reinstall Playwright browsers
docker-compose exec rackscrape npx playwright install chromium --with-deps

# Or rebuild image
docker-compose build --no-cache
```

## Production Deployment

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml rackscrape

# List services
docker service ls

# View logs
docker service logs rackscrape_rackscrape
```

### Kubernetes

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rackscrape
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rackscrape
  template:
    metadata:
      labels:
        app: rackscrape
    spec:
      containers:
      - name: rackscrape
        image: rackscrape:latest
        env:
        - name: SCRAPE_SCHEDULE
          value: "30 3 * * *"
        - name: TIMEZONE
          value: "America/New_York"
        volumeMounts:
        - name: database
          mountPath: /app/database
        - name: exports
          mountPath: /app/exports
      volumes:
      - name: database
        persistentVolumeClaim:
          claimName: rackscrape-db-pvc
      - name: exports
        persistentVolumeClaim:
          claimName: rackscrape-exports-pvc
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
```

### Cloud Deployment

#### AWS ECS

1. Push image to ECR
2. Create task definition
3. Create ECS service with scheduled tasks

#### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/rackscrape

# Deploy
gcloud run deploy rackscrape \
  --image gcr.io/PROJECT_ID/rackscrape \
  --platform managed \
  --region us-central1
```

#### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name rackscrape \
  --image rackscrape:latest \
  --restart-policy Always
```

## Monitoring

### Health Checks

The container includes a health check:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' rackscrape
```

### Prometheus Metrics (Optional)

Add metrics endpoint to expose scrape statistics.

### Logging to External Systems

Configure logging driver for centralized logging:

```yaml
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://logs.example.com:514"
```

## Best Practices

1. **Always use volumes** for data persistence
2. **Set resource limits** to prevent memory issues
3. **Use docker-compose** for easier management
4. **Backup database** regularly
5. **Monitor logs** for errors
6. **Update regularly** (git pull + rebuild)
7. **Use named volumes** for production
8. **Set restart policy** to `unless-stopped`
9. **Configure log rotation** to prevent disk fill
10. **Test locally** before deploying to production

## Security

### Run as Non-Root User (Optional)

Add to Dockerfile:

```dockerfile
RUN useradd -m -u 1000 scraper
USER scraper
```

### Secrets Management

Use Docker secrets instead of environment variables:

```yaml
secrets:
  db_password:
    external: true

services:
  rackscrape:
    secrets:
      - db_password
```

## Summary

You now have a fully containerized scraper that can:
- ✅ Run as a scheduled service
- ✅ Persist data across restarts
- ✅ Be deployed anywhere Docker runs
- ✅ Scale horizontally if needed
- ✅ Be easily updated and maintained

Quick command reference:
```bash
docker-compose up -d        # Start
docker-compose logs -f      # Watch logs
docker-compose restart      # Restart
docker-compose down         # Stop
docker-compose exec rackscrape npm run query stats  # Query data
```
