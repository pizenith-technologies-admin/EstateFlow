import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface PropertyPhoto {
  id: string;
  url: string;
  caption?: string;
}

interface PropertyPhotoCarouselProps {
  propertyId: string;
  height?: number;
  showIndicators?: boolean;
}

export function PropertyPhotoCarousel({
  propertyId,
  height = 120,
  showIndicators = true,
}: PropertyPhotoCarouselProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { data: photos = [], isLoading } = useQuery<PropertyPhoto[]>({
    queryKey: [`/api/properties/${propertyId}/photos`],
    retry: false,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🏠</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Image
        source={{ uri: photos[currentPhotoIndex].url }}
        style={[styles.image, { height }]}
      />
      {showIndicators && photos.length > 1 && (
        <View style={styles.dotsContainer}>
          {photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPhotoIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
      {photos.length > 1 && (
        <View style={styles.buttonContainer}>
          {currentPhotoIndex > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentPhotoIndex(currentPhotoIndex - 1)}
            >
              <Text style={styles.navButtonText}>◀</Text>
            </TouchableOpacity>
          )}
          {currentPhotoIndex < photos.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => setCurrentPhotoIndex(currentPhotoIndex + 1)}
            >
              <Text style={styles.navButtonText}>▶</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  placeholderText: {
    fontSize: 32,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonRight: {
    marginLeft: 'auto',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
