import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card as PaperCard, Title, Paragraph } from 'react-native-paper';
import { colors } from '../../theme/colors';

export const Card = ({
  title,
  subtitle,
  children,
  onPress,
  viewStyle,
  contentStyle,
  ...props
}) => {
  return (
    <PaperCard
      style={[styles.card, viewStyle]}
      onPress={onPress}
      {...props}
    >
      <PaperCard.Content style={contentStyle}>
        {title && <Title style={styles.title}>{title}</Title>}
        {subtitle && <Paragraph style={styles.subtitle}>{subtitle}</Paragraph>}
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4
  }
});

export default Card;
