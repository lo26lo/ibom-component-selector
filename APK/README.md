# IBom Selector - Version Android

Application Android pour sélectionner des composants depuis des fichiers InteractiveHtmlBom.

## Prérequis pour la compilation

### Sur Linux (recommandé pour Buildozer)

```bash
# Installer les dépendances système
sudo apt update
sudo apt install -y python3 python3-pip python3-venv \
    git zip unzip openjdk-17-jdk autoconf libtool pkg-config \
    zlib1g-dev libncurses5-dev libncursesw5-dev libtinfo5 \
    cmake libffi-dev libssl-dev

# Installer Buildozer
pip3 install --user buildozer

# Installer Cython
pip3 install --user cython
```

### Sur Windows (via WSL2)

1. Installer WSL2 avec Ubuntu
2. Suivre les instructions Linux ci-dessus

## Compilation de l'APK

### Debug APK

```bash
cd APK
buildozer android debug
```

L'APK sera généré dans `bin/ibomselector-1.0.0-arm64-v8a_armeabi-v7a-debug.apk`

### Release APK

```bash
buildozer android release
```

## Installation sur appareil Android

### Via ADB

```bash
adb install bin/ibomselector-1.0.0-arm64-v8a_armeabi-v7a-debug.apk
```

### Manuellement

1. Copier l'APK sur le téléphone
2. Activer "Sources inconnues" dans les paramètres
3. Ouvrir l'APK pour l'installer

## Test local (PC)

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer l'application
python main.py
```

## Fonctionnalités

- **Charger des fichiers HTML** - Supporte les formats InteractiveHtmlBom compressés et non compressés
- **Visualisation PCB** - Affiche le PCB avec les composants
- **Sélection tactile** - Dessinez un rectangle pour sélectionner les composants
- **Export CSV** - Exportez les composants sélectionnés vers un fichier CSV

## Structure des fichiers

```
APK/
├── main.py              # Application principale Kivy
├── buildozer.spec       # Configuration Buildozer pour Android
├── requirements.txt     # Dépendances Python
└── README.md           # Ce fichier
```

## Notes

- L'application demande les permissions de lecture/écriture du stockage
- Les fichiers HTML doivent être accessibles depuis le stockage de l'appareil
- Les exports CSV sont sauvegardés dans le dossier de stockage principal

## Dépannage

### Erreur "SDK not found"
```bash
buildozer android clean
buildozer android debug
```

### Erreur de permissions Android
Assurez-vous que les permissions sont accordées dans les paramètres de l'application.

### L'application ne se lance pas
Vérifiez les logs avec:
```bash
adb logcat | grep python
```
