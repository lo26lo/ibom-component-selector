#!/usr/bin/env pwsh
# Script de build pour générer l'APK Release (PowerShell)

Write-Host "=== IBom Selector - Build APK ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si on est dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "Erreur: Exécutez ce script depuis le répertoire ReactNative/" -ForegroundColor Red
    exit 1
}

# Installer les dépendances si nécessaire
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] Installation des dépendances npm..." -ForegroundColor Yellow
    npm install
}

# Aller dans le dossier android
Set-Location android

# Nettoyer les builds précédents
Write-Host "[2/3] Nettoyage des builds précédents..." -ForegroundColor Yellow
& .\gradlew.bat clean

# Build APK Release
Write-Host "[3/3] Build APK Release..." -ForegroundColor Yellow
& .\gradlew.bat assembleRelease

# Vérifier le succès
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build réussi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 APK disponible ici:" -ForegroundColor Cyan
    Write-Host "   android\app\build\outputs\apk\release\app-release.apk"
    Write-Host ""
    
    # Copier l'APK vers un emplacement plus accessible
    $buildDir = "..\build"
    if (-not (Test-Path $buildDir)) {
        New-Item -ItemType Directory -Path $buildDir | Out-Null
    }
    Copy-Item "app\build\outputs\apk\release\app-release.apk" "$buildDir\IBomSelector.apk" -Force
    Write-Host "   Copié vers: build\IBomSelector.apk" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

Set-Location ..
Write-Host ""
Write-Host "Terminé!" -ForegroundColor Green
