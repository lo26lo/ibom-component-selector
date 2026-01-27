#!/usr/bin/env python3
"""Analyse la structure des données ibom pour voir ce qu'on peut afficher"""
import re
import json
import sys

print("Démarrage de l'analyse...", flush=True)

try:
    import lzstring
    print("lzstring importé", flush=True)
except ImportError:
    print("Installation de lzstring...", flush=True)
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'lzstring'], check=True)
    import lzstring

# Lire le fichier HTML
print("Lecture du fichier HTML...", flush=True)
with open('bom/ibom.html', 'r', encoding='utf-8') as f:
    html = f.read()
print(f"Fichier lu: {len(html)} caractères", flush=True)

# Extraire les données compressées
m = re.search(r'var pcbdata = LZString\.decompressFromBase64\("([^"]+)"\)', html)
if not m:
    print("Pattern non trouvé!")
    exit(1)

# Décompresser
lz = lzstring.LZString()
decompressed = lz.decompressFromBase64(m.group(1))
data = json.loads(decompressed)

print("=" * 60)
print("STRUCTURE DES DONNÉES IBOM")
print("=" * 60)

print("\n1. CLÉS PRINCIPALES:")
for key in data.keys():
    value = data[key]
    if isinstance(value, dict):
        print(f"  - {key}: dict avec {len(value)} clés: {list(value.keys())[:5]}...")
    elif isinstance(value, list):
        print(f"  - {key}: list de {len(value)} éléments")
    else:
        print(f"  - {key}: {type(value).__name__} = {str(value)[:50]}")

print("\n2. DRAWINGS (dessins du PCB):")
drawings = data.get('drawings', {})
if isinstance(drawings, dict):
    for layer, items in drawings.items():
        print(f"  - {layer}: {len(items)} éléments")
        if items and len(items) > 0:
            sample = items[0]
            if isinstance(sample, dict):
                print(f"      Clés: {list(sample.keys())}")

print("\n3. EDGES (contour du PCB):")
edges = data.get('edges', [])
print(f"  - {len(edges)} edges")
if edges:
    print(f"  - Premier edge: {edges[0]}")

print("\n4. FOOTPRINTS (empreintes):")
footprints = data.get('footprints', [])
print(f"  - {len(footprints)} footprints")
if footprints:
    fp = footprints[0]
    print(f"  - Clés d'un footprint: {list(fp.keys())}")
    if 'pads' in fp:
        print(f"  - Pads dans footprint: {len(fp['pads'])}")
        if fp['pads']:
            print(f"  - Clés d'un pad: {list(fp['pads'][0].keys())}")
    if 'drawings' in fp:
        print(f"  - Drawings dans footprint: {len(fp['drawings'])}")
        if fp['drawings']:
            print(f"  - Clés d'un drawing: {list(fp['drawings'][0].keys())}")

print("\n5. TRACKS (pistes):")
tracks = data.get('tracks', {})
if isinstance(tracks, dict):
    for layer, items in tracks.items():
        print(f"  - {layer}: {len(items)} pistes")
        if items:
            print(f"      Clés: {list(items[0].keys()) if isinstance(items[0], dict) else type(items[0])}")

print("\n6. ZONES:")
zones = data.get('zones', {})
if isinstance(zones, dict):
    for layer, items in zones.items():
        print(f"  - {layer}: {len(items)} zones")

print("\n7. SILK (sérigraphie):")
silk = data.get('silkscreen', data.get('silk', {}))
if isinstance(silk, dict):
    for layer, items in silk.items():
        print(f"  - {layer}: {len(items)} éléments")

print("\n8. BOARD_BBOX:")
bbox = data.get('edges_bbox', data.get('board', {}).get('edges_bbox', {}))
print(f"  - {bbox}")
