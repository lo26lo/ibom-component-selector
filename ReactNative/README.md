# 🔧 IBom Selector - React Native

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.73.4-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)

> Application mobile pour la visualisation et la gestion de composants électroniques depuis des fichiers InteractiveHtmlBom (IBom).

Migration complète de l'application IBom Selector de **Kivy/Python** vers **React Native/TypeScript** avec des performances améliorées et une interface native.

---

## 📱 Captures d'écran

| Vue principale | Vue PCB | Mode E-ink |
|---------------|---------|------------|
| Liste composants avec filtres | Vue interactive du circuit | Thème optimisé e-paper |

---

## ✨ Fonctionnalités

### 🔄 Chargement de fichiers
- ✅ **Fichiers IBom HTML** - Support complet des fichiers InteractiveHtmlBom
  - Décompression automatique LZ-String (Base64)
  - Parsing JSON direct pour fichiers non compressés
  - Extraction des footprints, pads, edges et silkscreen
- ✅ **Fichiers CSV LCSC** - Import des données de commande LCSC
  - Correspondance automatique par référence
  - Association des numéros de pièces LCSC

### 🖥️ Vue PCB Interactive
- ✅ **Rendu SVG haute qualité** via react-native-svg
  - Affichage des composants, pads et edges
  - Option silkscreen activable
  - Tracks (pistes) optionnelles
- ✅ **Gestes tactiles avancés** via react-native-gesture-handler
  - Zoom par pincement fluide
  - Pan/déplacement avec inertie
  - Animations natives avec Reanimated 3
- ✅ **Sélection rectangulaire** - Sélectionner plusieurs composants d'un geste
- ✅ **Highlight intelligent** - Mise en surbrillance des composants sélectionnés

### 📋 Liste des composants
- ✅ **Filtrage multi-critères**
  - Par couche (Front/Back/Tous)
  - Par statut (Fait/À faire/Tous)
  - Par recherche textuelle (ref, valeur, footprint, LCSC)
- ✅ **Tri flexible**
  - Par référence, valeur, footprint, quantité
  - Ordre croissant/décroissant
- ✅ **Groupement par valeur** - Regroupement des composants identiques
- ✅ **Barre de progression** - Visualisation de l'avancement
- ✅ **Navigation séquentielle** - Précédent/Suivant entre composants

### 💾 Gestion de la sélection
- ✅ **Checkbox sur chaque composant** - Marquage individuel
- ✅ **Tout cocher/décocher** - Actions groupées
- ✅ **État "traité"** - Marquer les composants placés
- ✅ **Persistance automatique** - L'état survit aux redémarrages

### 📁 Historique & Sauvegarde
- ✅ **Historique des sessions** - Enregistrement horodaté
- ✅ **Sauvegarde nommée** - Créer des points de sauvegarde
- ✅ **Restauration** - Recharger une session précédente
- ✅ **Sauvegarde automatique** - Intervalle configurable (5, 10, 15, 30 min)

### 📤 Export
- ✅ **Export CSV LCSC** - Format compatible commande
- ✅ **Export liste de références** - Texte simple

### ⚙️ Préférences
- ✅ **Mode E-ink** - Thème noir/blanc optimisé pour écrans e-paper (Boox)
- ✅ **Détection automatique** - Reconnaissance des appareils Boox
- ✅ **Taille de police** - Ajustable (10-15px)
- ✅ **Vibration** - Retour haptique activable/désactivable
- ✅ **Affichage silkscreen** - Toggle on/off
- ✅ **Groupement par valeur** - Activer/désactiver

---

## 🛠️ Installation

### Prérequis

- Node.js >= 18
- npm ou yarn
- Android Studio (pour Android)
- Xcode (pour iOS, macOS uniquement)
- JDK 17

### Installation des dépendances

```bash
# Cloner le repository
git clone <repo-url>
cd ReactNative

# Installer les dépendances
npm install

# iOS uniquement (macOS)
cd ios && pod install && cd ..
```

---

## 🚀 Développement

### Démarrer le bundler Metro

```bash
npm start
```

### Lancer sur Android

```bash
npm run android
```

