FROM node:20-alpine

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies (including tsx for running typescript files)
RUN npm install

# Copy the rest of the backend source files
COPY . .

# Expose backend port
EXPOSE 3000

ENV RUN_STANDALONE=true
ENV NODE_ENV=development

CMD ["npm", "start"]
