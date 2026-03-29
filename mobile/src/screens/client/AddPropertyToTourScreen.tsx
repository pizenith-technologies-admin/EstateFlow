import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { PropertyPhotoCarousel } from '../../components/PropertyPhotoCarousel';

export function AddPropertyToTourScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tourId } = route.params;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allProperties, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/properties'],
  });

  const { data: tourProperties } = useQuery<any[]>({
    queryKey: [`/api/tours/${tourId}/properties`],
    enabled: !!tourId,
  });

  // IDs already in the tour
  const alreadyAddedIds = new Set(
    (tourProperties || []).map((tp: any) => tp.propertyId || tp.property?.id)
  );

  const addPropertyMutation = useMutation({
    mutationFn: (propertyId: string) =>
      apiRequest('POST', `/api/tours/${tourId}/properties`, { propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${tourId}/properties`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
    },
  });

  const formatPrice = (price: any) => {
    if (!price) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const filteredProperties = (allProperties || []).filter((p: any) =>
    p.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProperty = ({ item }: { item: any }) => {
    const isAdded = alreadyAddedIds.has(item.id);
    const isAdding = addPropertyMutation.isPending && addPropertyMutation.variables === item.id;

    return (
      <Card style={styles.propertyCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        >
          <PropertyPhotoCarousel propertyId={item.id} height={150} />
        </TouchableOpacity>
        <CardContent style={styles.cardContent}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
          <View style={styles.specs}>
            <Text style={styles.spec}>{item.bedrooms} bed</Text>
            <Text style={styles.specDivider}>•</Text>
            <Text style={styles.spec}>{item.bathrooms} bath</Text>
            {item.area && (
              <>
                <Text style={styles.specDivider}>•</Text>
                <Text style={styles.spec}>{item.area}</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, isAdded && styles.addedButton]}
            onPress={() => {
              if (!isAdded) addPropertyMutation.mutate(item.id);
            }}
            disabled={isAdded || isAdding}
          >
            <Text style={[styles.addButtonText, isAdded && styles.addedButtonText]}>
              {isAdded ? '✓ Added to Tour' : isAdding ? 'Adding...' : '+ Add to Tour'}
            </Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Input
          placeholder="Search by address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>No properties found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBar: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    padding: 16,
  },
  propertyCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    paddingTop: 10,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
  },
  address: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
    lineHeight: 20,
  },
  specs: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
  },
  spec: {
    fontSize: 13,
    color: '#94a3b8',
  },
  specDivider: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  addButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addedButton: {
    backgroundColor: '#dcfce7',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addedButtonText: {
    color: '#16a34a',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
