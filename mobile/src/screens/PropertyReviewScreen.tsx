import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest, api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

const DECISION_OPTIONS = [
  { label: 'Offer Now', value: 'offer_now', color: '#16a34a', bg: '#dcfce7' },
  { label: 'Hold', value: 'hold_later', color: '#d97706', bg: '#fef3c7' },
  { label: 'Pass', value: 'reject', color: '#dc2626', bg: '#fee2e2' },
];

interface SelectedPhoto {
  uri: string;
  base64: string;
  mimeType: string;
  filename: string;
  size: number;
}

export function PropertyReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tourId, propertyId, propertyAddress, userRole } = route.params;

  const isAgent = userRole === 'agent';

  // Form state
  const [rating, setRating] = useState(0);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing client rating
  const { data: existingRating } = useQuery<any>({
    queryKey: [`/api/tours/${tourId}/properties/${propertyId}/rating`],
    enabled: !isAgent,
  });

  // Load existing agent review
  const { data: existingAgentReview } = useQuery<any>({
    queryKey: [`/api/tours/${tourId}/properties/${propertyId}/agent-review`],
    enabled: isAgent,
    retry: false,
  });

  // Pre-populate form with existing data
  useEffect(() => {
    if (!isAgent && existingRating) {
      setRating(existingRating.rating ?? 0);
      setDecision(existingRating.feedbackCategory ?? '');
      setReason(existingRating.reason ?? '');
      setNotes(existingRating.notes ?? '');
    }
  }, [existingRating, isAgent]);

  useEffect(() => {
    if (isAgent && existingAgentReview) {
      setRating(existingAgentReview.agentRating ?? 0);
      setNotes(existingAgentReview.agentNotes ?? '');
    }
  }, [existingAgentReview, isAgent]);

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.7,
      selectionLimit: 8,
    });

    if (!result.canceled) {
      const newPhotos: SelectedPhoto[] = result.assets.map((asset) => ({
        uri: asset.uri,
        base64: asset.base64 || '',
        mimeType: asset.mimeType || 'image/jpeg',
        filename: asset.fileName || `photo_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 8));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    for (const photo of photos) {
      await api({
        method: 'POST',
        url: `/api/properties/${propertyId}/tours/${tourId}/media`,
        timeout: 120000, // 2 min for large images
        data: {
          file: {
            filename: photo.filename,
            mimeType: photo.mimeType,
            size: photo.size,
            base64Data: photo.base64,
          },
          mediaType: 'photo',
          caption: isAgent ? 'Agent observation' : 'Client photo',
        },
      });
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    if (!isAgent && !decision) {
      Alert.alert('Decision required', 'Please choose Offer Now, Hold, or Pass.');
      return;
    }
    if (!isAgent && !reason.trim()) {
      Alert.alert('Reason required', 'Please add a reason for your decision.');
      return;
    }
    if (isAgent && !notes.trim()) {
      Alert.alert('Notes required', 'Please add your observations.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAgent) {
        await apiRequest('PATCH', `/api/tours/${tourId}/properties/${propertyId}/agent-review`, {
          agentRating: rating,
          agentNotes: notes.trim(),
        });
      } else {
        await apiRequest('POST', `/api/tours/${tourId}/properties/${propertyId}/rating`, {
          rating,
          feedbackCategory: decision,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          remindLater: false,
        });
      }

      if (photos.length > 0) {
        await uploadPhotos();
      }

      queryClient.invalidateQueries({ queryKey: [`/api/tours/${tourId}/ratings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${tourId}/properties`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${tourId}/properties/${propertyId}/rating`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${tourId}/properties/${propertyId}/agent-review`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reviews`] });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRow = () => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
          <Text style={[styles.star, star <= rating && styles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Property address header */}
      <View style={styles.propertyHeader}>
        <Text style={styles.propertyIcon}>🏠</Text>
        <Text style={styles.propertyAddress} numberOfLines={2}>{propertyAddress}</Text>
      </View>

      {/* Client-only: Decision chips */}
      {!isAgent && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Decision</Text>
          <View style={styles.decisionRow}>
            {DECISION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.decisionChip,
                  { borderColor: opt.color },
                  decision === opt.value && { backgroundColor: opt.bg },
                ]}
                onPress={() => setDecision(opt.value)}
              >
                <Text style={[styles.decisionChipText, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Star rating */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Star Rating</Text>
        <StarRow />
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </Text>
        )}
      </View>

      {/* Client-only: Reason (required) */}
      {!isAgent && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Reason <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="What stood out about this property?"
            placeholderTextColor="#94a3b8"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Notes / Observations */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {isAgent ? 'Observations / Notes' : 'Additional Notes'}
          {isAgent && <Text style={styles.required}> *</Text>}
          {!isAgent && <Text style={styles.optional}> (optional)</Text>}
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder={
            isAgent
              ? 'Describe property condition, notable features, concerns...'
              : 'Any additional thoughts...'
          }
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Photo upload */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Photos <Text style={styles.optional}>(optional, up to 8)</Text>
        </Text>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoThumb}>
                <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(index)}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {photos.length < 8 && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>
              {photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {existingRating || (existingAgentReview?.agentRating) ? 'Update Review' : 'Submit Review'}
          </Text>
        )}
      </TouchableOpacity>
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
    paddingBottom: 40,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  propertyIcon: {
    fontSize: 24,
  },
  propertyAddress: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  required: {
    color: '#ef4444',
    textTransform: 'none',
  },
  optional: {
    color: '#94a3b8',
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  // Decision chips
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  decisionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Stars
  starRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 36,
    color: '#e2e8f0',
  },
  starFilled: {
    color: '#f59e0b',
  },
  ratingLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  // Text areas
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 88,
  },
  // Photos
  photoStrip: {
    marginBottom: 10,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhoto: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    paddingVertical: 14,
    gap: 8,
  },
  addPhotoIcon: {
    fontSize: 20,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  // Submit
  submitButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
