import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { Card, CardContent } from '../../components/Card';
import { Camera, Film, FileText } from 'lucide-react-native';

export function ClientMediaScreen() {
  const route = useRoute<any>();
  const { clientId } = route.params;

  const { data: clientMedia, isLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/media`],
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const photos = clientMedia?.filter((m: any) => m.mediaType === 'photo' || m.mimeType?.startsWith('image/')) || [];
  const videos = clientMedia?.filter((m: any) => m.mediaType === 'video' || m.mimeType?.startsWith('video/')) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Camera size={20} color="#1e40af" />
        <Text style={styles.headerTitle}>Media & Photos</Text>
        {clientMedia && clientMedia.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{clientMedia.length}</Text>
          </View>
        )}
      </View>

      {clientMedia && clientMedia.length > 0 ? (
        <>
          {photos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Camera size={16} color="#64748b" />
                <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
              </View>
              <View style={styles.photoGrid}>
                {photos.map((photo: any, index: number) => (
                  <TouchableOpacity
                    key={photo.id || index}
                    style={styles.photoItem}
                    onPress={() => photo.url && Linking.openURL(photo.url)}
                  >
                    <Image source={{ uri: photo.url }} style={styles.photoImage} />
                    {photo.originalName && (
                      <Text style={styles.photoName} numberOfLines={1}>{photo.originalName}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {videos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Film size={16} color="#64748b" />
                <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>
              </View>
              {videos.map((video: any, index: number) => (
                <TouchableOpacity
                  key={video.id || index}
                  style={styles.videoItem}
                  onPress={() => video.url && Linking.openURL(video.url)}
                >
                  <View style={styles.videoIcon}>
                    <Film size={20} color="#1e40af" />
                  </View>
                  <Text style={styles.videoName} numberOfLines={1}>{video.originalName || 'Video'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No Media Files</Text>
          <Text style={styles.emptyText}>Property photos and videos will appear here.</Text>
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
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#475569' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem: {
    width: '48%',
    borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  photoImage: { width: '100%', height: 120, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  photoName: { fontSize: 11, color: '#64748b', padding: 6 },
  videoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  videoIcon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  videoName: { fontSize: 14, color: '#1e293b', flex: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
