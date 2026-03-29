import { View, Text, StyleSheet, ScrollView, Linking, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { useTourCart } from '../contexts/TourCartContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PropertyPhotoCarousel } from '../components/PropertyPhotoCarousel';

export function PropertyDetailsScreen() {
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const { addToCart, removeFromCart, isInCart } = useTourCart();

  const { data: property, isLoading } = useQuery({
    queryKey: [`/api/properties/${propertyId}`],
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: [`/api/properties/${propertyId}/reviews`],
    enabled: !!propertyId,
  });

  const inCart = isInCart(propertyId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map((s) => (
      <Text key={s} style={s <= rating ? styles.starFilled : styles.starEmpty}>★</Text>
    ));

  const DECISION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    offer_now: { label: 'Offer Now', color: '#16a34a', bg: '#dcfce7' },
    hold_later: { label: 'Hold', color: '#d97706', bg: '#fef3c7' },
    reject:     { label: 'Pass',  color: '#dc2626', bg: '#fee2e2' },
  };

  const handleCartToggle = () => {
    if (!property) return;

    if (inCart) {
      removeFromCart(propertyId);
    } else {
      addToCart({
        id: property.id,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFootage: property.squareFootage,
        imageUrl: property.imageUrl,
      });
    }
  };

  const handleViewOnMap = () => {
    if (!property?.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <PropertyPhotoCarousel propertyId={propertyId} height={250} />

      <View style={styles.content}>
        <Text style={styles.price}>{formatPrice(property.price)}</Text>
        <Text style={styles.address}>{property.address}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{property.bedrooms}</Text>
            <Text style={styles.detailLabel}>Beds</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{property.bathrooms}</Text>
            <Text style={styles.detailLabel}>Baths</Text>
          </View>
          {property.squareFootage && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>{property.squareFootage.toLocaleString()}</Text>
                <Text style={styles.detailLabel}>Sq Ft</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title={inCart ? '✓ In Cart' : 'Add to Tour Cart'}
            onPress={handleCartToggle}
            variant={inCart ? 'secondary' : 'primary'}
            style={styles.actionButton}
          />
          <Button
            title="View on Map"
            onPress={handleViewOnMap}
            variant="outline"
            style={styles.actionButton}
          />
        </View>

        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MLS Number</Text>
              <Text style={styles.infoValue}>{property.mlsNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Property Type</Text>
              <Text style={styles.infoValue}>{property.propertyType || 'Residential'}</Text>
            </View>
            {property.yearBuilt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Year Built</Text>
                <Text style={styles.infoValue}>{property.yearBuilt}</Text>
              </View>
            )}
            {property.lotSize && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lot Size</Text>
                <Text style={styles.infoValue}>{property.lotSize}</Text>
              </View>
            )}
          </CardContent>
        </Card>

        {property.description && (
          <Card style={styles.section}>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Text style={styles.description}>{property.description}</Text>
            </CardContent>
          </Card>
        )}

        {property.features && property.features.length > 0 && (
          <Card style={styles.section}>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.featuresList}>
                {property.features.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureBullet}>•</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Reviews section */}
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Reviews {reviews && reviews.length > 0 ? `(${reviews.length})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {!reviews || reviews.length === 0 ? (
              <Text style={styles.noReviewsText}>No reviews yet for this property.</Text>
            ) : (
              reviews.map((review: any, index: number) => {
                const decision = review.feedbackCategory ? DECISION_LABELS[review.feedbackCategory] : null;
                return (
                  <View key={review.id || index} style={[styles.reviewItem, index < reviews.length - 1 && styles.reviewItemBorder]}>
                    {/* Header row: reviewer name + date + role badge */}
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderLeft}>
                        <View style={[styles.roleBadge, review.reviewType === 'agent' ? styles.roleBadgeAgent : styles.roleBadgeClient]}>
                          <Text style={styles.roleBadgeText}>
                            {review.reviewType === 'agent' ? 'Agent' : 'Client'}
                          </Text>
                        </View>
                        <Text style={styles.reviewerName}>{review.reviewerName?.trim() || 'Anonymous'}</Text>
                      </View>
                      {review.createdAt && (
                        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                      )}
                    </View>

                    {/* Star rating */}
                    {review.rating != null && (
                      <View style={styles.starsRow}>
                        {renderStars(review.rating)}
                      </View>
                    )}

                    {/* Client-only: decision chip */}
                    {decision && (
                      <View style={[styles.decisionChip, { backgroundColor: decision.bg }]}>
                        <Text style={[styles.decisionChipText, { color: decision.color }]}>{decision.label}</Text>
                      </View>
                    )}

                    {/* Reason (client) */}
                    {review.reason ? (
                      <Text style={styles.reviewText}>{review.reason}</Text>
                    ) : null}

                    {/* Notes (client optional / agent main text) */}
                    {review.notes ? (
                      <Text style={[styles.reviewText, styles.reviewNotes]}>{review.notes}</Text>
                    ) : null}

                    {/* Review photos */}
                    {review.photos && review.photos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotoStrip}>
                        {review.photos.map((photo: any, pi: number) => (
                          <Image
                            key={photo.id || pi}
                            source={{ uri: photo.url }}
                            style={styles.reviewPhotoThumb}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })
            )}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    padding: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e40af',
  },
  address: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 22,
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
  },
  featureBullet: {
    fontSize: 14,
    color: '#1e40af',
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  // Reviews
  noReviewsText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  reviewItem: {
    paddingVertical: 14,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeAgent: {
    backgroundColor: '#ede9fe',
  },
  roleBadgeClient: {
    backgroundColor: '#dbeafe',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 2,
  },
  starFilled: {
    fontSize: 18,
    color: '#f59e0b',
  },
  starEmpty: {
    fontSize: 18,
    color: '#e2e8f0',
  },
  decisionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  decisionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  reviewNotes: {
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  reviewPhotoStrip: {
    marginTop: 10,
  },
  reviewPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
});
