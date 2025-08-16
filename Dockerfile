# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discord-bot -u 1001

# Change ownership of the working directory to the non-root user
RUN chown -R discord-bot:nodejs /app
USER discord-bot

# Expose the port the app runs on (for health checks)
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "run", "start:production"]
