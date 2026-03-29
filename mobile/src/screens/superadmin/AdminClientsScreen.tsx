import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/Card';

interface AdminClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  agentName?: string;
  brokerageName?: string;
  tourCount?: number;
  offerCount?: number;
}

export function AdminClientsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients, isLoading, refetch } = useQuery<AdminClient[]>({
    queryKey: ['/api/admin/clients'],
  });

  const filtered = useMemo(() => {
    return clients?.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.agentName ?? ''} ${c.brokerageName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [clients, searchQuery]);

  const renderClient = ({ item }: { item: AdminClient }) => (
    <Card style={styles.card}>
      <CardContent style={styles.cardContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
          <Text style={styles.meta}>Agent: {item.agentName ?? 'Unassigned'}</Text>
          <Text style={styles.meta}>Brokerage: {item.brokerageName ?? 'Independent'}</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statNum}>{item.tourCount ?? 0}</Text>
          <Text style={styles.statLbl}>Tours</Text>
          <Text style={[styles.statNum, { marginTop: 6 }]}>{item.offerCount ?? 0}</Text>
          <Text style={styles.statLbl}>Offers</Text>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No clients on platform</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: { padding: 16 },
  searchInput: { backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  card: { marginBottom: 0 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e40af', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  clientEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statsCol: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  statLbl: { fontSize: 10, color: '#94a3b8' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
});
