/**
 * PCBView - Vue interactive du PCB avec SVG
 * Affiche les composants, pads, edges et silkscreen
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, G, Line, Polygon, Path, Ellipse } from 'react-native-svg';
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
}

export function PCBView({ 
  onSelectionComplete,
  showPads = true,
  showSilkscreen = true,
  showEdges = true,
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

  // Render component
  const renderComponent = useCallback(
    (comp: Component, index: number) => {
      const pos = boardToScreen(comp.x, comp.y);
      const isSelected = selectedComponents.some((c) => c.ref === comp.ref);
      const isHighlighted = highlightedComponents.some((c) => c.ref === comp.ref);

      let color = comp.layer === 'F' ? theme.pcbCompFront : theme.pcbCompBack;
      if (isHighlighted) {
        color = theme.pcbHighlight;
      } else if (isSelected) {
        color = theme.pcbSelected;
      }

      const size = 4 * scale.value;

      return (
        <Circle
          key={`comp-${comp.ref}-${index}`}
          cx={pos.x}
          cy={pos.y}
          r={size}
          fill={color}
          stroke={isHighlighted ? theme.pcbHighlight : 'none'}
          strokeWidth={isHighlighted ? 2 : 0}
        />
      );
    },
    [boardToScreen, selectedComponents, highlightedComponents, theme, scale]
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

  // Render pads from footprints
  const renderPads = useMemo(() => {
    if (!showPads || !footprints.length) return null;

    const padElements: React.ReactNode[] = [];
    
    footprints.forEach((fp: any, fpIndex: number) => {
      const pads = fp.pads || [];
      const fpLayer = fp.layer || 'F';
      
      pads.forEach((pad: any, padIndex: number) => {
        const pos = pad.pos || [0, 0];
        const size = pad.size || [0.5, 0.5];
        const layers = pad.layers || [fpLayer];
        const shape = pad.shape || 'rect';
        const angle = pad.angle || 0;
        
        const screenPos = boardToScreen(pos[0], pos[1]);
        const w = Math.max(2, size[0] * transform.scale);
        const h = Math.max(2, size[1] * transform.scale);
        
        // Couleur selon la couche
        let fillColor: string;
        if (isEinkMode) {
          fillColor = layers.includes('F') ? '#888888' : '#AAAAAA';
        } else {
          fillColor = layers.includes('F') ? '#C9A030' : '#4040A0';
        }
        
        const key = `pad-${fpIndex}-${padIndex}`;
        
        if (shape === 'circle' || shape === 'oval') {
          padElements.push(
            <Ellipse
              key={key}
              cx={screenPos.x}
              cy={screenPos.y}
              rx={w / 2}
              ry={h / 2}
              fill={fillColor}
              opacity={0.7}
            />
          );
        } else {
          // Rectangle (avec rotation si nécessaire)
          padElements.push(
            <Rect
              key={key}
              x={screenPos.x - w / 2}
              y={screenPos.y - h / 2}
              width={w}
              height={h}
              fill={fillColor}
              opacity={0.7}
              transform={angle ? `rotate(${-angle}, ${screenPos.x}, ${screenPos.y})` : undefined}
            />
          );
        }
      });
    });
    
    return padElements;
  }, [showPads, footprints, boardToScreen, transform.scale, isEinkMode]);

  // Render silkscreen drawings from footprints
  const renderSilkscreen = useMemo(() => {
    if (!showSilkscreen || !footprints.length) return null;

    const silkElements: React.ReactNode[] = [];
    const strokeColor = isEinkMode ? '#333333' : '#FFFFAA';
    
    footprints.forEach((fp: any, fpIndex: number) => {
      const fpDrawings = fp.drawings || [];
      
      fpDrawings.forEach((drawing: any, drawIndex: number) => {
        const key = `silk-${fpIndex}-${drawIndex}`;
        
        if (drawing.type === 'segment') {
          const start = boardToScreen(drawing.start[0], drawing.start[1]);
          const end = boardToScreen(drawing.end[0], drawing.end[1]);
          silkElements.push(
            <Line
              key={key}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={strokeColor}
              strokeWidth={0.8}
              opacity={0.6}
            />
          );
        } else if (drawing.type === 'circle') {
          const center = boardToScreen(drawing.start[0], drawing.start[1]);
          const r = (drawing.radius || 0.5) * transform.scale;
          silkElements.push(
            <Circle
              key={key}
              cx={center.x}
              cy={center.y}
              r={r}
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.8}
              opacity={0.6}
            />
          );
        } else if (drawing.type === 'polygon' && drawing.polygons) {
          drawing.polygons.forEach((poly: number[][], polyIndex: number) => {
            const points = poly.map(([x, y]) => {
              const p = boardToScreen(x, y);
              return `${p.x},${p.y}`;
            }).join(' ');
            silkElements.push(
              <Polygon
                key={`${key}-${polyIndex}`}
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeWidth={0.5}
                opacity={0.5}
              />
            );
          });
        }
      });
    });
    
    return silkElements;
  }, [showSilkscreen, footprints, boardToScreen, transform.scale, isEinkMode]);

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
