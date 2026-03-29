import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useTourCart } from '../../contexts/TourCartContext';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { Card, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { PropertyPhotoCarousel } from '../../components/PropertyPhotoCarousel';
import { Input } from '../../components/Input';
import { DatePickerModal } from '../../components/DatePickerModal';
import { useState } from 'react';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export function CartScreen() {
  const { cartItems, removeFromCart, clearCart } = useTourCart();
  const [preferredDate, setPreferredDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');

  const requestTourMutation = useMutation({
    mutationFn: async () => {
      const requestData = {
        preferredDate: preferredDate
          ? new Date(preferredDate + 'T' + (preferredTime || '10:00'))
          : null,
        preferredTime: preferredTime,
        notes: notes,
        propertyIds: cartItems.map((item) => item.id),
      };
      return apiRequest('POST', '/api/showing-requests', requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      queryClient.invalidateQueries({ queryKey: ['/api/showing-requests'] });
      const count = cartItems.length;
      clearCart();
      setPreferredDate('');
      setPreferredTime('');
      setNotes('');
      showAlert(
        'Tour Requested!',
        `Your tour request has been submitted for ${count} ${count === 1 ? 'property' : 'properties'}. Your agent will contact you to schedule.`
      );
    },
    onError: (error: any) => {
      showAlert(
        'Request Failed',
        error?.response?.data?.message || error?.message || 'Could not submit tour request'
      );
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleRequestTour = () => {
    if (cartItems.length === 0) {
      showAlert('Cart Empty', 'Please add at least one property to your tour');
      return;
    }

    requestTourMutation.mutate();
  };

  const handleRemove = (propertyId: string) => {
    removeFromCart(propertyId);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.propertyCard}>
      <CardContent style={styles.propertyContent}>
        <View style={styles.imageContainer}>
          <PropertyPhotoCarousel propertyId={item.id} height={80} showIndicators={false} />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
          <View style={styles.details}>
            <Text style={styles.detail}>{item.bedrooms} bed</Text>
            <Text style={styles.detailDivider}>•</Text>
            <Text style={styles.detail}>{item.bathrooms} bath</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item.id)}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptyText}>
          Browse properties and add them to your cart to schedule a tour
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Text style={styles.headerText}>
          {cartItems.length} {cartItems.length === 1 ? 'property' : 'properties'} in your cart
        </Text>

        <FlatList
          scrollEnabled={false}
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.schedulingSection}>
          <Text style={styles.sectionTitle}>Schedule Your Tour</Text>

          <Text style={styles.dateLabel}>Preferred Date (Optional)</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={preferredDate ? styles.dateInputValue : styles.dateInputPlaceholder}>
              {preferredDate
                ? new Date(preferredDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
                  })
                : 'Select a date'}
            </Text>
            <Text style={styles.dateInputIcon}>📅</Text>
          </TouchableOpacity>

          <Input
            label="Preferred Time (Optional)"
            placeholder="HH:MM"
            value={preferredTime}
            onChangeText={setPreferredTime}
            containerStyle={styles.inputContainer}
          />

          <Input
            label="Additional Notes (Optional)"
            placeholder="Any special requests for your agent..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            containerStyle={styles.inputContainer}
          />
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={preferredDate}
        onConfirm={(date) => { setPreferredDate(date); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
      />

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total Properties</Text>
          <Text style={styles.footerValue}>{cartItems.length}</Text>
        </View>
        <Button
          title={requestTourMutation.isPending ? 'Submitting...' : 'Request Tour'}
          onPress={handleRequestTour}
          loading={requestTourMutation.isPending}
          style={styles.submitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  headerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  propertyCard: {
    marginBottom: 12,
  },
  propertyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  propertyInfo: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  details: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailDivider: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  footerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  schedulingSection: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputValue: { fontSize: 14, color: '#1e293b', flex: 1 },
  dateInputPlaceholder: { fontSize: 14, color: '#94a3b8', flex: 1 },
  dateInputIcon: { fontSize: 16, marginLeft: 8 },
  submitButton: {
    flex: 1,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
});
