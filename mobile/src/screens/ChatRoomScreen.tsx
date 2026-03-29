import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';

export function ChatRoomScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { conversationId, otherUserName } = route.params;
  const { user } = useAuth();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ title: otherUserName || 'Chat' });
  }, [otherUserName]);

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest('POST', `/api/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.senderId === user?.id;
    const prev = messages[index - 1];
    const showDateHeader =
      !prev || new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, isMine ? styles.timeTextMine : styles.timeTextTheirs]}>
              {formatTime(item.createdAt)}
              {isMine && (
                <Text style={styles.readTick}>{item.isRead ? '  ✓✓' : '  ✓'}</Text>
              )}
            </Text>
          </View>
        </View>
      </>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  messageList: { padding: 16, paddingBottom: 8 },
  dateHeader: { alignItems: 'center', marginVertical: 12 },
  dateHeaderText: {
    fontSize: 12, color: '#64748b', backgroundColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },
  messageRow: { flexDirection: 'row', marginBottom: 4 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1,
  },
  bubbleMine: { backgroundColor: '#1e40af', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#ffffff', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#ffffff' },
  bubbleTextTheirs: { color: '#1e293b' },
  timeText: { fontSize: 11, marginTop: 4 },
  timeTextMine: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeTextTheirs: { color: '#94a3b8', textAlign: 'left' },
  readTick: { fontSize: 11 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12,
    paddingVertical: 10, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15, color: '#1e293b', maxHeight: 120, marginRight: 8,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#93c5fd' },
  sendIcon: { color: '#ffffff', fontSize: 18, marginLeft: 2 },
});
