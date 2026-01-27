/**
 * ThemedModal - Modal avec thème e-ink/normal
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function ThemedModal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
}: ThemedModalProps) {
  const { theme, isEinkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[
              styles.container,
              {
                backgroundColor: theme.bgPrimary,
                borderColor: isEinkMode ? theme.border : 'transparent',
                borderWidth: isEinkMode ? 2 : 0,
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: theme.bgButton,
                      borderColor: isEinkMode ? theme.border : 'transparent',
                      borderWidth: isEinkMode ? 1 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.closeText, { color: theme.textPrimary }]}>
                    X
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {children}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '85%',
    minHeight: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default ThemedModal;
