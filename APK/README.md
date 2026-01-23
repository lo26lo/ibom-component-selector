# IBom Selector - Application Android

Application Android/Tablette pour sélectionner et gérer des composants depuis des fichiers InteractiveHtmlBom (générés par KiCad).

## 📱 Fonctionnalités

### Visualisation PCB
- **Affichage interactif** du PCB avec les composants
- **Zoom +/-** et panoramique tactile
- **Double-tap** pour réinitialiser la vue
- **Sélection rectangulaire** - Dessinez une zone pour sélectionner les composants
- **Rectangle persistant** - La zone sélectionnée reste visible (en jaune) et suit le zoom/pan

### Liste des composants
- **Groupement automatique** par valeur/footprint (toggle avec bouton "Grp")
- **Tri** par colonnes (Ref, Valeur, Footprint, LCSC, Layer, Quantité)
- **Filtrage** par couche (Front/Back) et recherche textuelle
- **En-tête fixe** - Reste visible lors du défilement

### Gestion des composants
- **Double-tap sur une ligne** → Bascule l'état "traité" (fond jaune)
- **Appui long (0.5s)** → Affiche popup avec tous les détails (références complètes, etc.)
- **Checkbox** pour marquer les composants comme traités
- **Boutons "✓All" et "↻"** pour tout marquer/démarquer

### Fichiers LCSC
- **Chargement CSV LCSC** pour associer les codes LCSC aux composants
- Export compatible JLCPCB

### Historique
- **Sauvegarde des sélections** avec nom personnalisé
- **Restauration** des sélections précédentes
- **Mise à jour** de l'état des composants traités

### Export
- **Export CSV** standard
- **Export CSV format LCSC/JLCPCB**

### Interface adaptative
- **Mode Portrait** (téléphone) : PCB en haut, liste en bas
- **Mode Paysage** (tablette) : PCB à gauche, liste à droite
- Adaptation automatique lors de la rotation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MODE PORTRAIT                                  │
│                           (Téléphone vertical)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📂 HTML  │ 📋 LCSC │ 📜 Hist. │  💾  │ 📤 Exp │    <- Toolbar       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                           │  +  │   │   │
│  │                                                           ├─────┤   │   │
│  │                      PCB VIEW                             │  -  │   │   │
│  │                 (sélection tactile)                       ├─────┤   │   │
│  │                                                           │  ⟲  │   │   │
│  │                                                           ├─────┤   │   │
│  │                                                           │ All │   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Couche: [Tous▼]  🔍 [Rechercher...    ] [Grp] [✕]   <- Filtres     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Sélection: 123 comp.    Traités: 5/37    [✓All] [↻]  <- Info       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ✓ │ Ref  │ Valeur │ Footprint │ LCSC │ L │ Qt │  <- En-tête fixe   │   │
│  ├───┼──────┼────────┼───────────┼──────┼───┼────┤                     │   │
│  │ ☐ │ C1,C2│ 100nF  │ C_0603    │ C123 │ F │  2 │                     │   │
│  │ ☑ │ R1..5│ 10k    │ R_0402    │ C456 │ F │  5 │  <- Fond jaune      │   │
│  │ ☐ │ U1   │ STM32  │ QFP-48    │ C789 │ F │  1 │                     │   │
│  │   │  ... │  ...   │   ...     │ ...  │   │    │                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ibom.html: 334 comp., 0 LCSC                        <- Status bar  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              MODE PAYSAGE                                   │
│                         (Tablette horizontale)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📂 HTML  │ 📋 LCSC │ 📜 Hist. │  💾  │ 📤 Exp │    <- Toolbar       │   │
│  ├───────────────────────────────┬─────────────────────────────────────┤   │
│  │                         │ + │ │ Couche: [Tous▼]  🔍 [........] Grp │   │
│  │                         ├───┤ ├─────────────────────────────────────┤   │
│  │                         │ - │ │ Sélection: 123    Traités: 5/37    │   │
│  │      PCB VIEW           ├───┤ ├─────────────────────────────────────┤   │
│  │                         │ ⟲ │ │ ✓ │Ref │Valeur│Footprint│LCSC│L│Qt│   │
│  │   (zone plus grande     ├───┤ ├───┼────┼──────┼─────────┼────┼─┼──┤   │
│  │    pour sélection)      │All│ │ ☐ │C1,2│ 100nF│ C_0603  │C123│F│ 2│   │
│  │                         │   │ │ ☑ │R1.5│ 10k  │ R_0402  │C456│F│ 5│   │
│  │                         │   │ │ ☐ │U1  │ STM32│ QFP-48  │C789│F│ 1│   │
│  │                         │   │ │   │ ...│  ... │   ...   │ ...│ │  │   │
│  ├───────────────────────────────┴─────────────────────────────────────┤   │
│  │ ibom.html: 334 comp., 0 LCSC                        <- Status bar  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Prérequis pour la compilation

