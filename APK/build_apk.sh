#!/bin/bash
# Script de compilation APK pour IBom Selector

echo "=== IBom Selector - Compilation APK ==="
echo ""

# Incrémenter automatiquement la version patch (x.y.Z)
CURRENT_VERSION=$(grep -oP "__version__ = '\K[^']+" main.py)
echo "Version actuelle: $CURRENT_VERSION"

# Extraire major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# Mettre à jour la version dans main.py
sed -i "s/__version__ = '$CURRENT_VERSION'/__version__ = '$NEW_VERSION'/" main.py
echo "Nouvelle version: $NEW_VERSION"
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
    echo "Version: $NEW_VERSION"
    echo "APK disponible dans le dossier bin/"
    ls -la bin/*.apk
else
    echo ""
    echo "=== Erreur de compilation ==="
    echo "Vérifiez les logs ci-dessus pour plus de détails."
    # Restaurer l'ancienne version en cas d'erreur
    sed -i "s/__version__ = '$NEW_VERSION'/__version__ = '$CURRENT_VERSION'/" main.py
    echo "Version restaurée: $CURRENT_VERSION"
fi
