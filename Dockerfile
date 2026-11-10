FROM node:22-bookworm-slim

# Keep application files together in the image.
WORKDIR /app

# Install production dependencies first so source edits do not invalidate this layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the app and provide a local default env file; Compose overrides database settings.
COPY . .
COPY .env.example .env

# The server listens on 3000 inside the container.
ENV NODE_ENV=production
EXPOSE 3000

# Do not run the web app as root inside its container.
USER node

# Compose selects the database-specific startup command.
CMD ["npm", "start"]
