import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { LoginForm, RegisterForm } from '../components/auth/AuthForms';
import { Loader } from '../components/common';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';

const AuthScreen = ({ navigation }) => {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, register } = useAuth();

  const handleLogin = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await login(data.email, data.password);
      navigation.replace('Main');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await register(data);
      navigation.replace('Main');
    } catch (err) {
      setError(err.response?.data?.error || "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Scholars Connect</Text>
          <Text style={styles.tagline}>
            Connectez-vous avec des scholars qualifiés
          </Text>
        </View>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.activeTab]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
              Connexion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.activeTab]}
            onPress={() => switchMode('register')}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>
              Inscription
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'login' ? (
          <LoginForm onSubmit={handleLogin} loading={loading} />
        ) : (
          <RegisterForm onSubmit={handleRegister} loading={loading} />
        )}

        {loading && <Loader />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center'
  },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 9
  },
  activeTab: {
    backgroundColor: colors.primary
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600'
  },
  activeTabText: {
    color: colors.white
  },
  errorBox: {
    backgroundColor: '#FDECEA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: colors.error,
    fontSize: 14
  }
});

export default AuthScreen;
