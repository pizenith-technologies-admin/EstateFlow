import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { PropertyPhotoCarousel } from '../../components/PropertyPhotoCarousel';
import { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react-native';

export function PropertiesScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [minBedrooms, setMinBedrooms] = useState<string>('');
  const [minBathrooms, setMinBathrooms] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minArea, setMinArea] = useState<string>('');
  const [maxArea, setMaxArea] = useState<string>('');

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ['/api/properties'],
  });

  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'];

  const filteredProperties = useMemo(() => {
    return properties?.filter((property: any) => {
      const matchesSearch = !searchQuery || 
        property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.mlsNumber?.toString().includes(searchQuery);
      
      const matchesBeds = !minBedrooms || property.bedrooms >= parseInt(minBedrooms);
      const matchesBaths = !minBathrooms || property.bathrooms >= parseInt(minBathrooms);
      const matchesType = !propertyType || property.propertyType === propertyType;
      
      const price = parseFloat(property.price);
      const matchesMinPrice = !minPrice || price >= parseFloat(minPrice);
      const matchesMaxPrice = !maxPrice || price <= parseFloat(maxPrice);
      
      const area = property.squareFootage || 0;
      const matchesMinArea = !minArea || area >= parseInt(minArea);
      const matchesMaxArea = !maxArea || area <= parseInt(maxArea);

      return matchesSearch && matchesBeds && matchesBaths && matchesType && 
             matchesMinPrice && matchesMaxPrice && matchesMinArea && matchesMaxArea;
    }) || [];
  }, [properties, searchQuery, minBedrooms, minBathrooms, propertyType, minPrice, maxPrice, minArea, maxArea]);

  const resetFilters = () => {
    setMinBedrooms('');
    setMinBathrooms('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
  };

  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(numPrice || 0);
  };

  const renderProperty = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
    >
      <Card style={styles.cardInner}>
        <PropertyPhotoCarousel propertyId={item.id} height={120} showIndicators={false} />
        <CardContent style={styles.cardContent}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
          <View style={styles.details}>
            <Text style={styles.detail}>{item.bedrooms} bed</Text>
            <Text style={styles.detailDivider}>•</Text>
            <Text style={styles.detail}>{item.bathrooms} bath</Text>
          </View>
          <Text style={styles.mls}>MLS# {item.mlsNumber}</Text>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.searchRow}>
          <Input
            placeholder="Search address or MLS#..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInput}
          />
          <TouchableOpacity 
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersSection}>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Min Beds</Text>
                <Input
                  placeholder="0"
                  keyboardType="numeric"
                  value={minBedrooms}
                  onChangeText={setMinBedrooms}
                  containerStyle={styles.filterInput}
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Min Baths</Text>
                <Input
                  placeholder="0"
                  keyboardType="numeric"
                  value={minBathrooms}
                  onChangeText={setMinBathrooms}
                  containerStyle={styles.filterInput}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Min Price</Text>
                <Input
                  placeholder="$0"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  containerStyle={styles.filterInput}
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Max Price</Text>
                <Input
                  placeholder="$ Any"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  containerStyle={styles.filterInput}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Min Area (sqft)</Text>
                <Input
                  placeholder="0"
                  keyboardType="numeric"
                  value={minArea}
                  onChangeText={setMinArea}
                  containerStyle={styles.filterInput}
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Max Area (sqft)</Text>
                <Input
                  placeholder="Any"
                  keyboardType="numeric"
                  value={maxArea}
                  onChangeText={setMaxArea}
                  containerStyle={styles.filterInput}
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <X size={16} color="#64748b" />
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <Text style={styles.resultsCount}>{filteredProperties.length} results</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏘️</Text>
            <Text style={styles.emptyTitle}>No Properties Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters
            </Text>
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
  headerSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 16,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterToggleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filtersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  filterInput: {
    marginBottom: 0,
    height: 40,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  listContent: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  propertyCard: {
    width: '48%',
    marginBottom: 16,
  },
  cardInner: {
    flex: 1,
    marginBottom: 0,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    padding: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
    minHeight: 32,
  },
  details: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  detail: {
    fontSize: 11,
    color: '#64748b',
  },
  detailDivider: {
    fontSize: 11,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  mls: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});
