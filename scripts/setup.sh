#!/bin/bash

# CareforAb Setup Script
# Usage: ./scripts/setup.sh

set -e

echo "🔧 CareforAb Setup Script"
echo "==============================="

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    echo "💡 Install Node.js: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check npm
echo "📋 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found!"
    exit 1
fi
echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo "⚠️  Please update .env with your Supabase credentials!"
        echo "   Get them from: https://app.supabase.com → Settings → API"
    else
        echo "⚠️  .env.example not found. Creating basic .env..."
        cat > .env << EOF
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here
EOF
        echo "✅ Created .env file"
        echo "⚠️  Please update .env with your Supabase credentials!"
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with your Supabase credentials"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:8080"
echo ""

