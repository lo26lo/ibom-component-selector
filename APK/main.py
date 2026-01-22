"""
IBom Selector - Version Android avec Kivy
Application de sélection de composants depuis un fichier InteractiveHtmlBom
Avec tri, sauvegarde d'historique et marquage des composants traités
"""

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

# Pour Android
if platform == 'android':
    from android.permissions import request_permissions, Permission
    from android.storage import primary_external_storage_path
    request_permissions([Permission.READ_EXTERNAL_STORAGE, Permission.WRITE_EXTERNAL_STORAGE])


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
        
    def _load_lcsc_csv(self):
        """Charge le fichier CSV LCSC s'il existe"""
        html_dir = Path(self.html_file_path).parent
        possible_paths = [
            html_dir.parent / 'lcsc' / 'BOM-lcsc.csv',
            html_dir / 'lcsc' / 'BOM-lcsc.csv',
            Path('lcsc') / 'BOM-lcsc.csv',
            html_dir.parent / 'BOM-lcsc.csv',
        ]
        
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
        except Exception as e:
            print(f"Erreur lors du chargement du CSV LCSC: {e}")
    
    def parse(self):
        """Parse le fichier HTML et extrait les données"""
        self._load_lcsc_csv()
        
        try:
            with open(self.html_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            raise Exception(f"Erreur de lecture du fichier: {e}")
        
        # Chercher les données pcbdata
        pcbdata_match = re.search(r'var\s+pcbdata\s*=\s*(\{.*?\});', content, re.DOTALL)
        
        if pcbdata_match:
            try:
                self.pcbdata = json.loads(pcbdata_match.group(1))
            except json.JSONDecodeError as e:
                raise Exception(f"Erreur JSON pcbdata: {e}")
        else:
            # Essayer de trouver des données compressées
            compressed_match = re.search(r'var\s+pcbdata\s*=\s*JSON\.parse\s*\(\s*LZString\.decompress(?:FromBase64)?\s*\(\s*["\']([^"\']+)["\']\s*\)\s*\)', content)
            
            if compressed_match:
                compressed_data = compressed_match.group(1)
                decompressed = LZString.decompress_from_base64(compressed_data)
                
                if decompressed:
                    try:
                        self.pcbdata = json.loads(decompressed)
                    except json.JSONDecodeError as e:
                        raise Exception(f"Erreur JSON après décompression: {e}")
                else:
                    raise Exception("Échec de la décompression des données")
            else:
                raise Exception("Données pcbdata non trouvées dans le fichier HTML")
        
        # Extraire la bounding box du board
        if 'edges_bbox' in self.pcbdata:
            self.board_bbox = self.pcbdata['edges_bbox']
        elif 'board' in self.pcbdata and 'edges_bbox' in self.pcbdata['board']:
            self.board_bbox = self.pcbdata['board']['edges_bbox']
        
        # Extraire les composants du BOM
        self._extract_components()
        
        return True
    
    def _extract_components(self):
        """Extrait les composants du BOM"""
        if not self.pcbdata:
            return
        
        bom = self.pcbdata.get('bom', {})
        fields = bom.get('fields', [])
        
        # Trouver l'index du champ LCSC
        lcsc_index = None
        for i, field in enumerate(fields):
            if field.upper() in ['LCSC', 'LCSC PART', 'LCSC_PART']:
                lcsc_index = i
                break
        
        # Parcourir les groupes Front et Back
        for layer_key in ['F', 'B']:
            layer_groups = bom.get(layer_key, bom.get('both', []))
            
            for group in layer_groups:
                if len(group) >= 3:
                    refs = group[2] if len(group) > 2 else []
                    value = group[0] if len(group) > 0 else ""
                    footprint = group[1] if len(group) > 1 else ""
                    extra_fields = group[3] if len(group) > 3 else []
                    
                    # Récupérer le code LCSC
                    lcsc_code = ""
                    if lcsc_index is not None and len(extra_fields) > lcsc_index:
                        lcsc_code = extra_fields[lcsc_index]
                    
                    for ref_data in refs:
                        if isinstance(ref_data, list) and len(ref_data) >= 1:
                            ref = ref_data[0]
                        else:
                            ref = str(ref_data)
                        
                        # Utiliser le code LCSC du CSV si disponible
                        final_lcsc = self.lcsc_data.get(ref, lcsc_code)
                        
                        component = {
                            'ref': ref,
                            'value': value,
                            'footprint': footprint,
                            'layer': layer_key,
                            'lcsc': final_lcsc,
                            'bbox': None
                        }
                        
                        # Chercher la position du composant
                        self._find_component_position(component)
                        self.components.append(component)
    
    def _find_component_position(self, component):
        """Trouve la position d'un composant sur le PCB"""
        ref = component['ref']
        layer = component['layer']
        
        # Chercher dans les footprints
        footprints = self.pcbdata.get('footprints', [])
        modules = self.pcbdata.get('modules', footprints)
        
        for module in modules:
            module_ref = module.get('ref', '')
            if module_ref == ref:
                # Récupérer la bounding box
                bbox = module.get('bbox', None)
                if bbox:
                    component['bbox'] = bbox
                    return
                
                # Sinon calculer depuis les pads
                pads = module.get('pads', [])
                if pads:
                    min_x = min_y = float('inf')
                    max_x = max_y = float('-inf')
                    
                    for pad in pads:
                        pos = pad.get('pos', [0, 0])
                        size = pad.get('size', [1, 1])
                        x, y = pos[0], pos[1]
                        w, h = size[0] / 2, size[1] / 2
                        
                        min_x = min(min_x, x - w)
                        max_x = max(max_x, x + w)
                        min_y = min(min_y, y - h)
                        max_y = max(max_y, y + h)
                    
                    if min_x != float('inf'):
                        component['bbox'] = {
                            'minx': min_x,
                            'miny': min_y,
                            'maxx': max_x,
                            'maxy': max_y
                        }
    
    def get_components_in_rect(self, x1, y1, x2, y2):
        """Retourne les composants dans un rectangle donné"""
        result = []
        for comp in self.components:
            if comp.get('bbox'):
                bbox = comp['bbox']
                cx = (bbox['minx'] + bbox['maxx']) / 2
                cy = (bbox['miny'] + bbox['maxy']) / 2
                
                if min(x1, x2) <= cx <= max(x1, x2) and min(y1, y2) <= cy <= max(y1, y2):
                    result.append(comp)
        return result


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
        self.bind(size=self._on_size)
        
    def _on_size(self, *args):
        self._calculate_transform()
        self._redraw()
    
    def set_parser(self, parser):
        """Définit le parser et redessine"""
        self.parser = parser
        self.components = parser.components if parser else []
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
        self.scale = min(scale_x, scale_y)
        
        self.offset_x = margin + (available_width - board_width * self.scale) / 2 - bbox.get('minx', 0) * self.scale
        self.offset_y = margin + (available_height - board_height * self.scale) / 2 - bbox.get('miny', 0) * self.scale
    
    def _board_to_screen(self, x, y):
        """Convertit les coordonnées du PCB en coordonnées écran"""
        return (x * self.scale + self.offset_x, 
                self.height - (y * self.scale + self.offset_y))
    
    def _screen_to_board(self, x, y):
        """Convertit les coordonnées écran en coordonnées du PCB"""
        return ((x - self.offset_x) / self.scale,
                (self.height - y - self.offset_y) / self.scale)
    
    def _redraw(self):
        """Redessine le PCB"""
        self.canvas.clear()
        
        with self.canvas:
            # Fond
            Color(0.1, 0.1, 0.1, 1)
            Rectangle(pos=self.pos, size=self.size)
            
            if not self.parser or not self.parser.board_bbox:
                return
            
            # Dessiner le contour du board
            bbox = self.parser.board_bbox
            Color(0.2, 0.5, 0.2, 1)
            x1, y1 = self._board_to_screen(bbox.get('minx', 0), bbox.get('miny', 0))
            x2, y2 = self._board_to_screen(bbox.get('maxx', 100), bbox.get('maxy', 100))
            Rectangle(pos=(min(x1, x2), min(y1, y2)), 
                     size=(abs(x2 - x1), abs(y2 - y1)))
            
            # Dessiner les composants
            for comp in self.components:
                if comp.get('bbox'):
                    cbbox = comp['bbox']
                    cx1, cy1 = self._board_to_screen(cbbox['minx'], cbbox['miny'])
                    cx2, cy2 = self._board_to_screen(cbbox['maxx'], cbbox['maxy'])
                    
                    if comp in self.selected_components:
                        Color(1, 0.5, 0, 0.8)
                    elif comp['layer'] == 'F':
                        Color(0.8, 0.2, 0.2, 0.6)
                    else:
                        Color(0.2, 0.2, 0.8, 0.6)
                    
                    Rectangle(pos=(min(cx1, cx2), min(cy1, cy2)),
                             size=(abs(cx2 - cx1), abs(cy2 - cy1)))
            
            # Rectangle de sélection
            if self.selection_rect:
                Color(1, 1, 0, 0.3)
                x, y, w, h = self.selection_rect
                Rectangle(pos=(x, y), size=(w, h))
                Color(1, 1, 0, 1)
                Line(rectangle=(x, y, w, h), width=2)
    
    def on_touch_down(self, touch):
        if self.collide_point(*touch.pos):
            self.selection_start = touch.pos
            return True
        return super().on_touch_down(touch)
    
    def on_touch_move(self, touch):
        if self.selection_start and self.collide_point(*touch.pos):
            x1, y1 = self.selection_start
            x2, y2 = touch.pos
            self.selection_rect = (min(x1, x2), min(y1, y2), 
                                  abs(x2 - x1), abs(y2 - y1))
            self._redraw()
            return True
        return super().on_touch_move(touch)
    
    def on_touch_up(self, touch):
        if self.selection_start:
            if self.selection_rect:
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
            if comp.get('bbox'):
                cbbox = comp['bbox']
                cx1, cy1 = self._board_to_screen(cbbox['minx'], cbbox['miny'])
                cx2, cy2 = self._board_to_screen(cbbox['maxx'], cbbox['maxy'])
                
                # Vérifier l'intersection
                comp_x1, comp_y1 = min(cx1, cx2), min(cy1, cy2)
                comp_x2, comp_y2 = max(cx1, cx2), max(cy1, cy2)
                
                if (comp_x1 < rx2 and comp_x2 > rx and 
                    comp_y1 < ry2 and comp_y2 > ry):
                    self.selected_components.append(comp)
        
        # Notifier le parent
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
        self.checkbox = CheckBox(size_hint_x=0.1, active=False)
        self.checkbox.bind(active=self._on_checkbox)
        self.add_widget(self.checkbox)
        
        # Infos
        self.add_widget(Label(text=component.get('ref', ''), size_hint_x=0.15))
        self.add_widget(Label(text=component.get('value', '')[:15], size_hint_x=0.25))
        self.add_widget(Label(text=component.get('footprint', '')[:15], size_hint_x=0.25))
        self.add_widget(Label(text=component.get('lcsc', ''), size_hint_x=0.15))
        self.add_widget(Label(text=component.get('layer', ''), size_hint_x=0.1))
    
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
        self.processed_items = set()  # Set de (value, footprint, lcsc) traités
        self.sort_column = 'ref'
        self.sort_reverse = False
        self.layer_filter = 'all'  # 'all', 'F', 'B'
        self.search_text = ''
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
        
        # Trier
        if self.sort_column:
            filtered.sort(key=lambda x: x.get(self.sort_column, ''), reverse=self.sort_reverse)
        
        # En-tête avec boutons de tri
        header = BoxLayout(size_hint_y=None, height=dp(45))
        header.add_widget(Label(text='✓', size_hint_x=0.1, bold=True))
        
        for col, text, size in [('ref', 'Ref', 0.15), ('value', 'Valeur', 0.25), 
                                 ('footprint', 'Footprint', 0.25), ('lcsc', 'LCSC', 0.15),
                                 ('layer', 'Layer', 0.1)]:
            btn = Button(text=text + (' ↓' if self.sort_column == col and self.sort_reverse 
                                      else ' ↑' if self.sort_column == col else ''),
                        size_hint_x=size, background_color=(0.3, 0.3, 0.5, 1))
            btn.col = col
            btn.bind(on_press=self._on_sort_click)
            header.add_widget(btn)
        
        self.layout.add_widget(header)
        
        # Composants
        for comp in filtered:
            row = ComponentRow(comp, on_toggle=self._on_component_toggle)
            
            # Restaurer l'état "traité"
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
    
    def get_processed_count(self):
        """Retourne le nombre de composants traités"""
        count = sum(1 for row in self.component_rows if row.is_processed)
        return count, len(self.component_rows)
    
    def mark_all_processed(self, value):
        """Marque tous les composants visibles comme traités ou non"""
        for row in self.component_rows:
            row.set_processed(value)
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
                {'ref': c['ref'], 'value': c['value'], 'footprint': c['footprint'], 'lcsc': c['lcsc']}
                for c in components
            ],
            'processed': [list(p) for p in processed_items]
        }
        self.history.append(entry)
        self.save()
        return len(self.history) - 1
    
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
        self.title = 'IBom Selector'
        self.parser = None
        self.history_manager = HistoryManager()
        
        # Layout principal
        main_layout = BoxLayout(orientation='vertical', padding=dp(5), spacing=dp(5))
        
        # === Barre d'outils ===
        toolbar = BoxLayout(size_hint_y=None, height=dp(50), spacing=dp(5))
        
        load_btn = Button(text='📂 Charger', size_hint_x=0.25)
        load_btn.bind(on_press=self.show_file_chooser)
        toolbar.add_widget(load_btn)
        
        history_btn = Button(text='📜 Historique', size_hint_x=0.25)
        history_btn.bind(on_press=self.show_history_popup)
        toolbar.add_widget(history_btn)
        
        save_btn = Button(text='💾 Sauver', size_hint_x=0.25)
        save_btn.bind(on_press=self.save_selection)
        toolbar.add_widget(save_btn)
        
        export_btn = Button(text='📤 Export', size_hint_x=0.25)
        export_btn.bind(on_press=self.show_export_popup)
        toolbar.add_widget(export_btn)
        
        main_layout.add_widget(toolbar)
        
        # === Zone PCB ===
        self.pcb_view = PCBView(size_hint_y=0.4)
        self.pcb_view.on_selection_callback = self.on_selection_changed
        main_layout.add_widget(self.pcb_view)
        
        # === Filtres ===
        filter_layout = BoxLayout(size_hint_y=None, height=dp(45), spacing=dp(5))
        
        # Filtre couche
        filter_layout.add_widget(Label(text='Couche:', size_hint_x=0.15))
        self.layer_spinner = Spinner(
            text='Tous',
            values=['Tous', 'Front (F)', 'Back (B)'],
            size_hint_x=0.25
        )
        self.layer_spinner.bind(text=self.on_layer_filter_change)
        filter_layout.add_widget(self.layer_spinner)
        
        # Recherche
        filter_layout.add_widget(Label(text='Recherche:', size_hint_x=0.15))
        self.search_input = TextInput(
            hint_text='Ref, valeur, LCSC...',
            multiline=False,
            size_hint_x=0.45
        )
        self.search_input.bind(text=self.on_search_change)
        filter_layout.add_widget(self.search_input)
        
        main_layout.add_widget(filter_layout)
        
        # === Info sélection ===
        info_layout = BoxLayout(size_hint_y=None, height=dp(35), spacing=dp(10))
        
        self.selection_label = Label(text='Sélection: 0 composants', size_hint_x=0.5)
        info_layout.add_widget(self.selection_label)
        
        self.processed_label = Label(text='Traités: 0/0', size_hint_x=0.3)
        info_layout.add_widget(self.processed_label)
        
        clear_proc_btn = Button(text='↻', size_hint_x=0.2)
        clear_proc_btn.bind(on_press=self.clear_processed)
        info_layout.add_widget(clear_proc_btn)
        
        main_layout.add_widget(info_layout)
        
        # === Liste des composants ===
        self.component_list = ComponentList(size_hint_y=0.45)
        self.component_list.on_processed_change = self.update_processed_count
        main_layout.add_widget(self.component_list)
        
        # === Barre de statut ===
        self.status_label = Label(
            text='Aucun fichier chargé',
            size_hint_y=None,
            height=dp(30),
            color=(0.7, 0.7, 0.7, 1)
        )
        main_layout.add_widget(self.status_label)
        
        return main_layout
    
    def on_selection_changed(self, selected_components):
        """Appelé quand la sélection change"""
        count = len(selected_components)
        self.selection_label.text = f'Sélection: {count} composants'
        self.component_list.set_components(selected_components)
        self.update_processed_count()
    
    def on_layer_filter_change(self, spinner, text):
        """Filtre par couche"""
        if text == 'Front (F)':
            self.component_list.set_layer_filter('F')
        elif text == 'Back (B)':
            self.component_list.set_layer_filter('B')
        else:
            self.component_list.set_layer_filter('all')
    
    def on_search_change(self, instance, text):
        """Recherche de composants"""
        self.component_list.set_search_text(text)
    
    def update_processed_count(self):
        """Met à jour le compteur de composants traités"""
        processed, total = self.component_list.get_processed_count()
        self.processed_label.text = f'Traités: {processed}/{total}'
    
    def clear_processed(self, instance):
        """Efface les marquages 'traité'"""
        self.component_list.mark_all_processed(False)
    
    def show_file_chooser(self, instance):
        """Affiche le sélecteur de fichier"""
        content = BoxLayout(orientation='vertical')
        
        # Chemin initial
        if platform == 'android':
            initial_path = primary_external_storage_path()
        else:
            initial_path = str(Path.home())
        
        file_chooser = FileChooserListView(
            path=initial_path,
            filters=['*.html', '*.HTML']
        )
        content.add_widget(file_chooser)
        
        buttons = BoxLayout(size_hint_y=None, height=dp(50))
        
        select_btn = Button(text='Sélectionner')
        cancel_btn = Button(text='Annuler')
        
        buttons.add_widget(select_btn)
        buttons.add_widget(cancel_btn)
        content.add_widget(buttons)
        
        popup = Popup(title='Choisir un fichier HTML', content=content, 
                     size_hint=(0.9, 0.9))
        
        def on_select(btn):
            if file_chooser.selection:
                self.load_file(file_chooser.selection[0])
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
            self.status_label.text = f'Chargé: {Path(filepath).name}'
        except Exception as e:
            self.show_error(f"Erreur: {e}")
    
    def show_history_popup(self, instance):
        """Affiche la popup de l'historique"""
        if not self.parser:
            self.show_error("Veuillez d'abord charger un fichier HTML")
            return
        
        content = BoxLayout(orientation='vertical', spacing=dp(10), padding=dp(10))
        
        entries = self.history_manager.get_entries_list()
        
        if not entries:
            content.add_widget(Label(text="Aucun historique disponible"))
        else:
            scroll = ScrollView()
            entries_layout = GridLayout(cols=1, spacing=dp(5), size_hint_y=None)
            entries_layout.bind(minimum_height=entries_layout.setter('height'))
            
            for i, entry_text in enumerate(entries):
                btn = Button(text=entry_text, size_hint_y=None, height=dp(50))
                btn.entry_index = i
                btn.bind(on_press=lambda x: self.load_history_entry(x.entry_index, popup))
                entries_layout.add_widget(btn)
            
            scroll.add_widget(entries_layout)
            content.add_widget(scroll)
        
        close_btn = Button(text='Fermer', size_hint_y=None, height=dp(50))
        content.add_widget(close_btn)
        
        popup = Popup(title='Historique des sélections', content=content,
                     size_hint=(0.9, 0.8))
        close_btn.bind(on_press=lambda x: popup.dismiss())
        popup.open()
    
    def load_history_entry(self, index, popup):
        """Charge une entrée de l'historique"""
        entry = self.history_manager.get_entry(index)
        if not entry:
            return
        
        popup.dismiss()
        
        # Restaurer les composants
        saved_refs = set(c.get('ref') for c in entry.get('components', []))
        selected = [comp for comp in self.parser.components if comp.get('ref') in saved_refs]
        
        self.pcb_view.selected_components = selected
        self.pcb_view._redraw()
        
        # Restaurer les items traités
        self.component_list.processed_items.clear()
        for proc in entry.get('processed', []):
            if isinstance(proc, list) and len(proc) == 3:
                self.component_list.processed_items.add(tuple(proc))
        
        self.component_list.set_components(selected)
        self.selection_label.text = f'Sélection: {len(selected)} composants'
        self.update_processed_count()
        
        name = entry.get('name', 'Sélection')
        self.status_label.text = f"Chargé: {name}"
    
    def save_selection(self, instance):
        """Sauvegarde la sélection actuelle"""
        selected = self.pcb_view.selected_components
        
        if not selected:
            self.show_error("Aucune sélection à sauvegarder")
            return
        
        # Popup pour le nom
        content = BoxLayout(orientation='vertical', spacing=dp(10), padding=dp(10))
        
        content.add_widget(Label(text="Nom de la sélection:"))
        name_input = TextInput(
            text=f"Zone {len(self.history_manager.history) + 1}",
            multiline=False,
            size_hint_y=None,
            height=dp(40)
        )
        content.add_widget(name_input)
        
        buttons = BoxLayout(size_hint_y=None, height=dp(50), spacing=dp(10))
        save_btn = Button(text='Sauvegarder')
        cancel_btn = Button(text='Annuler')
        buttons.add_widget(save_btn)
        buttons.add_widget(cancel_btn)
        content.add_widget(buttons)
        
        popup = Popup(title='Sauvegarder la sélection', content=content,
                     size_hint=(0.8, 0.4))
        
        def on_save(btn):
            name = name_input.text or f"Zone {len(self.history_manager.history) + 1}"
            self.history_manager.add_entry(
                name,
                selected,
                self.component_list.processed_items,
                self.pcb_view.selection_rect
            )
            popup.dismiss()
            self.show_message(f"Sélection '{name}' sauvegardée!")
        
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
        
        content.add_widget(Label(text=f"{len(selected)} composants à exporter"))
        
        csv_btn = Button(text='Export CSV', size_hint_y=None, height=dp(50))
        csv_btn.bind(on_press=lambda x: self.export_csv(popup))
        content.add_widget(csv_btn)
        
        cancel_btn = Button(text='Annuler', size_hint_y=None, height=dp(50))
        content.add_widget(cancel_btn)
        
        popup = Popup(title='Exporter', content=content, size_hint=(0.8, 0.4))
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
        
        # Regrouper par valeur et footprint
        grouped = {}
        for comp in selected:
            # Appliquer le filtre de couche si actif
            if self.component_list.layer_filter != 'all':
                if comp.get('layer') != self.component_list.layer_filter:
                    continue
            
            key = (comp.get('value', ''), comp.get('footprint', ''), comp.get('lcsc', ''))
            if key not in grouped:
                grouped[key] = {'refs': [], 'value': comp['value'], 
                               'footprint': comp['footprint'], 'lcsc': comp['lcsc']}
            grouped[key]['refs'].append(comp['ref'])
        
        # Chemin de sortie
        if platform == 'android':
            output_dir = primary_external_storage_path()
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
            self.status_label.text = f"Export réussi: {Path(output_path).name}"
        except Exception as e:
            self.show_error(f"Erreur d'export: {e}")
    
    def show_error(self, message):
        """Affiche une popup d'erreur"""
        popup = Popup(title='Erreur', 
                     content=Label(text=message),
                     size_hint=(0.8, 0.3))
        popup.open()
    
    def show_message(self, message):
        """Affiche une popup de message"""
        popup = Popup(title='Information', 
                     content=Label(text=message),
                     size_hint=(0.8, 0.3))
        popup.open()


if __name__ == '__main__':
    IBomSelectorApp().run()
