import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { useState, useMemo } from 'react';
import { Plus, User, Mail, X, ChevronDown } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

export function ClientsScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [clientType, setClientType] = useState<'buyer' | 'renter' | ''>('');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const { data: clients, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  const addClientMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; clientType: string }) => {
      return apiRequest('POST', '/api/clients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      resetForm();
      setShowAddModal(false);
      Alert.alert('Success', 'New client has been added successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to add client. Please try again.');
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setClientType('');
  };

  const handleAddClient = () => {
    if (!firstName.trim()) {
      Alert.alert('Validation', 'First name is required.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation', 'Last name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    if (!clientType) {
      Alert.alert('Validation', 'Please select a client type.');
      return;
    }
    addClientMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      clientType,
    });
  };

  const filteredClients = useMemo(() => {
    return clients?.filter((client: any) =>
      `${client.firstName} ${client.lastName} ${client.email}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) || [];
  }, [clients, searchQuery]);

  const renderClient = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ClientProfile', { clientId: item.id.toString(), client: item })}
    >
      <Card style={styles.clientCard}>
        <CardContent style={styles.clientContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstName?.[0]}{item.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.clientEmail}>{item.email}</Text>
            {item.phone && (
              <Text style={styles.clientPhone}>{item.phone}</Text>
            )}
          </View>
          <View style={styles.clientStats}>
            <Text style={styles.tourCount}>{item.toursCount || 0}</Text>
            <Text style={styles.tourLabel}>Tours</Text>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Clients Yet</Text>
            <Text style={styles.emptyText}>
              Add your first client to get started
            </Text>
          </View>
        }
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => { resetForm(); setShowAddModal(false); }}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={styles.inputWithIcon}>
                <User size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter first name"
                  placeholderTextColor="#94a3b8"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={styles.inputWithIcon}>
                <User size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter last name"
                  placeholderTextColor="#94a3b8"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWithIcon}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.fieldLabel}>Client Type</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowTypePicker(!showTypePicker)}
              >
                <Text style={clientType ? styles.selectText : styles.selectPlaceholder}>
                  {clientType === 'buyer' ? 'Buyer' : clientType === 'renter' ? 'Renter' : 'Select client type'}
                </Text>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>

              {showTypePicker && (
                <View style={styles.pickerOptions}>
                  <TouchableOpacity
                    style={[styles.pickerOption, clientType === 'buyer' && styles.pickerOptionSelected]}
                    onPress={() => { setClientType('buyer'); setShowTypePicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, clientType === 'buyer' && styles.pickerOptionTextSelected]}>
                      Buyer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerOption, clientType === 'renter' && styles.pickerOptionSelected]}
                    onPress={() => { setClientType('renter'); setShowTypePicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, clientType === 'renter' && styles.pickerOptionTextSelected]}>
                      Renter
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { resetForm(); setShowAddModal(false); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, addClientMutation.isPending && styles.submitButtonDisabled]}
                onPress={handleAddClient}
                disabled={addClientMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {addClientMutation.isPending ? 'Adding...' : 'Add Client'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchContainer: { padding: 16, paddingBottom: 0 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInputWrap: { flex: 1 },
  searchInput: { marginBottom: 0 },
  addButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center',
  },
  listContent: { padding: 16 },
  clientCard: { marginBottom: 12 },
  clientContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  clientEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  clientPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  clientStats: { alignItems: 'center' },
  tourCount: { fontSize: 20, fontWeight: '700', color: '#1e40af' },
  tourLabel: { fontSize: 10, color: '#64748b' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 12, marginBottom: 16, backgroundColor: '#fff',
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, height: 46, fontSize: 14, color: '#1e293b' },
  selectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, height: 46, marginBottom: 8, backgroundColor: '#fff',
  },
  selectText: { fontSize: 14, color: '#1e293b' },
  selectPlaceholder: { fontSize: 14, color: '#94a3b8' },
  pickerOptions: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    overflow: 'hidden', marginBottom: 16,
  },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerOptionSelected: { backgroundColor: '#eff6ff' },
  pickerOptionText: { fontSize: 14, color: '#475569' },
  pickerOptionTextSelected: { color: '#1e40af', fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12,
    padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  submitButton: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1e40af',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
