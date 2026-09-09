import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    (disabled || loading) && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.secondary
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.primary
  },
  danger: {
    backgroundColor: colors.error
  },
  disabled: {
    opacity: 0.5
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32
  },
  text: {
    fontWeight: '600'
  },
  primaryText: {
    color: colors.white
  },
  secondaryText: {
    color: colors.white
  },
  outlineText: {
    color: colors.primary
  },
  dangerText: {
    color: colors.white
  },
  smallText: {
    fontSize: 14
  },
  mediumText: {
    fontSize: 16
  },
  largeText: {
    fontSize: 18
  }
});

export default Button;
