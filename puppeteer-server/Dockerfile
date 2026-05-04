FROM node:18-slim

RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    fontconfig \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libnspr4 \
    libnss3 \
    libxss1 \
    --no-install-recommends \
  && fc-cache -fv \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
