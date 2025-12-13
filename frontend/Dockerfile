# frontend/Dockerfile

# --- STAGE 1: BUILD ---
FROM node:18-alpine as builder

WORKDIR /app

# Install Dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy Source & Build
COPY . .
# This creates the /dist folder
RUN npm run build 

# --- STAGE 2: SERVE ---
FROM nginx:alpine

# Copy the build output from Stage 1 to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add a custom Nginx config to handle React Router (prevents 404 on refresh)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]