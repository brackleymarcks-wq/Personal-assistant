FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY bot/package*.json ./bot/
RUN cd bot && npm ci --only=production

# Copy context files to root app directory
COPY SYSTEM_PROMPT.md CONTEXT.md ./

# Copy bot source code
COPY bot/bot.js ./bot/

# Run the bot
WORKDIR /app/bot
EXPOSE 80
CMD ["node", "bot.js"]
