import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { useNavigation } from '@react-navigation/native';

interface BrokerKpis {
  totalAgents: number;
  activeClients: number;
  completedTours: number;
  upcomingTours: number;
  totalDistance: string;
  totalHours: string;
  offers: {
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
}

export function BrokerageDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: kpis, isLoading, refetch } = useQuery<BrokerKpis>({
    queryKey: ['/api/broker/kpis'],
  });

  const primaryStats = [
    { key: 'totalAgents', label: 'Total Agents', value: kpis?.totalAgents ?? 0, icon: '👤', color: '#7c3aed' },
    { key: 'activeClients', label: 'Active Clients', value: kpis?.activeClients ?? 0, icon: '👥', color: '#1e40af' },
    { key: 'upcomingTours', label: 'Upcoming Tours', value: kpis?.upcomingTours ?? 0, icon: '🗓️', color: '#f97316' },
    { key: 'completedTours', label: 'Completed Tours', value: kpis?.completedTours ?? 0, icon: '✅', color: '#10b981' },
  ];

  const secondaryStats = [
    { key: 'totalDistance', label: 'Total Distance', value: kpis?.totalDistance ?? '0 km', icon: '📍', color: '#06b6d4' },
    { key: 'totalHours', label: 'Total Hours', value: kpis?.totalHours ?? '0h', icon: '⏱️', color: '#6366f1' },
  ];

  const displayedStats = isExpanded ? [...primaryStats, ...secondaryStats] : primaryStats;

  const offers = kpis?.offers;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Brokerage Portal</Text>
        </View>
      </View>

      <View style={styles.statsHeaderContainer}>
        <Text style={styles.statsTitle}>Team Overview</Text>
        <TouchableOpacity
          style={[styles.expandButton, isExpanded && styles.expandButtonActive]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={[styles.expandButtonText, isExpanded && styles.expandButtonTextActive]}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {displayedStats.map((stat) => (
          <Card key={stat.key} style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Offer Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.offerRow}>
            <View style={[styles.offerBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.offerCount}>{offers?.draft ?? 0}</Text>
              <Text style={styles.offerLabel}>Draft</Text>
            </View>
            <View style={[styles.offerBox, { backgroundColor: '#fff7ed' }]}>
              <Text style={[styles.offerCount, { color: '#f97316' }]}>{offers?.submitted ?? 0}</Text>
              <Text style={styles.offerLabel}>Submitted</Text>
            </View>
            <View style={[styles.offerBox, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.offerCount, { color: '#10b981' }]}>{offers?.accepted ?? 0}</Text>
              <Text style={styles.offerLabel}>Accepted</Text>
            </View>
            <View style={[styles.offerBox, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.offerCount, { color: '#ef4444' }]}>{offers?.rejected ?? 0}</Text>
              <Text style={styles.offerLabel}>Rejected</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => navigation.navigate('Agents')}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>View Agents</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1e40af' }]}
              onPress={() => navigation.navigate('Clients')}
            >
              <Text style={styles.actionIcon}>🏠</Text>
              <Text style={styles.actionText}>View Clients</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 16, color: '#64748b' },
  name: { fontSize: 26, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  roleBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  statsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  expandButtonActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  expandButtonText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  expandButtonTextActive: { color: '#ffffff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%' },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statIcon: { fontSize: 20 },
  statInfo: { flex: 1 },
  statLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  section: { marginBottom: 16 },
  offerRow: { flexDirection: 'row', gap: 8 },
  offerBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  offerCount: { fontSize: 22, fontWeight: '700', color: '#475569' },
  offerLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: { fontSize: 24 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