### Lancer sur iOS (macOS uniquement)

```bash
npm run ios
```

### Nettoyer le cache

```bash
npm run clean
```

---

## 📦 Build APK Production

### 🐧 Linux/macOS - Script automatisé `build_apk.sh`

Le script `build_apk.sh` gère **automatiquement tout le processus de build**, y compris l'installation des prérequis :

```bash
# Build standard
./build_apk.sh

# Build avec nettoyage du cache
./build_apk.sh --clean

# Build avec envoi des logs sur GitHub (debug à distance)
./build_apk.sh --share-logs
```

#### Ce que fait le script :

| Étape | Description |
|-------|-------------|
| **[1/6] Prérequis** | Vérifie et installe automatiquement Node.js, Java 17, Android SDK |
| **[2/6] Projet RN** | Crée un projet React Native 0.73.4 propre avec toutes les dépendances |
| **[3/6] Sources** | Copie les fichiers sources TypeScript depuis `src/` |
| **[4/6] Config** | Configure les permissions Android, Proguard, Babel pour Reanimated |
| **[5/6] Build** | Compile l'APK Release avec Gradle |
| **[6/6] Finalisation** | Copie l'APK dans `build/IBomSelector.apk` |

#### Options :

| Option | Description |
|--------|-------------|
| `--clean` | Nettoie le cache Gradle et recrée le projet |
| `--share-logs` | Envoie les logs de build sur GitHub pour debug à distance |

### 🪟 Windows - Scripts PowerShell/Batch

```powershell
# PowerShell
.\build_apk.ps1

# Batch
.\build_apk.bat
```

Ces scripts font :
1. Installation des dépendances npm (si nécessaire)
2. Nettoyage des builds précédents
3. Build APK Release
4. Copie de l'APK vers `build\IBomSelector.apk`

### 📍 Emplacement de l'APK

```
build/IBomSelector.apk
```

### ⚠️ Prérequis Windows

