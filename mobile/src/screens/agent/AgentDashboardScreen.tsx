import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator, Pressable } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { PropertyPhotoCarousel } from '../../components/PropertyPhotoCarousel';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface OffersPipeline {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

interface StatsResponse {
  todayTours: number;
  activeClients: number;
  pendingRequests: number;
  weeklyDistance: number;
  timeInvestedHours: number;
  offersPipeline: OffersPipeline;
  avgScopeFitScore: number;
  exceptionsCount: number;
  recentChanges: number;
}

interface Tour {
  id: string;
  clientName?: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  propertyAddress?: string;
}

interface ShowingRequest {
  id: string;
  clientId?: string;
  clientName?: string;
  propertyAddress?: string;
  propertyCount?: number;
  preferredDate?: string | null;
  preferredTime?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

interface RequestDetailProperty {
  id: string;
  address: string;
  city?: string;
  province?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  price?: number;
}

interface RequestDetail extends ShowingRequest {
  properties: RequestDetailProperty[];
}

interface Property {
  id: string;
  address: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrl?: string;
}

// Icon symbols for stats
const StatIcons = {
  todayTours: '📅',
  activeClients: '👥',
  pendingRequests: '⏰',
  weeklyDistance: '📍',
  timeInvestedHours: '⏱️',
  offersPipeline: '📈',
  avgScopeFitScore: '🎯',
  exceptionsCount: '⚠️',
  recentChanges: '📄',
};

export function AgentDashboardScreen() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { data: stats, isLoading, refetch } = useQuery<StatsResponse>({
    queryKey: ['/api/stats'],
  });

  const { data: recentTours } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  const { data: pendingRequests } = useQuery<ShowingRequest[]>({
    queryKey: ['/api/showing-requests'],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: clients } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  const { data: requestDetail, isLoading: requestDetailLoading } = useQuery<RequestDetail>({
    queryKey: [`/api/showing-requests/${selectedRequestId}`],
    enabled: !!selectedRequestId,
  });

  // Filter tours for today
  const todayTours = recentTours?.filter((tour) => {
    const today = new Date().toDateString();
    const tourDate = new Date(tour.scheduledDate).toDateString();
    return today === tourDate;
  }) || [];

  // Filter pending requests
  const pendingOnly = pendingRequests?.filter((req) => req.status === 'pending') || [];

  // The detail endpoint doesn't join users, so grab clientName from the list data
  const selectedRequestListData = pendingOnly.find((r) => r.id === selectedRequestId);

  const updateRequestStatus = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) =>
      apiRequest('PATCH', `/api/showing-requests/${requestId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/showing-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  // Primary stats (4 items) - shown on dashboard
  const primaryStats = [
    { 
      label: 'Today\'s Tours', 
      value: stats?.todayTours || 0, 
      key: 'todayTours',
      icon: StatIcons.todayTours,
      color: '#3b82f6',
    },
    { 
      label: 'Active Clients', 
      value: stats?.activeClients || 0, 
      key: 'activeClients',
      icon: StatIcons.activeClients,
      color: '#8b5cf6',
    },
    { 
      label: 'Pending Requests', 
      value: stats?.pendingRequests || 0, 
      key: 'pendingRequests',
      icon: StatIcons.pendingRequests,
      color: '#eab308',
    },
    { 
      label: 'Weekly (km)', 
      value: Math.round(stats?.weeklyDistance || 0), 
      key: 'weeklyDistance',
      icon: StatIcons.weeklyDistance,
      color: '#10b981',
    },
  ];

  // Secondary stats (5 items) - shown when expanded
  const secondaryStats = [
    { 
      label: 'Time Invested', 
      value: `${Math.round(stats?.timeInvestedHours || 0)}h`, 
      key: 'timeInvestedHours',
      icon: StatIcons.timeInvestedHours,
      color: '#06b6d4',
    },
    { 
      label: 'Offers', 
      value: typeof stats?.offersPipeline === 'object' ? stats.offersPipeline.total : 0,
      subValue: typeof stats?.offersPipeline === 'object' ? `${stats.offersPipeline.pending} pend` : '',
      key: 'offersPipeline',
      icon: StatIcons.offersPipeline,
      color: '#22c55e',
    },
    { 
      label: 'Scope Fit', 
      value: `${Math.round((stats?.avgScopeFitScore || 0) * 100)}%`, 
      key: 'avgScopeFitScore',
      icon: StatIcons.avgScopeFitScore,
      color: '#a855f7',
    },
    { 
      label: 'Exceptions', 
      value: stats?.exceptionsCount || 0, 
      key: 'exceptionsCount',
      icon: StatIcons.exceptionsCount,
      color: '#f97316',
    },
    { 
      label: 'Recent Changes', 
      value: stats?.recentChanges || 0,
      subValue: 'Last 7d',
      key: 'recentChanges',
      icon: StatIcons.recentChanges,
      color: '#6366f1',
    },
  ];

  const displayedStats = isExpanded ? [...primaryStats, ...secondaryStats] : primaryStats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      </View>

      <View style={styles.statsHeaderContainer}>
        <Text style={styles.statsTitle}>Performance Stats</Text>
        <TouchableOpacity
          style={[styles.expandButton, isExpanded && styles.expandButtonActive]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={[styles.expandButtonText, isExpanded && styles.expandButtonTextActive]}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {displayedStats.map((stat: any) => (
          <Card key={stat.key} style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                {stat.subValue && <Text style={styles.statSubValue}>{stat.subValue}</Text>}
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Today's Tours</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTours.length > 0 ? (
            todayTours.map((tour) => (
              <View key={tour.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {tour.propertyAddress || 'Property Tour'}
                  </Text>
                  <Text style={styles.activityDate}>
                    with {tour.clientName || 'Client'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  tour.status === 'scheduled' && styles.statusscheduled,
                  tour.status === 'completed' && styles.statuscompleted,
                  tour.status === 'cancelled' && styles.statuscancelled,
                ]}>
                  <Text style={styles.statusText}>{tour.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>None left right now</Text>
          )}
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOnly.length > 0 ? (
            pendingOnly.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestItem}
                onPress={() => setSelectedRequestId(request.id)}
                activeOpacity={0.7}
              >
                <View style={styles.requestHeader}>
                  <View style={[styles.activityDot, styles.pendingDot]} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      {request.propertyAddress || 'Property Request'}
                      {(request.propertyCount ?? 0) > 1
                        ? ` +${(request.propertyCount ?? 0) - 1} more`
                        : ''}
                    </Text>
                    <Text style={styles.activityDate}>
                      from {request.clientName?.trim() || 'Client'}
                    </Text>
                  </View>
                  <Text style={styles.requestChevron}>›</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => updateRequestStatus.mutate({ requestId: request.id, status: 'approved' })}
                    disabled={updateRequestStatus.isPending}
                  >
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => updateRequestStatus.mutate({ requestId: request.id, status: 'rejected' })}
                    disabled={updateRequestStatus.isPending}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>None left right now</Text>
          )}
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Featured Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length > 0 ? (
            <>
              <View style={styles.propertiesGrid}>
                {properties.slice(0, 4).map((property) => (
                  <View key={property.id} style={styles.propertyCard}>
                    <PropertyPhotoCarousel propertyId={property.id} />
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyTitle} numberOfLines={1}>
                        {property.address}
                      </Text>
                      {property.price && (
                        <Text style={styles.propertyPrice}>
                          ${Number(property.price).toLocaleString()}
                        </Text>
                      )}
                      {(property.bedrooms !== undefined || property.bathrooms !== undefined) && (
                        <Text style={styles.propertyDetails}>
                          {property.bedrooms && `${property.bedrooms} bed`}
                          {property.bedrooms && property.bathrooms && ' • '}
                          {property.bathrooms && `${Math.round(Number(property.bathrooms))} bath`}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              {properties.length > 4 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => {
                    // Navigate to properties page
                    // This can be connected to your navigation stack
                  }}
                >
                  <Text style={styles.viewAllButtonText}>View All Properties</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No properties added yet</Text>
          )}
        </CardContent>
      </Card>

      <Card style={styles.section}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent style={styles.quickActions}>
          <View style={styles.actionButton}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Add Client</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionIcon}>🏠</Text>
            <Text style={styles.actionLabel}>Add Property</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Schedule Tour</Text>
          </View>
        </CardContent>
      </Card>

      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequestId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequestId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedRequestId(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>

            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Request Details</Text>

            {requestDetailLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#1e40af" />
              </View>
            ) : requestDetail ? (
              <>
                {/* Client */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>CLIENT</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>👤</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequestListData?.clientName?.trim() || 'Unknown Client'}
                    </Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>PREFERRED DATE & TIME</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailValue}>
                      {requestDetail.preferredDate
                        ? new Date(requestDetail.preferredDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : 'No date specified'}
                    </Text>
                  </View>
                  {requestDetail.preferredTime && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>⏰</Text>
                      <Text style={styles.detailValue}>{requestDetail.preferredTime}</Text>
                    </View>
                  )}
                </View>

                {/* Properties */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>
                    PROPERTIES ({requestDetail.properties?.length ?? 0})
                  </Text>
                  {requestDetail.properties?.length > 0 ? (
                    requestDetail.properties.map((prop, idx) => (
                      <View key={prop.id} style={styles.propertyDetailItem}>
                        <View style={styles.propertyDetailIndex}>
                          <Text style={styles.propertyDetailIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.propertyDetailInfo}>
                          <Text style={styles.propertyDetailAddress} numberOfLines={1}>
                            {prop.address}
                          </Text>
                          <Text style={styles.propertyDetailMeta}>
                            {[
                              prop.city,
                              prop.propertyType,
                              prop.bedrooms !== undefined && `${prop.bedrooms}bd`,
                              prop.bathrooms !== undefined && `${prop.bathrooms}ba`,
                              prop.price && `$${Number(prop.price).toLocaleString()}`,
                            ].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailEmpty}>No properties listed</Text>
                  )}
                </View>

                {/* Notes */}
                {requestDetail.notes ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>NOTES</Text>
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{requestDetail.notes}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Requested on */}
                {requestDetail.createdAt && (
                  <Text style={styles.requestedOn}>
                    Requested on {new Date(requestDetail.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalRejectButton}
                    onPress={() => {
                      updateRequestStatus.mutate(
                        { requestId: requestDetail.id, status: 'rejected' },
                        { onSuccess: () => setSelectedRequestId(null) }
                      );
                    }}
                    disabled={updateRequestStatus.isPending}
                  >
                    <Text style={styles.modalRejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalApproveButton}
                    onPress={() => {
                      updateRequestStatus.mutate(
                        { requestId: requestDetail.id, status: 'approved' },
                        { onSuccess: () => setSelectedRequestId(null) }
                      );
                    }}
                    disabled={updateRequestStatus.isPending}
                  >
                    {updateRequestStatus.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalApproveText}>Approve Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.detailEmpty}>Could not load request details.</Text>
            )}

          </Pressable>
        </Pressable>
      </Modal>
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
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  expandButtonActive: {
    backgroundColor: '#1e40af',
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  expandButtonTextActive: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statSubValue: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e40af',
    marginRight: 12,
  },
  pendingDot: {
    backgroundColor: '#f59e0b',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  activityDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusscheduled: {
    backgroundColor: '#dbeafe',
  },
  statuscompleted: {
    backgroundColor: '#dcfce7',
  },
  statuscancelled: {
    backgroundColor: '#fee2e2',
  },
  statuspending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  propertiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  propertyCard: {
    width: '48%',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propertyImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  propertyImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  propertyInfo: {
    padding: 8,
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  propertyDetails: {
    fontSize: 10,
    color: '#94a3b8',
  },
  viewAllButton: {
    backgroundColor: '#1e40af',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  requestItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 20,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  requestChevron: {
    fontSize: 20,
    color: '#94a3b8',
    marginLeft: 4,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  modalLoader: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 15,
    marginRight: 8,
    width: 22,
  },
  detailValue: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
  },
  propertyDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propertyDetailIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  propertyDetailIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  propertyDetailInfo: {
    flex: 1,
  },
  propertyDetailAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  propertyDetailMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  notesText: {
    fontSize: 14,
    color: '#713f12',
    lineHeight: 20,
  },
  requestedOn: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailEmpty: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalRejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  modalRejectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalApproveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalApproveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
