FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server.js columnWebhook.cjs db.cjs ./
USER node

EXPOSE 4000
CMD ["npm", "start"]
