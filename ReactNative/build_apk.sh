#!/bin/bash
# Script de build pour générer l'APK Release
# Usage: ./build_apk.sh [--clean] [--share-logs]
#   --clean      : Nettoie le cache avant le build
#   --share-logs : Envoie les logs sur GitHub pour debug à distance

set -e

echo "=== IBom Selector - Build APK ==="
echo ""

# Aller dans le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration des logs
LOG_FILE="$SCRIPT_DIR/../build_log.txt"
SHARE_LOGS=false

# Vérifier si on doit partager les logs
for arg in "$@"; do
    if [ "$arg" == "--share-logs" ]; then
        SHARE_LOGS=true
    fi
done

# Fonction pour logger avec horodatage
log_message() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    if [ "$SHARE_LOGS" = true ]; then
        echo "$msg" >> "$LOG_FILE"
    fi
}

# Si partage des logs activé, initialiser le fichier
if [ "$SHARE_LOGS" = true ]; then
    echo "=== BUILD LOG - $(date) ===" > "$LOG_FILE"
    echo "Script: build_apk.sh" >> "$LOG_FILE"
    echo "Arguments: $@" >> "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"
    echo ""
    log_message "Mode partage de logs activé - Les logs seront envoyés sur GitHub"
fi

# Fonction pour envoyer les logs sur GitHub en cas d'erreur
push_logs_on_error() {
    local exit_code=$?
    if [ "$SHARE_LOGS" = true ] && [ "$LOGS_PUSHED" != true ]; then
        LOGS_PUSHED=true
        echo "" >> "$LOG_FILE"
        echo "=== FIN DU BUILD (ERREUR code: $exit_code) - $(date) ===" >> "$LOG_FILE"
        
        cd "$SCRIPT_DIR/.."
        git add -f build_log.txt 2>/dev/null || true
        git commit -m "build: Log d'erreur du build $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || true
        git push 2>/dev/null || true
        
        echo ""
        echo -e "${YELLOW}📤 Logs envoyés sur GitHub pour analyse${NC}"
    fi
}

# Fonction wrapper pour exit avec push des logs
exit_with_logs() {
    local code=$1
    push_logs_on_error
    exit $code
}

# Attraper toutes les sorties (erreur ou normale) pour envoyer les logs
trap 'push_logs_on_error' EXIT

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
log_message "[1/6] Vérification des prérequis..."
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

