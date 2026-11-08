FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose admin portal port
EXPOSE 4001

# Start admin portal
CMD ["npm", "start"]
