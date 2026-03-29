import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { DatePickerModal } from '../../components/DatePickerModal';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientType: string;
}

interface ClientGroup {
  id: string;
  name: string;
  createdById: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  imageUrl?: string;
}

interface SelectedProperty extends Property {
  scheduledTime: string;
  estimatedDuration: number;
}

const STEPS = [
  { id: 1, title: 'Client', description: 'Select client or group' },
  { id: 2, title: 'Properties', description: 'Choose properties' },
  { id: 3, title: 'Schedule', description: 'Date & time' },
  { id: 4, title: 'Review', description: 'Confirm & create' },
];

export function CreateTourScreen() {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<SelectedProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: clientGroups = [] } = useQuery<ClientGroup[]>({
    queryKey: ['/api/client-groups'],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
  const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

  const createTourMutation = useMutation({
    mutationFn: async () => {
      const time = isValidTime(startTime) ? startTime : '09:00';
      const dateTimeStr = scheduledDate + 'T' + time;
      const clientId = selectedClient?.id || null;
      const groupId = selectedGroup?.id || null;

      const tourData = {
        clientId,
        groupId,
        scheduledDate: new Date(dateTimeStr).toISOString(),
        startTime: new Date(dateTimeStr).toISOString(),
        notes: notes || null,
        properties: selectedProperties.map((prop, index) => ({
          propertyId: prop.id,
          order: index + 1,
          scheduledTime: prop.scheduledTime && isValidTime(prop.scheduledTime)
            ? new Date(scheduledDate + 'T' + prop.scheduledTime).toISOString()
            : null,
        })),
      };
      return apiRequest('POST', '/api/tours', tourData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      const name = selectedClient
        ? `${selectedClient.firstName} ${selectedClient.lastName}`
        : selectedGroup?.name || 'the group';
      Alert.alert(
        'Tour Created',
        `Tour scheduled for ${name}`,
        [{
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main' as any);
            }
          },
        }]
      );
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      console.log('Tour creation error:', JSON.stringify(error?.response?.data))
      if (status === 409) {
        const duplicateId = error?.response?.data?.duplicateTourId;
        const buttons: any[] = [{ text: 'Change Details', style: 'cancel' }];
        if (duplicateId) {
          buttons.push({
            text: 'View Existing Tour',
            onPress: () => {
              navigation.goBack();
              navigation.navigate('TourDetail' as any, { tourId: duplicateId });
            },
          });
        }
        Alert.alert(
          'Tour Already Exists',
          'A tour with the same client, date, and properties already exists. Would you like to view it or change your selections?',
          buttons
        );
      } else {
        const msg = error?.response?.data?.message || error?.message || 'Failed to create tour. Please try again.';
        Alert.alert('Error', msg);
      }
    },
  });

  const filteredClients = clients.filter((c) =>
    clientSearch === '' ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProperties = properties.filter((p) =>
    searchQuery === '' ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.propertyType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPropertySelected = (id: string) => selectedProperties.some((p) => p.id === id);

  const toggleProperty = (property: Property) => {
    if (isPropertySelected(property.id)) {
      setSelectedProperties((prev) => prev.filter((p) => p.id !== property.id));
    } else {
      setSelectedProperties((prev) => [
        ...prev,
        { ...property, scheduledTime: '', estimatedDuration: 30 },
      ]);
    }
  };

  const updatePropertyTime = (propertyId: string, time: string) => {
    setSelectedProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, scheduledTime: time } : p))
    );
  };

  const updatePropertyDuration = (propertyId: string, duration: number) => {
    setSelectedProperties((prev) =>
      prev.map((p) => (p.id === propertyId ? { ...p, estimatedDuration: duration } : p))
    );
  };

  const removeProperty = (propertyId: string) => {
    setSelectedProperties((prev) => prev.filter((p) => p.id !== propertyId));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedClient || !!selectedGroup;
      case 2:
        return selectedProperties.length > 0;
      case 3:
        return isValidDate(scheduledDate);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreate = () => {
    if ((!selectedClient && !selectedGroup) || selectedProperties.length === 0 || !isValidDate(scheduledDate)) {
      Alert.alert('Missing Information', 'Please complete all required fields with valid values.');
      return;
    }
    createTourMutation.mutate();
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step) => (
        <View key={step.id} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step.id < currentStep && styles.stepCompleted,
              step.id === currentStep && styles.stepActive,
            ]}
          >
            {step.id < currentStep ? (
              <Text style={styles.stepCheckmark}>✓</Text>
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  step.id === currentStep && styles.stepNumberActive,
                ]}
              >
                {step.id}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepTitle,
              step.id === currentStep && styles.stepTitleActive,
            ]}
            numberOfLines={1}
          >
            {step.title}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <View style={styles.stepHeader}>
        <Text style={styles.stepHeaderIcon}>👥</Text>
        <Text style={styles.stepHeaderTitle}>Select Client or Group</Text>
        <Text style={styles.stepHeaderSubtitle}>Choose who this tour is for</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search clients..."
        value={clientSearch}
        onChangeText={setClientSearch}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.sectionLabel}>Individual Clients</Text>
      {clientsLoading ? (
        <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 20 }} />
      ) : filteredClients.length === 0 ? (
        <Text style={styles.emptyText}>No clients found</Text>
      ) : (
        filteredClients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={[
              styles.selectCard,
              selectedClient?.id === client.id && styles.selectCardActive,
            ]}
            onPress={() => {
              setSelectedClient(client);
              setSelectedGroup(null);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.selectCardContent}>
              <View style={styles.selectCardInfo}>
                <Text style={styles.selectCardTitle}>
                  {client.firstName} {client.lastName}
                </Text>
                <Text style={styles.selectCardSubtitle}>{client.email}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{client.clientType || 'buyer'}</Text>
                </View>
              </View>
              {selectedClient?.id === client.id && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}

      {clientGroups.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Client Groups</Text>
          {clientGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.selectCard,
                selectedGroup?.id === group.id && styles.selectCardActive,
              ]}
              onPress={() => {
                setSelectedGroup(group);
                setSelectedClient(null);
              }}
            >
              <View style={styles.selectCardContent}>
                <View style={styles.selectCardInfo}>
                  <Text style={styles.selectCardTitle}>{group.name}</Text>
                  <Text style={styles.selectCardSubtitle}>Group Tour</Text>
                </View>
                {selectedGroup?.id === group.id && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <View style={styles.stepHeader}>
        <Text style={styles.stepHeaderIcon}>🏠</Text>
        <Text style={styles.stepHeaderTitle}>Select Properties</Text>
        <Text style={styles.stepHeaderSubtitle}>Choose properties for the tour</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by address, city, or type..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#94a3b8"
      />

      {propertiesLoading ? (
        <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 20 }} />
      ) : filteredProperties.length === 0 ? (
        <Text style={styles.emptyText}>No properties found</Text>
      ) : (
        filteredProperties.map((property) => {
          const selected = isPropertySelected(property.id);
          return (
            <TouchableOpacity
              key={property.id}
              style={[styles.selectCard, selected && styles.selectCardActive]}
              onPress={() => toggleProperty(property)}
            >
              <View style={styles.selectCardContent}>
                <View style={styles.selectCardInfo}>
                  <Text style={styles.selectCardTitle} numberOfLines={1}>
                    {property.address}
                  </Text>
                  <Text style={styles.selectCardSubtitle}>
                    {property.city}, {property.province}
                  </Text>
                  <View style={styles.propertyMeta}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{property.propertyType}</Text>
                    </View>
                    <Text style={styles.propertySpecs}>
                      {property.bedrooms}br / {property.bathrooms}ba
                    </Text>
                    <Text style={styles.propertyPrice}>
                      ${Number(property.price).toLocaleString()}
                    </Text>
                  </View>
                </View>
                {selected && <Text style={styles.checkIcon}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {selectedProperties.length > 0 && (
        <View style={styles.selectedSummary}>
          <Text style={styles.selectedSummaryText}>
            {selectedProperties.length} {selectedProperties.length === 1 ? 'property' : 'properties'} selected
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <View style={styles.stepHeader}>
        <Text style={styles.stepHeaderIcon}>📅</Text>
        <Text style={styles.stepHeaderTitle}>Schedule & Time</Text>
        <Text style={styles.stepHeaderSubtitle}>Set tour date and times for each property</Text>
      </View>

      <Card style={styles.formCard}>
        <CardContent>
          <Text style={styles.inputLabel}>Tour Date *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={scheduledDate ? styles.dateInputValue : styles.dateInputPlaceholder}>
              {scheduledDate
                ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                  })
                : 'Select a date'}
            </Text>
            <Text style={styles.dateInputIcon}>📅</Text>
          </TouchableOpacity>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Start Time</Text>
          <TextInput
            style={styles.formInput}
            placeholder="HH:MM (e.g. 09:00)"
            value={startTime}
            onChangeText={setStartTime}
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            placeholder="Any special instructions or notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />
        </CardContent>
      </Card>

      {selectedProperties.length > 0 && (
        <Card style={[styles.formCard, { marginTop: 16 }]}>
          <CardHeader>
            <CardTitle>Property Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProperties.map((property, index) => (
              <View key={property.id} style={styles.propertyScheduleItem}>
                <View style={styles.propertyScheduleHeader}>
                  <Text style={styles.propertyScheduleNumber}>#{index + 1}</Text>
                  <Text style={styles.propertyScheduleAddress} numberOfLines={1}>
                    {property.address}
                  </Text>
                  <TouchableOpacity onPress={() => removeProperty(property.id)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.propertyScheduleFields}>
                  <View style={styles.scheduleField}>
                    <Text style={styles.scheduleFieldLabel}>Time</Text>
                    <TextInput
                      style={styles.scheduleFieldInput}
                      placeholder="HH:MM"
                      value={property.scheduledTime}
                      onChangeText={(t) => updatePropertyTime(property.id, t)}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.scheduleField}>
                    <Text style={styles.scheduleFieldLabel}>Duration (min)</Text>
                    <TextInput
                      style={styles.scheduleFieldInput}
                      placeholder="30"
                      value={String(property.estimatedDuration)}
                      onChangeText={(d) => updatePropertyDuration(property.id, parseInt(d) || 30)}
                      keyboardType="number-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View>
      <View style={styles.stepHeader}>
        <Text style={styles.stepHeaderIcon}>✅</Text>
        <Text style={styles.stepHeaderTitle}>Review & Create</Text>
        <Text style={styles.stepHeaderSubtitle}>Confirm all details before creating the tour</Text>
      </View>

      <Card style={styles.formCard}>
        <CardHeader>
          <CardTitle>Tour Details</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Client</Text>
            <Text style={styles.reviewValue}>
              {selectedClient
                ? `${selectedClient.firstName} ${selectedClient.lastName}`
                : selectedGroup?.name || '-'}
            </Text>
          </View>
          {selectedClient && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Type</Text>
              <Text style={styles.reviewValue}>{selectedClient.clientType || 'buyer'}</Text>
            </View>
          )}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Date</Text>
            <Text style={styles.reviewValue}>{scheduledDate || '-'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Start Time</Text>
            <Text style={styles.reviewValue}>{startTime || 'Not set'}</Text>
          </View>
          {notes ? (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Notes</Text>
              <Text style={styles.reviewValue}>{notes}</Text>
            </View>
          ) : null}
        </CardContent>
      </Card>

      <Card style={[styles.formCard, { marginTop: 16 }]}>
        <CardHeader>
          <CardTitle>Properties ({selectedProperties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedProperties.map((property, index) => (
            <View key={property.id} style={styles.reviewPropertyItem}>
              <View style={styles.reviewPropertyHeader}>
                <Text style={styles.reviewPropertyNumber}>#{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewPropertyAddress} numberOfLines={1}>
                    {property.address}
                  </Text>
                  <Text style={styles.reviewPropertyDetails}>
                    {property.city} · {property.bedrooms}br/{property.bathrooms}ba · $
                    {Number(property.price).toLocaleString()}
                  </Text>
                </View>
              </View>
              {property.scheduledTime ? (
                <Text style={styles.reviewPropertyTime}>
                  {property.scheduledTime} · {property.estimatedDuration}min
                </Text>
              ) : null}
            </View>
          ))}
        </CardContent>
      </Card>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderStepIndicator()}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {currentStep < 4 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.createButton, createTourMutation.isPending && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={createTourMutation.isPending}
          >
            {createTourMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Tour</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <DatePickerModal
        visible={showDatePicker}
        value={scheduledDate}
        onConfirm={(date) => { setScheduledDate(date); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
  },
  stepCompleted: { backgroundColor: '#16a34a' },
  stepActive: { backgroundColor: '#1e40af' },
  stepCheckmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stepNumber: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  stepNumberActive: { color: '#fff' },
  stepTitle: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  stepTitleActive: { color: '#1e40af', fontWeight: '600' },
  stepHeader: { alignItems: 'center', marginBottom: 20 },
  stepHeaderIcon: { fontSize: 40, marginBottom: 8 },
  stepHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  stepHeaderSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b', marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8, marginLeft: 4,
  },
  selectCard: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  selectCardActive: { borderColor: '#1e40af', backgroundColor: '#eff6ff' },
  selectCardContent: { flexDirection: 'row', alignItems: 'center' },
  selectCardInfo: { flex: 1 },
  selectCardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  selectCardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  typeBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start', marginTop: 6,
  },
  typeBadgeText: { fontSize: 11, color: '#475569', fontWeight: '500', textTransform: 'capitalize' },
  checkIcon: { fontSize: 20, color: '#1e40af', fontWeight: '700', marginLeft: 12 },
  propertyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  propertySpecs: { fontSize: 12, color: '#64748b' },
  propertyPrice: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  selectedSummary: {
    backgroundColor: '#eff6ff', padding: 12, borderRadius: 10, marginTop: 8, alignItems: 'center',
  },
  selectedSummaryText: { fontSize: 14, fontWeight: '600', color: '#1e40af' },
  formCard: { marginTop: 0 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  formInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b',
  },
  dateInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  dateInputValue: { fontSize: 14, color: '#1e293b', flex: 1 },
  dateInputPlaceholder: { fontSize: 14, color: '#94a3b8', flex: 1 },
  dateInputIcon: { fontSize: 16, marginLeft: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  propertyScheduleItem: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  propertyScheduleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  propertyScheduleNumber: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginRight: 8 },
  propertyScheduleAddress: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1e293b' },
  removeButton: { fontSize: 18, color: '#ef4444', fontWeight: '600', paddingLeft: 8 },
  propertyScheduleFields: { flexDirection: 'row', gap: 12 },
  scheduleField: { flex: 1 },
  scheduleFieldLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  scheduleFieldInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b',
  },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  reviewLabel: { fontSize: 14, color: '#64748b' },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', textAlign: 'right', flex: 1, marginLeft: 16 },
  reviewPropertyItem: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  reviewPropertyHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewPropertyNumber: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginRight: 10 },
  reviewPropertyAddress: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  reviewPropertyDetails: { fontSize: 12, color: '#64748b', marginTop: 2 },
  reviewPropertyTime: { fontSize: 12, color: '#1e40af', marginTop: 6, fontWeight: '500' },
  footer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  backButton: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  backButtonText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  nextButton: {
    backgroundColor: '#1e40af', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  nextButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  createButton: {
    backgroundColor: '#16a34a', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 20 },
});
