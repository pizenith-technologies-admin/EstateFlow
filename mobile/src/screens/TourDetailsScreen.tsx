import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { apiRequest } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { PropertyPhotoCarousel } from '../components/PropertyPhotoCarousel';
import { useAuth } from '../contexts/AuthContext';

export function TourDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tourId } = route.params;
  const { user } = useAuth();
  const userRole = (user?.role === 'agent' ? 'agent' : 'client') as 'agent' | 'client';

  const { data: allTours, isLoading } = useQuery<any[]>({
    queryKey: ['/api/tours'],
  });

  const tour = allTours?.find((t: any) => t.id === tourId) || null;

  const { data: properties } = useQuery({
    queryKey: [`/api/tours/${tourId}/properties`],
    enabled: !!tourId,
  });

  // For clients: fetch existing ratings to show reviewed state
  const { data: tourRatings } = useQuery<any[]>({
    queryKey: [`/api/tours/${tourId}/ratings`],
    enabled: !!tourId && userRole === 'client',
  });

  const reviewedPropertyIds = new Set(
    (tourRatings || []).map((r: any) => r.propertyId)
  );

  // For agents: reviewed = agentRating is not null on the tourProperty
  const agentReviewedPropertyIds = new Set(
    ((properties as any[]) || [])
      .filter((tp: any) => tp.agentRating != null)
      .map((tp: any) => tp.propertyId || tp.property?.id)
  );

  const canReview = tour?.status === 'in_progress' || tour?.status === 'completed';

  const startTourMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tours/${tourId}`, { status: 'in_progress', startNow: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      if (properties && Array.isArray(properties) && (properties as any[]).length > 0) {
        openMapsNavigation();
      }
    },
  });

  const endTourMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tours/${tourId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const openMapsNavigation = async () => {
    if (!properties || properties.length === 0) return;

    const addresses = (properties as any[]).map((p: any) => (p.property || p).address);
    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses.slice(0, -1).map((a: string) => encodeURIComponent(a)).join('|');

    // Try to get live current location as the starting point
    let originLat: number | null = null;
    let originLng: number | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        originLat = loc.coords.latitude;
        originLng = loc.coords.longitude;
      }
    } catch (_) {
      // Permission denied or location unavailable
    }

    // Store the driving distance (what Google Maps will show) on the tour for the weekly stats
    apiRequest('POST', `/api/tours/${tourId}/calculate-route-distance`, {
      originLat,
      originLng,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    }).catch(() => {
      // Non-fatal — stats will update next time
    });

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    if (originLat !== null && originLng !== null) {
      url += `&origin=${originLat},${originLng}`;
    }
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }

    Linking.openURL(url);
  };

  const formatPrice = (price: any) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getPropertyStatusColor = (status: string) => {
    switch (status) {
      case 'liked': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'offer_made': return '#8b5cf6';
      case 'viewed': return '#3b82f6';
      default: return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!tour || !tour.id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.tourId}>Tour #{(tour.id || '').slice(-6)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tour.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(tour.status) }]}>
              {tour.status?.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.date}>
          {new Date(tour.scheduledDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.time}>
          {new Date(tour.scheduledDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <Text style={styles.statValue}>{Array.isArray(properties) ? properties.length : 0}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <Text style={styles.statValue}>
              {tour.totalDistance && Number(tour.totalDistance) > 0
                ? `${Number(tour.totalDistance).toFixed(1)}`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>
              {tour.totalDistance && Number(tour.totalDistance) > 0 ? 'km covered' : 'Distance'}
            </Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <Text style={styles.statValue}>
              {tour.actualDuration && tour.actualDuration > 0
                ? tour.actualDuration < 60
                  ? `${tour.actualDuration}m`
                  : `${Math.floor(tour.actualDuration / 60)}h${tour.actualDuration % 60 > 0 ? `${tour.actualDuration % 60}m` : ''}`
                : tour.estimatedDuration
                  ? tour.estimatedDuration < 60
                    ? `~${tour.estimatedDuration}m`
                    : `~${Math.floor(tour.estimatedDuration / 60)}h${tour.estimatedDuration % 60 > 0 ? `${tour.estimatedDuration % 60}m` : ''}`
                  : '—'}
            </Text>
            <Text style={styles.statLabel}>
              {tour.actualDuration && tour.actualDuration > 0 ? 'Time Taken' : 'Est. Time'}
            </Text>
          </CardContent>
        </Card>
      </View>

      {tour.status === 'scheduled' && (
        <Button
          title="Start Tour & Navigate"
          onPress={() => startTourMutation.mutate()}
          loading={startTourMutation.isPending}
          style={styles.startButton}
        />
      )}

      {tour.status === 'in_progress' && (
        <Button
          title="Open Navigation"
          onPress={openMapsNavigation}
          style={styles.startButton}
        />
      )}

      {tour.status === 'in_progress' && userRole === 'agent' && (
        <Button
          title="End Tour"
          onPress={() => endTourMutation.mutate()}
          loading={endTourMutation.isPending}
          variant="outline"
          style={styles.endTourButton}
        />
      )}

      {(tour.status === 'scheduled' || tour.status === 'in_progress') && (
        <Button
          title="+ Add Property"
          onPress={() => navigation.navigate('AddPropertyToTour', { tourId })}
          variant="outline"
          style={styles.addPropertyButton}
        />
      )}

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Properties ({Array.isArray(properties) ? properties.length : 0})</CardTitle>
        </CardHeader>
        <CardContent style={styles.propertiesContent}>
          {properties && Array.isArray(properties) && properties.length > 0 ? (
            properties.map((tp: any, index: number) => {
              const prop = tp.property || tp;
              return (
                <TouchableOpacity
                  key={tp.propertyId || tp.id || `prop-${index}`}
                  style={styles.propertyCard}
                  onPress={() => navigation.navigate('PropertyDetails', { propertyId: prop.id })}
                  activeOpacity={0.85}
                >
                  {/* Photo */}
                  <View style={styles.photoContainer}>
                    <PropertyPhotoCarousel propertyId={prop.id} height={160} />
                    {/* Stop number badge */}
                    <View style={styles.stopBadge}>
                      <Text style={styles.stopBadgeText}>{index + 1}</Text>
                    </View>
                    {/* Visit status badge */}
                    {tp.status && tp.status !== 'scheduled' && (
                      <View style={[
                        styles.visitStatusBadge,
                        { backgroundColor: getPropertyStatusColor(tp.status) },
                      ]}>
                        <Text style={styles.visitStatusText}>
                          {tp.status.replace('_', ' ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  <View style={styles.propertyDetails}>
                    {/* Price */}
                    {prop.price && (
                      <Text style={styles.propertyPrice}>{formatPrice(prop.price)}</Text>
                    )}

                    {/* Address */}
                    <Text style={styles.propertyAddress} numberOfLines={1}>
                      {prop.address}
                    </Text>
                    {(prop.city || prop.province) && (
                      <Text style={styles.propertyCity}>
                        {[prop.city, prop.province].filter(Boolean).join(', ')}
                      </Text>
                    )}

                    {/* Specs row */}
                    <View style={styles.specsRow}>
                      {prop.bedrooms != null && (
                        <View style={styles.specItem}>
                          <Text style={styles.specIcon}>🛏</Text>
                          <Text style={styles.specText}>{prop.bedrooms} bed</Text>
                        </View>
                      )}
                      {prop.bathrooms != null && (
                        <View style={styles.specItem}>
                          <Text style={styles.specIcon}>🚿</Text>
                          <Text style={styles.specText}>{prop.bathrooms} bath</Text>
                        </View>
                      )}
                      {prop.area && (
                        <View style={styles.specItem}>
                          <Text style={styles.specIcon}>📐</Text>
                          <Text style={styles.specText}>{prop.area}</Text>
                        </View>
                      )}
                    </View>

                    {/* Meta row */}
                    <View style={styles.metaRow}>
                      {prop.propertyType && (
                        <View style={styles.typeTag}>
                          <Text style={styles.typeTagText}>{prop.propertyType}</Text>
                        </View>
                      )}
                      {prop.mlsNumber && (
                        <Text style={styles.metaText}>MLS #{prop.mlsNumber}</Text>
                      )}
                    </View>

                    {/* Review button */}
                    {canReview && (
                      <TouchableOpacity
                        style={[
                          styles.reviewButton,
                          (userRole === 'client'
                            ? reviewedPropertyIds.has(prop.id)
                            : agentReviewedPropertyIds.has(tp.propertyId || prop.id))
                            && styles.reviewButtonDone,
                        ]}
                        onPress={() =>
                          navigation.navigate('PropertyReview', {
                            tourId,
                            propertyId: prop.id,
                            propertyAddress: prop.address,
                            userRole,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.reviewButtonText,
                            (userRole === 'client'
                              ? reviewedPropertyIds.has(prop.id)
                              : agentReviewedPropertyIds.has(tp.propertyId || prop.id))
                              && styles.reviewButtonTextDone,
                          ]}
                        >
                          {(userRole === 'client'
                            ? reviewedPropertyIds.has(prop.id)
                            : agentReviewedPropertyIds.has(tp.propertyId || prop.id))
                            ? '✓ Review Added'
                            : '✍ Write Review'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No properties in this tour</Text>
          )}
        </CardContent>
      </Card>

      {tour.notes && (
        <Card style={styles.section}>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.notes}>{tour.notes}</Text>
          </CardContent>
        </Card>
      )}
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
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 16,
    color: '#475569',
    marginTop: 8,
  },
  time: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  startButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addPropertyButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  endTourButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderColor: '#ef4444',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  propertiesContent: {
    padding: 12,
    gap: 12,
  },
  propertyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  photoContainer: {
    position: 'relative',
  },
  stopBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  stopBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  visitStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  visitStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  propertyDetails: {
    padding: 12,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  propertyCity: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specIcon: {
    fontSize: 13,
  },
  specText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  typeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 16,
  },
  notes: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  reviewButton: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1e40af',
    alignItems: 'center',
  },
  reviewButtonDone: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  reviewButtonTextDone: {
    color: '#16a34a',
  },
});
