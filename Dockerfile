FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=4312
EXPOSE 4312
CMD ["npm", "start"]
