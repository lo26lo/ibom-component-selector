/**
 * PCBView - Vue interactive du PCB avec SVG
 * Affiche les composants, pads, edges et silkscreen
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, G, Line, Polygon, Path, Ellipse, Text as SvgText } from 'react-native-svg';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store';
import type { Component, BoundingBox, SelectionRect } from '../../core/types';

interface PCBViewProps {
  onSelectionComplete?: (components: Component[]) => void;
  showPads?: boolean;
  showSilkscreen?: boolean;
  showEdges?: boolean;
  showTracks?: boolean;
}

export function PCBView({ 
  onSelectionComplete,
  showPads = true,
  showSilkscreen = true,
  showEdges = true,
  showTracks = true,
}: PCBViewProps) {
  const { theme, isEinkMode } = useTheme();
  const containerRef = useRef<View>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Store state
  const components = useAppStore((s) => s.components);
  const boardBbox = useAppStore((s) => s.boardBbox);
  const parser = useAppStore((s) => s.parser);
  const selectedComponents = useAppStore((s) => s.selectedComponents);
  const highlightedComponents = useAppStore((s) => s.highlightedComponents);
  const setSelectedComponents = useAppStore((s) => s.setSelectedComponents);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);

  // Récupérer les footprints et edges depuis le parser
  const footprints = useMemo(() => parser?.getFootprints() || [], [parser]);
  const edges = useMemo(() => parser?.getEdges() || [], [parser]);
  const drawings = useMemo(() => parser?.getDrawings() || {}, [parser]);
  const tracks = useMemo(() => parser?.getTracks() || {}, [parser]);

  // Gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Selection rectangle (stored in board coordinates for persistence across zoom/pan)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [lastSelectionPcb, setLastSelectionPcb] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  // Touch tracking
  const [isTouching, setIsTouching] = useState(false);

  // Calculate transform
  const transform = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    const margin = 20;
    const boardWidth = boardBbox.maxx - boardBbox.minx;
    const boardHeight = boardBbox.maxy - boardBbox.miny;

    if (boardWidth <= 0 || boardHeight <= 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    const availableWidth = containerSize.width - 2 * margin;
    const availableHeight = containerSize.height - 2 * margin;

    const scaleX = availableWidth / boardWidth;
    const scaleY = availableHeight / boardHeight;
    const baseScale = Math.min(scaleX, scaleY);

    const offsetX = margin + (availableWidth - boardWidth * baseScale) / 2 - boardBbox.minx * baseScale;
    const offsetY = margin + (availableHeight - boardHeight * baseScale) / 2 - boardBbox.miny * baseScale;

    return { scale: baseScale, offsetX, offsetY };
  }, [boardBbox, containerSize]);

  // Convert board coords to screen coords
  const boardToScreen = useCallback(
    (x: number, y: number) => {
      return {
        x: x * transform.scale + transform.offsetX,
        y: containerSize.height - (y * transform.scale + transform.offsetY),
      };
    },
    [transform, containerSize]
  );

  // Convert screen coords to board coords
  const screenToBoard = useCallback(
    (x: number, y: number) => {
      return {
        x: (x - transform.offsetX) / transform.scale,
        y: (containerSize.height - y - transform.offsetY) / transform.scale,
      };
    },
    [transform, containerSize]
  );

  // Get components in selection rectangle
  const getComponentsInRect = useCallback(
    (x1: number, y1: number, x2: number, y2: number): Component[] => {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      return components.filter((comp) => {
        return (
          comp.x >= minX &&
          comp.x <= maxX &&
          comp.y >= minY &&
          comp.y <= maxY
        );
      });
    },
    [components]
  );

  // Pinch gesture for zoom (2 fingers)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(5, savedScale.value * event.scale));
    });

  // Pan gesture for moving (2 fingers)
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    });

  // Composed gestures for zoom/pan (needs 2 fingers)
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for the SVG container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Handle layout
  const handleLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // Handle touch for selection (1 finger = selection rectangle)
  const handleTouchStart = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    // Start selection
    setIsTouching(true);
    setSelectionStart({ x: locationX, y: locationY });
    setSelectionEnd({ x: locationX, y: locationY });
  }, []);

  const handleTouchMove = useCallback((event: any) => {
    if (!isTouching || !selectionStart) return;
    const { locationX, locationY } = event.nativeEvent;
    setSelectionEnd({ x: locationX, y: locationY });
  }, [isTouching, selectionStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouching || !selectionStart || !selectionEnd) {
      setIsTouching(false);
      return;
    }

    // Check if selection rectangle is big enough (not just a tap)
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width > 10 && height > 10) {
      // Convert to board coordinates
      const start = screenToBoard(selectionStart.x, selectionStart.y);
      const end = screenToBoard(selectionEnd.x, selectionEnd.y);

      // Get components in selection
      const selected = getComponentsInRect(start.x, start.y, end.x, end.y);
      setSelectedComponents(selected);
      setSelectionRect({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
      
      // Save selection in PCB coordinates for persistence across zoom/pan
      setLastSelectionPcb({ 
        x1: Math.min(start.x, end.x), 
        y1: Math.min(start.y, end.y), 
        x2: Math.max(start.x, end.x), 
        y2: Math.max(start.y, end.y) 
      });

      if (onSelectionComplete) {
        onSelectionComplete(selected);
      }
    }

    setIsTouching(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isTouching, selectionStart, selectionEnd, screenToBoard, getComponentsInRect, setSelectedComponents, setSelectionRect, onSelectionComplete]);

  // Render component - discret par défaut, visible si sélectionné/highlighté
  const renderComponent = useCallback(
    (comp: Component, index: number) => {
      const pos = boardToScreen(comp.x, comp.y);
      const isSelected = selectedComponents.some((c) => c.ref === comp.ref);
      const isHighlighted = highlightedComponents.some((c) => c.ref === comp.ref);

      // Ne pas afficher les composants non sélectionnés/highlightés (les pads sont déjà visibles)
      if (!isSelected && !isHighlighted) {
        return null;
      }

      if (isHighlighted) {
        // Highlight très visible - grand cercle + croix
        const size = 12 * scale.value;
        return (
          <G key={`comp-${comp.ref}-${index}`}>
            {/* Cercle externe */}
            <Circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill="none"
              stroke={isEinkMode ? '#000000' : '#FF0000'}
              strokeWidth={3}
            />
            {/* Croix au centre */}
            <Line
              x1={pos.x - size * 0.6}
              y1={pos.y}
              x2={pos.x + size * 0.6}
              y2={pos.y}
              stroke={isEinkMode ? '#000000' : '#FF0000'}
              strokeWidth={2}
            />
            <Line
              x1={pos.x}
              y1={pos.y - size * 0.6}
              x2={pos.x}
              y2={pos.y + size * 0.6}
              stroke={isEinkMode ? '#000000' : '#FF0000'}
              strokeWidth={2}
            />
            {/* Cercle interne */}
            <Circle
              cx={pos.x}
              cy={pos.y}
              r={size * 0.5}
              fill="none"
              stroke={isEinkMode ? '#555555' : '#FFFF00'}
              strokeWidth={2}
            />
          </G>
        );
      } else if (isSelected) {
        // Sélectionné - petit cercle orange
        const size = 3 * scale.value;
        return (
          <Circle
            key={`comp-${comp.ref}-${index}`}
            cx={pos.x}
            cy={pos.y}
            r={size}
            fill={isEinkMode ? '#000000' : '#FF8800'}
            opacity={0.8}
          />
        );
      }

      return null;
    },
    [boardToScreen, selectedComponents, highlightedComponents, scale, isEinkMode]
  );

  // Render board outline
  const renderBoard = useMemo(() => {
    const topLeft = boardToScreen(boardBbox.minx, boardBbox.maxy);
    const bottomRight = boardToScreen(boardBbox.maxx, boardBbox.miny);

    return (
      <Rect
        x={topLeft.x}
        y={topLeft.y}
        width={bottomRight.x - topLeft.x}
        height={bottomRight.y - topLeft.y}
        fill={theme.pcbBoard}
        stroke={theme.border}
        strokeWidth={isEinkMode ? 2 : 1}
      />
    );
  }, [boardBbox, boardToScreen, theme, isEinkMode]);

  // Render persistent selection rectangle (in board coords, follows zoom/pan)
  const renderPersistentSelectionRect = useMemo(() => {
    if (!lastSelectionPcb) return null;

    const topLeft = boardToScreen(lastSelectionPcb.x1, lastSelectionPcb.y2);
    const bottomRight = boardToScreen(lastSelectionPcb.x2, lastSelectionPcb.y1);

    return (
      <Rect
        x={topLeft.x}
        y={topLeft.y}
        width={bottomRight.x - topLeft.x}
        height={bottomRight.y - topLeft.y}
        fill={isEinkMode ? 'transparent' : 'rgba(255, 255, 0, 0.15)'}
        stroke={isEinkMode ? theme.textPrimary : theme.pcbSelected}
        strokeWidth={isEinkMode ? 2 : 1.5}
      />
    );
  }, [lastSelectionPcb, boardToScreen, isEinkMode, theme]);

  // Render selection rectangle (during drag)
  const renderSelectionRect = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;

    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isEinkMode ? 'rgba(200, 200, 200, 0.5)' : 'rgba(100, 150, 255, 0.3)'}
        stroke={theme.pcbSelected}
        strokeWidth={2}
        strokeDasharray="5,5"
      />
    );
  }, [selectionStart, selectionEnd, theme, isEinkMode]);

  // Render edges (contour du PCB)
  const renderEdges = useMemo(() => {
    if (!showEdges || !edges.length) return null;

    return edges.map((edge: any, index: number) => {
      const type = edge.type;
      const strokeColor = isEinkMode ? '#000000' : '#FFCC00';
      const strokeWidth = 1.5;

      if (type === 'segment') {
        const start = boardToScreen(edge.start[0], edge.start[1]);
        const end = boardToScreen(edge.end[0], edge.end[1]);
        return (
          <Line
            key={`edge-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      } else if (type === 'arc') {
        // Pour les arcs, on dessine une approximation avec plusieurs segments
        const cx = edge.start[0];
        const cy = edge.start[1];
        const radius = edge.radius || 1;
        const startAngle = edge.startangle || 0;
        const endAngle = edge.endangle || 360;
        const center = boardToScreen(cx, cy);
        const r = radius * transform.scale;
        
        // Simple cercle si arc complet
        if (Math.abs(endAngle - startAngle) >= 359) {
          return (
            <Circle
              key={`edge-${index}`}
              cx={center.x}
              cy={center.y}
              r={r}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          );
        }
        return null;
      } else if (type === 'circle') {
        const center = boardToScreen(edge.start[0], edge.start[1]);
        const r = (edge.radius || 1) * transform.scale;
        return (
          <Circle
            key={`edge-${index}`}
            cx={center.x}
            cy={center.y}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      }
      return null;
    });
  }, [showEdges, edges, boardToScreen, transform.scale, isEinkMode]);

  // Render pads from footprints - Amélioration avec formes correctes et trous
  const renderPads = useMemo(() => {
    if (!showPads || !footprints.length) return null;

    const padElements: React.ReactNode[] = [];
    
    // Couleurs inspirées de ibom.html
    const padColor = isEinkMode ? '#808080' : '#878787';
    const padHoleColor = isEinkMode ? '#AAAAAA' : '#CCCCCC';
    const frontColor = isEinkMode ? '#808080' : '#B0A050';  // Or/cuivre pour F
    const backColor = isEinkMode ? '#606060' : '#5050A0';   // Bleu pour B
    
    footprints.forEach((fp: any, fpIndex: number) => {
      const pads = fp.pads || [];
      const fpLayer = fp.layer || 'F';
      
      pads.forEach((pad: any, padIndex: number) => {
        const pos = pad.pos || [0, 0];
        const size = pad.size || [0.5, 0.5];
        const layers = pad.layers || [fpLayer];
        const shape = pad.shape || 'rect';
        const angle = pad.angle || 0;
        const padType = pad.type || 'smd';
        const offset = pad.offset || [0, 0];
        const radius = pad.radius || 0;
        const drillsize = pad.drillsize || [0.3, 0.3];
        const drillshape = pad.drillshape || 'circle';
        
        // Position avec offset
        const actualX = pos[0] + offset[0];
        const actualY = pos[1] + offset[1];
        const screenPos = boardToScreen(actualX, actualY);
        
        const w = Math.max(1.5, size[0] * transform.scale);
        const h = Math.max(1.5, size[1] * transform.scale);
        
        // Couleur selon la couche principale
        const isTopLayer = layers.includes('F') || layers.some((l: string) => l.startsWith('F.'));
        const fillColor = isTopLayer ? frontColor : backColor;
        
        const key = `pad-${fpIndex}-${padIndex}`;
        
        // Dessiner le pad selon sa forme
        if (shape === 'circle') {
          padElements.push(
            <Circle
              key={key}
              cx={screenPos.x}
              cy={screenPos.y}
              r={w / 2}
              fill={fillColor}
              opacity={0.85}
            />
          );
        } else if (shape === 'oval') {
          padElements.push(
            <Ellipse
              key={key}
              cx={screenPos.x}
              cy={screenPos.y}
              rx={w / 2}
              ry={h / 2}
              fill={fillColor}
              opacity={0.85}
              transform={angle ? `rotate(${-angle}, ${screenPos.x}, ${screenPos.y})` : undefined}
            />
          );
        } else if (shape === 'roundrect') {
          // Rectangle arrondi - calculer le rayon des coins
          const cornerRadius = Math.min(w, h) * (radius || 0.25);
          padElements.push(
            <Rect
              key={key}
              x={screenPos.x - w / 2}
              y={screenPos.y - h / 2}
              width={w}
              height={h}
              rx={cornerRadius}
              ry={cornerRadius}
              fill={fillColor}
              opacity={0.85}
              transform={angle ? `rotate(${-angle}, ${screenPos.x}, ${screenPos.y})` : undefined}
            />
          );
        } else {
          // Rectangle standard
          padElements.push(
            <Rect
              key={key}
              x={screenPos.x - w / 2}
              y={screenPos.y - h / 2}
              width={w}
              height={h}
              fill={fillColor}
              opacity={0.85}
              transform={angle ? `rotate(${-angle}, ${screenPos.x}, ${screenPos.y})` : undefined}
            />
          );
        }
        
        // Dessiner le trou pour les pads through-hole
        if (padType === 'th' && drillsize) {
          const holeW = Math.max(1, drillsize[0] * transform.scale);
          const holeH = drillsize.length > 1 ? Math.max(1, drillsize[1] * transform.scale) : holeW;
          
          if (drillshape === 'oblong') {
            padElements.push(
              <Ellipse
                key={`${key}-hole`}
                cx={screenPos.x}
                cy={screenPos.y}
                rx={holeW / 2}
                ry={holeH / 2}
                fill={padHoleColor}
                transform={angle ? `rotate(${-angle}, ${screenPos.x}, ${screenPos.y})` : undefined}
              />
            );
          } else {
            padElements.push(
              <Circle
                key={`${key}-hole`}
                cx={screenPos.x}
                cy={screenPos.y}
                r={holeW / 2}
                fill={padHoleColor}
              />
            );
          }
        }
      });
    });
    
    return padElements;
  }, [showPads, footprints, boardToScreen, transform.scale, isEinkMode]);

  // Render silkscreen drawings from footprints - avec texte des références
  const renderSilkscreen = useMemo(() => {
    if (!showSilkscreen || !footprints.length) return null;

    const silkElements: React.ReactNode[] = [];
    // Couleurs inspirées de ibom.html
    const silkEdgeColor = isEinkMode ? '#333333' : '#AAAA44';
    const silkTextColor = isEinkMode ? '#444444' : '#44AAAA';
    
    footprints.forEach((fp: any, fpIndex: number) => {
      const fpDrawings = fp.drawings || [];
      const fpRef = fp.ref || '';
      const fpBbox = fp.bbox;
      
      // Dessiner les drawings du footprint
      fpDrawings.forEach((drawingObj: any, drawIndex: number) => {
        const key = `silk-${fpIndex}-${drawIndex}`;
        const layer = drawingObj.layer || '';
        const drawing = drawingObj.drawing || drawingObj;
        
        // Seulement les couches silkscreen
        if (!layer.includes('Silk') && !layer.includes('F.SilkS') && !layer.includes('B.SilkS')) {
          // Mais on dessine quand même si c'est directement dans drawings
          if (drawingObj.layer) return;
        }
        
        const type = drawing.type;
        
        if (type === 'segment') {
          const start = drawing.start || [0, 0];
          const end = drawing.end || [0, 0];
          const startScreen = boardToScreen(start[0], start[1]);
          const endScreen = boardToScreen(end[0], end[1]);
          const width = Math.max(0.3, (drawing.width || 0.1) * transform.scale);
          silkElements.push(
            <Line
              key={key}
              x1={startScreen.x}
              y1={startScreen.y}
              x2={endScreen.x}
              y2={endScreen.y}
              stroke={silkEdgeColor}
              strokeWidth={width}
              strokeLinecap="round"
            />
          );
        } else if (type === 'rect') {
          const start = drawing.start || [0, 0];
          const end = drawing.end || [1, 1];
          const topLeft = boardToScreen(Math.min(start[0], end[0]), Math.max(start[1], end[1]));
          const bottomRight = boardToScreen(Math.max(start[0], end[0]), Math.min(start[1], end[1]));
          const width = Math.max(0.3, (drawing.width || 0.1) * transform.scale);
          silkElements.push(
            <Rect
              key={key}
              x={topLeft.x}
              y={topLeft.y}
              width={bottomRight.x - topLeft.x}
              height={bottomRight.y - topLeft.y}
              fill="none"
              stroke={silkEdgeColor}
              strokeWidth={width}
            />
          );
        } else if (type === 'circle') {
          const center = drawing.start || [0, 0];
          const centerScreen = boardToScreen(center[0], center[1]);
          const r = (drawing.radius || 0.5) * transform.scale;
          const width = Math.max(0.3, (drawing.width || 0.1) * transform.scale);
          silkElements.push(
            <Circle
              key={key}
              cx={centerScreen.x}
              cy={centerScreen.y}
              r={r}
              fill="none"
              stroke={silkEdgeColor}
              strokeWidth={width}
            />
          );
        } else if (type === 'arc') {
          // Arc - dessiner approximativement
          const start = drawing.start || [0, 0];
          const mid = drawing.mid || start;
          const end = drawing.end || start;
          const startScreen = boardToScreen(start[0], start[1]);
          const endScreen = boardToScreen(end[0], end[1]);
          const width = Math.max(0.3, (drawing.width || 0.1) * transform.scale);
          // Simplification: ligne entre start et end
          silkElements.push(
            <Line
              key={key}
              x1={startScreen.x}
              y1={startScreen.y}
              x2={endScreen.x}
              y2={endScreen.y}
              stroke={silkEdgeColor}
              strokeWidth={width}
              strokeLinecap="round"
            />
          );
        } else if (type === 'polygon' && drawing.polygons) {
          drawing.polygons.forEach((poly: number[][], polyIndex: number) => {
            if (!Array.isArray(poly)) return;
            const points = poly.map(([x, y]) => {
              const p = boardToScreen(x, y);
              return `${p.x},${p.y}`;
            }).join(' ');
            if (points) {
              const filled = drawing.filled !== false;
              silkElements.push(
                <Polygon
                  key={`${key}-${polyIndex}`}
                  points={points}
                  fill={filled ? silkEdgeColor : 'none'}
                  stroke={silkEdgeColor}
                  strokeWidth={0.5}
                  opacity={0.8}
                />
              );
            }
          });
        }
      });
      
      // Dessiner la référence du composant comme texte
      if (fpRef && fpBbox) {
        const bboxPos = fpBbox.pos || [0, 0];
        const bboxRelpos = fpBbox.relpos || [0, 0];
        const bboxSize = fpBbox.size || [1, 1];
        const bboxAngle = fpBbox.angle || 0;
        
        // Centre de la bounding box
        const centerX = bboxPos[0] + bboxRelpos[0] + bboxSize[0] / 2;
        const centerY = bboxPos[1] + bboxRelpos[1] + bboxSize[1] / 2;
        const textPos = boardToScreen(centerX, centerY);
        
        // Taille du texte proportionnelle à la bbox
        const textSize = Math.max(6, Math.min(14, Math.min(bboxSize[0], bboxSize[1]) * transform.scale * 0.4));
        
        silkElements.push(
          <SvgText
            key={`text-${fpIndex}`}
            x={textPos.x}
            y={textPos.y}
            fill={silkTextColor}
            fontSize={textSize}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            opacity={0.9}
          >
            {fpRef}
          </SvgText>
        );
      }
    });
    
    return silkElements;
  }, [showSilkscreen, footprints, boardToScreen, transform.scale, isEinkMode]);

  // Render tracks (pistes de cuivre) - avec couleurs ibom
  const renderTracks = useMemo(() => {
    if (!showTracks || !tracks || Object.keys(tracks).length === 0) return null;

    const trackElements: React.ReactNode[] = [];
    let trackIndex = 0;
    
    // Couleurs inspirées de ibom.html
    const trackColorF = isEinkMode ? '#555555' : '#DEF5F1';  // Cuivre avant
    const trackColorB = isEinkMode ? '#777777' : '#42524F';  // Cuivre arrière
    
    // Parcourir les layers (F.Cu, B.Cu, etc.)
    Object.entries(tracks).forEach(([layer, layerTracks]: [string, any]) => {
      if (!Array.isArray(layerTracks)) return;
      
      // Couleur selon la couche
      const isTopLayer = layer.startsWith('F') || layer === 'F.Cu';
      const strokeColor = isTopLayer ? trackColorF : trackColorB;
      
      layerTracks.forEach((track: any) => {
        const start = track.start;
        const end = track.end;
        const width = track.width || 0.2;
        
        if (start && end && Array.isArray(start) && Array.isArray(end)) {
          const startScreen = boardToScreen(start[0], start[1]);
          const endScreen = boardToScreen(end[0], end[1]);
          // Utiliser la largeur réelle de la piste
          const strokeWidth = Math.max(0.8, width * transform.scale);
          
          trackElements.push(
            <Line
              key={`track-${trackIndex++}`}
              x1={startScreen.x}
              y1={startScreen.y}
              x2={endScreen.x}
              y2={endScreen.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.75}
            />
          );
        }
      });
    });
    
    return trackElements;
  }, [showTracks, tracks, boardToScreen, transform.scale, isEinkMode]);

  return (
    <View style={styles.container}>
      <View
        ref={containerRef}
        style={[styles.svgContainer, { backgroundColor: theme.pcbBg }]}
        onLayout={handleLayout}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.animated, animatedStyle]}>
            <Svg
              width={containerSize.width}
              height={containerSize.height}
              viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            >
              <G>
                {/* Board outline */}
                {renderBoard}

                {/* Edges (contour PCB) */}
                {renderEdges}

                {/* Tracks (pistes de cuivre) */}
                {renderTracks}

                {/* Pads des footprints */}
                {renderPads}

                {/* Silkscreen */}
                {renderSilkscreen}

                {/* Components (cercles) */}
                {components.map(renderComponent)}

                {/* Persistent selection rectangle (follows zoom/pan) */}
                {renderPersistentSelectionRect}

                {/* Selection rectangle being drawn */}
                {renderSelectionRect}
              </G>
            </Svg>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  svgContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  animated: {
    flex: 1,
  },
});

export default PCBView;
