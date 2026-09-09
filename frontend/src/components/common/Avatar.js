import React from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';

const Avatar = ({ size = 50, source, name, style }) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          style
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.initialsAvatar,
        { width: size, height: size, borderRadius: size / 2 },
        style
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primary
  },
  initialsAvatar: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  initials: {
    color: colors.white,
    fontWeight: '700'
  }
});

export default Avatar;
