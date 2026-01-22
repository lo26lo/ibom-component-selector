#!/bin/bash
# Script de compilation APK pour IBom Selector

echo "=== IBom Selector - Compilation APK ==="
echo ""

# Vérifier si buildozer est installé
if ! command -v buildozer &> /dev/null; then
    echo "Buildozer n'est pas installé."
    echo "Installation..."
    pip3 install --user buildozer cython
fi

# Nettoyer les builds précédents
echo "Nettoyage des builds précédents..."
buildozer android clean

# Compiler en mode debug
echo ""
echo "Compilation de l'APK en mode debug..."
buildozer android debug

# Vérifier si la compilation a réussi
if [ -f "bin/"*.apk ]; then
    echo ""
    echo "=== Compilation réussie ! ==="
    echo "APK disponible dans le dossier bin/"
    ls -la bin/*.apk
else
    echo ""
    echo "=== Erreur de compilation ==="
    echo "Vérifiez les logs ci-dessus pour plus de détails."
fi