### Sur Linux (recommandé)

```bash
# Installer les dépendances système
sudo apt update
sudo apt install -y python3 python3-pip python3-venv \
    git zip unzip openjdk-17-jdk autoconf libtool pkg-config \
    zlib1g-dev libncurses5-dev libncursesw5-dev libtinfo5 \
    cmake libffi-dev libssl-dev

# Créer un environnement virtuel
python3 -m venv .venv
source .venv/bin/activate

# Installer Buildozer et Cython
pip install buildozer cython
```

### Sur Windows (via WSL2)

1. Installer WSL2 : `wsl --install -d Ubuntu`
2. Redémarrer le PC
3. Suivre les instructions Linux ci-dessus dans le terminal WSL

## 📦 Compilation de l'APK

### Debug APK

```bash
cd APK
buildozer android debug
```

L'APK sera généré dans `bin/ibomselector-X.X.X-arm64-v8a_armeabi-v7a-debug.apk`

### En cas de problème "Argument list too long"

```bash
# Nettoyer complètement le cache
rm -rf .buildozer bin
buildozer android debug
```

### Release APK (signé)

```bash
buildozer android release
```

## 📲 Installation sur Android

### Via ADB

```bash
adb install bin/ibomselector-*-debug.apk
```

### Manuellement

1. Copier l'APK sur le téléphone
2. Autoriser l'installation depuis des sources inconnues
3. Installer l'APK

## 📋 Permissions requises

- `READ_EXTERNAL_STORAGE` - Lire les fichiers HTML/CSV
- `WRITE_EXTERNAL_STORAGE` - Sauvegarder les exports
- `MANAGE_EXTERNAL_STORAGE` - Accès complet aux fichiers (Android 11+)
- `INTERNET` - Non utilisé actuellement

## 🎮 Guide d'utilisation

### 1. Charger un fichier HTML
- Appuyer sur **📂 HTML**
- Naviguer vers le fichier `ibom.html` généré par InteractiveHtmlBom

### 2. (Optionnel) Charger le fichier LCSC
- Appuyer sur **📋 LCSC**
- Sélectionner le fichier `BOM-lcsc.csv`

### 3. Sélectionner des composants
- Sur le PCB, **glisser** pour dessiner une zone de sélection
- Ou appuyer sur **All** pour tout sélectionner

### 4. Gérer les composants
- **Double-tap** sur une ligne pour la marquer comme traitée (devient jaune)
- **Appui long** pour voir tous les détails
- Utiliser les filtres pour affiner la vue

### 5. Sauvegarder la sélection
- Appuyer sur **💾** pour sauvegarder dans l'historique
- Donner un nom à la sélection

### 6. Exporter
- Appuyer sur **📤 Exp**
- Choisir le format d'export (CSV ou CSV LCSC)

## 📁 Structure des fichiers

```
APK/
├── main.py           # Code source principal
├── buildozer.spec    # Configuration Buildozer
├── requirements.txt  # Dépendances Python
└── README.md         # Ce fichier
```

## 🛠️ Technologies utilisées

- **Python 3** - Langage principal
- **Kivy** - Framework UI multiplateforme
- **Buildozer** - Outil de compilation Android
- **python-for-android** - Toolchain Android

## 📝 Notes

- Les fichiers d'historique sont sauvegardés à côté du fichier HTML (`.nomfichier_history.json`)
- Le format LZ-String compressé des fichiers ibom récents est supporté
- Compatible avec Android 5.0+ (API 21+)

## 🐛 Dépannage

### L'app ne démarre pas
- Vérifier les permissions dans les paramètres Android
- Redémarrer l'application

### Fichier HTML non lu
- S'assurer que c'est un fichier généré par InteractiveHtmlBom
- Vérifier que les permissions de stockage sont accordées

### PCB ne s'affiche pas
- Le fichier HTML peut être dans un format non supporté
- Vérifier la console de logs (adb logcat)

## 📄 Licence

MIT License
