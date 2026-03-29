import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface BrokerageSettings {
  id?: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
}

export function BrokerageSettingsScreen() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const { data: settings, isLoading } = useQuery<BrokerageSettings>({
    queryKey: ['/api/broker/settings'],
  });

  useEffect(() => {
    if (settings) {
      setName(settings.name ?? '');
      setContactEmail(settings.contactEmail ?? '');
      setContactPhone(settings.contactPhone ?? '');
      setWebsite(settings.website ?? '');
      setLogoUrl(settings.logoUrl ?? '');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: BrokerageSettings) => apiRequest('PUT', '/api/broker/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/settings'] });
      setIsEditing(false);
      Alert.alert('Success', 'Brokerage settings updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to update settings.');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Brokerage name is required.');
      return;
    }
    updateMutation.mutate({ name, contactEmail, contactPhone, website, logoUrl });
  };

  const handleCancel = () => {
    if (settings) {
      setName(settings.name ?? '');
      setContactEmail(settings.contactEmail ?? '');
      setContactPhone(settings.contactPhone ?? '');
      setWebsite(settings.website ?? '');
      setLogoUrl(settings.logoUrl ?? '');
    }
    setIsEditing(false);
  };

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <CardContent style={styles.profileContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Brokerage Admin</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <View style={styles.sectionTitleRow}>
            <CardTitle>Brokerage Profile</CardTitle>
            {!isEditing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Brokerage Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Brokerage name" placeholderTextColor="#94a3b8" />
              <Text style={styles.fieldLabel}>Contact Email</Text>
              <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} placeholder="contact@brokerage.com" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Contact Phone</Text>
              <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+1 555 000 0000" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
              <Text style={styles.fieldLabel}>Website</Text>
              <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://brokerage.com" placeholderTextColor="#94a3b8" autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Logo URL</Text>
              <TextInput style={styles.input} value={logoUrl} onChangeText={setLogoUrl} placeholder="https://..." placeholderTextColor="#94a3b8" autoCapitalize="none" />
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.displayFields}>
              {settings?.name && <View style={styles.field}><Text style={styles.fieldKey}>Name</Text><Text style={styles.fieldVal}>{settings.name}</Text></View>}
              {settings?.contactEmail && <View style={styles.field}><Text style={styles.fieldKey}>Email</Text><Text style={styles.fieldVal}>{settings.contactEmail}</Text></View>}
              {settings?.contactPhone && <View style={styles.field}><Text style={styles.fieldKey}>Phone</Text><Text style={styles.fieldVal}>{settings.contactPhone}</Text></View>}
              {settings?.website && <View style={styles.field}><Text style={styles.fieldKey}>Website</Text><Text style={styles.fieldVal}>{settings.website}</Text></View>}
              {!settings?.name && !isLoading && <Text style={styles.noSettings}>No settings configured yet. Tap Edit to get started.</Text>}
            </View>
          )}
        </CardContent>
      </Card>

      <View style={styles.accountSection}>
        <Text style={styles.accountTitle}>Account</Text>
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
  profileCard: { marginBottom: 16 },
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '600' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '600', color: '#1e293b' },
  profileEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  roleBadge: { backgroundColor: '#7c3aed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  form: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  saveBtn: { flex: 2, backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  displayFields: { gap: 12 },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  fieldKey: { fontSize: 14, color: '#64748b' },
  fieldVal: { fontSize: 14, color: '#1e293b', fontWeight: '500', flex: 1, textAlign: 'right' },
  noSettings: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 16 },
  accountSection: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', padding: 16 },
  accountTitle: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  logoutIcon: { fontSize: 20, marginRight: 12 },
  logoutText: { fontSize: 16, color: '#dc2626', fontWeight: '500' },
});
