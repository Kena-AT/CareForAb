# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install dependencies for both backend and frontend
RUN npm install
COPY . .
RUN npm run install:all

# Build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy built frontend
COPY --from=builder /app/frontend/.next /app/frontend/.next
COPY --from=builder /app/frontend/public /app/frontend/public
COPY --from=builder /app/frontend/package*.json /app/frontend/
COPY --from=builder /app/frontend/next.config.mjs /app/frontend/

# Copy built backend
COPY --from=builder /app/backend/dist /app/backend/dist
COPY --from=builder /app/backend/package*.json /app/backend/

# Copy root package for runner
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start both using root package.json dev script (or a specialized prod script)
# For now, we'll use start scripts
CMD ["npm", "run", "dev"]
