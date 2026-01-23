"""
IBom Selector - Version Android avec Kivy
Application de sélection de composants depuis un fichier InteractiveHtmlBom
Avec tri, sauvegarde d'historique et marquage des composants traités
Compatible avec les versions récentes d'Android (API 29+)
"""

__version__ = '1.0.1'

import os
import json
import re
import csv
from pathlib import Path
from datetime import datetime

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.button import Button
from kivy.uix.togglebutton import ToggleButton
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.checkbox import CheckBox
from kivy.uix.popup import Popup
from kivy.uix.spinner import Spinner
from kivy.uix.filechooser import FileChooserListView
from kivy.uix.widget import Widget
from kivy.graphics import Color, Rectangle, Line, Ellipse
from kivy.core.window import Window
from kivy.utils import platform
from kivy.clock import Clock
from kivy.metrics import dp
from kivy.properties import ListProperty, StringProperty, BooleanProperty

# Pour Android - Permissions améliorées
if platform == 'android':
    from android.permissions import request_permissions, Permission, check_permission
    from android.storage import primary_external_storage_path, app_storage_path
    from jnius import autoclass
    
    # Classes Java - chargées de manière lazy pour éviter les crashs au démarrage
    _java_classes = {}
    
    def _get_java_class(class_name):
        """Charge une classe Java de manière lazy et sécurisée"""
        if class_name not in _java_classes:
            try:
                _java_classes[class_name] = autoclass(class_name)
            except Exception as e:
                print(f"Erreur chargement classe {class_name}: {e}")
                return None
        return _java_classes[class_name]
    
    def request_all_permissions():
        """Demande toutes les permissions nécessaires pour Android"""
        try:
            permissions = [
                Permission.READ_EXTERNAL_STORAGE,
                Permission.WRITE_EXTERNAL_STORAGE,
            ]
            
            # D'abord demander les permissions de base
            def on_permissions_result(permissions_list, grant_results):
                print(f"Permissions result: {grant_results}")
                # Après les permissions de base, gérer Android 11+
                _request_manage_storage()
            
            request_permissions(permissions, on_permissions_result)
            
        except Exception as e:
            print(f"Erreur request_all_permissions: {e}")
    
    def _request_manage_storage():
        """Demande MANAGE_EXTERNAL_STORAGE pour Android 11+ si nécessaire"""
        try:
            # VERSION est une classe interne de Build, il faut la charger avec $
            BuildVERSION = _get_java_class('android.os.Build$VERSION')
            if BuildVERSION is None:
                print("Impossible de charger android.os.Build$VERSION")
                return
                
            sdk_int = BuildVERSION.SDK_INT
            print(f"Android SDK version: {sdk_int}")
            
            # Pour Android 11+ (API 30+), on a besoin de MANAGE_EXTERNAL_STORAGE
            if sdk_int >= 30:
                Environment = _get_java_class('android.os.Environment')
                if Environment is None:
                    return
                    
                # Vérifier si on a déjà l'accès
                if not Environment.isExternalStorageManager():
                    try:
                        PythonActivity = _get_java_class('org.kivy.android.PythonActivity')
                        Intent = _get_java_class('android.content.Intent')
                        Settings = _get_java_class('android.provider.Settings')
                        
                        if PythonActivity and Intent and Settings:
                            activity = PythonActivity.mActivity
                            if activity:
                                intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                                activity.startActivity(intent)
                    except Exception as e:
                        print(f"Erreur lors de la demande de permission MANAGE: {e}")
                        # Fallback: essayer avec l'URI spécifique
                        try:
                            PythonActivity = _get_java_class('org.kivy.android.PythonActivity')
                            Intent = _get_java_class('android.content.Intent')
                            Settings = _get_java_class('android.provider.Settings')
                            Uri = _get_java_class('android.net.Uri')
                            
                            if PythonActivity and Intent and Settings and Uri:
                                activity = PythonActivity.mActivity
                                if activity:
                                    intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                                    uri = Uri.parse("package:org.lolobom.ibomselector")
                                    intent.setData(uri)
                                    activity.startActivity(intent)
                        except Exception as e2:
                            print(f"Erreur fallback MANAGE: {e2}")
        except Exception as e:
            print(f"Erreur _request_manage_storage: {e}")
    
    def get_storage_paths():
        """Retourne une liste de chemins de stockage disponibles"""
        paths = []
        
        # Stockage interne de l'app
        try:
            app_path = app_storage_path()
            if app_path and os.path.exists(app_path):
                paths.append(('App Storage', app_path))
        except:
            pass
        
        # Stockage externe principal
        try:
            ext_path = primary_external_storage_path()
            if ext_path and os.path.exists(ext_path):
                paths.append(('Internal Storage', ext_path))
        except:
            pass
        
        # Download folder
        try:
            download_path = os.path.join(primary_external_storage_path(), 'Download')
            if os.path.exists(download_path):
                paths.append(('Downloads', download_path))
        except:
            pass
        
        # Documents folder
        try:
            docs_path = os.path.join(primary_external_storage_path(), 'Documents')
            if os.path.exists(docs_path):
                paths.append(('Documents', docs_path))
        except:
            pass
        
        return paths
else:
    def request_all_permissions():
        pass
    
    def get_storage_paths():
        return [('Home', str(Path.home()))]


class LZString:
    """Décompresseur LZ-String pour les données InteractiveHtmlBom"""
    
    @staticmethod
    def decompress_from_base64(compressed):
        """Décompresse une chaîne encodée en base64"""
        if not compressed:
            return ""
        
        key_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
        base_reverse_dict = {char: i for i, char in enumerate(key_str)}
        
        try:
            length = len(compressed)
            get_next_value = lambda index: base_reverse_dict.get(compressed[index], 0)
            result = LZString._decompress(length, 32, get_next_value)
            return result
        except Exception as e:
            print(f"Erreur de décompression: {e}")
            return None
    
    @staticmethod
    def _decompress(length, reset_value, get_next_value):
        """Algorithme de décompression LZ"""
        dictionary = {}
        enlargeIn = 4
        dictSize = 4
        numBits = 3
        entry = ""
        result = []
        
        data_val = get_next_value(0)
        data_position = reset_value
        data_index = 1
        
        for i in range(3):
            dictionary[i] = i
        
        bits = 0
        maxpower = 2 ** 2
        power = 1
        
        while power != maxpower:
            resb = data_val & data_position
            data_position >>= 1
            if data_position == 0:
                data_position = reset_value
                data_val = get_next_value(data_index)
                data_index += 1
            bits |= (1 if resb > 0 else 0) * power
            power <<= 1
        
        next_val = bits
        if next_val == 0:
            bits = 0
            maxpower = 2 ** 8
            power = 1
            while power != maxpower:
                resb = data_val & data_position
                data_position >>= 1
                if data_position == 0:
                    data_position = reset_value
                    data_val = get_next_value(data_index)
                    data_index += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            c = chr(bits)
        elif next_val == 1:
            bits = 0
            maxpower = 2 ** 16
            power = 1
            while power != maxpower:
                resb = data_val & data_position
                data_position >>= 1
                if data_position == 0:
                    data_position = reset_value
                    data_val = get_next_value(data_index)
                    data_index += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            c = chr(bits)
        elif next_val == 2:
            return ""
        
        dictionary[3] = c
        w = c
        result.append(c)
        
        while True:
            if data_index > length:
                return ""
            
            bits = 0
            maxpower = 2 ** numBits
            power = 1
            while power != maxpower:
                resb = data_val & data_position
                data_position >>= 1
                if data_position == 0:
                    data_position = reset_value
                    data_val = get_next_value(data_index)
                    data_index += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            
            c = bits
            if c == 0:
                bits = 0
                maxpower = 2 ** 8
                power = 1
                while power != maxpower:
                    resb = data_val & data_position
                    data_position >>= 1
                    if data_position == 0:
                        data_position = reset_value
                        data_val = get_next_value(data_index)
                        data_index += 1
                    bits |= (1 if resb > 0 else 0) * power
                    power <<= 1
                dictionary[dictSize] = chr(bits)
                dictSize += 1
                c = dictSize - 1
                enlargeIn -= 1
            elif c == 1:
                bits = 0
                maxpower = 2 ** 16
                power = 1
                while power != maxpower:
                    resb = data_val & data_position
                    data_position >>= 1
                    if data_position == 0:
                        data_position = reset_value
                        data_val = get_next_value(data_index)
                        data_index += 1
                    bits |= (1 if resb > 0 else 0) * power
                    power <<= 1
                dictionary[dictSize] = chr(bits)
                dictSize += 1
                c = dictSize - 1
                enlargeIn -= 1
            elif c == 2:
                return "".join(result)
            
            if enlargeIn == 0:
                enlargeIn = 2 ** numBits
                numBits += 1
            
            if c in dictionary:
                entry = dictionary[c] if isinstance(dictionary[c], str) else chr(dictionary[c])
            else:
                if c == dictSize:
                    entry = w + w[0]
                else:
                    return None
            
            result.append(entry)
            dictionary[dictSize] = w + entry[0]
            dictSize += 1
            enlargeIn -= 1
            
            if enlargeIn == 0:
                enlargeIn = 2 ** numBits
                numBits += 1
            
            w = entry
        
        return "".join(result)


