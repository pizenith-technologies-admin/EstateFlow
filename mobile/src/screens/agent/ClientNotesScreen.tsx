import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { StickyNote, Plus, Send } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

export function ClientNotesScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;
  const [newNote, setNewNote] = useState('');

  const { data: clientNotes, isLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/notes`],
    enabled: !!clientId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest('POST', `/api/clients/${clientId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      setNewNote('');
      Alert.alert('Success', 'Note added successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add note. Please try again.');
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

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
        <StickyNote size={20} color="#1e40af" />
        <Text style={styles.headerTitle}>Agent Notes</Text>
      </View>

      <Card style={styles.inputCard}>
        <CardContent>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note about this client..."
            placeholderTextColor="#94a3b8"
            value={newNote}
            onChangeText={setNewNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.addButton, (!newNote.trim() || addNoteMutation.isPending) && styles.addButtonDisabled]}
            onPress={handleAddNote}
            disabled={!newNote.trim() || addNoteMutation.isPending}
          >
            <Send size={16} color="#fff" />
            <Text style={styles.addButtonText}>
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </Text>
          </TouchableOpacity>
        </CardContent>
      </Card>

      {clientNotes && clientNotes.length > 0 ? (
        clientNotes.map((note: any, index: number) => (
          <Card key={note.id || index} style={styles.noteCard}>
            <CardContent>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{note.author || 'Agent'}</Text>
                <Text style={styles.noteDate}>
                  {new Date(note.date || note.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
            </CardContent>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No Notes</Text>
          <Text style={styles.emptyText}>Add your first note above to get started.</Text>
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
  inputCard: { marginBottom: 20 },
  noteInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1e293b', minHeight: 80, marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1e40af', padding: 12, borderRadius: 10,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  noteCard: { marginBottom: 10 },
  noteHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  noteAuthor: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  noteDate: { fontSize: 12, color: '#94a3b8' },
  noteContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
