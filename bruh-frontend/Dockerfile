# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments
ARG VITE_APP_BACKEND_API_URL
ARG VITE_APP_BACKEND_API_VERSION

# Set as environment variables for Vite
ENV VITE_APP_BACKEND_API_URL=$VITE_APP_BACKEND_API_URL
ENV VITE_APP_BACKEND_API_VERSION=$VITE_APP_BACKEND_API_VERSION

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Vite app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY certs /certs

# Copy built assets from Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]