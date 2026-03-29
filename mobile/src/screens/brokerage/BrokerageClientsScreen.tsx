import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/Card';

interface BrokerageClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  agentName?: string;
  tourCount?: number;
}

export function BrokerageClientsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients, isLoading, refetch } = useQuery<BrokerageClient[]>({
    queryKey: ['/api/broker/clients'],
  });

  const filteredClients = useMemo(() => {
    return clients?.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.agentName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [clients, searchQuery]);

  const renderClient = ({ item }: { item: BrokerageClient }) => (
    <Card style={styles.clientCard}>
      <CardContent style={styles.clientContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
          {item.agentName && (
            <Text style={styles.agentVia}>via {item.agentName}</Text>
          )}
        </View>
        <View style={styles.tourBadge}>
          <Text style={styles.tourCount}>{item.tourCount ?? 0}</Text>
          <Text style={styles.tourLabel}>Tours</Text>
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
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>No clients yet</Text>
            <Text style={styles.emptySubtext}>Clients appear here when agents are linked</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: { padding: 16 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  clientCard: { marginBottom: 0 },
  clientContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  clientEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  agentVia: { fontSize: 12, color: '#94a3b8', marginTop: 3, fontStyle: 'italic' },
  tourBadge: { alignItems: 'center', minWidth: 48 },
  tourCount: { fontSize: 20, fontWeight: '700', color: '#1e40af' },
  tourLabel: { fontSize: 11, color: '#94a3b8' },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptySubtext: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
