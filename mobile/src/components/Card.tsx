import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: ReactNode;
}

interface CardContentProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardTitle({ children }: CardTitleProps) {
  return <Text style={styles.title}>{children}</Text>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <Text style={styles.description}>{children}</Text>;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: CardContentProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
