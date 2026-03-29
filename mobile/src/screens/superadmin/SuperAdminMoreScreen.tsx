import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';

interface AdminReports {
  tourMetrics?: {
    total?: number;
    completed?: number;
    scheduled?: number;
    cancelled?: number;
  };
  offerAnalytics?: {
    total?: number;
    draft?: number;
    submitted?: number;
    accepted?: number;
    rejected?: number;
  };
  ratingCategories?: Record<string, number>;
}

function RatingDot({ value }: { value: number }) {
  const color = value >= 4 ? '#10b981' : value >= 3 ? '#f97316' : '#ef4444';
  return <View style={[styles.ratingDot, { backgroundColor: color }]} />;
}

export function SuperAdminMoreScreen() {
  const { user, logout } = useAuth();

  const { data: reports, isLoading, refetch } = useQuery<AdminReports>({
    queryKey: ['/api/admin/reports'],
  });

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) logout();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const tourMetrics = reports?.tourMetrics;
  const offerAnalytics = reports?.offerAnalytics;
  const ratingCategories = reports?.ratingCategories;

  const offerTotal = offerAnalytics?.total || 1;
  const offerBars = [
    { key: 'draft', label: 'Draft', value: offerAnalytics?.draft ?? 0, color: '#94a3b8' },
    { key: 'submitted', label: 'Submitted', value: offerAnalytics?.submitted ?? 0, color: '#f97316' },
    { key: 'accepted', label: 'Accepted', value: offerAnalytics?.accepted ?? 0, color: '#10b981' },
    { key: 'rejected', label: 'Rejected', value: offerAnalytics?.rejected ?? 0, color: '#ef4444' },
  ];

  const tourCards = [
    { label: 'Total Tours', value: tourMetrics?.total ?? 0, icon: '🗓️', color: '#1e40af' },
    { label: 'Completed', value: tourMetrics?.completed ?? 0, icon: '✅', color: '#10b981' },
    { label: 'Scheduled', value: tourMetrics?.scheduled ?? 0, icon: '📅', color: '#f97316' },
    { label: 'Cancelled', value: tourMetrics?.cancelled ?? 0, icon: '❌', color: '#ef4444' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      {/* Profile card */}
      <Card style={styles.profileCard}>
        <CardContent style={styles.profileContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Super Admin</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Reports */}
      <Text style={styles.sectionHeader}>Platform Reports</Text>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Tour Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.tourGrid}>
            {tourCards.map((card) => (
              <View key={card.label} style={[styles.tourCard, { borderLeftColor: card.color }]}>
                <Text style={styles.tourIcon}>{card.icon}</Text>
                <Text style={[styles.tourValue, { color: card.color }]}>{card.value}</Text>
                <Text style={styles.tourLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Offer Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {offerBars.map((bar) => (
            <View key={bar.key} style={styles.barRow}>
              <Text style={styles.barLabel}>{bar.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { flex: bar.value / offerTotal, backgroundColor: bar.color, minWidth: bar.value > 0 ? 4 : 0 }]} />
                <View style={{ flex: 1 - bar.value / offerTotal }} />
              </View>
              <Text style={styles.barCount}>{bar.value}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {ratingCategories && Object.keys(ratingCategories).length > 0 && (
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Rating Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(ratingCategories).map(([category, score]) => (
              <View key={category} style={styles.ratingRow}>
                <RatingDot value={Number(score)} />
                <Text style={styles.ratingCategory}>{category}</Text>
                <Text style={styles.ratingScore}>{Number(score).toFixed(1)}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Account */}
      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.accountSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  profileCard: { marginBottom: 20 },
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '600' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '600', color: '#1e293b' },
  profileEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  roleBadge: { backgroundColor: '#dc2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  section: { marginBottom: 16 },
  tourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tourCard: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 10, borderLeftWidth: 4, padding: 14 },
  tourIcon: { fontSize: 24, marginBottom: 6 },
  tourValue: { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  tourLabel: { fontSize: 12, color: '#64748b' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 80, fontSize: 13, color: '#64748b' },
  barTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: '#f1f5f9', flexDirection: 'row', overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: 12, borderRadius: 6 },
  barCount: { width: 32, fontSize: 14, fontWeight: '600', color: '#1e293b', textAlign: 'right' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ratingDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  ratingCategory: { flex: 1, fontSize: 14, color: '#1e293b', textTransform: 'capitalize' },
  ratingScore: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  accountSection: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', padding: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  logoutIcon: { fontSize: 20, marginRight: 12 },
  logoutText: { fontSize: 16, color: '#dc2626', fontWeight: '500' },
});
