/**
 * HelpModal - Modal d'aide avec explication des couleurs et gestes
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { ThemedModal } from '../common';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

interface HelpSection {
  title: string;
  items: { icon: string; color: string; text: string }[];
}

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const { theme, isEinkMode } = useTheme();

  const sections: HelpSection[] = [
    {
      title: '🎨 Couleurs des composants',
      items: [
        {
          icon: '✓',
          color: theme.bgValidated,
          text: `Validé (swipe gauche) - ${isEinkMode ? 'gris clair' : 'vert'}, ce groupe est terminé`,
        },
        {
          icon: '▬',
          color: theme.bgHidden,
          text: `Masqué (swipe droite) - ${isEinkMode ? 'gris moyen' : 'gris'}, disparaît de la liste`,
        },
        {
          icon: '◆',
          color: theme.bgHighlighted,
          text: `Surligné (double-tap) - ${isEinkMode ? 'gris foncé' : 'bleu'}, temporaire`,
        },
        {
          icon: '■',
          color: '#D04040',
          text: 'Sélection rectangle sur le PCB (temporaire, rouge)',
        },
      ],
    },
    {
      title: '👆 Gestes sur les lignes de composants',
      items: [
        {
          icon: '�',
          color: theme.bgValidated,
          text: 'Swipe gauche : Valider ce groupe (🟢 vert)',
        },
        {
          icon: '👉',
          color: theme.bgHidden,
          text: 'Swipe droite : Masquer ce groupe (⚫ gris, disparaît)',
        },
        {
          icon: '👆👆',
          color: theme.bgHighlighted,
          text: 'Double-tap : Surligner ce groupe (🔵 bleu, temporaire)',
        },
        {
          icon: '👆⏳',
          color: theme.textPrimary,
          text: 'Appui long : Afficher les détails du composant',
        },
      ],
    },
    {
      title: '📌 Un seul état par composant',
      items: [
        {
          icon: 'ℹ️',
          color: theme.textSecondary,
          text: 'Un composant ne peut avoir qu\'un seul état (validé OU masqué OU surligné)',
        },
        {
          icon: '🔄',
          color: theme.textSecondary,
          text: 'Le dernier geste gagne : valider un masqué le rend validé',
        },
        {
          icon: '↩️',
          color: theme.textSecondary,
          text: 'Re-geste : refaire le même geste annule l\'action (retour normal)',
        },
      ],
    },
    {
      title: '📋 Gestes sur les en-têtes de colonnes',
      items: [
        {
          icon: '👆',
          color: theme.textPrimary,
          text: 'Tap : Trier par cette colonne',
        },
        {
          icon: '👆👆',
          color: theme.bgHighlighted,
          text: 'Double-tap sur "Valeur" : Toggle highlight de tous les groupes',
        },
      ],
    },
    {
      title: '🔧 Boutons et actions',
      items: [
        {
          icon: '📁',
          color: theme.textPrimary,
          text: 'Fichier : Charger un fichier IBom HTML ou CSV LCSC',
        },
        {
          icon: '⚙️',
          color: theme.textPrimary,
          text: 'Préf : Configurer les préférences (thème, police, etc.)',
        },
        {
          icon: '📜',
          color: theme.textPrimary,
          text: 'Hist : Voir et restaurer les sauvegardes précédentes',
        },
        {
          icon: '💾',
          color: theme.textPrimary,
          text: 'Save : Sauvegarder l\'état actuel',
        },
        {
          icon: '📤',
          color: theme.textPrimary,
          text: 'Export : Exporter la sélection en CSV ou liste',
        },
        {
          icon: '👁️',
          color: theme.bgHidden,
          text: 'Masqués : Gérer les groupes masqués (les restaurer)',
        },
        {
          icon: '🎨',
          color: theme.textPrimary,
          text: 'Filtre PCB : Choisir quelles couleurs afficher (🟢 validé, ⚫ masqué, 🔵 surligné, ⚪ normal)',
        },
      ],
    },
    {
      title: '📌 Filtres et tri',
      items: [
        {
          icon: 'F/B',
          color: theme.textPrimary,
          text: 'Filtrer par couche : Face avant (F) ou arrière (B)',
        },
        {
          icon: '🔍',
          color: theme.textPrimary,
          text: 'Recherche : Filtrer par référence, valeur ou footprint',
        },
        {
          icon: '↕️',
          color: theme.textPrimary,
          text: 'Cliquer sur un en-tête pour trier (cliquer à nouveau pour inverser)',
        },
      ],
    },
  ];

  return (
    <ThemedModal visible={visible} onClose={onClose} title="Aide">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {section.title}
            </Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: item.color },
                  ]}
                >
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <Text style={[styles.itemText, { color: theme.textSecondary }]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            💡 Astuce : La sauvegarde automatique restaure votre dernière session
            au redémarrage de l'application.
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary, marginTop: spacing.xs }]}>
            🔄 Après chaque action (masquer, valider), une notification apparaît
            avec un bouton "ANNULER" pour revenir en arrière.
          </Text>
        </View>
      </ScrollView>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 450,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: fontSize.sm,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
  footer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
  },
  footerText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default HelpModal;
