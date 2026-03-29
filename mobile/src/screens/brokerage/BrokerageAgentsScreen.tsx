import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/Card';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface BrokerageAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  brokerageRole?: string;
  activeClients?: number;
  totalTours?: number;
  completedTours?: number;
}

export function BrokerageAgentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [agentEmail, setAgentEmail] = useState('');

  const { data: agents, isLoading, refetch } = useQuery<BrokerageAgent[]>({
    queryKey: ['/api/broker/agents'],
  });

  const linkAgentMutation = useMutation({
    mutationFn: (data: { agentEmail: string }) => apiRequest('POST', '/api/broker/agents/link', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/agents'] });
      setAgentEmail('');
      setShowLinkModal(false);
      Alert.alert('Success', 'Agent has been linked to your brokerage.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to link agent.');
    },
  });

  const handleLinkAgent = () => {
    if (!agentEmail.trim() || !agentEmail.includes('@')) {
      Alert.alert('Validation', 'Please enter a valid agent email address.');
      return;
    }
    linkAgentMutation.mutate({ agentEmail: agentEmail.trim() });
  };

  const filteredAgents = useMemo(() => {
    return agents?.filter((a) =>
      `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [agents, searchQuery]);

  const renderAgent = ({ item }: { item: BrokerageAgent }) => (
    <Card style={styles.agentCard}>
      <CardContent style={styles.agentContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.agentEmail}>{item.email}</Text>
          {item.brokerageRole && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{item.brokerageRole}</Text>
            </View>
          )}
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statNum}>{item.activeClients ?? 0}</Text>
          <Text style={styles.statLbl}>Clients</Text>
          <Text style={[styles.statNum, { marginTop: 6 }]}>{item.totalTours ?? 0}</Text>
          <Text style={styles.statLbl}>Tours</Text>
          <Text style={[styles.statNum, { marginTop: 6 }]}>{item.completedTours ?? 0}</Text>
          <Text style={styles.statLbl}>Done</Text>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search agents..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowLinkModal(true)}>
          <Text style={styles.addBtnText}>+ Link Agent</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAgents}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No agents linked yet</Text>
            <Text style={styles.emptySubtext}>Link agents to see them here</Text>
          </View>
        }
      />

      <Modal visible={showLinkModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link an Agent</Text>
              <TouchableOpacity onPress={() => { setShowLinkModal(false); setAgentEmail(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Enter the agent's email address to link them to your brokerage.</Text>
            <TextInput
              style={styles.input}
              placeholder="agent@example.com"
              placeholderTextColor="#94a3b8"
              value={agentEmail}
              onChangeText={setAgentEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.submitBtn, linkAgentMutation.isPending && styles.submitBtnDisabled]}
              onPress={handleLinkAgent}
              disabled={linkAgentMutation.isPending}
            >
              <Text style={styles.submitBtnText}>
                {linkAgentMutation.isPending ? 'Linking...' : 'Link Agent'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: { flexDirection: 'row', padding: 16, gap: 10, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  agentCard: { marginBottom: 0 },
  agentContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  agentEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  roleBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: { color: '#7c3aed', fontSize: 11, fontWeight: '600' },
  statsCol: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statLbl: { fontSize: 10, color: '#94a3b8' },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptySubtext: { fontSize: 14, color: '#64748b', marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#64748b' },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 16,
  },
  submitBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
