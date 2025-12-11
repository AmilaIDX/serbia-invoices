FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_URL=https://api.idgraphicx.com
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM node:18-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000", "--single", "--header", "Content-Security-Policy: default-src 'self'; img-src * data: blob:; connect-src *; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"]
