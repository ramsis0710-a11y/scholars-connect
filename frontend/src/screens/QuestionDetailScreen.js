import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getQuestionById } from '../api/questions';
import { addResponse } from '../api/questions';
import { useAuth } from '../hooks/useAuth';
import { Loader, Button, Input } from '../components/common';
import { colors } from '../theme/colors';
import { CATEGORIES } from '../utils/constants';

const QuestionDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuestionById(id);
      setQuestion(data);
    } catch (err) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      await addResponse(id, { content: responseText.trim() });
      setResponseText('');
      await loadQuestion();
    } catch (err) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Chargement..." />;

  if (error || !question) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Question non trouvée'}</Text>
      </View>
    );
  }

  const isScholar = user?.role === 'scholar';
  const canRespond = isScholar;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.category}>
          {CATEGORIES.find(c => c.value === question.category)?.labelFr || question.category}
        </Text>
        <Text style={styles.title}>{question.title}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Question</Text>
        <Text style={styles.content}>{question.content}</Text>
      </View>

      {question.scholar && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignée à</Text>
          <Text style={styles.scholarName}>
            {question.scholar.name}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Réponses</Text>
        {(question.responses || []).length === 0 ? (
          <Text style={styles.emptyText}>
            En attente de réponse du scholar...
          </Text>
        ) : (
          question.responses.map(response => (
            <View key={response.id} style={styles.response}>
              <Text style={styles.responseText}>{response.content}</Text>
              <Text style={styles.responseDate}>
                {new Date(response.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title="Discuter avec le scholar"
          onPress={() => navigation.navigate('Chat', { questionId: question.id })}
          style={styles.chatButton}
        />
      </View>

      {canRespond && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votre réponse</Text>
          <Input
            value={responseText}
            onChangeText={setResponseText}
            placeholder="Écrivez votre réponse..."
            multiline
            numberOfLines={5}
          />
          <Button
            title={submitting ? 'Envoi...' : "Envoyer la réponse"}
            onPress={handleSubmitResponse}
            loading={submitting}
            style={styles.respondButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingTop: 24
  },
  category: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  section: {
    backgroundColor: colors.surface,
    padding: 16,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8
  },
  content: {
    color: colors.textSecondary,
    lineHeight: 22
  },
  scholarName: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600'
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic'
  },
  response: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  responseText: {
    color: colors.textPrimary,
    lineHeight: 20
  },
  responseDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4
  },
  actions: {
    padding: 16
  },
  chatButton: {
    backgroundColor: colors.secondary
  },
  respondButton: {
    marginTop: 8,
    backgroundColor: colors.primary
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  errorText: {
    color: colors.error
  }
});

export default QuestionDetailScreen;
