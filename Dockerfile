FROM node:18-bullseye

# Instalar dependências do Chromium
RUN apt-get update && \
    apt-get install -y \
    chromium \
    chromium-driver \
    ffmpeg \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    curl \
    wget \
    gnupg \
    --no-install-recommends

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Porta do Railway
ENV PORT=3000

# Puppeteer env
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium

# Criar pastas persistentes
RUN mkdir -p /app/.wwebjs_auth
RUN mkdir -p /app/.wwebjs_cache

# Railway start
CMD ["npm", "start"]
