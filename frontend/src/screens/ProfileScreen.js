import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, Avatar } from '../components/common';
import { updateMe } from '../api/users';
import { colors } from '../theme/colors';
import { LANGUAGES } from '../utils/constants';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'ar');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateMe({ firstName, lastName, phone, preferredLanguage });
      await refreshUser();
      setEditMode(false);
      setMessage({ type: 'success', text: 'Profil mis à jour' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Échec de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }]
    });
  };

  const fullName = `${user?.firstName} ${user?.lastName}`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar size={80} source={user?.avatar} name={fullName} />
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'scholar' ? 'Scholar' : 'Utilisateur'}
          </Text>
        </View>
      </View>

      {message && (
        <View style={[styles.message, message.type === 'error' ? styles.errorMessage : styles.successMessage]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      <View style={styles.section}>
        {!editMode ? (
          <>
            <Text style={styles.label}>Prénom</Text>
            <Text style={styles.value}>{user?.firstName}</Text>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>{user?.lastName}</Text>
            {user?.phone && (
              <>
                <Text style={styles.label}>Téléphone</Text>
                <Text style={styles.value}>{user?.phone}</Text>
              </>
            )}
            <Text style={styles.label}>Langue préférée</Text>
            <Text style={styles.value}>
              {LANGUAGES.find(l => l.value === user?.preferredLanguage)?.label || user?.preferredLanguage}
            </Text>
          </>
        ) : (
          <>
            <Input
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Input
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <Input
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>Langue préférée</Text>
            <View style={styles.languageRow}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.value}
                  style={[
                    styles.languageItem,
                    preferredLanguage === lang.value && styles.languageItemActive
                  ]}
                  onPress={() => setPreferredLanguage(lang.value)}
                >
                  <Text style={[
                    styles.languageText,
                    preferredLanguage === lang.value && styles.languageTextActive
                  ]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        {!editMode ? (
          <>
            <Button
              title="Modifier le profil"
              onPress={() => setEditMode(true)}
              variant="outline"
            />
            <View style={styles.spacer} />
            <Button
              title="Se déconnecter"
              onPress={handleLogout}
              variant="danger"
            />
          </>
        ) : (
          <>
            <Button
              title={saving ? 'Enregistrement...' : "Enregistrer"}
              onPress={handleSave}
              loading={saving}
            />
            <View style={styles.spacer} />
            <Button
              title="Annuler"
              onPress={() => {
                setEditMode(false);
                setFirstName(user?.firstName);
                setLastName(user?.lastName);
                setPhone(user?.phone);
              }}
              variant="outline"
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12
  },
  email: {
    color: colors.textSecondary,
    marginTop: 4
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  roleText: {
    color: colors.white,
    fontWeight: '600'
  },
  message: {
    padding: 12,
    margin: 16,
    borderRadius: 8
  },
  successMessage: {
    backgroundColor: colors.success + '22'
  },
  errorMessage: {
    backgroundColor: colors.error + '22'
  },
  messageText: {
    textAlign: 'center',
    fontWeight: '600'
  },
  section: {
    backgroundColor: colors.surface,
    padding: 16,
    marginTop: 8
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  languageItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginRight: 8,
    marginBottom: 8
  },
  languageItemActive: {
    backgroundColor: colors.primary
  },
  languageText: {
    color: colors.textSecondary
  },
  languageTextActive: {
    color: colors.white,
    fontWeight: '600'
  },
  actions: {
    padding: 16,
    flexDirection: 'row'
  },
  spacer: {
    width: 12
  }
});

export default ProfileScreen;
