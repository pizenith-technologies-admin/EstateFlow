import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';

export function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';
  const [showNewChat, setShowNewChat] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const { data: conversations = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
    refetchInterval: 5000,
  });

  // For agents: load client list to start new conversations
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: isAgent && showNewChat,
  });

  const startConversationMutation = useMutation({
    mutationFn: (otherUserId: string) =>
      apiRequest('POST', '/api/conversations', { otherUserId }),
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setShowNewChat(false);
      setClientSearch('');
      const otherUser = conversation.clientId === user?.id
        ? null
        : clients.find((c: any) => c.id === conversation.clientId);
      navigation.navigate('ChatRoom', {
        conversationId: conversation.id,
        otherUserName: otherUser
          ? `${otherUser.firstName} ${otherUser.lastName}`
          : 'Chat',
      });
    },
    onError: () => Alert.alert('Error', 'Could not start conversation'),
  });

  const handleOpenConversation = (conv: any) => {
    const otherName = conv.otherUser
      ? `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      : 'Chat';
    navigation.navigate('ChatRoom', {
      conversationId: conv.id,
      otherUserName: otherName,
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredClients = clients.filter((c: any) =>
    clientSearch === '' ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const renderConversation = ({ item }: { item: any }) => {
    const otherName = item.otherUser
      ? `${item.otherUser.firstName} ${item.otherUser.lastName}`
      : 'Unknown';
    const initials = item.otherUser
      ? `${item.otherUser.firstName?.[0] || ''}${item.otherUser.lastName?.[0] || ''}`
      : '?';
    const lastMsg = item.lastMessage?.content || 'No messages yet';
    const truncated = lastMsg.length > 50 ? lastMsg.slice(0, 50) + '…' : lastMsg;
    const hasUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity style={styles.convRow} onPress={() => handleOpenConversation(item)} activeOpacity={0.75}>
        <View style={[styles.avatar, { backgroundColor: isAgent ? '#10b981' : '#1e40af' }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={[styles.convName, hasUnread && styles.convNameUnread]}>{otherName}</Text>
            <Text style={styles.convTime}>{formatTime(item.lastMessage?.createdAt || item.lastMessageAt)}</Text>
          </View>
          <View style={styles.convFooter}>
            <Text style={[styles.convPreview, hasUnread && styles.convPreviewUnread]} numberOfLines={1}>
              {truncated}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderClientPicker = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.clientRow}
      onPress={() => startConversationMutation.mutate(item.id)}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.avatarText}>
          {item.firstName?.[0]}{item.lastName?.[0]}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <Text style={styles.clientArrow}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* New Chat modal (agent only) */}
      {isAgent && showNewChat && (
        <View style={styles.newChatPanel}>
          <View style={styles.newChatHeader}>
            <Text style={styles.newChatTitle}>Start New Chat</Text>
            <TouchableOpacity onPress={() => { setShowNewChat(false); setClientSearch(''); }}>
              <Text style={styles.newChatClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            value={clientSearch}
            onChangeText={setClientSearch}
            placeholderTextColor="#94a3b8"
          />
          <FlatList
            data={filteredClients}
            keyExtractor={(c) => c.id}
            renderItem={renderClientPicker}
            style={styles.clientList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No clients found</Text>
            }
          />
        </View>
      )}

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            {isAgent
              ? 'Start a conversation with one of your clients'
              : 'Your agent will be in touch soon'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {isAgent && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewChat(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 4 },
  convRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: '#ffffff',
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  convInfo: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  convNameUnread: { fontWeight: '700' },
  convTime: { fontSize: 12, color: '#94a3b8' },
  convFooter: { flexDirection: 'row', alignItems: 'center' },
  convPreview: { flex: 1, fontSize: 14, color: '#64748b' },
  convPreviewUnread: { color: '#1e293b', fontWeight: '500' },
  unreadBadge: {
    backgroundColor: '#1e40af', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 8,
  },
  unreadBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6,
  },
  fabIcon: { fontSize: 22 },
  // New chat panel
  newChatPanel: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#ffffff', zIndex: 10,
  },
  newChatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  newChatTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  newChatClose: { fontSize: 20, color: '#64748b', padding: 4 },
  searchInput: {
    margin: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1e293b',
  },
  clientList: { flex: 1 },
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  clientName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  clientEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  clientArrow: { fontSize: 22, color: '#94a3b8' },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 24, paddingHorizontal: 16 },
});
