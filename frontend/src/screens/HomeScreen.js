import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuestions } from '../hooks/useQuestions';
import { useAuth } from '../hooks/useAuth';
import { Card, Loader, Button } from '../components/common';
import { colors } from '../theme/colors';
import { CATEGORIES } from '../utils/constants';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { questions, loading, error } = useQuestions();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredQuestions = selectedCategory
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

  const statusLabels = {
    pending: 'En attente',
    matched: 'Assignée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Salam, {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.subtitle}>
          Posez vos questions aux scholars qualifiés
        </Text>
      </View>

      <Button
        title="Poser une nouvelle question"
        onPress={() => navigation.navigate('NewQuestion')}
        size="large"
        style={styles.mainButton}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[styles.category, !selectedCategory && styles.categoryActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.category, selectedCategory === cat.value && styles.categoryActive]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.value && styles.categoryTextActive]}>
              {cat.labelFr}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Loader text="Chargement des questions..." />
      ) : error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.questions}>
          <Text style={styles.sectionTitle}>Vos questions</Text>
          {filteredQuestions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Aucune question pour le moment
              </Text>
            </View>
          ) : (
            filteredQuestions.map(question => (
              <TouchableOpacity
                key={question.id}
                onPress={() => navigation.navigate('QuestionDetail', { id: question.id })}
              >
                <Card title={question.title}>
                  <Text numberOfLines={2} style={styles.questionContent}>
                    {question.content}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.categoryLabel}>
                      {CATEGORIES.find(c => c.value === question.category)?.labelFr}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(question.status) }]}>
                      <Text style={styles.statusText}>
                        {statusLabels[question.status]}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  const colors = {
    pending: '#FB8C00',
    matched: '#1E88E5',
    in_progress: '#7B1FA2',
    completed: '#43A047',
    cancelled: '#757575'
  };
  return colors[status] || '#757575';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    padding: 16,
    paddingTop: 24
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4
  },
  mainButton: {
    marginHorizontal: 16,
    marginTop: 16
  },
  categoryScroll: {
    marginTop: 24
  },
  categoryContent: {
    paddingHorizontal: 16
  },
  category: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  categoryActive: {
    backgroundColor: colors.primary
  },
  categoryText: {
    color: colors.textSecondary
  },
  categoryTextActive: {
    color: colors.white
  },
  questions: {
    paddingTop: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 8,
    color: colors.textPrimary
  },
  questionContent: {
    color: colors.textSecondary,
    marginTop: 4
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600'
  },
  error: {
    padding: 24,
    alignItems: 'center'
  },
  errorText: {
    color: colors.error
  },
  empty: {
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14
  }
});

export default HomeScreen;
