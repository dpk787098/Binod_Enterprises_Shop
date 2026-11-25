FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY server ./server
COPY package.json ./package.json
RUN mkdir -p /app/data
ENV NODE_ENV=production PORT=8787 DATA_DIR=/app/data
EXPOSE 8787
CMD ["npm", "run", "start"]
