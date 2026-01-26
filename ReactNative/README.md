# IBom Selector - React Native

Migration complète de l'application IBom Selector de Kivy/Python vers React Native/TypeScript.

## Fonctionnalités

Toutes les fonctionnalités de l'application originale sont préservées :

- ✅ **Chargement fichiers IBom HTML** - Support des fichiers compressés LZ-String
- ✅ **Chargement CSV LCSC** - Import/Export au format LCSC
- ✅ **Vue PCB interactive** - Zoom, pan, sélection rectangulaire
- ✅ **Liste des composants** - Filtrage, tri, recherche, groupement
- ✅ **Gestion de la sélection** - Checkbox, navigation, tout cocher/décocher
- ✅ **Historique** - Sauvegarde et restauration des sessions
- ✅ **Export** - CSV LCSC et liste des références
- ✅ **Mode E-ink** - Thème optimisé pour écrans e-paper (Boox)
- ✅ **Sauvegarde automatique** - Intervalle configurable
- ✅ **Retour haptique** - Vibrations sur actions

## Installation

```bash
# Installer les dépendances
npm install

# iOS uniquement
cd ios && pod install && cd ..
```

## Développement

```bash
# Démarrer Metro bundler
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios
```

## Build Android APK

```bash
cd android
./gradlew assembleRelease
```

L'APK sera disponible dans `android/app/build/outputs/apk/release/`

## Architecture

```
src/
├── core/           # Logique métier
│   ├── types.ts    # Interfaces TypeScript
│   ├── LZString.ts # Décompression LZ-String
│   ├── IBomParser.ts # Parsing HTML IBom
│   └── CSVLoader.ts  # Parsing CSV LCSC
├── theme/          # Système de thèmes
│   ├── colors.ts   # Palettes normal/e-ink
│   ├── spacing.ts  # Constantes de spacing
│   └── ThemeContext.tsx # Context React
├── store/          # State management (Zustand)
│   ├── useAppStore.ts        # État principal
│   ├── usePreferencesStore.ts # Préférences persistées
│   └── useHistoryStore.ts    # Historique des sessions
├── hooks/          # Custom hooks
│   ├── useEinkDetect.ts # Détection mode e-ink
│   ├── useHaptic.ts     # Retour haptique
│   └── useFileSystem.ts # Gestion fichiers
├── components/     # Composants React Native
│   ├── common/     # Boutons, modals, toggles
│   ├── PCBView/    # Vue SVG du PCB
│   ├── ComponentList/ # Liste scrollable
│   └── Modals/     # Toutes les modals
└── screens/        # Écrans de navigation
    ├── HomeScreen.tsx
    └── LoadingScreen.tsx
```

## Dépendances principales

- **react-native-svg** - Rendu SVG du PCB
- **react-native-gesture-handler** - Gestion des gestes
- **react-native-reanimated** - Animations fluides
- **zustand** - State management léger
- **react-native-document-picker** - Sélection de fichiers
- **react-native-fs** - Lecture/écriture fichiers
- **react-native-haptic-feedback** - Vibrations

## Différences avec la version Kivy

| Aspect | Kivy | React Native |
|--------|------|--------------|
| Langage | Python | TypeScript |
| Rendu PCB | Canvas | react-native-svg |
| État | Properties | Zustand stores |
| Thème | Dictionnaire | Context API |
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
