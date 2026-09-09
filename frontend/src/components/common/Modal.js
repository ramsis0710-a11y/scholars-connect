import React from 'react';
import { Modal as RNModal, View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const Modal = ({ visible, onClose, children, transparent = true }) => {
  return (
    <RNModal
      visible={visible}
      transparent={transparent}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.closeButtonArea}>
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  closeButtonArea: {
    width: '100%'
  }
});

export default Modal;
