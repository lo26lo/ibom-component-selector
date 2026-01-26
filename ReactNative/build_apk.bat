@echo off
REM Script de build pour générer l'APK Release (Windows)

echo === IBom Selector - Build APK ===
echo.

REM Vérifier si on est dans le bon répertoire
if not exist "package.json" (
    echo Erreur: Executez ce script depuis le repertoire ReactNative/
    exit /b 1
)

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo [1/3] Installation des dependances npm...
    call npm install
)

REM Aller dans le dossier android
cd android

REM Nettoyer les builds précédents
echo [2/3] Nettoyage des builds precedents...
call gradlew.bat clean

REM Build APK Release
echo [3/3] Build APK Release...
call gradlew.bat assembleRelease

REM Vérifier le succès
if %ERRORLEVEL% equ 0 (
    echo.
    echo Build reussi!
    echo.
    echo APK disponible ici:
    echo    android\app\build\outputs\apk\release\app-release.apk
    echo.
    
    REM Copier l'APK vers un emplacement plus accessible
    if not exist "..\build" mkdir "..\build"
    copy "app\build\outputs\apk\release\app-release.apk" "..\build\IBomSelector.apk"
    echo    Copie vers: build\IBomSelector.apk
) else (
    echo.
    echo Erreur lors du build
    exit /b 1
)

cd ..
echo.
echo Termine!
pause
