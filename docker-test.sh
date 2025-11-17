#!/bin/bash
# Docker Test Script - Quick verification of Docker setup

set -e

echo "=== RackScrape Docker Test ==="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose is installed"

# Build the image
echo ""
echo "Building Docker image..."
docker-compose build

echo ""
echo "✅ Image built successfully"

# Run a test scrape
echo ""
echo "Running test scrape in container..."
docker-compose run --rm rackscrape-once

echo ""
echo "=== Test Complete ==="
echo ""
echo "Next steps:"
echo "  1. View the data: docker-compose exec rackscrape npm run query stats"
echo "  2. Start scheduler: docker-compose up -d"
echo "  3. View logs: docker-compose logs -f"
echo ""
