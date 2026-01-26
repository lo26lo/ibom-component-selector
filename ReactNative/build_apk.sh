#!/bin/bash
# Script de build pour générer l'APK Release
# Usage: ./build_apk.sh

set -e

echo "=== IBom Selector - Build APK ==="
echo ""

# Aller dans le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# [1/6] Vérifier et installer les prérequis
# ============================================
echo -e "${YELLOW}[1/6] Vérification des prérequis...${NC}"

# Vérifier Node.js
if ! command_exists node; then
    echo "      Node.js non trouvé. Installation..."
    if command_exists apt; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    elif command_exists yum; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif command_exists pacman; then
        sudo pacman -S nodejs npm
    else
        echo -e "${RED}Impossible d'installer Node.js automatiquement.${NC}"
        echo "Installez Node.js manuellement: https://nodejs.org/"
        exit 1
    fi
fi
echo "      ✓ Node.js $(node --version)"

# Vérifier npm
if ! command_exists npm; then
    echo -e "${RED}npm non trouvé. Installez Node.js avec npm.${NC}"
    exit 1
fi
echo "      ✓ npm $(npm --version)"

# Vérifier Java
if ! command_exists java; then
    echo "      Java non trouvé. Installation..."
    if command_exists apt; then
        sudo apt install -y openjdk-17-jdk
    elif command_exists yum; then
        sudo yum install -y java-17-openjdk-devel
    elif command_exists pacman; then
        sudo pacman -S jdk17-openjdk
    else
        echo -e "${RED}Impossible d'installer Java automatiquement.${NC}"
        echo "Installez OpenJDK 17 manuellement."
        exit 1
    fi
fi
echo "      ✓ Java $(java --version 2>&1 | head -1)"

# ============================================
# [2/6] Créer un projet React Native propre
# ============================================
echo -e "${YELLOW}[2/6] Préparation du projet React Native...${NC}"

BUILD_DIR="$SCRIPT_DIR/../.rn_build"
PROJECT_NAME="IBomSelectorBuild"

# Nettoyer le build précédent si demandé
if [ "$1" == "--clean" ]; then
    echo "      Nettoyage du build précédent..."
    rm -rf "$BUILD_DIR"
fi

# Créer le projet seulement s'il n'existe pas
if [ ! -d "$BUILD_DIR/$PROJECT_NAME/android" ]; then
    echo "      Création du projet React Native (peut prendre quelques minutes)..."
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"
    
    # Supprimer l'ancien projet s'il existe partiellement
    rm -rf "$PROJECT_NAME"
    
    # Créer un nouveau projet React Native
    npx react-native@0.73.4 init "$PROJECT_NAME" --version 0.73.4 --skip-git-init
    
    cd "$PROJECT_NAME"
    
    # Installer les dépendances additionnelles
    echo "      Installation des dépendances..."
    npm install zustand \
        react-native-svg \
        react-native-gesture-handler \
        react-native-reanimated \
        react-native-document-picker \
        react-native-fs \
        @react-native-async-storage/async-storage \
        react-native-haptic-feedback \
        react-native-device-info
    
    # Configurer Babel pour react-native-reanimated
    echo "      Configuration de Babel pour reanimated..."
    cat > babel.config.js << 'BABELEOF'
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
BABELEOF

    # Configurer settings.gradle pour résoudre les dépendances
    echo "      Configuration de Gradle..."
    cat > android/settings.gradle << 'SETTINGSEOF'
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven { url 'https://www.jitpack.io' }
    }
}

rootProject.name = 'IBomSelectorBuild'
include ':app'

// Include react-native modules
apply from: file("../node_modules/@react-native-community/cli-platform-android/native_modules.gradle")
applyNativeModulesSettingsGradle(settings)
SETTINGSEOF

    # Configurer build.gradle pour reanimated
    echo "      Configuration build.gradle..."
    
    # Ajouter la configuration Hermes pour reanimated dans gradle.properties
    echo "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64" >> android/gradle.properties
    
    echo "      ✓ Projet React Native créé"
