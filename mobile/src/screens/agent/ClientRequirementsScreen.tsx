import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Target, DollarSign, Home, MapPin, Shield, FileText } from 'lucide-react-native';

export function ClientRequirementsScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientRequirementsEnhanced, isLoading } = useQuery<any>({
    queryKey: [`/api/clients/${clientId}/requirements-enhanced`],
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const req = clientRequirementsEnhanced?.requirement;

  if (!req) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No Requirements Profile</Text>
          <Text style={styles.emptyText}>
            Create a comprehensive requirements profile to unlock property matching, validation scoring, and personalized recommendations.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const validationScore = Number(req.validationScore) || 0;
  const scorePercent = Math.round(validationScore * 100);
  const scoreColor = scorePercent >= 80 ? '#16a34a' : scorePercent >= 50 ? '#ca8a04' : '#dc2626';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <CardHeader>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Shield size={20} color="#64748b" />
              <CardTitle>Requirements Validation</CardTitle>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{scorePercent}% Complete</Text>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${scorePercent}%`, backgroundColor: scoreColor }]} />
          </View>
          <Text style={styles.validatedAt}>
            Last validated: {req.lastValidatedAt ? new Date(req.lastValidatedAt).toLocaleDateString() : 'Never'}
          </Text>

          {req.status && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{req.status.replace('_', ' ')}</Text>
              </View>
            </View>
          )}
        </CardContent>
      </Card>

      <Card style={styles.card}>
        <CardHeader>
          <View style={styles.headerLeft}>
            <FileText size={20} color="#64748b" />
            <CardTitle>Requirements Summary</CardTitle>
          </View>
          {req.version && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{req.version}</Text>
            </View>
          )}
        </CardHeader>
        <CardContent>
          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <View style={styles.specIconRow}>
                <DollarSign size={16} color="#16a34a" />
                <Text style={styles.specTitle}>Budget Range</Text>
              </View>
              <Text style={styles.specValue}>
                ${Number(req.budgetMin).toLocaleString()} - ${Number(req.budgetMax).toLocaleString()}
              </Text>
            </View>

            <View style={styles.specItem}>
              <View style={styles.specIconRow}>
                <Home size={16} color="#2563eb" />
                <Text style={styles.specTitle}>Property Specs</Text>
              </View>
              <Text style={styles.specValue}>{req.bedrooms} bed, {req.bathrooms} bath</Text>
            </View>

            <View style={styles.specItemFull}>
              <View style={styles.specIconRow}>
                <MapPin size={16} color="#7c3aed" />
                <Text style={styles.specTitle}>Preferred Areas</Text>
              </View>
              <View style={styles.areasContainer}>
                {req.preferredAreas?.map((area: string) => (
                  <View key={area} style={styles.areaBadge}>
                    <Text style={styles.areaBadgeText}>{area}</Text>
                  </View>
                ))}
                {(!req.preferredAreas || req.preferredAreas.length === 0) && (
                  <Text style={styles.noData}>No areas specified</Text>
                )}
              </View>
            </View>

            {req.propertyTypes && req.propertyTypes.length > 0 && (
              <View style={styles.specItemFull}>
                <View style={styles.specIconRow}>
                  <Home size={16} color="#0891b2" />
                  <Text style={styles.specTitle}>Property Types</Text>
                </View>
                <View style={styles.areasContainer}>
                  {req.propertyTypes.map((type: string) => (
                    <View key={type} style={styles.areaBadge}>
                      <Text style={styles.areaBadgeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {req.mustHaveFeatures && req.mustHaveFeatures.length > 0 && (
              <View style={styles.specItemFull}>
                <View style={styles.specIconRow}>
                  <Target size={16} color="#ea580c" />
                  <Text style={styles.specTitle}>Must-Have Features</Text>
                </View>
                <View style={styles.areasContainer}>
                  {req.mustHaveFeatures.map((feature: string) => (
                    <View key={feature} style={[styles.areaBadge, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                      <Text style={[styles.areaBadgeText, { color: '#9a3412' }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {req.dealBreakers && req.dealBreakers.length > 0 && (
              <View style={styles.specItemFull}>
                <View style={styles.specIconRow}>
                  <Shield size={16} color="#dc2626" />
                  <Text style={styles.specTitle}>Deal Breakers</Text>
                </View>
                <View style={styles.areasContainer}>
                  {req.dealBreakers.map((item: string) => (
                    <View key={item} style={[styles.areaBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                      <Text style={[styles.areaBadgeText, { color: '#991b1b' }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {req.additionalNotes && (
              <View style={styles.specItemFull}>
                <Text style={styles.specTitle}>Additional Notes</Text>
                <Text style={styles.notesText}>{req.additionalNotes}</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { fontSize: 12, fontWeight: '600' },
  progressBarBg: {
    height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 8, overflow: 'hidden',
  },
  progressBarFill: { height: 8, borderRadius: 4 },
  validatedAt: { fontSize: 12, color: '#94a3b8' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  statusLabel: { fontSize: 13, color: '#64748b' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '500', color: '#475569', textTransform: 'capitalize' },
  versionBadge: {
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  versionText: { fontSize: 11, color: '#64748b' },
  specGrid: { gap: 16 },
  specItem: {
    padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
  },
  specItemFull: {
    padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
  },
  specIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  specTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
  specValue: { fontSize: 14, color: '#1e293b' },
  areasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  areaBadgeText: { fontSize: 12, color: '#475569' },
  noData: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  notesText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
