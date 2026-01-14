# IBom Component Selector

A Python GUI tool to visually select components from InteractiveHtmlBom files and export them to Excel.

## Features

- **Load InteractiveHtmlBom HTML files** - Supports compressed (LZ-String) and uncompressed formats
- **Visual PCB preview** - See your PCB layout with pads, silkscreen, and board outline
- **Rectangle selection** - Click on the PCB preview to open the selection window, then draw a rectangle to select components
- **LCSC part numbers** - Automatically loads LCSC codes from a CSV file if available
- **Grouped export** - Components are grouped by value/footprint with quantity count
- **Excel export** - Export selected components to a formatted Excel file

## Requirements

- Python 3.x
- Required packages:
  - `openpyxl` - For Excel file generation
  - `lzstring` - For decompressing InteractiveHtmlBom data

Install dependencies:
```bash
pip install openpyxl lzstring
```

## Usage

### Quick Start

1. Double-click `launch_ibom_selector.bat` to start the application
2. The program automatically loads `bom/ibom.html` if it exists
3. Click on the PCB preview to open the selection window
4. Draw a rectangle around the components you want to select
5. Review the selected components in the list
6. Click "Export to Excel" to save

### Manual Launch

```bash
python ibom_selector.py
```

## File Structure

```
lolobom/
├── ibom_selector.py      # Main application
├── launch_ibom_selector.bat  # Windows launcher
├── README.md             # This file
├── bom/
│   └── ibom.html         # InteractiveHtmlBom file (auto-loaded)
└── lcsc/
    └── BOM-lcsc.csv      # LCSC part numbers (optional)
```

## LCSC CSV Format

To add LCSC part numbers, create a file `lcsc/BOM-lcsc.csv` with the following format:

```csv
Comment,Designator,Footprint,LCSC
100nF,"C1,C2,C3",C_0603_1608Metric,C14663
10k,"R1,R2",R_0603_1608Metric,C25804
```

The program will automatically match component references to LCSC codes.

## PCB Viewer Controls

- **Left click + drag** - Draw selection rectangle
- **Mouse wheel** - Zoom in/out
- **Zoom +/-** buttons - Zoom controls
- **Reset** button - Reset view to fit

## Export Format

The Excel export includes:
- **Quantity** - Number of components with same value/footprint
- **References** - List of component designators (e.g., "C1, C2, C3")
- **Value** - Component value (e.g., "100nF", "10k")
- **Footprint** - Component footprint name
- **LCSC** - LCSC part number (if available)

## Color Legend

In the PCB viewer:
- **Green** - Front layer components
- **Red** - Back layer components
- **Dark red pads** - Front SMD pads
- **Dark blue pads** - Back SMD pads
- **Gold pads** - Through-hole pads
- **White outline** - Board edge
- **Yellow dashed rectangle** - Selection area

## License

MIT License

## Credits

Designed to work with [InteractiveHtmlBom](https://github.com/openscopeproject/InteractiveHtmlBom) - a BOM plugin for KiCad.
