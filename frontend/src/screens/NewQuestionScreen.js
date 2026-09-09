import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useQuestions } from '../hooks/useQuestions';
import { Input, Button } from '../components/common';
import { colors } from '../theme/colors';
import { CATEGORIES, LANGUAGES, URGENCY_LEVELS } from '../utils/constants';

const NewQuestionScreen = ({ navigation }) => {
  const { createQuestion } = useQuestions();
  const [category, setCategory] = useState(null);
  const [language, setLanguage] = useState('ar');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!category) newErrors.category = 'Veuillez choisir une catégorie';
    if (!title || title.trim().length < 5) newErrors.title = 'Titre trop court (min 5 caractères)';
    if (!content || content.trim().length < 10) newErrors.content = 'Description trop courte (min 10 caractères)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await createQuestion({
        category,
        title: title.trim(),
        content: content.trim(),
        language,
        urgency,
        isAnonymous
      });
      Alert.alert('Succès', 'Votre question a été soumise', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.message || "Impossible de soumettre la question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nouvelle Question</Text>

        <Text style={styles.label}>Catégorie *</Text>
        <View style={styles.selectGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.selectItem,
                category === cat.value && styles.selectItemActive
              ]}
              onPress={() => {
                setCategory(cat.value);
                setErrors(prev => ({ ...prev, category: undefined }));
              }}
            >
              <Text
                style={[
                  styles.selectItemText,
                  category === cat.value && styles.selectItemTextActive
                ]}
              >
                {cat.labelFr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        <Input
          label="Titre *"
          value={title}
          onChangeText={setTitle}
          placeholder="Résumez votre question"
          error={errors.title}
          autoCapitalize="sentences"
        />

        <Input
          label="Description *"
          value={content}
          onChangeText={setContent}
          placeholder="Détaillez votre question..."
          error={errors.content}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Langue</Text>
        <View style={styles.selectRow}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.value}
              style={[
                styles.languageItem,
                language === lang.value && styles.languageItemActive
              ]}
              onPress={() => setLanguage(lang.value)}
            >
              <Text
                style={[
                  styles.languageText,
                  language === lang.value && styles.languageTextActive
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Urgence</Text>
        <View style={styles.selectRow}>
          {URGENCY_LEVELS.map(level => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.urgencyItem,
                urgency === level.value && styles.urgencyItemActive
              ]}
              onPress={() => setUrgency(level.value)}
            >
              <Text
                style={[
                  styles.urgencyText,
                  urgency === level.value && styles.urgencyTextActive
                ]}
              >
                {level.labelFr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.anonymityToggle}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
            {isAnonymous && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.anonymityText}>
            Poser la question de manière anonyme
          </Text>
        </TouchableOpacity>

        <Button
          title={loading ? 'Envoi...' : 'Envoyer la question'}
          onPress={handleSubmit}
          loading={loading}
          size="large"
          style={styles.submitButton}
        />
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
    padding: 16,
    paddingBottom: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 8
  },
  selectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  selectItem: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  selectItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selectItemText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  selectItemTextActive: {
    color: colors.white,
    fontWeight: '600'
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  languageItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  languageItemActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  languageText: {
    color: colors.textSecondary
  },
  languageTextActive: {
    color: colors.white,
    fontWeight: '600'
  },
  urgencyItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  urgencyItemActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  urgencyText: {
    color: colors.textSecondary
  },
  urgencyTextActive: {
    color: colors.black,
    fontWeight: '600'
  },
  anonymityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: colors.primary
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  anonymityText: {
    fontSize: 14,
    color: colors.textPrimary
  },
  submitButton: {
    marginTop: 16
  }
});

export default NewQuestionScreen;
