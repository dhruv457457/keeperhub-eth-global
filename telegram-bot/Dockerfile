FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --ignore-scripts
COPY . .
ENV NODE_ENV=production
CMD ["node", "index.js"]
