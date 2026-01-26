#!/bin/bash
# Script d'initialisation et build simplifié

echo "=== IBom Selector - Setup & Build ==="

cd "$(dirname "$0")"

# 1. Installer npm dependencies
echo "[1/4] Installation des dépendances npm..."
npm install

# 2. Vérifier/créer gradlew
if [ ! -f "android/gradlew" ]; then
    echo "[2/4] Téléchargement du Gradle Wrapper..."
    
    mkdir -p android/gradle/wrapper
    
    # Télécharger gradle-wrapper.jar
    curl -L -s -o android/gradle/wrapper/gradle-wrapper.jar \
        "https://github.com/nicerobot/gradlew/raw/master/gradle/wrapper/gradle-wrapper.jar"
    
    # Créer gradlew script
    cat > android/gradlew << 'GRADLEW'
#!/bin/sh
DIRNAME=$(dirname "$0")
GRADLE_HOME="${DIRNAME}/gradle/wrapper"
exec java -jar "${GRADLE_HOME}/gradle-wrapper.jar" "$@"
GRADLEW
    
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

    echo "   ✓ Gradle Wrapper configuré"
else
    echo "[2/4] Gradle Wrapper déjà présent ✓"
fi

# 3. Build
echo "[3/4] Build APK Release..."
cd android
./gradlew assembleRelease

# 4. Copier APK
echo "[4/4] Finalisation..."
mkdir -p ../build
cp app/build/outputs/apk/release/app-release.apk ../build/IBomSelector.apk 2>/dev/null && \
    echo "✅ APK disponible: build/IBomSelector.apk" || \
    echo "⚠️  APK dans: android/app/build/outputs/apk/release/"
