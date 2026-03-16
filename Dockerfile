FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p data uploads

ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/mateclub.db

EXPOSE 3000

CMD ["npm", "run", "start"]
