import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, Modal, Platform } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { Phone, Mail, FileText, Image as ImageIcon, ClipboardList, ChevronRight, MessageSquare, Users, History, Star, Trash2 } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

export function ClientProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { clientId, client } = route.params;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowDeleteConfirm(false);
      if (Platform.OS === 'web') {
        window.alert('Client has been removed successfully.');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Main' as any);
        }
      } else {
        Alert.alert('Deleted', 'Client has been removed successfully.', [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main' as any);
              }
            },
          },
        ]);
      }
    },
    onError: (error: any) => {
      console.log('Delete client error:', JSON.stringify(error?.response?.data), error?.message);
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete client. Please try again.';
      setShowDeleteConfirm(false);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    },
  });

  const handleDeleteClient = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${client?.firstName} ${client?.lastName}? This action cannot be undone.`
      );
      if (confirmed) {
        deleteClientMutation.mutate();
      }
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const { data: clientRequirementsEnhanced } = useQuery<any>({
    queryKey: [`/api/clients/${clientId}/requirements-enhanced`],
    enabled: !!clientId,
  });

  const { data: clientHistory } = useQuery<any>({
    queryKey: [`/api/clients/${clientId}/history`],
    enabled: !!clientId,
  });

  const { data: clientShortlists } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/shortlists`],
    enabled: !!clientId,
  });

  const { data: clientOffers } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/offers`],
    enabled: !!clientId,
  });

  const { data: clientDocuments } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/documents`],
    enabled: !!clientId,
  });

  const { data: clientMedia } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/media`],
    enabled: !!clientId,
  });

  const { data: clientNotes } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/notes`],
    enabled: !!clientId,
  });

  const { data: clientGroups } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/groups`],
    enabled: !!clientId,
  });

  if (!client) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <CardContent style={styles.headerContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {client?.firstName?.[0]}{client?.lastName?.[0]}
            </Text>
          </View>
          <Text style={styles.name}>{client?.firstName} {client?.lastName}</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`mailto:${client?.email}`)}
            >
              <Mail size={18} color="#1e40af" />
              <Text style={styles.contactText}>Email</Text>
            </TouchableOpacity>
            {client?.phone && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => Linking.openURL(`tel:${client?.phone}`)}
              >
                <Phone size={18} color="#1e40af" />
                <Text style={styles.contactText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              console.log('Delete button pressed for client:', clientId);
              handleDeleteClient();
            }}
            disabled={deleteClientMutation.isPending}
            activeOpacity={0.6}
          >
            {deleteClientMutation.isPending ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Trash2 size={18} color="#dc2626" />
            )}
            <Text style={styles.deleteText}>
              {deleteClientMutation.isPending ? 'Deleting...' : 'Delete Client'}
            </Text>
          </TouchableOpacity>
        </CardContent>
      </Card>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{clientHistory?.summary?.totalTours ?? 0}</Text>
          <Text style={styles.statLabel}>Tours</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{clientShortlists?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Shortlists</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{clientHistory?.summary?.totalOffers ?? 0}</Text>
          <Text style={styles.statLabel}>Offers</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TourHistory', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <History size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Tour History</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientHistory?.summary?.totalTours ?? 0) > 0 && <Text style={styles.badge}>{clientHistory.summary.totalTours}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientRequirements', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <ClipboardList size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Requirements Hub</Text>
          </View>
          <View style={styles.menuItemRight}>
            {clientRequirementsEnhanced && <Star size={18} color="#f59e0b" fill="#f59e0b" />}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientShortlists', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <Star size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Shortlists</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientShortlists?.length ?? 0) > 0 && <Text style={styles.badge}>{clientShortlists?.length}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientDocuments', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <FileText size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Documents</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientDocuments?.length ?? 0) > 0 && <Text style={styles.badge}>{clientDocuments?.length}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientMedia', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <ImageIcon size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Media Gallery</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientMedia?.length ?? 0) > 0 && <Text style={styles.badge}>{clientMedia?.length}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientNotes', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <MessageSquare size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Notes</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientNotes?.length ?? 0) > 0 && <Text style={styles.badge}>{clientNotes?.length}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ClientGroups', { clientId })}
        >
          <View style={styles.menuItemLeft}>
            <Users size={22} color="#64748b" />
            <Text style={styles.menuItemText}>Groups</Text>
          </View>
          <View style={styles.menuItemRight}>
            {(clientGroups?.length ?? 0) > 0 && <Text style={styles.badge}>{clientGroups?.length}</Text>}
            <ChevronRight size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Client</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete {client?.firstName} {client?.lastName}? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => deleteClientMutation.mutate()}
                disabled={deleteClientMutation.isPending}
              >
                {deleteClientMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  contactText: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 16,
    width: '100%',
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
