FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN if [ ! -f "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" ] && [ -f "/usr/bin/chromium" ]; then ln -s /usr/bin/chromium "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"; fi

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
