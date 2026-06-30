# Use official Node.js lightweight image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy remaining source code files
COPY . .

# Expose server port (matches PORT in .env)
EXPOSE 5000

# Define command to run the application
CMD ["npm", "start"]
