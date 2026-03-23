#!/bin/bash

# CareforAb Deployment Script
# Usage: ./scripts/deploy.sh [vercel|netlify|docker|build]

set -e

DEPLOY_TARGET=${1:-build}

echo "🚀 CareforAb Deployment Script"
echo "===================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your credentials."
        exit 1
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building application..."
npm run build

if [ "$DEPLOY_TARGET" = "build" ]; then
    echo "✅ Build complete! Output in ./dist"
    echo "📝 To preview: npm run preview"
    exit 0
fi

# Deploy to Vercel
if [ "$DEPLOY_TARGET" = "vercel" ]; then
    echo "🚀 Deploying to Vercel..."
    if ! command -v vercel &> /dev/null; then
        echo "📦 Installing Vercel CLI..."
        npm install -g vercel
    fi
    vercel --prod
    exit 0
fi

# Deploy to Netlify
if [ "$DEPLOY_TARGET" = "netlify" ]; then
    echo "🚀 Deploying to Netlify..."
    if ! command -v netlify &> /dev/null; then
        echo "📦 Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    netlify deploy --prod --dir=dist
    exit 0
fi

# Docker deployment
if [ "$DEPLOY_TARGET" = "docker" ]; then
    echo "🐳 Building Docker image..."
    docker build -t careforab:latest .
    echo "✅ Docker image built!"
    echo "📝 To run: docker run -d -p 80:80 careforab:latest"
    exit 0
fi

echo "❌ Unknown deployment target: $DEPLOY_TARGET"
echo "Usage: ./scripts/deploy.sh [vercel|netlify|docker|build]"
exit 1