class IBomParser:
    """Parse le fichier HTML d'InteractiveHtmlBom pour extraire les données"""
    
    def __init__(self, html_file_path):
        self.html_file_path = html_file_path
        self.pcbdata = None
        self.config = None
        self.components = []
        self.bom_data = []
        self.board_bbox = None
        self.lcsc_data = {}
        self.lcsc_csv_path = None
        
    def set_lcsc_csv(self, csv_path):
        """Définit le chemin du fichier LCSC CSV et le charge"""
        self.lcsc_csv_path = csv_path
        self._load_lcsc_csv()
        # Mettre à jour les codes LCSC des composants existants
        self._update_lcsc_codes()
        
    def _load_lcsc_csv(self):
        """Charge le fichier CSV LCSC s'il existe"""
        self.lcsc_data = {}
        
        # Chemins possibles pour le fichier CSV
        possible_paths = []
        
        if self.lcsc_csv_path:
            possible_paths.append(Path(self.lcsc_csv_path))
        
        if self.html_file_path:
            html_dir = Path(self.html_file_path).parent
            possible_paths.extend([
                html_dir.parent / 'lcsc' / 'BOM-lcsc.csv',
                html_dir / 'lcsc' / 'BOM-lcsc.csv',
                html_dir / 'BOM-lcsc.csv',
                html_dir.parent / 'BOM-lcsc.csv',
            ])
        
        csv_path = None
        for path in possible_paths:
            if path.exists():
                csv_path = path
                break
        
        if not csv_path:
            return
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    designators = row.get('Designator', '')
                    lcsc_code = row.get('LCSC', '').strip()
                    
                    if lcsc_code:
                        for ref in designators.split(','):
                            ref = ref.strip()
                            if ref:
                                self.lcsc_data[ref] = lcsc_code
            print(f"Fichier LCSC chargé: {len(self.lcsc_data)} références depuis {csv_path}")
        except Exception as e:
            print(f"Erreur lors du chargement du CSV LCSC: {e}")
    
    def _update_lcsc_codes(self):
        """Met à jour les codes LCSC des composants depuis le fichier CSV"""
        for comp in self.components:
            ref = comp.get('ref', '')
            if ref in self.lcsc_data:
                comp['lcsc'] = self.lcsc_data[ref]
    
    def parse(self):
        """Parse le fichier HTML et extrait les données"""
        self._load_lcsc_csv()
        
        try:
            with open(self.html_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            raise Exception(f"Erreur de lecture du fichier: {e}")
        
        # Chercher les données compressées (nouveau format avec LZ-String)
        lz_match = re.search(r'LZString\.decompressFromBase64\(["\']([^"\']+)["\']\)', content)
        
        if lz_match:
            compressed_data = lz_match.group(1)
            print(f"Données compressées trouvées ({len(compressed_data)} caractères)")
            
            decompressed = LZString.decompress_from_base64(compressed_data)
            if decompressed:
                try:
                    self.pcbdata = json.loads(decompressed)
                    print("Décompression réussie!")
                except json.JSONDecodeError as e:
                    raise Exception(f"Erreur JSON après décompression: {e}")
            else:
                raise Exception("Échec de la décompression des données")
        else:
            # Essayer le format non compressé
            pcbdata_match = re.search(r'var\s+pcbdata\s*=\s*(\{.*?\});', content, re.DOTALL)
            if not pcbdata_match:
                pcbdata_match = re.search(r'pcbdata\s*=\s*(\{.*?\})\s*[;\n]', content, re.DOTALL)
            
            if pcbdata_match:
                try:
                    self.pcbdata = json.loads(pcbdata_match.group(1))
                except json.JSONDecodeError:
                    pcbdata_str = pcbdata_match.group(1)
                    pcbdata_str = re.sub(r',\s*}', '}', pcbdata_str)
                    pcbdata_str = re.sub(r',\s*]', ']', pcbdata_str)
                    self.pcbdata = json.loads(pcbdata_str)
            else:
                raise Exception("Données pcbdata non trouvées dans le fichier HTML")
        
        # Extraire la bounding box du board
        if 'edges_bbox' in self.pcbdata:
            self.board_bbox = self.pcbdata['edges_bbox']
        elif 'board' in self.pcbdata and 'edges_bbox' in self.pcbdata['board']:
            self.board_bbox = self.pcbdata['board']['edges_bbox']
        else:
            self.board_bbox = {'minx': 0, 'miny': 0, 'maxx': 100, 'maxy': 100}
        
        # Extraire les composants
        self._extract_components()
        self._extract_bom()
        
        return True
    
    def _extract_components(self):
        """Extrait les composants avec leurs positions"""
        self.components = []
        
        if 'modules' in self.pcbdata:
            modules = self.pcbdata.get('modules', {})
            for layer in ['F', 'B']:
                layer_modules = modules.get(layer, [])
                for module in layer_modules:
                    self._add_component_from_module(module, layer)
        
        if 'footprints' in self.pcbdata:
            footprints = self.pcbdata.get('footprints', [])
            for fp_id, fp in enumerate(footprints):
                self._add_component_from_footprint(fp, fp_id)
    
    def _add_component_from_module(self, module, layer):
        """Ajoute un composant depuis un module (ancien format)"""
        ref = module.get('ref', '')
        bbox = module.get('bbox', {})
        
        if bbox:
            x = (bbox.get('minx', 0) + bbox.get('maxx', 0)) / 2
            y = (bbox.get('miny', 0) + bbox.get('maxy', 0)) / 2
        else:
            x = module.get('x', 0)
            y = module.get('y', 0)
        
        self.components.append({
            'ref': ref,
            'x': x,
            'y': y,
            'layer': layer,
            'bbox': bbox,
            'value': '',
            'footprint': '',
            'lcsc': self.lcsc_data.get(ref, '')
        })
    
    def _add_component_from_footprint(self, fp, fp_id):
        """Ajoute un composant depuis un footprint (nouveau format)"""
        ref = fp.get('ref', '')
        layer = fp.get('layer', 'F')
        
        x, y = 0, 0
        bbox = fp.get('bbox', {})
        
        if bbox and 'pos' in bbox:
            pos = bbox.get('pos', [0, 0])
            if isinstance(pos, list) and len(pos) >= 2:
                x, y = pos[0], pos[1]
        elif 'center' in fp:
            center = fp.get('center', [0, 0])
            if isinstance(center, list) and len(center) >= 2:
                x, y = center[0], center[1]
        elif bbox and 'minx' in bbox:
            x = (bbox.get('minx', 0) + bbox.get('maxx', 0)) / 2
            y = (bbox.get('miny', 0) + bbox.get('maxy', 0)) / 2
        else:
            pads = fp.get('pads', [])
            if pads:
                x = sum(p.get('pos', [0, 0])[0] for p in pads) / len(pads)
                y = sum(p.get('pos', [0, 0])[1] for p in pads) / len(pads)
        
        self.components.append({
            'ref': ref,
            'id': fp_id,
            'x': x,
            'y': y,
            'layer': layer,
            'bbox': bbox,
            'value': '',
            'footprint': '',
            'lcsc': self.lcsc_data.get(ref, '')
        })
    
    def _extract_bom(self):
        """Extrait les données BOM"""
        self.bom_data = []
        
        bom = self.pcbdata.get('bom', {})
        fields_data = bom.get('fields', {})
        fields = bom.get('fields', [])
        
        # Trouver l'index du champ LCSC
        lcsc_index = None
        if isinstance(fields, list):
            for i, field in enumerate(fields):
                if isinstance(field, str) and field.upper() in ['LCSC', 'LCSC PART', 'LCSC_PART']:
                    lcsc_index = i
                    break
        
        # Format both: liste de groupes de composants identiques
        both = bom.get('both', [])
        
        for group in both:
            if not isinstance(group, list):
                continue
            
            for ref_item in group:
                if not isinstance(ref_item, list) or len(ref_item) < 2:
                    continue
                
                ref_name = ref_item[0]
                fp_id = ref_item[1]
                
                value = ''
                footprint_name = ''
                lcsc = ''
                
                # Chercher dans fields_data (dict format)
                if isinstance(fields_data, dict):
                    fp_id_str = str(fp_id)
                    if fp_id_str in fields_data:
                        component_fields = fields_data[fp_id_str]
                        if len(component_fields) >= 1:
                            value = component_fields[0] or ''
                        if len(component_fields) >= 2:
                            footprint_name = component_fields[1] or ''
                        for field_val in component_fields:
                            if isinstance(field_val, str) and len(field_val) > 1:
                                if field_val.startswith('C') and field_val[1:].isdigit():
                                    lcsc = field_val
                                    break
                
                # Si pas de LCSC trouvé, chercher dans le CSV
                if not lcsc and ref_name in self.lcsc_data:
                    lcsc = self.lcsc_data[ref_name]
                
                self.bom_data.append({
                    'ref': ref_name,
                    'id': fp_id,
                    'value': value,
                    'footprint': footprint_name,
                    'lcsc': lcsc
                })
                
                # Mettre à jour le composant correspondant
                for comp in self.components:
                    if comp.get('ref') == ref_name or comp.get('id') == fp_id:
                        comp['value'] = value
                        comp['footprint'] = footprint_name
                        if not comp.get('lcsc'):
                            comp['lcsc'] = lcsc
                        break
    
    def get_bom_for_ref(self, ref, fp_id=None):
        """Récupère les infos BOM pour une référence"""
        for bom_entry in self.bom_data:
            if bom_entry['ref'] == ref:
                return bom_entry
            if fp_id is not None and bom_entry.get('id') == fp_id:
                return bom_entry
        return {'ref': ref, 'value': '', 'footprint': '', 'lcsc': '', 'id': fp_id}
    
    def get_components_in_rect(self, x1, y1, x2, y2):
        """Retourne les composants dans un rectangle donné"""
        min_x, max_x = min(x1, x2), max(x1, x2)
        min_y, max_y = min(y1, y2), max(y1, y2)
        
        result = []
        for comp in self.components:
            if min_x <= comp['x'] <= max_x and min_y <= comp['y'] <= max_y:
                result.append(comp.copy())
        return result
    
    def get_all_components(self):
        """Retourne tous les composants"""
        return [comp.copy() for comp in self.components]


class PCBView(Widget):
    """Widget pour afficher le PCB et permettre la sélection"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.parser = None
        self.components = []
        self.selected_components = []
        self.selection_start = None
        self.selection_rect = None
        self.scale = 1.0
        self.offset_x = 0
        self.offset_y = 0
        self.zoom_factor = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self.last_touch_pos = None
        self.is_panning = False
        self._touches = []
        self.bind(size=self._on_size)
        
    def _on_size(self, *args):
        self._calculate_transform()
        self._redraw()
    
    def on_pos(self, *args):
        """Redessine quand la position change"""
        self._redraw()
    
    def set_parser(self, parser):
        """Définit le parser et redessine"""
        self.parser = parser
        self.components = parser.components if parser else []
        self.zoom_factor = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self._calculate_transform()
        self._redraw()
    
    def _calculate_transform(self):
        """Calcule l'échelle et l'offset pour afficher le PCB"""
        if not self.parser or not self.parser.board_bbox:
            return
        
        bbox = self.parser.board_bbox
        board_width = bbox.get('maxx', 100) - bbox.get('minx', 0)
        board_height = bbox.get('maxy', 100) - bbox.get('miny', 0)
        
        if board_width <= 0 or board_height <= 0:
            return
        
        margin = 20
        available_width = self.width - 2 * margin
        available_height = self.height - 2 * margin
        
        if available_width <= 0 or available_height <= 0:
            return
        
        scale_x = available_width / board_width
        scale_y = available_height / board_height
        self.scale = min(scale_x, scale_y) * self.zoom_factor
        
        self.offset_x = margin + (available_width - board_width * self.scale) / 2 - bbox.get('minx', 0) * self.scale + self.pan_x
        self.offset_y = margin + (available_height - board_height * self.scale) / 2 - bbox.get('miny', 0) * self.scale + self.pan_y
    
    def _board_to_screen(self, x, y):
        """Convertit les coordonnées du PCB en coordonnées écran"""
        # Ajouter self.x et self.y pour tenir compte de la position du widget
        return (self.x + x * self.scale + self.offset_x, 
                self.y + self.height - (y * self.scale + self.offset_y))
    
    def _screen_to_board(self, x, y):
        """Convertit les coordonnées écran en coordonnées du PCB"""
        # Soustraire self.x et self.y pour convertir depuis les coordonnées absolues
        return ((x - self.x - self.offset_x) / self.scale,
                (self.height - (y - self.y) - self.offset_y) / self.scale)
    
    def zoom_in(self):
        """Zoom avant"""
        self.zoom_factor *= 1.3
        self._calculate_transform()
        self._redraw()
    
    def zoom_out(self):
        """Zoom arrière"""
        self.zoom_factor /= 1.3
        if self.zoom_factor < 0.1:
            self.zoom_factor = 0.1
        self._calculate_transform()
        self._redraw()
    
    def reset_view(self):
        """Réinitialise la vue"""
        self.zoom_factor = 1.0
        self.pan_x = 0
        self.pan_y = 0
        self._calculate_transform()
        self._redraw()
    
    def _redraw(self):
        """Redessine le PCB"""
        self.canvas.clear()
        
        with self.canvas:
            # Fond
            Color(0.1, 0.1, 0.15, 1)
            Rectangle(pos=self.pos, size=self.size)
            
            if not self.parser or not self.parser.board_bbox:
                Color(0.5, 0.5, 0.5, 1)
                return
            
            # Dessiner le contour du board
            bbox = self.parser.board_bbox
            Color(0.1, 0.25, 0.15, 1)
            x1, y1 = self._board_to_screen(bbox.get('minx', 0), bbox.get('miny', 0))
            x2, y2 = self._board_to_screen(bbox.get('maxx', 100), bbox.get('maxy', 100))
            Rectangle(pos=(min(x1, x2), min(y1, y2)), 
                     size=(abs(x2 - x1), abs(y2 - y1)))
            
            # Dessiner les pads des footprints si disponible
            self._draw_pads()
            
            # Dessiner les composants
            for comp in self.components:
                cx, cy = self._board_to_screen(comp['x'], comp['y'])
                
                if comp in self.selected_components:
                    Color(1, 0.5, 0, 0.9)
                    size = max(8, 6 * self.zoom_factor)
                elif comp['layer'] == 'F':
                    Color(0.8, 0.2, 0.2, 0.7)
                    size = max(5, 4 * self.zoom_factor)
                else:
                    Color(0.2, 0.2, 0.8, 0.7)
                    size = max(5, 4 * self.zoom_factor)
                
                Ellipse(pos=(cx - size/2, cy - size/2), size=(size, size))
                
                # Afficher la référence si zoom suffisant
                if self.zoom_factor >= 2:
                    Color(1, 1, 1, 0.8)
            
            # Rectangle de sélection
            if self.selection_rect:
                Color(1, 1, 0, 0.3)
                x, y, w, h = self.selection_rect
                Rectangle(pos=(x, y), size=(w, h))
                Color(1, 1, 0, 1)
                Line(rectangle=(x, y, w, h), width=2)
    
    def _draw_pads(self):
        """Dessine les pads des footprints"""
        if not self.parser or not self.parser.pcbdata:
            return
        
        footprints = self.parser.pcbdata.get('footprints', [])
        
        for fp in footprints:
            layer = fp.get('layer', 'F')
            pads = fp.get('pads', [])
            
            for pad in pads:
                pos = pad.get('pos', [0, 0])
                size = pad.get('size', [0.5, 0.5])
                layers = pad.get('layers', [layer])
                
                cx, cy = self._board_to_screen(pos[0], pos[1])
                
                w = max(2, size[0] * self.scale / 2)
                h = max(2, size[1] * self.scale / 2)
                
                if 'F' in layers:
                    Color(0.5, 0.1, 0.1, 0.4)
                else:
                    Color(0.1, 0.1, 0.5, 0.4)
                
                Rectangle(pos=(cx - w/2, cy - h/2), size=(w, h))
    
    def on_touch_down(self, touch):
        if self.collide_point(*touch.pos):
            self._touches.append(touch)
            
            # Double tap pour reset
            if touch.is_double_tap:
                self.reset_view()
                return True
            
            # Multi-touch = panning
            if len(self._touches) > 1:
                self.is_panning = True
                self.last_touch_pos = touch.pos
                touch.grab(self)
                return True
            
            self.selection_start = touch.pos
            touch.grab(self)
            return True
        return super().on_touch_down(touch)
    
    def on_touch_move(self, touch):
        if touch.grab_current is self:
            if self.is_panning or len(self._touches) > 1:
                # Mode panoramique
                if self.last_touch_pos:
                    dx = touch.pos[0] - self.last_touch_pos[0]
                    dy = touch.pos[1] - self.last_touch_pos[1]
                    self.pan_x += dx
                    self.pan_y -= dy  # Inverser car l'axe Y est inversé
                    self._calculate_transform()
                    self._redraw()
                self.last_touch_pos = touch.pos
            elif self.selection_start:
                # Mode sélection
                x1, y1 = self.selection_start
                x2, y2 = touch.pos
                self.selection_rect = (min(x1, x2), min(y1, y2), 
                                      abs(x2 - x1), abs(y2 - y1))
                self._redraw()
            return True
        return super().on_touch_move(touch)
    
    def on_touch_up(self, touch):
        if touch in self._touches:
            self._touches.remove(touch)
        
        if touch.grab_current is self:
            touch.ungrab(self)
            
            if self.is_panning:
                self.is_panning = False
                self.last_touch_pos = None
            elif self.selection_start:
                if self.selection_rect and self.selection_rect[2] > 10 and self.selection_rect[3] > 10:
                    self._select_components_in_rect()
                self.selection_start = None
                self.selection_rect = None
                self._redraw()
            return True
        return super().on_touch_up(touch)
    
    def _select_components_in_rect(self):
        """Sélectionne les composants dans le rectangle de sélection"""
        if not self.selection_rect:
            return
        
        rx, ry, rw, rh = self.selection_rect
        rx2, ry2 = rx + rw, ry + rh
        
        self.selected_components = []
        
        for comp in self.components:
            cx, cy = self._board_to_screen(comp['x'], comp['y'])
            
            if rx <= cx <= rx2 and ry <= cy <= ry2:
                self.selected_components.append(comp)
        
        # Notifier le parent
        if hasattr(self, 'on_selection_callback') and self.on_selection_callback:
            self.on_selection_callback(self.selected_components)
    
    def select_all(self):
        """Sélectionne tous les composants"""
        self.selected_components = self.components[:]
        self._redraw()
        if hasattr(self, 'on_selection_callback') and self.on_selection_callback:
            self.on_selection_callback(self.selected_components)


class ComponentRow(BoxLayout):
    """Ligne de composant avec checkbox pour marquer comme traité"""
    
    def __init__(self, component, on_toggle=None, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'horizontal'
        self.size_hint_y = None
        self.height = dp(40)
        self.component = component
        self.on_toggle = on_toggle
        self.is_processed = False
        
        # Checkbox
        self.checkbox = CheckBox(size_hint_x=0.08, active=False)
        self.checkbox.bind(active=self._on_checkbox)
        self.add_widget(self.checkbox)
        
        # Infos
        self.add_widget(Label(text=component.get('ref', ''), size_hint_x=0.12, font_size=dp(11)))
        self.add_widget(Label(text=component.get('value', '')[:12], size_hint_x=0.2, font_size=dp(11)))
        self.add_widget(Label(text=component.get('footprint', '')[:12], size_hint_x=0.25, font_size=dp(10)))
        self.add_widget(Label(text=component.get('lcsc', ''), size_hint_x=0.2, font_size=dp(11)))
        self.add_widget(Label(text=component.get('layer', ''), size_hint_x=0.08, font_size=dp(11)))
        
        # Quantité (pour les groupes)
        qty = component.get('qty', 1)
        self.add_widget(Label(text=str(qty) if qty > 1 else '', size_hint_x=0.07, font_size=dp(11)))
    
    def _on_checkbox(self, checkbox, value):
        self.is_processed = value
        if self.on_toggle:
            self.on_toggle(self.component, value)
    
    def set_processed(self, value):
        self.checkbox.active = value
        self.is_processed = value


class ComponentList(ScrollView):
    """Liste scrollable des composants avec tri"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.layout = GridLayout(cols=1, spacing=dp(2), size_hint_y=None)
        self.layout.bind(minimum_height=self.layout.setter('height'))
        self.add_widget(self.layout)
        self.components = []
        self.component_rows = []
        self.processed_items = set()
        self.sort_column = 'ref'
        self.sort_reverse = False
        self.layer_filter = 'all'
        self.search_text = ''
        self.group_by_value = True  # Grouper par valeur/footprint
        self.on_processed_change = None
    
    def set_components(self, components):
        """Met à jour la liste des composants"""
        self.components = components
        self._refresh_list()
    
    def _refresh_list(self):
        """Rafraîchit l'affichage de la liste"""
        self.layout.clear_widgets()
        self.component_rows = []
        
        # Filtrer les composants
        filtered = self.components[:]
        
        # Filtre par couche
        if self.layer_filter != 'all':
            filtered = [c for c in filtered if c.get('layer') == self.layer_filter]
        
        # Filtre par recherche
        if self.search_text:
            search_lower = self.search_text.lower()
            filtered = [c for c in filtered if 
                       search_lower in c.get('ref', '').lower() or
                       search_lower in c.get('value', '').lower() or
                       search_lower in c.get('footprint', '').lower() or
                       search_lower in c.get('lcsc', '').lower()]
        
        # Grouper par valeur/footprint si activé
        if self.group_by_value:
            grouped = {}
            for comp in filtered:
                key = (comp.get('value', ''), comp.get('footprint', ''), comp.get('lcsc', ''))
                if key not in grouped:
                    grouped[key] = {
                        'refs': [],
                        'value': comp.get('value', ''),
                        'footprint': comp.get('footprint', ''),
                        'lcsc': comp.get('lcsc', ''),
                        'layer': comp.get('layer', 'F')
                    }
                grouped[key]['refs'].append(comp.get('ref', ''))
            
            # Convertir en liste
            filtered = []
            for key, data in grouped.items():
                filtered.append({
                    'ref': ', '.join(sorted(data['refs'])),
                    'value': data['value'],
                    'footprint': data['footprint'],
                    'lcsc': data['lcsc'],
                    'layer': data['layer'],
                    'qty': len(data['refs']),
                    'group_key': key
                })
        
        # Trier
        if self.sort_column:
            if self.sort_column == 'qty':
                filtered.sort(key=lambda x: x.get('qty', 1), reverse=self.sort_reverse)
            else:
                filtered.sort(key=lambda x: str(x.get(self.sort_column, '')).lower(), 
                            reverse=self.sort_reverse)
        
        # En-tête avec boutons de tri
        header = BoxLayout(size_hint_y=None, height=dp(40))
        header.add_widget(Label(text='✓', size_hint_x=0.08, font_size=dp(10)))
        
        for col, text, size in [('ref', 'Ref', 0.12), ('value', 'Valeur', 0.2), 
                                 ('footprint', 'Footprint', 0.25), ('lcsc', 'LCSC', 0.2),
                                 ('layer', 'L', 0.08), ('qty', 'Qt', 0.07)]:
            indicator = ''
            if self.sort_column == col:
                indicator = ' ↓' if self.sort_reverse else ' ↑'
            btn = Button(text=text + indicator, size_hint_x=size, 
                        background_color=(0.25, 0.25, 0.4, 1), font_size=dp(10))
            btn.col = col
            btn.bind(on_press=self._on_sort_click)
            header.add_widget(btn)
        
        self.layout.add_widget(header)
        
        # Composants
        for comp in filtered:
            row = ComponentRow(comp, on_toggle=self._on_component_toggle)
            
            # Restaurer l'état "traité"
            if self.group_by_value and 'group_key' in comp:
                key = comp['group_key']
            else:
                key = (comp.get('value', ''), comp.get('footprint', ''), comp.get('lcsc', ''))
            
            if key in self.processed_items:
                row.set_processed(True)
            
            self.component_rows.append(row)
            self.layout.add_widget(row)
    
    def _on_sort_click(self, btn):
        """Gère le clic sur un bouton de tri"""
        if self.sort_column == btn.col:
            self.sort_reverse = not self.sort_reverse
        else:
            self.sort_column = btn.col
            self.sort_reverse = False
        self._refresh_list()
    
    def _on_component_toggle(self, component, is_processed):
        """Gère le changement d'état d'un composant"""
        if 'group_key' in component:
            key = component['group_key']
        else:
            key = (component.get('value', ''), component.get('footprint', ''), component.get('lcsc', ''))
        
        if is_processed:
            self.processed_items.add(key)
        else:
            self.processed_items.discard(key)
        
        if self.on_processed_change:
            self.on_processed_change()
    
    def set_layer_filter(self, layer):
        """Définit le filtre par couche"""
        self.layer_filter = layer
        self._refresh_list()
    
    def set_search_text(self, text):
        """Définit le texte de recherche"""
        self.search_text = text
        self._refresh_list()
    
    def toggle_grouping(self):
        """Active/désactive le groupement par valeur"""
        self.group_by_value = not self.group_by_value
        self._refresh_list()
    
    def get_processed_count(self):
        """Retourne le nombre de composants traités"""
        count = sum(1 for row in self.component_rows if row.is_processed)
        return count, len(self.component_rows)
    
    def mark_all_processed(self, value):
        """Marque tous les composants visibles comme traités ou non"""
        for row in self.component_rows:
            row.set_processed(value)
            if 'group_key' in row.component:
                key = row.component['group_key']
            else:
                key = (row.component.get('value', ''), row.component.get('footprint', ''), 
                       row.component.get('lcsc', ''))
            if value:
                self.processed_items.add(key)
            else:
                self.processed_items.discard(key)
        
        if self.on_processed_change:
            self.on_processed_change()


class HistoryManager:
    """Gère la sauvegarde et le chargement de l'historique des sélections"""
    
    def __init__(self, html_file_path=None):
        self.html_file_path = html_file_path
        self.history = []
    
    def _get_history_file_path(self):
        """Retourne le chemin du fichier d'historique"""
        if not self.html_file_path:
            return None
        html_path = Path(self.html_file_path)
        return html_path.parent / f".{html_path.stem}_history.json"
    
    def set_html_file(self, html_file_path):
        """Définit le fichier HTML et charge l'historique"""
        self.html_file_path = html_file_path
        self.load()
    
    def load(self):
        """Charge l'historique depuis le fichier JSON"""
        self.history = []
        history_file = self._get_history_file_path()
        
        if history_file and history_file.exists():
            try:
                with open(history_file, 'r', encoding='utf-8') as f:
                    self.history = json.load(f)
                print(f"Historique chargé: {len(self.history)} sélections")
            except Exception as e:
                print(f"Erreur lors du chargement de l'historique: {e}")
                self.history = []
    
    def save(self):
        """Sauvegarde l'historique dans le fichier JSON"""
        history_file = self._get_history_file_path()
        if not history_file:
            return False
        
        try:
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
            print(f"Historique sauvegardé: {len(self.history)} sélections")
            return True
        except Exception as e:
            print(f"Erreur lors de la sauvegarde de l'historique: {e}")
            return False
    
    def add_entry(self, name, components, processed_items, rect=None):
        """Ajoute une entrée à l'historique"""
        entry = {
            'name': name,
            'date': datetime.now().strftime("%Y-%m-%d %H:%M"),
            'rect': list(rect) if rect else None,
            'components': [
                {'ref': c.get('ref', ''), 'value': c.get('value', ''), 
                 'footprint': c.get('footprint', ''), 'lcsc': c.get('lcsc', '')}
                for c in components
            ],
            'processed': [list(p) for p in processed_items]
        }
        self.history.append(entry)
        self.save()
        return len(self.history) - 1
    
    def update_entry(self, index, components, processed_items):
        """Met à jour une entrée existante"""
        if 0 <= index < len(self.history):
            entry = self.history[index]
            entry['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
            entry['components'] = [
                {'ref': c.get('ref', ''), 'value': c.get('value', ''), 
                 'footprint': c.get('footprint', ''), 'lcsc': c.get('lcsc', '')}
                for c in components
            ]
            entry['processed'] = [list(p) for p in processed_items]
            self.save()
            return True
        return False
    
    def get_entries_list(self):
        """Retourne la liste des entrées pour affichage"""
        items = []
        for i, entry in enumerate(self.history):
            name = entry.get('name', f"Sélection {i+1}")
            date = entry.get('date', '')
            count = len(entry.get('components', []))
            processed = len(entry.get('processed', []))
            items.append(f"{name} ({count} comp., {processed} traités) - {date}")
        return items
    
    def get_entry(self, index):
        """Retourne une entrée spécifique"""
        if 0 <= index < len(self.history):
            return self.history[index]
        return None
    
    def delete_entry(self, index):
        """Supprime une entrée"""
        if 0 <= index < len(self.history):
            del self.history[index]
            self.save()
            return True
        return False


class IBomSelectorApp(App):
    """Application principale"""
    
    def build(self):
        self.title = f'IBom Selector v{__version__}'
        self.parser = None
        self.history_manager = HistoryManager()
        self.current_history_index = None
        self.lcsc_csv_path = None
        
        # Demander les permissions au démarrage (délai plus long pour s'assurer que l'activité est prête)
        Clock.schedule_once(self._request_permissions_safe, 1.5)
        
        # Layout principal
        main_layout = BoxLayout(orientation='vertical', padding=dp(5), spacing=dp(3))
        
        # === Barre d'outils principale ===
        toolbar = BoxLayout(size_hint_y=None, height=dp(45), spacing=dp(3))
        
        load_btn = Button(text='📂 HTML', size_hint_x=0.22, font_size=dp(12))
        load_btn.bind(on_press=self.show_file_chooser)
        toolbar.add_widget(load_btn)
        
        lcsc_btn = Button(text='📋 LCSC', size_hint_x=0.22, font_size=dp(12))
        lcsc_btn.bind(on_press=self.show_lcsc_file_chooser)
        toolbar.add_widget(lcsc_btn)
        
        history_btn = Button(text='📜 Hist.', size_hint_x=0.18, font_size=dp(12))
        history_btn.bind(on_press=self.show_history_popup)
        toolbar.add_widget(history_btn)
        
        save_btn = Button(text='💾', size_hint_x=0.12, font_size=dp(14))
        save_btn.bind(on_press=self.save_selection)
        toolbar.add_widget(save_btn)
        
        export_btn = Button(text='📤 Exp', size_hint_x=0.26, font_size=dp(12))
        export_btn.bind(on_press=self.show_export_popup)
        toolbar.add_widget(export_btn)
        
        main_layout.add_widget(toolbar)
        
        # === Zone PCB avec contrôles de zoom ===
        pcb_container = BoxLayout(orientation='horizontal', size_hint_y=0.35)
        
        self.pcb_view = PCBView(size_hint_x=0.85)
        self.pcb_view.on_selection_callback = self.on_selection_changed
        pcb_container.add_widget(self.pcb_view)
        
        # Boutons de contrôle du zoom
        zoom_layout = BoxLayout(orientation='vertical', size_hint_x=0.15, spacing=dp(5))
        
        zoom_in_btn = Button(text='+', font_size=dp(20))
        zoom_in_btn.bind(on_press=lambda x: self.pcb_view.zoom_in())
        zoom_layout.add_widget(zoom_in_btn)
        
        zoom_out_btn = Button(text='-', font_size=dp(20))
        zoom_out_btn.bind(on_press=lambda x: self.pcb_view.zoom_out())
        zoom_layout.add_widget(zoom_out_btn)
        
        reset_btn = Button(text='⟲', font_size=dp(18))
        reset_btn.bind(on_press=lambda x: self.pcb_view.reset_view())
        zoom_layout.add_widget(reset_btn)
        
        select_all_btn = Button(text='All', font_size=dp(12))
        select_all_btn.bind(on_press=lambda x: self.pcb_view.select_all())
        zoom_layout.add_widget(select_all_btn)
        
        pcb_container.add_widget(zoom_layout)
        main_layout.add_widget(pcb_container)
        
        # === Filtres ===
        filter_layout = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(3))
        
        # Filtre couche
        filter_layout.add_widget(Label(text='Couche:', size_hint_x=0.12, font_size=dp(10)))
        self.layer_spinner = Spinner(
            text='Tous',
            values=['Tous', 'Front', 'Back'],
            size_hint_x=0.18,
            font_size=dp(10)
        )
        self.layer_spinner.bind(text=self.on_layer_filter_change)
        filter_layout.add_widget(self.layer_spinner)
        
        # Recherche
        filter_layout.add_widget(Label(text='🔍', size_hint_x=0.08, font_size=dp(12)))
        self.search_input = TextInput(
            hint_text='Rechercher...',
            multiline=False,
            size_hint_x=0.35,
            font_size=dp(11)
        )
        self.search_input.bind(text=self.on_search_change)
        filter_layout.add_widget(self.search_input)
        
        # Toggle groupement
        self.group_btn = ToggleButton(text='Grp', size_hint_x=0.12, state='down', font_size=dp(10))
        self.group_btn.bind(on_press=self.toggle_grouping)
        filter_layout.add_widget(self.group_btn)
        
        # Clear search
        clear_btn = Button(text='✕', size_hint_x=0.08, font_size=dp(12))
        clear_btn.bind(on_press=lambda x: setattr(self.search_input, 'text', ''))
        filter_layout.add_widget(clear_btn)
        
        main_layout.add_widget(filter_layout)
        
        # === Info sélection ===
        info_layout = BoxLayout(size_hint_y=None, height=dp(30), spacing=dp(5))
        
        self.selection_label = Label(text='Sélection: 0 composants', size_hint_x=0.4, font_size=dp(10))
        info_layout.add_widget(self.selection_label)
        
        self.processed_label = Label(text='Traités: 0/0', size_hint_x=0.25, font_size=dp(10))
        info_layout.add_widget(self.processed_label)
        
        mark_all_btn = Button(text='✓All', size_hint_x=0.15, font_size=dp(10))
        mark_all_btn.bind(on_press=lambda x: self.component_list.mark_all_processed(True))
        info_layout.add_widget(mark_all_btn)
        
        clear_proc_btn = Button(text='↻', size_hint_x=0.1, font_size=dp(14))
        clear_proc_btn.bind(on_press=self.clear_processed)
        info_layout.add_widget(clear_proc_btn)
        
        main_layout.add_widget(info_layout)
        
        # === Liste des composants ===
        self.component_list = ComponentList(size_hint_y=0.5)
        self.component_list.on_processed_change = self.update_processed_count
        main_layout.add_widget(self.component_list)
        
        # === Barre de statut ===
        self.status_label = Label(
            text='Aucun fichier chargé - Tapez "📂 HTML" pour charger un fichier',
            size_hint_y=None,
            height=dp(25),
            color=(0.7, 0.7, 0.7, 1),
            font_size=dp(10)
        )
        main_layout.add_widget(self.status_label)
        
        return main_layout
    
    def on_selection_changed(self, selected_components):
        """Appelé quand la sélection change"""
        count = len(selected_components)
        self.selection_label.text = f'Sélection: {count} comp.'
        self.component_list.set_components(selected_components)
        self.update_processed_count()
    
    def on_layer_filter_change(self, spinner, text):
        """Filtre par couche"""
        if text == 'Front':
            self.component_list.set_layer_filter('F')
        elif text == 'Back':
            self.component_list.set_layer_filter('B')
        else:
            self.component_list.set_layer_filter('all')
    
    def on_search_change(self, instance, text):
        """Recherche de composants"""
        self.component_list.set_search_text(text)
    
    def toggle_grouping(self, instance):
        """Active/désactive le groupement"""
        self.component_list.toggle_grouping()
    
    def update_processed_count(self):
        """Met à jour le compteur de composants traités"""
        processed, total = self.component_list.get_processed_count()
        self.processed_label.text = f'Traités: {processed}/{total}'
    
    def clear_processed(self, instance):
        """Efface les marquages 'traité'"""
        self.component_list.mark_all_processed(False)
    
    def _request_permissions_safe(self, dt):
        """Demande les permissions de manière sécurisée"""
        try:
            request_all_permissions()
        except Exception as e:
            print(f"Erreur lors de la demande de permissions: {e}")
    
    def show_file_chooser(self, instance):
        """Affiche le sélecteur de fichier HTML"""
        self._show_file_chooser_popup(
            title='Choisir un fichier HTML IBom',
            filters=['*.html', '*.HTML'],
            callback=self.load_file
        )
    
    def show_lcsc_file_chooser(self, instance):
        """Affiche le sélecteur de fichier LCSC CSV"""
        self._show_file_chooser_popup(
            title='Choisir un fichier LCSC CSV',
            filters=['*.csv', '*.CSV'],
            callback=self.load_lcsc_csv
        )
    
    def _show_file_chooser_popup(self, title, filters, callback):
        """Affiche un popup de sélection de fichier"""
        content = BoxLayout(orientation='vertical', spacing=dp(5))
        
        # Sélecteur de chemin de départ
        storage_paths = get_storage_paths()
        if storage_paths:
            path_layout = BoxLayout(size_hint_y=None, height=dp(40))
            path_layout.add_widget(Label(text='Emplacement:', size_hint_x=0.3, font_size=dp(11)))
            
            path_names = [name for name, path in storage_paths]
            path_spinner = Spinner(
                text=path_names[0] if path_names else 'Home',
                values=path_names,
                size_hint_x=0.7,
                font_size=dp(11)
            )
            path_layout.add_widget(path_spinner)
            content.add_widget(path_layout)
            
            initial_path = storage_paths[0][1] if storage_paths else str(Path.home())
        else:
            initial_path = str(Path.home())
        
        # FileChooser - SANS filtre pour voir tous les fichiers
        file_chooser = FileChooserListView(
            path=initial_path,
            filters=filters,
            filter_dirs=True,
            size_hint_y=0.8
        )
        content.add_widget(file_chooser)
        
        # Mettre à jour le path quand on change d'emplacement
        if storage_paths:
            def on_path_change(spinner, text):
                for name, path in storage_paths:
                    if name == text:
                        file_chooser.path = path
                        break
            path_spinner.bind(text=on_path_change)
        
        # Info chemin actuel
        path_label = Label(text=f'Chemin: {initial_path}', size_hint_y=None, height=dp(25), 
                          font_size=dp(9), halign='left')
        path_label.bind(size=path_label.setter('text_size'))
        
        def update_path_label(*args):
            path_label.text = f'Chemin: {file_chooser.path}'
        file_chooser.bind(path=update_path_label)
        content.add_widget(path_label)
        
        # Boutons
        buttons = BoxLayout(size_hint_y=None, height=dp(45), spacing=dp(10))
        
        select_btn = Button(text='Sélectionner', font_size=dp(12))
        cancel_btn = Button(text='Annuler', font_size=dp(12))
        
        buttons.add_widget(select_btn)
        buttons.add_widget(cancel_btn)
        content.add_widget(buttons)
        
        popup = Popup(title=title, content=content, size_hint=(0.95, 0.9))
        
        def on_select(btn):
            if file_chooser.selection:
                callback(file_chooser.selection[0])
            popup.dismiss()
        
        select_btn.bind(on_press=on_select)
        cancel_btn.bind(on_press=lambda x: popup.dismiss())
        
        popup.open()
    
    def load_file(self, filepath):
        """Charge un fichier HTML"""
        try:
            parser = IBomParser(filepath)
            parser.parse()
            self.parser = parser
            self.pcb_view.set_parser(parser)
            self.history_manager.set_html_file(filepath)
            
            # Charger le fichier LCSC si déjà défini
            if self.lcsc_csv_path:
                parser.set_lcsc_csv(self.lcsc_csv_path)
            
            filename = Path(filepath).name
            comp_count = len(parser.components)
            lcsc_count = len(parser.lcsc_data)
            self.status_label.text = f'{filename}: {comp_count} comp., {lcsc_count} LCSC'
            
            self.show_message(f"Fichier chargé!\n{comp_count} composants\n{lcsc_count} codes LCSC")
        except Exception as e:
            self.show_error(f"Erreur: {e}")
    
    def load_lcsc_csv(self, filepath):
        """Charge un fichier LCSC CSV"""
        self.lcsc_csv_path = filepath
        
        if self.parser:
            self.parser.set_lcsc_csv(filepath)
            
            # Rafraîchir l'affichage
            if self.pcb_view.selected_components:
                self.component_list.set_components(self.pcb_view.selected_components)
            
            lcsc_count = len(self.parser.lcsc_data)
            self.status_label.text = f'LCSC: {lcsc_count} codes chargés depuis {Path(filepath).name}'
            self.show_message(f"Fichier LCSC chargé!\n{lcsc_count} codes LCSC")
        else:
            self.show_message(f"Fichier LCSC sélectionné.\nChargez d'abord un fichier HTML.")
    
    def show_history_popup(self, instance):
        """Affiche la popup de l'historique"""
        if not self.parser:
            self.show_error("Chargez d'abord un fichier HTML")
            return
        
        content = BoxLayout(orientation='vertical', spacing=dp(8), padding=dp(8))
        
        entries = self.history_manager.get_entries_list()
        
        if not entries:
            content.add_widget(Label(text="Aucun historique disponible", font_size=dp(12)))
        else:
            scroll = ScrollView(size_hint_y=0.8)
            entries_layout = GridLayout(cols=1, spacing=dp(5), size_hint_y=None)
            entries_layout.bind(minimum_height=entries_layout.setter('height'))
            
            for i, entry_text in enumerate(entries):
                row = BoxLayout(size_hint_y=None, height=dp(50), spacing=dp(5))
                
                btn = Button(text=entry_text, size_hint_x=0.75, font_size=dp(10))
                btn.entry_index = i
                
                del_btn = Button(text='🗑', size_hint_x=0.15, font_size=dp(14))
                del_btn.entry_index = i
                
                row.add_widget(btn)
                row.add_widget(del_btn)
                entries_layout.add_widget(row)
                
                def make_load_callback(idx):
                    return lambda x: self.load_history_entry(idx, popup)
                def make_delete_callback(idx):
                    return lambda x: self.delete_history_entry(idx, popup)
                
                btn.bind(on_press=make_load_callback(i))
                del_btn.bind(on_press=make_delete_callback(i))
            
            scroll.add_widget(entries_layout)
            content.add_widget(scroll)
        
        # Boutons
        buttons = BoxLayout(size_hint_y=None, height=dp(45), spacing=dp(10))
        
        update_btn = Button(text='Mettre à jour', font_size=dp(11))
        update_btn.bind(on_press=lambda x: self.update_current_history(popup))
        buttons.add_widget(update_btn)
        
        close_btn = Button(text='Fermer', font_size=dp(11))
        buttons.add_widget(close_btn)
        
        content.add_widget(buttons)
        
        popup = Popup(title='Historique des sélections', content=content,
                     size_hint=(0.95, 0.85))
        close_btn.bind(on_press=lambda x: popup.dismiss())
        popup.open()
    
    def load_history_entry(self, index, popup):
        """Charge une entrée de l'historique"""
        entry = self.history_manager.get_entry(index)
        if not entry:
            return
        
        popup.dismiss()
        self.current_history_index = index
        
        # Restaurer les composants
        saved_refs = set()
        for c in entry.get('components', []):
            refs = c.get('ref', '').split(', ')
            saved_refs.update(refs)
        
        selected = [comp for comp in self.parser.components if comp.get('ref') in saved_refs]
        
        self.pcb_view.selected_components = selected
        self.pcb_view._redraw()
        
        # Restaurer les items traités
        self.component_list.processed_items.clear()
        for proc in entry.get('processed', []):
            if isinstance(proc, list) and len(proc) == 3:
                self.component_list.processed_items.add(tuple(proc))
        
        self.component_list.set_components(selected)
        self.selection_label.text = f'Sélection: {len(selected)} comp.'
        self.update_processed_count()
        
        name = entry.get('name', 'Sélection')
        self.status_label.text = f"Chargé: {name}"
    
    def delete_history_entry(self, index, popup):
        """Supprime une entrée de l'historique"""
        if self.history_manager.delete_entry(index):
            popup.dismiss()
            self.show_message("Entrée supprimée")
            if self.current_history_index == index:
                self.current_history_index = None
    
    def update_current_history(self, popup):
        """Met à jour l'entrée d'historique actuelle"""
        if self.current_history_index is None:
            self.show_error("Aucune entrée d'historique sélectionnée")
            return
        
        selected = self.pcb_view.selected_components
        if not selected:
            self.show_error("Aucune sélection à sauvegarder")
            return
        
        if self.history_manager.update_entry(
            self.current_history_index,
            selected,
            self.component_list.processed_items
        ):
            popup.dismiss()
            self.show_message("Historique mis à jour!")
    
    def save_selection(self, instance):
        """Sauvegarde la sélection actuelle"""
        selected = self.pcb_view.selected_components
        
        if not selected:
            self.show_error("Aucune sélection à sauvegarder")
            return
        
        # Popup pour le nom
        content = BoxLayout(orientation='vertical', spacing=dp(10), padding=dp(10))
        
        content.add_widget(Label(text="Nom de la sélection:", font_size=dp(12)))
        name_input = TextInput(
            text=f"Zone {len(self.history_manager.history) + 1}",
            multiline=False,
            size_hint_y=None,
            height=dp(40),
            font_size=dp(12)
        )
        content.add_widget(name_input)
        
        buttons = BoxLayout(size_hint_y=None, height=dp(45), spacing=dp(10))
        save_btn = Button(text='Sauvegarder', font_size=dp(12))
        cancel_btn = Button(text='Annuler', font_size=dp(12))
        buttons.add_widget(save_btn)
        buttons.add_widget(cancel_btn)
        content.add_widget(buttons)
        
        popup = Popup(title='Sauvegarder la sélection', content=content,
                     size_hint=(0.85, 0.35))
        
        def on_save(btn):
            name = name_input.text or f"Zone {len(self.history_manager.history) + 1}"
            self.current_history_index = self.history_manager.add_entry(
                name,
                selected,
                self.component_list.processed_items,
                self.pcb_view.selection_rect
            )
            popup.dismiss()
            self.show_message(f"'{name}' sauvegardé!")
        
        save_btn.bind(on_press=on_save)
        cancel_btn.bind(on_press=lambda x: popup.dismiss())
        popup.open()
    
    def show_export_popup(self, instance):
        """Affiche la popup d'export"""
        selected = self.pcb_view.selected_components
        
        if not selected:
            self.show_error("Aucun composant à exporter")
            return
        
        content = BoxLayout(orientation='vertical', spacing=dp(10), padding=dp(10))
        
        # Appliquer le filtre de couche
        filtered = selected
        if self.component_list.layer_filter != 'all':
            filtered = [c for c in selected if c.get('layer') == self.component_list.layer_filter]
        
        content.add_widget(Label(text=f"{len(filtered)} composants à exporter", font_size=dp(12)))
        
        csv_btn = Button(text='📄 Export CSV', size_hint_y=None, height=dp(50), font_size=dp(13))
        csv_btn.bind(on_press=lambda x: self.export_csv(popup))
        content.add_widget(csv_btn)
        
        csv_lcsc_btn = Button(text='📄 Export CSV format LCSC', size_hint_y=None, height=dp(50), font_size=dp(13))
        csv_lcsc_btn.bind(on_press=lambda x: self.export_csv_lcsc(popup))
        content.add_widget(csv_lcsc_btn)
        
        cancel_btn = Button(text='Annuler', size_hint_y=None, height=dp(45), font_size=dp(12))
        content.add_widget(cancel_btn)
        
        popup = Popup(title='Exporter', content=content, size_hint=(0.85, 0.5))
        cancel_btn.bind(on_press=lambda x: popup.dismiss())
        popup.open()
    
    def export_csv(self, popup=None):
        """Exporte les composants sélectionnés en CSV"""
        if popup:
            popup.dismiss()
        
        selected = self.pcb_view.selected_components
        
        if not selected:
            self.show_error("Aucun composant sélectionné")
            return
        
        # Appliquer le filtre
        filtered = selected
        if self.component_list.layer_filter != 'all':
            filtered = [c for c in selected if c.get('layer') == self.component_list.layer_filter]
        
        # Regrouper par valeur et footprint
        grouped = {}
        for comp in filtered:
            key = (comp.get('value', ''), comp.get('footprint', ''), comp.get('lcsc', ''))
            if key not in grouped:
                grouped[key] = {'refs': [], 'value': comp['value'], 
                               'footprint': comp['footprint'], 'lcsc': comp['lcsc']}
            grouped[key]['refs'].append(comp['ref'])
        
        # Chemin de sortie
        if platform == 'android':
            try:
                output_dir = os.path.join(primary_external_storage_path(), 'Download')
                if not os.path.exists(output_dir):
                    output_dir = primary_external_storage_path()
            except:
                output_dir = str(Path.home())
        else:
            output_dir = str(Path.home())
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f'ibom_export_{timestamp}.csv')
        
        try:
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Quantité', 'Référence', 'Valeur', 'Footprint', 'LCSC'])
                
                for key, data in sorted(grouped.items()):
                    refs = sorted(data['refs'])
                    writer.writerow([
                        len(refs),
                        ', '.join(refs),
                        data['value'],
                        data['footprint'],
                        data['lcsc']
                    ])
            
            self.show_message(f"Exporté vers:\n{output_path}")
            self.status_label.text = f"Export: {Path(output_path).name}"
        except Exception as e:
            self.show_error(f"Erreur d'export: {e}")
    
    def export_csv_lcsc(self, popup=None):
        """Exporte les composants en format CSV compatible LCSC/JLCPCB"""
        if popup:
            popup.dismiss()
        
        selected = self.pcb_view.selected_components
        
        if not selected:
            self.show_error("Aucun composant sélectionné")
            return
        
        # Appliquer le filtre
        filtered = selected
        if self.component_list.layer_filter != 'all':
            filtered = [c for c in selected if c.get('layer') == self.component_list.layer_filter]
        
        # Regrouper par LCSC code
        grouped = {}
        for comp in filtered:
            lcsc = comp.get('lcsc', '')
            if not lcsc:
                continue  # Ignorer les composants sans code LCSC
            
            if lcsc not in grouped:
                grouped[lcsc] = {'refs': [], 'value': comp['value'], 
                                'footprint': comp['footprint']}
            grouped[lcsc]['refs'].append(comp['ref'])
        
        # Chemin de sortie
        if platform == 'android':
            try:
                output_dir = os.path.join(primary_external_storage_path(), 'Download')
                if not os.path.exists(output_dir):
                    output_dir = primary_external_storage_path()
            except:
                output_dir = str(Path.home())
        else:
            output_dir = str(Path.home())
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f'BOM_LCSC_{timestamp}.csv')
        
        try:
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Comment', 'Designator', 'Footprint', 'LCSC'])
                
                for lcsc, data in sorted(grouped.items()):
                    refs = sorted(data['refs'])
                    writer.writerow([
                        data['value'],
                        ','.join(refs),
                        data['footprint'],
                        lcsc
                    ])
            
            self.show_message(f"Format LCSC exporté:\n{output_path}")
            self.status_label.text = f"Export LCSC: {Path(output_path).name}"
        except Exception as e:
            self.show_error(f"Erreur d'export: {e}")
    
    def show_error(self, message):
        """Affiche une popup d'erreur"""
        content = Label(text=message, font_size=dp(12))
        popup = Popup(title='Erreur', content=content, size_hint=(0.85, 0.3))
        popup.open()
    
    def show_message(self, message):
        """Affiche une popup de message"""
        content = Label(text=message, font_size=dp(12))
        popup = Popup(title='Information', content=content, size_hint=(0.85, 0.3))
        popup.open()


if __name__ == '__main__':
    IBomSelectorApp().run()
