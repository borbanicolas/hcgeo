FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Build arguments
ARG CORS_ORIGIN
ENV CORS_ORIGIN=${CORS_ORIGIN:-https://hcgeo.nikoscience.tech}

EXPOSE 3000

CMD ["node", "src/index.js"]