else
    echo "      ✓ Projet React Native existant trouvé"
    cd "$BUILD_DIR/$PROJECT_NAME"
fi

# ============================================
# [3/6] Copier les fichiers sources
# ============================================
echo -e "${YELLOW}[3/6] Copie des fichiers sources...${NC}"

# Créer le dossier src s'il n'existe pas
mkdir -p src

# Copier les sources
cp -r "$SCRIPT_DIR/src/"* src/
cp "$SCRIPT_DIR/tsconfig.json" .

# Mettre à jour index.js pour pointer vers notre App
cat > index.js << 'EOF'
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
EOF

echo "      ✓ Fichiers sources copiés"

# ============================================
# [4/6] Configurer l'application
# ============================================
echo -e "${YELLOW}[4/6] Configuration de l'application...${NC}"

# Mettre à jour app.json
cat > app.json << 'EOF'
{
  "name": "IBomSelectorBuild",
  "displayName": "IBom Selector"
}
EOF

# Configurer les permissions Android
MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"
if ! grep -q "READ_EXTERNAL_STORAGE" "$MANIFEST_FILE"; then
    sed -i 's/<uses-permission android:name="android.permission.INTERNET" \/>/<uses-permission android:name="android.permission.INTERNET" \/>\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" \/>\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" \/>\n    <uses-permission android:name="android.permission.VIBRATE" \/>/g' "$MANIFEST_FILE"
fi

# S'assurer que proguard ne supprime pas reanimated
PROGUARD_FILE="android/app/proguard-rules.pro"
if ! grep -q "reanimated" "$PROGUARD_FILE" 2>/dev/null; then
    cat >> "$PROGUARD_FILE" << 'PROGUARDEOF'

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
PROGUARDEOF
fi

# Configurer MainApplication.kt pour reanimated si nécessaire
MAIN_APP_FILE="android/app/src/main/java/com/ibomselectorbuild/MainApplication.kt"
if [ -f "$MAIN_APP_FILE" ] && ! grep -q "reanimated" "$MAIN_APP_FILE"; then
    # Le plugin react-native-reanimated configure automatiquement avec autolinking
    echo "      ✓ Reanimated configuré via autolinking"
fi

echo "      ✓ Application configurée"

# ============================================
# [5/6] Build APK Release
# ============================================
echo -e "${YELLOW}[5/6] Build APK Release...${NC}"

cd android
chmod +x gradlew

# Nettoyer le cache si demandé
if [ "$1" == "--clean" ] || [ "$2" == "--clean" ]; then
    echo "      Nettoyage du cache Gradle..."
    ./gradlew clean
fi

# Build avec gestion d'erreur détaillée
echo "      Compilation en cours (peut prendre plusieurs minutes)..."
if ! ./gradlew assembleRelease --stacktrace; then
    echo -e "${RED}❌ Erreur lors du build${NC}"
    echo ""
    echo "Essayez:"
    echo "  1. ./build_apk.sh --clean"
    echo "  2. Vérifiez que Java 17 est installé: java --version"
    echo "  3. Supprimez ~/.gradle/caches et réessayez"
    exit 1
fi

# ============================================
# [6/6] Copier l'APK
# ============================================
echo -e "${YELLOW}[6/6] Finalisation...${NC}"

APK_SOURCE="app/build/outputs/apk/release/app-release.apk"
APK_DEST="$SCRIPT_DIR/build"

mkdir -p "$APK_DEST"

if [ -f "$APK_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST/IBomSelector.apk"
    echo ""
    echo -e "${GREEN}✅ Build réussi!${NC}"
    echo -e "${GREEN}📱 APK: $APK_DEST/IBomSelector.apk${NC}"
    echo ""
    ls -lh "$APK_DEST/IBomSelector.apk"
else
    echo -e "${RED}❌ APK non trouvé${NC}"
    exit 1
fi
