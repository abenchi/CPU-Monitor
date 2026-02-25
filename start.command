#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Démarrage du CPU Monitor..."
echo ""
npm install --silent
echo "✅ Serveur lancé ! Ouvre http://localhost:3000"
echo "   (Appuie sur Ctrl+C pour arrêter)"
echo ""
open http://localhost:3000
node server.js
