import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTourCart } from '../../contexts/TourCartContext';
import { Card, CardContent } from '../../components/Card';
import { PropertyPhotoCarousel } from '../../components/PropertyPhotoCarousel';
import { useState } from 'react';

const PROPERTY_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Detached', value: 'detached' },
  { label: 'Semi-Detached', value: 'semi-detached' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Condo', value: 'condo' },
  { label: 'Apartment', value: 'apartment' },
];

const BEDS_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
];

const BATHS_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
];

export function BrowseScreen() {
  const navigation = useNavigation<any>();
  const { addToCart, removeFromCart, isInCart } = useTourCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    propertyType: '',
  });

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ['/api/properties'],
  });

  const activeFilterCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minBeds,
    filters.minBaths,
    filters.propertyType,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ minPrice: '', maxPrice: '', minBeds: '', minBaths: '', propertyType: '' });
  };

  const filteredProperties = (properties as any[] | undefined)?.filter((property: any) => {
    const matchesSearch =
      !searchQuery ||
      property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMinPrice = !filters.minPrice || Number(property.price) >= parseInt(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || Number(property.price) <= parseInt(filters.maxPrice);
    const matchesBeds = !filters.minBeds || property.bedrooms >= parseInt(filters.minBeds);
    const matchesBaths = !filters.minBaths || Number(property.bathrooms) >= parseInt(filters.minBaths);
    const matchesType = !filters.propertyType || property.propertyType === filters.propertyType;
    return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesBeds && matchesBaths && matchesType;
  }) || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCartToggle = (property: any) => {
    if (isInCart(property.id)) {
      removeFromCart(property.id);
    } else {
      addToCart({
        id: property.id,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFootage: property.area,
        imageUrl: property.imageUrl,
      });
    }
  };

  const renderProperty = ({ item }: { item: any }) => {
    const inCart = isInCart(item.id);

    return (
      <Card style={styles.propertyCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        >
          <PropertyPhotoCarousel propertyId={item.id} height={180} />
        </TouchableOpacity>
        <CardContent>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
          {(item.city || item.province) && (
            <Text style={styles.location}>{[item.city, item.province].filter(Boolean).join(', ')}</Text>
          )}
          <View style={styles.details}>
            <Text style={styles.detail}>{item.bedrooms} bed</Text>
            <Text style={styles.detailDivider}>•</Text>
            <Text style={styles.detail}>{item.bathrooms} bath</Text>
            {item.area && (
              <>
                <Text style={styles.detailDivider}>•</Text>
                <Text style={styles.detail}>{item.area}</Text>
              </>
            )}
            {item.propertyType && (
              <>
                <Text style={styles.detailDivider}>•</Text>
                <Text style={styles.detail}>{item.propertyType}</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[styles.cartButton, inCart && styles.cartButtonActive]}
            onPress={() => handleCartToggle(item)}
          >
            <Text style={[styles.cartButtonText, inCart && styles.cartButtonTextActive]}>
              {inCart ? '✓ In Cart' : '+ Add to Tour'}
            </Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search + Filter bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by address or city..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={[styles.filterButtonIcon, activeFilterCount > 0 && styles.filterButtonIconActive]}>⚙</Text>
            <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <Text style={styles.filterSectionLabel}>Price Range</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor="#94a3b8"
                  value={filters.minPrice}
                  onChangeText={(v) => setFilters((f) => ({ ...f, minPrice: v }))}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.priceSeparator}>—</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor="#94a3b8"
                  value={filters.maxPrice}
                  onChangeText={(v) => setFilters((f) => ({ ...f, maxPrice: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Bedrooms */}
            <Text style={styles.filterSectionLabel}>Bedrooms</Text>
            <View style={styles.chipRow}>
              {BEDS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, filters.minBeds === opt.value && styles.chipActive]}
                  onPress={() => setFilters((f) => ({ ...f, minBeds: opt.value }))}
                >
                  <Text style={[styles.chipText, filters.minBeds === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bathrooms */}
            <Text style={styles.filterSectionLabel}>Bathrooms</Text>
            <View style={styles.chipRow}>
              {BATHS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, filters.minBaths === opt.value && styles.chipActive]}
                  onPress={() => setFilters((f) => ({ ...f, minBaths: opt.value }))}
                >
                  <Text style={[styles.chipText, filters.minBaths === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Property Type */}
            <Text style={styles.filterSectionLabel}>Property Type</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, filters.propertyType === opt.value && styles.chipActive]}
                  onPress={() => setFilters((f) => ({ ...f, propertyType: opt.value }))}
                >
                  <Text style={[styles.chipText, filters.propertyType === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer buttons */}
            <View style={styles.filterFooter}>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>
                  Show {filteredProperties.length} result{filteredProperties.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Results count */}
      {(searchQuery || activeFilterCount > 0) && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'} found
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filteredProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No Properties Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filters
            </Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                <Text style={styles.clearAllText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
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
  // Search bar
  searchContainer: {
    padding: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  clearIcon: {
    fontSize: 14,
    color: '#94a3b8',
    paddingLeft: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
  },
  filterButtonIcon: {
    fontSize: 14,
    color: '#475569',
  },
  filterButtonIconActive: {
    color: '#ffffff',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Filter panel
  filterPanel: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 360,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  pricePrefix: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  priceSeparator: {
    fontSize: 14,
    color: '#94a3b8',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  clearAllButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#1e40af',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Results bar
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  resultsText: {
    fontSize: 13,
    color: '#64748b',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  // Property card
  listContent: {
    padding: 16,
  },
  propertyCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e40af',
  },
  address: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 4,
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  detail: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detailDivider: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  cartButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartButtonActive: {
    backgroundColor: '#1e40af',
  },
  cartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  cartButtonTextActive: {
    color: '#ffffff',
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
    marginBottom: 20,
  },
});
