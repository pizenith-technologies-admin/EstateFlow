import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../contexts/AuthContext';
import { api, apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

const DOCUMENT_TYPES = [
  { value: 'client_id', label: 'ID / Passport' },
  { value: 'financial_document', label: 'Financial Document' },
  { value: 'legal_document', label: 'Legal Document' },
  { value: 'representative_agreement', label: 'Agency Agreement' },
  { value: 'purchase_agreement', label: 'Purchase Agreement' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'offer_placed', label: 'Offer Made' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contract' },
  { value: 'deed', label: 'Deed / Title' },
  { value: 'floor_plan', label: 'Floor Plan' },
  { value: 'survey', label: 'Survey' },
  { value: 'other', label: 'Other' },
];

interface PickedFile {
  base64: string;
  mimeType: string;
  size: number;
  originalName: string;
}

function getDocIcon(mimeType: string): string {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
  return '📁';
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getTypeLabel(value: string): string {
  return DOCUMENT_TYPES.find(t => t.value === value)?.label ?? value.replace(/_/g, ' ');
}

export function MyDocumentsScreen() {
  const { user } = useAuth();

  // Upload modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0].value);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [`/api/documents/${user?.id}`],
    enabled: !!user?.id,
  });

  // ── File pickers ──────────────────────────────────────────────

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedFile({
        base64: asset.base64 || '',
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
        originalName: asset.fileName || `photo_${Date.now()}.jpg`,
      });
      if (!title) setTitle(asset.fileName?.replace(/\.[^.]+$/, '') || 'Photo');
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const MAX_BYTES = 25 * 1024 * 1024;
    if (asset.size && asset.size > MAX_BYTES) {
      Alert.alert('File too large', 'Maximum file size is 25 MB.');
      return;
    }

    try {
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPickedFile({
        base64: b64,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        originalName: asset.name,
      });
      if (!title) setTitle(asset.name.replace(/\.[^.]+$/, ''));
    } catch {
      Alert.alert('Error', 'Could not read the selected file.');
    }
  };

  // ── Upload ────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!title.trim()) { Alert.alert('Title required', 'Please enter a document title.'); return; }
    if (!pickedFile) { Alert.alert('File required', 'Please select a file to upload.'); return; }

    setIsUploading(true);
    try {
      await api({
        method: 'POST',
        url: '/api/documents/upload-direct',
        timeout: 120000,
        data: {
          title: title.trim(),
          documentType: docType,
          base64Data: pickedFile.base64,
          mimeType: pickedFile.mimeType,
          size: pickedFile.size,
          originalName: pickedFile.originalName,
        },
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${user?.id}`] });
      closeModal();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────

  const handleDelete = (doc: any) => {
    Alert.alert('Delete Document', `Delete "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest('DELETE', `/api/documents/${doc.id}`);
            queryClient.invalidateQueries({ queryKey: [`/api/documents/${user?.id}`] });
          } catch {
            Alert.alert('Error', 'Could not delete the document.');
          }
        },
      },
    ]);
  };

  // ── View / Open ───────────────────────────────────────────────

  const handleOpen = (doc: any) => {
    if (!doc.url) return;
    if (doc.url.startsWith('data:')) {
      Alert.alert('Preview unavailable', 'This document was stored locally. Download functionality requires Cloudinary setup.');
      return;
    }
    Linking.openURL(doc.url);
  };

  // ── Modal helpers ─────────────────────────────────────────────

  const openModal = () => {
    setTitle('');
    setDocType(DOCUMENT_TYPES[0].value);
    setPickedFile(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setPickedFile(null);
    setTitle('');
  };

  // ── Render ────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.docCard} onPress={() => handleOpen(item)} activeOpacity={0.75}>
      <View style={styles.docIcon}>
        <Text style={styles.docIconText}>{getDocIcon(item.mimeType)}</Text>
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.docMeta}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getTypeLabel(item.documentType)}</Text>
          </View>
          <Text style={styles.docDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.size > 0 && (
          <Text style={styles.docSize}>{formatSize(item.size)}</Text>
        )}
      </View>
      <View style={styles.docActions}>
        <TouchableOpacity onPress={() => handleOpen(item)} style={styles.openBtn}>
          <Text style={styles.openBtnText}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            documents.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No Documents Yet</Text>
              <Text style={styles.emptyText}>
                Upload your IDs, contracts, inspection reports and more to keep everything in one place.
              </Text>
            </View>
          }
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Document</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.fieldLabel}>Title <Text style={styles.req}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Passport, Purchase Agreement..."
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              {/* Document Type */}
              <Text style={styles.fieldLabel}>Document Type <Text style={styles.req}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {DOCUMENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeChip, docType === t.value && styles.typeChipActive]}
                    onPress={() => setDocType(t.value)}
                  >
                    <Text style={[styles.typeChipText, docType === t.value && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* File selection */}
              <Text style={styles.fieldLabel}>File <Text style={styles.req}>*</Text></Text>

              {pickedFile ? (
                <View style={styles.selectedFile}>
                  <Text style={styles.selectedFileIcon}>{getDocIcon(pickedFile.mimeType)}</Text>
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>{pickedFile.originalName}</Text>
                    <Text style={styles.selectedFileSize}>{formatSize(pickedFile.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPickedFile(null)}>
                    <Text style={styles.clearFile}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickerRow}>
                  <TouchableOpacity style={styles.pickerButton} onPress={pickFromLibrary}>
                    <Text style={styles.pickerButtonIcon}>🖼️</Text>
                    <Text style={styles.pickerButtonText}>Photo Library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerButton} onPress={pickDocument}>
                    <Text style={styles.pickerButtonIcon}>📄</Text>
                    <Text style={styles.pickerButtonText}>PDF / File</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Upload button */}
              <TouchableOpacity
                style={[styles.uploadButton, (isUploading || !pickedFile || !title.trim()) && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={isUploading || !pickedFile || !title.trim()}
              >
                {isUploading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.uploadButtonText}>Upload Document</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={closeModal} disabled={isUploading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  emptyList: { flex: 1 },

  // Document card
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docIconText: { fontSize: 22 },
  docInfo: { flex: 1, marginRight: 8 },
  docTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#1e40af' },
  docDate: { fontSize: 11, color: '#94a3b8' },
  docSize: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  docActions: { flexDirection: 'column', alignItems: 'center', gap: 6 },
  openBtn: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1e40af',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 30 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#e2e8f0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },

  // Form fields
  fieldLabel: {
    fontSize: 13, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  req: { color: '#ef4444', textTransform: 'none' },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1e293b', marginBottom: 20,
  },

  // Type chips
  typeScroll: { marginBottom: 20 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc', marginRight: 8,
  },
  typeChipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#fff' },

  // File pickers
  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pickerButton: {
    flex: 1, alignItems: 'center', paddingVertical: 18,
    backgroundColor: '#f8fafc', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed',
  },
  pickerButtonIcon: { fontSize: 28, marginBottom: 6 },
  pickerButtonText: { fontSize: 13, fontWeight: '600', color: '#475569' },

  // Selected file
  selectedFile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
    padding: 12, marginBottom: 24,
  },
  selectedFileIcon: { fontSize: 24, marginRight: 10 },
  selectedFileInfo: { flex: 1 },
  selectedFileName: { fontSize: 14, fontWeight: '600', color: '#166534' },
  selectedFileSize: { fontSize: 12, color: '#16a34a', marginTop: 2 },
  clearFile: { fontSize: 16, color: '#64748b', paddingLeft: 8 },

  // Action buttons
  uploadButton: {
    backgroundColor: '#1e40af', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
  },
  uploadButtonDisabled: { opacity: 0.45 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 10 },
  cancelButtonText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
});
