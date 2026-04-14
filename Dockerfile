FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p data uploads

ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/mateclub.db

EXPOSE 3001

CMD ["npm", "run", "start"]
