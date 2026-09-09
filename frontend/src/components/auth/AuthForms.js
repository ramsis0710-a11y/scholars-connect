import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input, Button } from '../common';
import { colors } from '../../theme/colors';

export const LoginForm = ({ onSubmit, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email || !email.includes('@')) newErrors.email = 'Email invalide';
    if (!password || password.length < 8) newErrors.password = 'Mot de passe invalide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ email, password });
    }
  };

  return (
    <View style={styles.container}>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="votre@email.com"
        error={errors.email}
        keyboardType="email-address"
      />
      <Input
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        placeholder="Votre mot de passe"
        error={errors.password}
        secureTextEntry
      />
      <Button
        title={loading ? 'Connexion...' : 'Se connecter'}
        onPress={handleSubmit}
        loading={loading}
        size="large"
        style={styles.button}
      />
    </View>
  );
};

export const RegisterForm = ({ onSubmit, loading }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!firstName || firstName.length < 2) newErrors.firstName = 'Prénom requis';
    if (!lastName || lastName.length < 2) newErrors.lastName = 'Nom requis';
    if (!email || !email.includes('@')) newErrors.email = 'Email invalide';
    if (!password || password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ firstName, lastName, email, password });
    }
  };

  return (
    <View style={styles.container}>
      <Input
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Votre prénom"
        error={errors.firstName}
        autoCapitalize="words"
      />
      <Input
        label="Nom"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Votre nom"
        error={errors.lastName}
        autoCapitalize="words"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="votre@email.com"
        error={errors.email}
        keyboardType="email-address"
      />
      <Input
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimum 8 caractères"
        error={errors.password}
        secureTextEntry
      />
      <Input
        label="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Répétez le mot de passe"
        error={errors.confirmPassword}
        secureTextEntry
      />
      <Button
        title={loading ? 'Inscription...' : "S'inscrire"}
        onPress={handleSubmit}
        loading={loading}
        size="large"
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.secondary
  }
});