Sur Windows, vous devez avoir installé au préalable :
- Node.js 18+
- JDK 17 (ex: [Adoptium Temurin](https://adoptium.net/))
- Android SDK (via Android Studio)

---

## 🏗️ Architecture

```
src/
├── core/                        # 🔧 Logique métier
│   ├── types.ts                 # Interfaces TypeScript
│   ├── LZString.ts              # Décompression LZ-String
│   ├── IBomParser.ts            # Parsing HTML IBom
│   └── CSVLoader.ts             # Parsing CSV LCSC
│
├── theme/                       # 🎨 Système de thèmes
│   ├── colors.ts                # Palettes normal/e-ink
│   ├── spacing.ts               # Constantes de spacing
│   └── ThemeContext.tsx         # Context React pour le thème
│
├── store/                       # 📦 State management (Zustand)
│   ├── useAppStore.ts           # État principal de l'app
│   ├── usePreferencesStore.ts   # Préférences utilisateur (persistées)
│   └── useHistoryStore.ts       # Historique des sessions
│
├── hooks/                       # 🪝 Custom hooks
│   ├── useEinkDetect.ts         # Détection automatique mode e-ink
│   ├── useHaptic.ts             # Retour haptique
│   ├── useFileSystem.ts         # Gestion fichiers
│   ├── useOrientation.ts        # Détection orientation écran
│   └── usePermissions.ts        # Gestion permissions Android
│
├── components/                  # 🧩 Composants React Native
│   ├── common/                  # Composants réutilisables
│   │   ├── ThemedButton.tsx     # Bouton avec thème
│   │   ├── ThemedModal.tsx      # Modal avec thème
│   │   ├── ThemedToggle.tsx     # Toggle switch avec thème
│   │   ├── ProgressBar.tsx      # Barre de progression
│   │   └── AnimatedProgress.tsx # Barre animée
│   │
│   ├── PCBView/                 # Vue du circuit
│   │   └── PCBView.tsx          # Rendu SVG interactif
│   │
│   ├── ComponentList/           # Liste des composants
│   │   ├── ComponentList.tsx    # Container principal
│   │   ├── ComponentRow.tsx     # Ligne de composant
│   │   ├── FilterBar.tsx        # Barre de filtres
│   │   └── ListHeader.tsx       # En-tête avec colonnes
│   │
│   └── Modals/                  # Fenêtres modales
│       ├── ComponentDetailModal.tsx  # Détails composant
│       ├── ExportModal.tsx           # Options d'export
│       ├── FilePicker.tsx            # Sélection fichiers
│       ├── HistoryModal.tsx          # Historique sessions
│       ├── PreferencesModal.tsx      # Préférences
│       └── SaveSelectionModal.tsx    # Sauvegarde nommée
│
└── screens/                     # 📱 Écrans de navigation
    ├── HomeScreen.tsx           # Écran principal
    └── LoadingScreen.tsx        # Écran de chargement
```

---

## 📚 Dépendances principales

| Package | Version | Usage |
|---------|---------|-------|
| `react-native` | 0.73.4 | Framework mobile |
| `react-native-svg` | 14.1.0 | Rendu SVG du PCB |
| `react-native-gesture-handler` | 2.14.1 | Gestes tactiles |
| `react-native-reanimated` | 3.8.1 | Animations natives |
| `zustand` | 4.5.0 | State management |
| `@react-native-async-storage/async-storage` | 1.21.0 | Persistance locale |
| `react-native-document-picker` | 9.1.1 | Sélection de fichiers |
| `react-native-fs` | 2.20.0 | Lecture/écriture fichiers |
| `react-native-haptic-feedback` | 2.2.0 | Vibrations |
| `react-native-device-info` | 10.12.0 | Info appareil (détection e-ink) |
| `react-native-safe-area-context` | 4.8.2 | Gestion zones sûres |

---

## 🔄 Migration depuis Kivy

| Aspect | Kivy/Python | React Native/TypeScript |
|--------|-------------|------------------------|
| **Langage** | Python 3.x | TypeScript 5.3 |
| **Rendu PCB** | Canvas Kivy | react-native-svg |
| **Gestes** | Touch events | react-native-gesture-handler |
| **Animations** | Kivy Animation | react-native-reanimated |
| **État** | Properties | Zustand stores |
| **Persistance** | JSON files | AsyncStorage |
| **Thème** | Dictionnaire Python | React Context API |
| **UI Components** | Kivy widgets | React Native components |

### Améliorations par rapport à Kivy

- 🚀 **Performances** - Animations 60fps natives
- 📱 **UI Native** - Look & feel Android/iOS natif
- 🧩 **Modularité** - Architecture composants réutilisables
- 🔒 **Type Safety** - TypeScript pour moins de bugs
- 🎨 **Theming** - Système de thème plus flexible
- 📦 **Build** - Toolchain moderne (Metro, Gradle)

---

## 🎯 Utilisation

1. **Ouvrir un fichier IBom** - Appuyer sur "Ouvrir fichier"
2. **Optionnel: Charger CSV LCSC** - Pour les infos de commande
3. **Parcourir les composants** - Liste ou vue PCB
4. **Cocher les composants traités** - Suivi de l'avancement
5. **Sauvegarder** - Manuel ou automatique
6. **Exporter** - CSV ou liste de références

---

## ⚙️ Configuration Android

### Permissions requises (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Configuration Gradle

- `minSdkVersion`: 24
- `targetSdkVersion`: 34
- `compileSdkVersion`: 34

---

## 🐛 Dépannage

### Erreur "Unable to load script"

```bash
npm start --reset-cache
```

### Erreur de build Android

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Problème de permissions fichiers

Vérifier que l'app a les permissions de stockage dans les paramètres Android.

---

## 📄 License

MIT © 2024-2026

---

## 🤝 Contribution

Les contributions sont bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
| Gestures | touch_down/up | gesture-handler |
| Persistence | JSON files | AsyncStorage |

## Configuration E-ink

L'application détecte automatiquement les appareils Boox et active le mode e-ink.
Le mode peut aussi être activé manuellement dans les préférences.

Optimisations e-ink :
- Fond blanc opaque
- Bordures noires visibles
- Pas de dégradés ni transparences
- Contrastes maximaux
