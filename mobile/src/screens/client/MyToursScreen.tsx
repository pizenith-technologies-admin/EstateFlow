import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { useState } from 'react';

const STATUS_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'requested', label: 'Requested' },
  { key: 'all', label: 'All' },
];

export function MyToursScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('upcoming');

  const { data: tours, isLoading: toursLoading, refetch: refetchTours } = useQuery<any[]>({
    queryKey: ['/api/tours'],
  });

  const { data: showingRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ['/api/showing-requests'],
  });

  const isLoading = toursLoading || requestsLoading;

  const refetch = () => {
    refetchTours();
    refetchRequests();
  };

  const allItems = [
    ...(tours || []).map((t: any) => ({ ...t, itemType: 'tour' })),
    ...(showingRequests || []).map((r: any) => ({
      ...r,
      itemType: 'request',
      scheduledDate: r.preferredDate || r.createdAt,
      status: r.status === 'pending' ? 'requested' : r.status,
    })),
  ];

  const filteredTours = allItems.filter((item: any) => {
    if (activeTab === 'upcoming') return item.itemType === 'tour' && (item.status === 'scheduled' || item.status === 'in_progress');
    if (activeTab === 'completed') return item.itemType === 'tour' && item.status === 'completed';
    if (activeTab === 'requested') return item.itemType === 'request';
    return true;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'requested': return '#8b5cf6';
      case 'approved': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const renderTour = ({ item }: { item: any }) => {
    const isRequest = item.itemType === 'request';
    const dateStr = item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-US', { month: 'short' }) : '—';
    const dayStr = item.scheduledDate ? new Date(item.scheduledDate).getDate().toString() : '—';
    const timeStr = item.scheduledDate ? new Date(item.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';

    return (
      <TouchableOpacity
        onPress={() => {
          if (!isRequest) {
            navigation.navigate('TourDetails', { tourId: item.id });
          }
        }}
        activeOpacity={isRequest ? 1 : 0.7}
      >
        <Card style={styles.tourCard}>
          <CardContent>
            <View style={styles.tourHeader}>
              <View style={[styles.dateBox, isRequest && { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.dateMonth}>{dateStr}</Text>
                <Text style={styles.dateDay}>{dayStr}</Text>
              </View>
              <View style={styles.tourInfo}>
                <Text style={styles.tourTitle}>
                  {isRequest ? 'Tour Request' : 'Property Tour'}
                </Text>
                <Text style={styles.tourTime}>{timeStr}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status?.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.tourDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏠</Text>
                <Text style={styles.detailText}>
                  {item.propertiesCount || item.propertyIds?.length || 0} properties
                </Text>
              </View>
              {item.totalDistance != null && typeof item.totalDistance === 'number' && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📍</Text>
                  <Text style={styles.detailText}>
                    {item.totalDistance.toFixed(1)} km route
                  </Text>
                </View>
              )}
            </View>

            {isRequest && item.notes && (
              <View style={styles.ratingPrompt}>
                <Text style={styles.detailText} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}

            {item.status === 'completed' && !isRequest && (
              <View style={styles.ratingPrompt}>
                <Text style={styles.ratingText}>Rate properties from this tour</Text>
              </View>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? 'No Upcoming Tours' : 'No Tours Found'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'Add properties to your cart and schedule a tour'
                : 'Your tour history will appear here'}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1e40af',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#1e40af',
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
    alignItems: 'center',
  },
  dateBox: {
    width: 48,
    height: 48,
    backgroundColor: '#1e40af',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 10,
    color: '#93c5fd',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  tourInfo: {
    flex: 1,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  tourTime: {
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
    marginTop: 12,
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
  ratingPrompt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ratingText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
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
    paddingHorizontal: 32,
  },
});
