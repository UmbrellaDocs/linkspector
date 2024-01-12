# Use the official Puppeteer Docker image as the base image
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the project dependencies
RUN npm install

# Copy the rest of the project files to the working directory
COPY . .

# Define the command to run the app
CMD [ "node", "index.js", "check" ]
