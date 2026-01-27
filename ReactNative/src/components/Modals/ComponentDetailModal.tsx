/**
 * ComponentDetailModal - Modal affichant les détails d'un composant
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { ThemedModal, ThemedButton } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { Component } from '../../core/types';

interface ComponentDetailModalProps {
  visible: boolean;
  onClose: () => void;
  component: Component | null;
  isProcessed?: boolean;
  onToggleProcessed?: (key: string) => void;
}

export function ComponentDetailModal({
  visible,
  onClose,
  component,
  isProcessed = false,
  onToggleProcessed,
}: ComponentDetailModalProps) {
  const { theme, isEinkMode } = useTheme();

  if (!component) return null;

  const componentKey = `${component.value}|${component.footprint}|${component.lcsc}`;

  const handleToggle = () => {
    if (onToggleProcessed) {
      onToggleProcessed(componentKey);
    }
  };

  const DetailRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | undefined;
  }) => (
    <View
      style={[
        styles.detailRow,
        { borderBottomColor: theme.borderLight },
      ]}
    >
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[styles.detailValue, { color: theme.textPrimary }]}
        selectable
      >
        {value || '-'}
      </Text>
    </View>
  );

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Détails">
        <DetailRow label="Référence" value={component.ref} />
        <DetailRow label="Valeur" value={component.value} />
        <DetailRow label="Footprint" value={component.footprint} />
        <DetailRow label="LCSC" value={component.lcsc} />
        <DetailRow label="Layer" value={component.layer} />
        <DetailRow label="Quantité" value={component.qty || 1} />

        {/* Extra fields if any */}
        {Object.entries(component)
          .filter(
            ([key]) =>
              !['ref', 'value', 'footprint', 'lcsc', 'layer', 'qty', 'bbox'].includes(key)
          )
          .map(([key, val]) => (
            <DetailRow
              key={key}
              label={key}
              value={typeof val === 'object' ? JSON.stringify(val) : String(val)}
            />
          ))}

        {/* Status toggle */}
        <View style={styles.statusSection}>
          <Text style={[styles.statusLabel, { color: theme.textPrimary }]}>
            Statut: {isProcessed ? 'Traité ✓' : 'Non traité'}
          </Text>
          <ThemedButton
            title={isProcessed ? 'Marquer non traité' : 'Marquer traité'}
            onPress={handleToggle}
            active={!isProcessed}
            style={styles.toggleButton}
          />
        </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  detailLabel: {
    width: 100,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  statusSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  statusLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  toggleButton: {
    width: '100%',
  },
});

export default ComponentDetailModal;
