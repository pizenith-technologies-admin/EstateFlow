import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { Users } from 'lucide-react-native';

export function ClientGroupsScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientGroups, isLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/groups`],
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
        <Users size={20} color="#1e40af" />
        <Text style={styles.headerTitle}>Client Groups</Text>
        {clientGroups && clientGroups.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{clientGroups.length}</Text>
          </View>
        )}
      </View>

      {clientGroups && clientGroups.length > 0 ? (
        clientGroups.map((group: any, index: number) => (
          <Card key={group.id || index} style={styles.groupCard}>
            <CardContent style={styles.groupContent}>
              <View style={styles.groupIcon}>
                <Users size={22} color="#1e40af" />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description && (
                  <Text style={styles.groupDescription} numberOfLines={2}>{group.description}</Text>
                )}
                {group.memberCount != null && (
                  <Text style={styles.groupMeta}>{group.memberCount} members</Text>
                )}
                {group.createdAt && (
                  <Text style={styles.groupMeta}>
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </CardContent>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Groups</Text>
          <Text style={styles.emptyText}>Client is not part of any collaboration groups.</Text>
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
  groupCard: { marginBottom: 10 },
  groupContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  groupDescription: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  groupMeta: { fontSize: 12, color: '#94a3b8' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
