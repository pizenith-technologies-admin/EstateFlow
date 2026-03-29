import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Heart, Home } from 'lucide-react-native';

export function ClientShortlistsScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientShortlists, isLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/shortlists`],
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Heart size={20} color="#1e40af" />
        <Text style={styles.headerTitle}>Shortlisted Properties</Text>
        {clientShortlists && clientShortlists.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{clientShortlists.length}</Text>
          </View>
        )}
      </View>

      {clientShortlists && clientShortlists.length > 0 ? (
        clientShortlists.map((shortlist: any) => (
          <Card key={shortlist.id} style={styles.propertyCard}>
            {shortlist.property?.imageUrl ? (
              <Image source={{ uri: shortlist.property.imageUrl }} style={styles.propertyImage} />
            ) : (
              <View style={styles.propertyImagePlaceholder}>
                <Home size={32} color="#9ca3af" />
              </View>
            )}
            <CardContent>
              <Text style={styles.propertyAddress} numberOfLines={2}>
                {shortlist.property?.address}
              </Text>
              {shortlist.property?.city && (
                <Text style={styles.propertyCity}>
                  {shortlist.property.city}, {shortlist.property.province}
                </Text>
              )}
              {shortlist.property?.mlsNumber && (
                <Text style={styles.mlsNumber}>MLS# {shortlist.property.mlsNumber}</Text>
              )}

              <View style={styles.specsRow}>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{shortlist.property?.bedrooms}</Text>
                  <Text style={styles.specLabel}>Beds</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>{shortlist.property?.bathrooms}</Text>
                  <Text style={styles.specLabel}>Baths</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specValue}>${Number(shortlist.property?.price).toLocaleString()}</Text>
                  <Text style={styles.specLabel}>Price</Text>
                </View>
              </View>

              {shortlist.property?.area && (
                <Text style={styles.area}>Area: {shortlist.property.area}</Text>
              )}

              {shortlist.property?.propertyType && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{shortlist.property.propertyType}</Text>
                </View>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyTitle}>No Properties Shortlisted</Text>
          <Text style={styles.emptyText}>Client hasn't shortlisted any properties yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', flex: 1 },
  countBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  countText: { fontSize: 13, fontWeight: '600', color: '#1e40af' },
  propertyCard: { marginBottom: 16, overflow: 'hidden' },
  propertyImage: { width: '100%', height: 180, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  propertyImagePlaceholder: {
    width: '100%', height: 140, backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
  },
  propertyAddress: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  propertyCity: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  mlsNumber: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  specsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  specItem: {},
  specValue: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  specLabel: { fontSize: 11, color: '#64748b' },
  area: { fontSize: 13, color: '#475569', marginBottom: 8 },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  typeText: { fontSize: 12, color: '#1e40af' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
