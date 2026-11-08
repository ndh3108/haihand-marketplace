FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose React development server port
EXPOSE 3000

# Start React app
CMD ["npm", "start"]
