# ── Frontend Dockerfile ───────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install deps first (cached layer)
COPY package.json .
RUN npm install --silent

# Copy source
COPY . .

EXPOSE 3000

# Disable browser auto-open inside Docker
ENV BROWSER=none

CMD ["npm", "start"]
