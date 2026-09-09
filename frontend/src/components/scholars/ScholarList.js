import React, { useState } from 'react';
import { getAllScholars } from '../api/scholars';
import { Loader } from '../components/common';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Button } from '../components/common';
import { CATEGORIES } from '../utils/constants';

const ScholarListComponent = ({ navigation, category, onSelect }) => {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadScholars();
    }, [category])
  );

  const loadScholars = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category) params.category = category;
      params.available = 'true';
      const data = await getAllScholars(params);
      setScholars(data.data);
    } catch (err) {
      setError(err.message || 'Failed to load scholars');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Chargement des scholars..." />;

  if (error) {
    return <Text style={{ color: colors.error, padding: 16 }}>{error}</Text>;
  }

  if (scholars.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Aucun scholar disponible</Text>
      </View>
    );
  }

  return scholars.map(scholar => (
    <Card
      key={scholar.id}
      title={`${scholar.user?.firstName} ${scholar.user?.lastName}`}
      subtitle={scholar.specializations.map(s =>
        CATEGORIES.find(c => c.value === s)?.labelFr
      ).filter(Boolean).join(', ')}
    >
      <Text numberOfLines={3} style={{ color: colors.textSecondary }}>
        {scholar.bio}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <Button
          title="Voir le profil"
          size="small"
          onPress={() => onSelect ? onSelect(scholar) : navigation?.navigate('ScholarProfile', { id: scholar.id })}
        />
        <View style={{ width: 12 }} />
        <Button
          title={`★ ${scholar.averageRating || 'N/A'}`}
          size="small"
          variant="secondary"
        />
      </View>
    </Card>
  ));
};

import { View, Text } from 'react-native';
import { colors } from '../theme/colors';

export default ScholarListComponent;
