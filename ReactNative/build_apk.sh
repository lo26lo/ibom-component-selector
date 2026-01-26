#!/bin/bash
# Script de build pour générer l'APK Release

set -e

echo "=== IBom Selector - Build APK ==="
echo ""

# Aller dans le répertoire du script
cd "$(dirname "$0")"

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "Erreur: package.json non trouvé!"
    exit 1
fi

# 1. Installer les dépendances npm
echo "[1/4] Vérification des dépendances npm..."
if [ ! -d "node_modules" ]; then
    echo "      Installation des dépendances npm..."
    npm install
else
    echo "      ✓ node_modules présent"
fi

# 2. Configurer Gradle Wrapper si nécessaire
echo "[2/4] Configuration Gradle Wrapper..."
if [ ! -f "android/gradlew" ] || [ ! -f "android/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "      Téléchargement du Gradle Wrapper..."
    
    mkdir -p android/gradle/wrapper
    
    # Télécharger gradle-wrapper.jar depuis le repo officiel Gradle
    curl -L -s -o android/gradle/wrapper/gradle-wrapper.jar \
        "https://raw.githubusercontent.com/gradle/gradle/v8.6.0/gradle/wrapper/gradle-wrapper.jar"
    
    # Créer le script gradlew
    cat > android/gradlew << 'GRADLEW_SCRIPT'
#!/bin/sh

##############################################################################
# Gradle start up script for POSIX
##############################################################################

APP_HOME=$(cd "$(dirname "$0")" && pwd -P)

# Determine the Java command to use
if [ -n "$JAVA_HOME" ] ; then
    JAVACMD="$JAVA_HOME/bin/java"
else
    JAVACMD=java
fi

CLASSPATH="$APP_HOME/gradle/wrapper/gradle-wrapper.jar"

exec "$JAVACMD" -Xmx64m -Xms64m -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"
GRADLEW_SCRIPT
    
    chmod +x android/gradlew
    
    # Créer gradle-wrapper.properties
    cat > android/gradle/wrapper/gradle-wrapper.properties << 'PROPS'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.6-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
PROPS

    echo "      ✓ Gradle Wrapper configuré"
else
    echo "      ✓ Gradle Wrapper présent"
fi

# 3. Nettoyer et builder
echo "[3/4] Build APK Release..."
cd android
chmod +x gradlew
./gradlew clean assembleRelease

# 4. Copier APK
echo "[4/4] Finalisation..."
cd ..
mkdir -p build

if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp android/app/build/outputs/apk/release/app-release.apk build/IBomSelector.apk
    echo ""
    echo "✅ Build réussi!"
    echo "📱 APK: build/IBomSelector.apk"
else
    echo ""
    echo "❌ APK non trouvé"
    exit 1
fi
