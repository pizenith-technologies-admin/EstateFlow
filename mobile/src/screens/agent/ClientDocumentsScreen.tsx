import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { FolderOpen, FileText, Download } from 'lucide-react-native';

export function ClientDocumentsScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientDocuments, isLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/documents`],
    enabled: !!clientId,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <FolderOpen size={20} color="#1e40af" />
        <Text style={styles.headerTitle}>Client Documents</Text>
        {clientDocuments && clientDocuments.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{clientDocuments.length}</Text>
          </View>
        )}
      </View>

      {clientDocuments && clientDocuments.length > 0 ? (
        clientDocuments.map((doc: any) => (
          <Card key={doc.id} style={styles.docCard}>
            <CardContent style={styles.docContent}>
              <View style={styles.docIcon}>
                <FileText size={24} color="#1e40af" />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docTitle} numberOfLines={1}>{doc.title || doc.originalName}</Text>
                <View style={styles.docMetaRow}>
                  {doc.documentType && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{doc.documentType.replace('_', ' ')}</Text>
                    </View>
                  )}
                  {doc.size && <Text style={styles.docMeta}>{formatSize(doc.size)}</Text>}
                  {doc.createdAt && (
                    <Text style={styles.docMeta}>{new Date(doc.createdAt).toLocaleDateString()}</Text>
                  )}
                </View>
              </View>
              {doc.url && (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => Linking.openURL(doc.url)}
                >
                  <Download size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyTitle}>No Documents</Text>
          <Text style={styles.emptyText}>No documents have been uploaded for this client yet.</Text>
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
  docCard: { marginBottom: 10 },
  docContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  docMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 11, color: '#475569', textTransform: 'capitalize' },
  docMeta: { fontSize: 11, color: '#94a3b8' },
  downloadButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
