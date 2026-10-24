FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./server.js
COPY scripts ./scripts
COPY public ./public
EXPOSE 3000
USER node
CMD ["node", "server.js"]
