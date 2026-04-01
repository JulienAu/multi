FROM node:22-alpine

WORKDIR /app

# Install Docker CLI (needed to manage OpenClaw containers)
RUN apk add --no-cache docker-cli

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Default command: dev with hot reload
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
