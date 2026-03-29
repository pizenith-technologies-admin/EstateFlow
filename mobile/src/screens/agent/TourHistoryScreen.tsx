import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Calendar, Home, Star, Camera, FileText, Eye } from 'lucide-react-native';

export function TourHistoryScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientHistory, isLoading } = useQuery<any>({
    queryKey: [`/api/clients/${clientId}/history`],
    enabled: !!clientId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#dcfce7', text: '#166534' };
      case 'scheduled': return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const getFeedbackStyle = (category: string) => {
    switch (category) {
      case 'offer_now': return { bg: '#dcfce7', text: '#166534', label: 'Offer Now' };
      case 'hold_later': return { bg: '#fef3c7', text: '#92400e', label: 'Hold' };
      case 'reject': return { bg: '#fee2e2', text: '#991b1b', label: 'Reject' };
      default: return { bg: '#f1f5f9', text: '#475569', label: category };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {clientHistory?.summary && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{clientHistory.summary.totalTours}</Text>
            <Text style={styles.statLabel}>Total Tours</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{clientHistory.summary.totalPropertiesViewed}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{clientHistory.summary.totalRatings}</Text>
            <Text style={styles.statLabel}>Rated</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{clientHistory.summary.totalOffers}</Text>
            <Text style={styles.statLabel}>Offers</Text>
          </View>
        </View>
      )}

      {clientHistory?.tours?.map((tour: any) => {
        const statusColor = getStatusColor(tour.status);
        return (
          <Card key={tour.id} style={styles.tourCard}>
            <CardHeader>
              <View style={styles.tourHeaderRow}>
                <View style={styles.tourHeaderLeft}>
                  <Calendar size={18} color="#2563eb" />
                  <View>
                    <Text style={styles.tourDate}>{formatDate(tour.scheduledDate)}</Text>
                    <Text style={styles.tourMeta}>
                      {tour.totalProperties} {tour.totalProperties === 1 ? 'property' : 'properties'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                  <Text style={[styles.statusText, { color: statusColor.text }]}>{tour.status}</Text>
                </View>
              </View>
            </CardHeader>
            <CardContent>
              {tour.properties?.map((property: any) => (
                <View key={property.id} style={styles.propertyItem}>
                  <View style={styles.propertyRow}>
                    {property.imageUrl ? (
                      <Image source={{ uri: property.imageUrl }} style={styles.propertyImage} />
                    ) : (
                      <View style={styles.propertyImagePlaceholder}>
                        <Home size={24} color="#9ca3af" />
                      </View>
                    )}
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyAddress} numberOfLines={2}>{property.address}</Text>
                      <Text style={styles.propertySpecs}>
                        {property.bedrooms} bed  {property.bathrooms} bath  ${Number(property.price).toLocaleString()}
                      </Text>

                      {property.rating && (
                        <View style={styles.ratingRow}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              color={i < property.rating.rating ? '#facc15' : '#d1d5db'}
                              fill={i < property.rating.rating ? '#facc15' : 'transparent'}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {property.rating && (
                    <View style={styles.feedbackContainer}>
                      {property.rating.feedbackCategory && (
                        <View style={styles.feedbackRow}>
                          <View style={[styles.feedbackBadge, { backgroundColor: getFeedbackStyle(property.rating.feedbackCategory).bg }]}>
                            <Text style={[styles.feedbackBadgeText, { color: getFeedbackStyle(property.rating.feedbackCategory).text }]}>
                              {getFeedbackStyle(property.rating.feedbackCategory).label}
                            </Text>
                          </View>
                          {property.rating.reason && (
                            <Text style={styles.feedbackReason} numberOfLines={1}>{property.rating.reason}</Text>
                          )}
                        </View>
                      )}
                      {property.rating.notes && (
                        <Text style={styles.feedbackNotes}>"{property.rating.notes}"</Text>
                      )}
                    </View>
                  )}

                  {property.media && property.media.totalCount > 0 && (
                    <View style={styles.mediaInfo}>
                      <Camera size={14} color="#1e40af" />
                      <Text style={styles.mediaInfoText}>
                        {property.media.totalCount} {property.media.totalCount === 1 ? 'file' : 'files'}
                      </Text>
                      {property.media.photos?.length > 0 && (
                        <Text style={styles.mediaDetail}>{property.media.photos.length} photos</Text>
                      )}
                      {property.media.videos?.length > 0 && (
                        <Text style={styles.mediaDetail}>{property.media.videos.length} videos</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {(!clientHistory?.tours || clientHistory.tours.length === 0) && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Tour History</Text>
          <Text style={styles.emptyText}>This client hasn't toured any properties yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1e40af' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
  tourCard: { marginBottom: 16 },
  tourHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tourDate: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  tourMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  propertyItem: {
    padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 10,
  },
  propertyRow: { flexDirection: 'row', gap: 12 },
  propertyImage: { width: 72, height: 72, borderRadius: 8 },
  propertyImagePlaceholder: {
    width: 72, height: 72, borderRadius: 8, backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
  },
  propertyInfo: { flex: 1 },
  propertyAddress: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  propertySpecs: { fontSize: 12, color: '#64748b' },
  ratingRow: { flexDirection: 'row', gap: 2, marginTop: 6 },
  feedbackContainer: {
    marginTop: 8, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8,
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  feedbackBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  feedbackBadgeText: { fontSize: 11, fontWeight: '600' },
  feedbackReason: { fontSize: 12, color: '#64748b', flex: 1 },
  feedbackNotes: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 6 },
  mediaInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    padding: 8, backgroundColor: '#eff6ff', borderRadius: 6,
  },
  mediaInfoText: { fontSize: 12, fontWeight: '500', color: '#1e40af' },
  mediaDetail: { fontSize: 11, color: '#3b82f6' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
