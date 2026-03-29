import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/Card';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface Brokerage {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  agentCount?: number;
  clientCount?: number;
  tourCount?: number;
}

const emptyForm = { name: '', contactEmail: '', contactPhone: '', website: '', logoUrl: '', adminEmail: '', adminFirstName: '', adminLastName: '' };

export function AdminBrokeragesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: brokerages, isLoading, refetch } = useQuery<Brokerage[]>({
    queryKey: ['/api/admin/brokerages'],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => apiRequest('POST', '/api/admin/brokerages', data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brokerages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kpis'] });
      closeModal();
      if (response.brokerageUser && response.tempPassword) {
        Alert.alert(
          'Brokerage Created',
          `Share these login credentials with the brokerage admin:\n\nEmail: ${response.brokerageUser.email}\nTemp Password: ${response.tempPassword}\n\nThey can update their profile after logging in.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Brokerage created successfully.');
      }
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to create brokerage.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) => apiRequest('PUT', `/api/admin/brokerages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brokerages'] });
      closeModal();
      Alert.alert('Success', 'Brokerage updated successfully.');
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to update brokerage.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/brokerages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brokerages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kpis'] });
    },
    onError: (error: any) => Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to delete brokerage.'),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };

  const openEdit = (item: Brokerage) => {
    setForm({ name: item.name ?? '', contactEmail: item.contactEmail ?? '', contactPhone: item.contactPhone ?? '', website: item.website ?? '', logoUrl: item.logoUrl ?? '' });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Brokerage name is required.'); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (item: Brokerage) => {
    Alert.alert('Delete Brokerage', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const handleLongPress = (item: Brokerage) => {
    Alert.alert(item.name, 'Choose an action', [
      { text: 'Edit', onPress: () => openEdit(item) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filtered = useMemo(() => {
    return brokerages?.filter((b) =>
      `${b.name} ${b.contactEmail ?? ''} ${b.website ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [brokerages, searchQuery]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderBrokerage = ({ item }: { item: Brokerage }) => (
    <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.cardHeader}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{item.name?.[0] ?? '?'}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.contactEmail && <Text style={styles.cardSub}>{item.contactEmail}</Text>}
              {item.website && <Text style={styles.cardSub}>{item.website}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleLongPress(item)} style={styles.moreBtn}>
              <Text style={styles.moreBtnText}>⋯</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pills}>
            <View style={styles.pill}><Text style={styles.pillText}>{item.agentCount ?? 0} Agents</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>{item.clientCount ?? 0} Clients</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>{item.tourCount ?? 0} Tours</Text></View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search brokerages..."
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
        renderItem={renderBrokerage}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏛️</Text>
            <Text style={styles.emptyText}>No brokerages yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Add" to create the first one</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Brokerage' : 'Add Brokerage'}</Text>
                <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
              {[
                { label: 'Name *', key: 'name', placeholder: 'Brokerage name' },
                { label: 'Contact Email', key: 'contactEmail', placeholder: 'contact@brokerage.com' },
                { label: 'Contact Phone', key: 'contactPhone', placeholder: '+1 555 000 0000' },
                { label: 'Website', key: 'website', placeholder: 'https://brokerage.com' },
                { label: 'Logo URL', key: 'logoUrl', placeholder: 'https://...' },
                ...(!editingId ? [
                  { label: 'Admin Login Email', key: 'adminEmail', placeholder: 'admin@brokerage.com (optional)' },
                  { label: 'Admin First Name', key: 'adminFirstName', placeholder: 'First name' },
                  { label: 'Admin Last Name', key: 'adminLastName', placeholder: 'Last name' },
                ] : []),
              ].map(({ label, key, placeholder }) => (
                <View key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    value={form[key as keyof typeof form]}
                    onChangeText={(val) => setForm((f) => ({ ...f, [key]: val }))}
                    autoCapitalize="none"
                  />
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Brokerage'}</Text>
              </TouchableOpacity>
            </ScrollView>
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
  addBtn: { backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  card: { marginBottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  moreBtn: { padding: 8 },
  moreBtnText: { fontSize: 20, color: '#94a3b8' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptySubtext: { fontSize: 14, color: '#64748b', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#64748b' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
