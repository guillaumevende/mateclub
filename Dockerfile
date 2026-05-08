FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ffmpeg \
		python3.11 \
		python3-pip \
		python3.11-venv \
		ca-certificates \
		curl \
	&& rm -rf /var/lib/apt/lists/*

RUN python3.11 -m venv /opt/mateclub-audio \
	&& /opt/mateclub-audio/bin/python -m pip install --no-cache-dir --upgrade pip \
	&& /opt/mateclub-audio/bin/python -m pip install --no-cache-dir \
		torch==2.2.2 \
		torchaudio==2.2.2 \
		deepfilter-multimedia==0.1.3

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p data uploads

ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/mateclub.db
ENV AUDIO_PROCESSING_MODE=basic
ENV AUDIO_PROCESSING_PYTHON_BIN=/opt/mateclub-audio/bin/python

EXPOSE 3001

CMD ["npm", "run", "start"]
