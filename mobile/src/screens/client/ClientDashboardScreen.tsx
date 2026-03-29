import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTourCart } from '../../contexts/TourCartContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';

export function ClientDashboardScreen() {
  const { user } = useAuth();
  const { cartCount } = useTourCart();
  const navigation = useNavigation<any>();

  const { data: tours, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/tours'],
  });

  const { data: showingRequests } = useQuery<any[]>({
    queryKey: ['/api/showing-requests'],
  });

  const scheduledTours = tours?.filter((t: any) => t.status === 'scheduled' || t.status === 'in_progress') || [];
  const completedTours = tours?.filter((t: any) => t.status === 'completed') || [];
  const pendingRequests = showingRequests?.filter((r: any) => r.status === 'pending') || [];

  const stats = {
    propertiesViewed: completedTours.length,
    upcomingTours: scheduledTours.length,
    pendingRequests: pendingRequests.length,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello,</Text>
        <Text style={styles.name}>{user?.firstName}!</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.propertiesViewed || 0}</Text>
            <Text style={styles.statLabel}>Properties Viewed</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.upcomingTours || scheduledTours.length}</Text>
            <Text style={styles.statLabel}>Upcoming Tours</Text>
          </CardContent>
        </Card>
      </View>

      {cartCount > 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Card style={styles.cartBanner}>
            <CardContent style={styles.cartContent}>
              <View style={styles.cartInfo}>
                <Text style={styles.cartIcon}>🛒</Text>
                <View>
                  <Text style={styles.cartTitle}>Tour Cart</Text>
                  <Text style={styles.cartSubtitle}>
                    {cartCount} {cartCount === 1 ? 'property' : 'properties'} ready to schedule
                  </Text>
                </View>
              </View>
              <Text style={styles.cartArrow}>→</Text>
            </CardContent>
          </Card>
        </TouchableOpacity>
      )}

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Upcoming Tours</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledTours.length > 0 ? (
            scheduledTours.slice(0, 3).map((tour: any) => (
              <TouchableOpacity
                key={tour.id}
                style={styles.tourItem}
                onPress={() => navigation.navigate('TourDetails', { tourId: tour.id })}
              >
                <View style={styles.tourDate}>
                  <Text style={styles.tourMonth}>
                    {new Date(tour.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                  <Text style={styles.tourDay}>
                    {new Date(tour.scheduledDate).getDate()}
                  </Text>
                </View>
                <View style={styles.tourInfo}>
                  <Text style={styles.tourTitle}>Property Tour</Text>
                  <Text style={styles.tourProperties}>
                    {Number(tour.propertiesCount) || 0} properties
                  </Text>
                </View>
                <Text style={styles.tourArrow}>›</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No upcoming tours scheduled</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
                <Text style={styles.browseLink}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          )}
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Browse')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyTours')}
          >
            <Text style={styles.actionIcon}>🗓️</Text>
            <Text style={styles.actionLabel}>My Tours</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionLabel}>Cart</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  cartBanner: {
    backgroundColor: '#1e40af',
    marginBottom: 16,
  },
  cartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cartSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
    marginTop: 2,
  },
  cartArrow: {
    fontSize: 24,
    color: '#ffffff',
  },
  section: {
    marginBottom: 16,
  },
  tourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tourDate: {
    width: 50,
    height: 50,
    backgroundColor: '#1e40af',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tourMonth: {
    fontSize: 10,
    color: '#93c5fd',
    textTransform: 'uppercase',
  },
  tourDay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  tourInfo: {
    flex: 1,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  tourProperties: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  tourArrow: {
    fontSize: 24,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  browseLink: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    color: '#64748b',
  },
});
