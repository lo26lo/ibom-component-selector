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
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const { height: screenHeight } = Dimensions.get('window');

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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.bgPrimary,
              borderColor: isEinkMode ? theme.border : theme.bgSecondary,
              maxHeight: screenHeight * 0.8,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { 
                borderBottomColor: theme.border,
                backgroundColor: theme.bgSecondary,
              },
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
                  },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeText, { color: theme.textPrimary }]}>
                  X
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.childrenWrapper}>
              {children}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    width: '92%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  closeText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  childrenWrapper: {
    padding: spacing.md,
  },
});

export default ThemedModal;
