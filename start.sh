#!/bin/sh
# Script pour lancer backend et frontend dans le même conteneur

# Lancer le backend en arrière-plan
cd /app/backend && npm run start:prod &

# Lancer le frontend (Next.js)
cd /app/frontend && npm start
