FROM node:22-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 4000

# Start backend server
CMD ["npm", "start"]
