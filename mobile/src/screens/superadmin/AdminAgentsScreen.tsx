import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/Card';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface AdminAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  brokerageName?: string;
  clientCount?: number;
  tourCount?: number;
  upcomingTours?: number;
  offerCount?: number;
}

const emptyForm = { firstName: '', lastName: '', email: '' };

export function AdminAgentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: agents, isLoading, refetch } = useQuery<AdminAgent[]>({
    queryKey: ['/api/admin/agents'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => apiRequest('POST', '/api/admin/agents', data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kpis'] });
      closeModal();
      Alert.alert(
        'Agent Created',
        `Share these credentials with the agent:\n\nEmail: ${response.email}\nTemp Password: ${response.tempPassword}\n\nThey can change their password after logging in.`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to create agent.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) => apiRequest('PUT', `/api/admin/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      closeModal();
      Alert.alert('Success', 'Agent updated successfully.');
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to update agent.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kpis'] });
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to delete agent.'),
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };

  const openEdit = (item: AdminAgent) => {
    setForm({ firstName: item.firstName ?? '', lastName: item.lastName ?? '', email: item.email ?? '' });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.firstName.trim()) { Alert.alert('Validation', 'First name is required.'); return; }
    if (!form.lastName.trim()) { Alert.alert('Validation', 'Last name is required.'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { Alert.alert('Validation', 'Valid email is required.'); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (item: AdminAgent) => {
    Alert.alert('Delete Agent', `Delete "${item.firstName} ${item.lastName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const handleLongPress = (item: AdminAgent) => {
    Alert.alert(`${item.firstName} ${item.lastName}`, 'Choose an action', [
      { text: 'Edit', onPress: () => openEdit(item) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filtered = useMemo(() => {
    return agents?.filter((a) =>
      `${a.firstName} ${a.lastName} ${a.email} ${a.brokerageName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [agents, searchQuery]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderAgent = ({ item }: { item: AdminAgent }) => (
    <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <CardContent style={styles.cardContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.agentEmail}>{item.email}</Text>
            <View style={[styles.badge, item.brokerageName ? styles.badgeBlue : styles.badgeGrey]}>
              <Text style={[styles.badgeText, item.brokerageName ? styles.badgeTextBlue : styles.badgeTextGrey]}>
                {item.brokerageName ?? 'Independent'}
              </Text>
            </View>
          </View>
          <View style={styles.statsCol}>
            <Text style={styles.statNum}>{item.clientCount ?? 0}</Text>
            <Text style={styles.statLbl}>Clients</Text>
            <Text style={[styles.statNum, { marginTop: 6 }]}>{item.tourCount ?? 0}</Text>
            <Text style={styles.statLbl}>Tours</Text>
            <Text style={[styles.statNum, { marginTop: 6 }]}>{item.offerCount ?? 0}</Text>
            <Text style={styles.statLbl}>Offers</Text>
          </View>
          <TouchableOpacity onPress={() => handleLongPress(item)} style={styles.moreBtn}>
            <Text style={styles.moreBtnText}>⋯</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </TouchableOpacity>
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
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No agents on the platform</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Agent' : 'Add Agent'}</Text>
              <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            {[
              { label: 'First Name *', key: 'firstName', placeholder: 'First name' },
              { label: 'Last Name *', key: 'lastName', placeholder: 'Last name' },
              { label: 'Email *', key: 'email', placeholder: 'agent@example.com' },
            ].map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#94a3b8"
                  value={form[key as keyof typeof form]}
                  onChangeText={(val) => setForm((f) => ({ ...f, [key]: val }))}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                  keyboardType={key === 'email' ? 'email-address' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
              <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Agent'}</Text>
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
  searchInput: { flex: 1, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  addBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  card: { marginBottom: 0 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  agentEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeGrey: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextBlue: { color: '#1e40af' },
  badgeTextGrey: { color: '#64748b' },
  statsCol: { alignItems: 'center', marginRight: 8 },
  statNum: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statLbl: { fontSize: 10, color: '#94a3b8' },
  moreBtn: { padding: 8 },
  moreBtnText: { fontSize: 20, color: '#94a3b8' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#64748b' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
