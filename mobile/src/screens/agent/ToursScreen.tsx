import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const STATUS_FILTERS = ['all', 'scheduled', 'in_progress', 'completed', 'cancelled'];

export function ToursScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: tours, isLoading, refetch } = useQuery({
    queryKey: ['/api/tours'],
  });

  const filteredTours =
    tours?.filter((tour: any) =>
      statusFilter === 'all' || tour.status === statusFilter
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderTour = ({ item }: { item: any }) => {

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TourDetails', { tourId: item.id })}
      >
        <Card style={styles.tourCard}>
          <CardContent>
            <View style={styles.tourHeader}>
              <View style={styles.tourInfo}>
                <Text style={styles.tourTitle}>
                  Tour #{item.id.slice(-6)}
                </Text>
                <Text style={styles.clientName}>
                  {item.clientName || 'Client'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) + '20' }
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.status) }
                  ]}
                >
                  {item.status?.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.tourDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📅</Text>
                <Text style={styles.detailText}>
                  {new Date(item.scheduledDate).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏠</Text>
                <Text style={styles.detailText}>
                  {Number(item.propertiesCount) || 0} properties
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={[styles.detailText, item.totalDistance && Number(item.totalDistance) > 0 && styles.detailTextHighlight]}>
                  {item.totalDistance && Number(item.totalDistance) > 0
                    ? `${Number(item.totalDistance).toFixed(1)} km`
                    : '— km'}
                </Text>
              </View>

              {(item.actualDuration > 0 || item.estimatedDuration > 0) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>⏱️</Text>
                  <Text style={styles.detailText}>
                    {item.actualDuration > 0
                      ? item.actualDuration < 60
                        ? `${item.actualDuration}m`
                        : `${Math.floor(item.actualDuration / 60)}h${item.actualDuration % 60 > 0 ? `${item.actualDuration % 60}m` : ''}`
                      : item.estimatedDuration < 60
                        ? `~${item.estimatedDuration}m`
                        : `~${Math.floor(item.estimatedDuration / 60)}h${item.estimatedDuration % 60 > 0 ? `${item.estimatedDuration % 60}m` : ''}`}
                  </Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === item && styles.filterTextActive
                ]}
              >
                {item === 'all' ? 'All' : item.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      <FlatList
        data={filteredTours}
        renderItem={renderTour}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No Tours</Text>
            <Text style={styles.emptyText}>
              {statusFilter === 'all'
                ? 'Schedule your first tour to get started'
                : `No ${statusFilter.replace('_', ' ')} tours`}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTour')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
  },
  filterText: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  tourCard: {
    marginBottom: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tourInfo: {
    flex: 1,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  clientName: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tourDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
  },
  detailTextHighlight: {
    color: '#1e40af',
    fontWeight: '600',
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
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
    lineHeight: 30,
  },
});
