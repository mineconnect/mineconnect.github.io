#!/bin/bash

# Detener el script si ocurre un error
set -e

echo "📦 Instalando dependencias del proyecto..."

echo "🌐 Instalando dependencias de la Web (Raíz)..."
npm install

echo "📱 Instalando dependencias de la App Móvil..."
cd mobile
npm install
cd ..

echo "✅ ¡Todas las dependencias han sido instaladas correctamente!"
echo "   - Para iniciar la web: npm run dev"
echo "   - Para iniciar mobile: cd mobile && npm start"