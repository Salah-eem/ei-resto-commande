# Dockerfile unique pour backend + frontend
FROM node:20-alpine

WORKDIR /app

# Copier les package.json des deux apps
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Installer les dépendances backend
WORKDIR /app/backend
RUN npm install --production

# Installer les dépendances frontend
WORKDIR /app/frontend
RUN npm install --production

# Copier tout le code
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# Builder le backend
WORKDIR /app/backend
RUN npm run build

# Builder le frontend
WORKDIR /app/frontend
RUN npm run build

# Script de démarrage pour lancer les deux serveurs
WORKDIR /app
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000 3001
CMD ["./start.sh"]
