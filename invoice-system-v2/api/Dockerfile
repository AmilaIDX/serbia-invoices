FROM node:20
RUN apt-get update && apt-get install -y sqlite3
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8787
CMD ["node", "server.js"]