# Vérifier/Configurer Android SDK
ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ ! -d "$ANDROID_SDK_ROOT/platforms" ]; then
    echo "      Android SDK non trouvé. Installation..."
    
    # Créer le répertoire SDK
    mkdir -p "$ANDROID_SDK_ROOT"
    
    # Télécharger commandlinetools
    CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    CMDLINE_TOOLS_ZIP="/tmp/cmdline-tools.zip"
    
    echo "      Téléchargement des Android Command Line Tools..."
    curl -L -o "$CMDLINE_TOOLS_ZIP" "$CMDLINE_TOOLS_URL"
    
    # Extraire dans un dossier temporaire
    rm -rf "/tmp/cmdline-tools-extract"
    unzip -q "$CMDLINE_TOOLS_ZIP" -d "/tmp/cmdline-tools-extract"
    
    # Créer la bonne structure: cmdline-tools/latest/bin/sdkmanager
    mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools/latest"
    mv /tmp/cmdline-tools-extract/cmdline-tools/* "$ANDROID_SDK_ROOT/cmdline-tools/latest/"
    rm -rf "/tmp/cmdline-tools-extract"
    
    # Exporter les variables
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
    export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH"
    
    # Vérifier que sdkmanager existe
    if [ ! -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
        echo -e "${RED}Erreur: sdkmanager non trouvé${NC}"
        ls -la "$ANDROID_SDK_ROOT/cmdline-tools/"
        exit 1
    fi
    
    echo "      Acceptation des licences..."
    yes | "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
    
    echo "      Installation des composants SDK (cela peut prendre quelques minutes)..."
    "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" "platforms;android-34" "build-tools;34.0.0" "platform-tools"
    
    rm -f "$CMDLINE_TOOLS_ZIP"
    echo "      ✓ Android SDK installé"
fi

# Exporter ANDROID_HOME
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
echo "      ✓ Android SDK: $ANDROID_HOME"

# ============================================
# [2/6] Créer un projet React Native propre
# ============================================
log_message "[2/6] Préparation du projet React Native..."
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
    
    # Créer un nouveau projet React Native (--yes pour éviter les prompts interactifs)
    npx --yes react-native@0.73.4 init "$PROJECT_NAME" --version 0.73.4 --skip-git-init
    
    cd "$PROJECT_NAME"
    
    # Installer les dépendances additionnelles (versions compatibles avec RN 0.73.4)
    echo "      Installation des dépendances..."
    npm install zustand@4.5.0 \
        react-native-svg@13.14.0 \
        react-native-gesture-handler@2.14.0 \
        react-native-reanimated@3.8.1 \
        react-native-document-picker@9.1.0 \
        react-native-fs@2.20.0 \
        @react-native-async-storage/async-storage@1.21.0 \
        react-native-haptic-feedback@2.2.0 \
        react-native-device-info@10.12.0 \
        react-native-safe-area-context@4.8.2
    
    # Configurer Babel pour react-native-reanimated
    echo "      Configuration de Babel pour reanimated..."
    cat > babel.config.js << 'BABELEOF'
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
BABELEOF

    # NE PAS modifier settings.gradle - React Native init le configure correctement
    # Juste ajouter les configurations supplémentaires dans gradle.properties
    echo "      Configuration de Gradle..."
    
    # Ajouter la configuration pour reanimated dans gradle.properties
    if ! grep -q "reactNativeArchitectures" android/gradle.properties; then
        echo "" >> android/gradle.properties
        echo "# React Native Reanimated config" >> android/gradle.properties
        echo "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64" >> android/gradle.properties
    fi
    
    # Créer local.properties avec le chemin du SDK
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    
    echo "      ✓ Projet React Native créé"
else
    echo "      ✓ Projet React Native existant trouvé"
    cd "$BUILD_DIR/$PROJECT_NAME"
    
    # S'assurer que local.properties existe
    if [ ! -f "android/local.properties" ]; then
        echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    fi
fi

# ============================================
# [3/6] Copier les fichiers sources
# ============================================
log_message "[3/6] Copie des fichiers sources..."
echo -e "${YELLOW}[3/6] Copie des fichiers sources...${NC}"

# Supprimer l'ancien src et recopier (pour avoir les dernières modifications)
rm -rf src
mkdir -p src

# Copier les sources avec verbose pour debug
cp -r "$SCRIPT_DIR/src/"* src/
cp "$SCRIPT_DIR/tsconfig.json" .

# Vérifier que theme existe
if [ ! -d "src/theme" ]; then
    echo -e "${RED}ERREUR: src/theme n'existe pas après la copie!${NC}"
    ls -la src/
    exit 1
fi

# Mettre à jour index.js pour pointer vers notre App
cat > index.js << 'EOF'
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
EOF

echo "      ✓ Fichiers sources copiés"

# Copier les icônes personnalisées depuis le dossier icons (synchronisé avec git)
echo "      Copie des icônes personnalisées..."
ICONS_SRC="$SCRIPT_DIR/icons"
RES_DEST="android/app/src/main/res"

# Copier les fichiers drawable (foreground, background)
if [ -d "$ICONS_SRC/drawable" ]; then
    mkdir -p "$RES_DEST/drawable"
    cp -f "$ICONS_SRC/drawable/ic_launcher_background.xml" "$RES_DEST/drawable/" 2>/dev/null || true
    cp -f "$ICONS_SRC/drawable/ic_launcher_foreground_bom.xml" "$RES_DEST/drawable/" 2>/dev/null || true
    cp -f "$ICONS_SRC/drawable/ic_launcher_foreground_pcb.xml" "$RES_DEST/drawable/" 2>/dev/null || true
    echo "      ✓ Drawable copiés"
fi

# Copier les adaptive icons (Android 8+)
if [ -d "$ICONS_SRC/mipmap-anydpi-v26" ]; then
    mkdir -p "$RES_DEST/mipmap-anydpi-v26"
    cp -f "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher.xml" "$RES_DEST/mipmap-anydpi-v26/" 2>/dev/null || true
    cp -f "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher_round.xml" "$RES_DEST/mipmap-anydpi-v26/" 2>/dev/null || true
    echo "      ✓ Adaptive icons copiés"
fi

echo "      ✓ Icônes personnalisées installées"

# ============================================
# [4/6] Configurer l'application
# ============================================
log_message "[4/6] Configuration de l'application..."
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
log_message "[5/6] Build APK Release..."
echo -e "${YELLOW}[5/6] Build APK Release...${NC}"

cd android
chmod +x gradlew

# Nettoyer le cache si demandé
if [ "$1" == "--clean" ] || [ "$2" == "--clean" ]; then
    log_message "Nettoyage du cache Gradle..."
    echo "      Nettoyage du cache Gradle..."
    ./gradlew clean
fi

# Build avec gestion d'erreur détaillée
log_message "Compilation en cours (peut prendre plusieurs minutes)..."
echo "      Compilation en cours (peut prendre plusieurs minutes)..."

# Capture du build avec logs
if [ "$SHARE_LOGS" = true ]; then
    echo "" >> "$LOG_FILE"
    echo "=== GRADLE BUILD OUTPUT ===" >> "$LOG_FILE"
    if ! ./gradlew assembleRelease --stacktrace 2>&1 | tee -a "$LOG_FILE"; then
        log_message "❌ Erreur lors du build Gradle"
        echo -e "${RED}❌ Erreur lors du build${NC}"
        echo ""
        echo "Essayez:"
        echo "  1. ./build_apk.sh --clean --share-logs"
        echo "  2. Vérifiez que Java 17 est installé: java --version"
        echo "  3. Supprimez ~/.gradle/caches et réessayez"
        exit 1
    fi
else
    if ! ./gradlew assembleRelease --stacktrace; then
        echo -e "${RED}❌ Erreur lors du build${NC}"
        echo ""
        echo "Essayez:"
        echo "  1. ./build_apk.sh --clean"
        echo "  2. Vérifiez que Java 17 est installé: java --version"
        echo "  3. Supprimez ~/.gradle/caches et réessayez"
        exit 1
    fi
fi

# ============================================
# [6/6] Copier l'APK
# ============================================
log_message "[6/6] Finalisation..."
echo -e "${YELLOW}[6/6] Finalisation...${NC}"

APK_SOURCE="app/build/outputs/apk/release/app-release.apk"
APK_DEST="$SCRIPT_DIR/build"

mkdir -p "$APK_DEST"

if [ -f "$APK_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST/IBomSelector.apk"
    log_message "✅ Build réussi! APK: $APK_DEST/IBomSelector.apk"
    echo ""
    echo -e "${GREEN}✅ Build réussi!${NC}"
    echo -e "${GREEN}📱 APK: $APK_DEST/IBomSelector.apk${NC}"
    echo ""
    ls -lh "$APK_DEST/IBomSelector.apk"
    
    # Envoyer les logs de succès si demandé
    if [ "$SHARE_LOGS" = true ]; then
        LOGS_PUSHED=true  # Éviter le double push via trap EXIT
        echo "" >> "$LOG_FILE"
        echo "=== BUILD RÉUSSI - $(date) ===" >> "$LOG_FILE"
        ls -lh "$APK_DEST/IBomSelector.apk" >> "$LOG_FILE"
        
        cd "$SCRIPT_DIR/.."
        git add -f build_log.txt 2>/dev/null || true
        git commit -m "build: Build réussi $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || true
        git push 2>/dev/null || true
        
        echo ""
        echo -e "${GREEN}📤 Logs de succès envoyés sur GitHub${NC}"
    fi
else
    log_message "❌ APK non trouvé"
    echo -e "${RED}❌ APK non trouvé${NC}"
    exit 1
fi
