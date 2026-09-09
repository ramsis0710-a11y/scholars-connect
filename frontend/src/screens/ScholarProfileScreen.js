import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getScholarById } from '../api/scholars';
import { Loader, Button, Avatar } from '../components/common';
import { colors } from '../theme/colors';
import { CATEGORIES, LANGUAGES } from '../utils/constants';

const ScholarProfileScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadScholar();
  }, [id]);

  const loadScholar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScholarById(id);
      setScholar(data);
    } catch (err) {
      setError(err.message || 'Failed to load scholar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Chargement du profil..." />;

  if (error || !scholar) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Scholar non trouvé'}</Text>
      </View>
    );
  }

  const fullName = `${scholar.user?.firstName} ${scholar.user?.lastName}`;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar size={80} source={scholar.user?.avatar} name={fullName} />
        <Text style={styles.name}>{fullName}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {scholar.averageRating || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spécialités</Text>
        <View style={styles.tagContainer}>
          {scholar.specializations.map(spec => (
            <View key={spec} style={styles.tag}>
              <Text style={styles.tagText}>
                {CATEGORIES.find(c => c.value === spec)?.labelFr || spec}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Langues</Text>
        <View style={styles.tagContainer}>
          {scholar.languages.map(lang => (
            <View key={lang} style={[styles.tag, styles.langTag]}>
              <Text style={styles.tagText}>
                {LANGUAGES.find(l => l.value === lang)?.label || lang}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {scholar.qualifications?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifications</Text>
          {scholar.qualifications.map((qual, i) => (
            <Text key={i} style={styles.qualification}>
              • {qual}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biographie</Text>
        <Text style={styles.bio}>{scholar.bio}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{scholar.totalResponses}</Text>
          <Text style={styles.statLabel}>Réponses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {scholar.isAvailable ? 'Disponible' : 'Occupé'}
          </Text>
          <Text style={styles.statLabel}>Statut</Text>
        </View>
      </View>

      <Button
        title="Demander une réponse"
        size="large"
        style={styles.askButton}
        onPress={() => navigation.navigate('NewQuestion')}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 12
  },
  ratingBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8
  },
  ratingText: {
    color: colors.black,
    fontWeight: '700'
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  langTag: {
    backgroundColor: colors.secondary + '22'
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 13
  },
  qualification: {
    color: colors.textSecondary,
    marginVertical: 4
  },
  bio: {
    color: colors.textSecondary,
    lineHeight: 20
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    padding: 16,
    marginTop: 8
  },
  stat: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0'
  },
  askButton: {
    margin: 16,
    backgroundColor: colors.secondary
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

export default ScholarProfileScreen;
