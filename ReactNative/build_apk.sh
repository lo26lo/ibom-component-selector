#!/bin/bash
# Script de build pour générer l'APK Release

echo "=== IBom Selector - Build APK ==="
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "Erreur: Exécutez ce script depuis le répertoire ReactNative/"
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install
fi

# Nettoyer les builds précédents
echo "🧹 Nettoyage des builds précédents..."
cd android
./gradlew clean

# Build APK Release
echo "🔨 Build APK Release..."
./gradlew assembleRelease

# Vérifier le succès
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build réussi!"
    echo ""
    echo "📱 APK disponible ici:"
    echo "   android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    
    # Copier l'APK vers un emplacement plus accessible
    mkdir -p ../build
    cp app/build/outputs/apk/release/app-release.apk ../build/IBomSelector.apk
    echo "   Copié vers: build/IBomSelector.apk"
else
    echo ""
    echo "❌ Erreur lors du build"
    exit 1
fi
