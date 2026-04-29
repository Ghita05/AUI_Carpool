import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

const carSizeImg     = require('../../assets/CarSizeRef.png');
const luggageSizeImg = require('../../assets/CarryOnSizeRef.jpeg');

export default function VehicleSizeGuideModal({ visible, onClose, passengerMode = false }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[s.safe, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.title}>
            {passengerMode ? 'Luggage Guide' : 'Vehicle Size Guide'}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={26} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Car size section — drivers only */}
          {!passengerMode && (
            <>
              <Text style={s.sectionTitle}>Car Size</Text>
              <Text style={s.sectionDesc}>
                Select the category that best matches your car's footprint. This helps passengers know how much space to expect.
              </Text>
              <View style={s.imageCard}>
                <Image source={carSizeImg} style={s.image} resizeMode="contain" />
              </View>
              <View style={s.table}>
                {[
                  { label: 'Small',  detail: 'Compact hatchback (e.g. Yaris, Clio)' },
                  { label: 'Medium', detail: 'Mid-size sedan or hatchback (e.g. Corolla, Logan)', highlight: true },
                  { label: 'Large',  detail: 'SUV or full-size (e.g. RAV4, Duster)' },
                ].map(row => (
                  <View key={row.label} style={[s.tableRow, row.highlight && s.tableRowHL]}>
                    <Text style={[s.tableLabel, row.highlight && s.tableLabelHL]}>{row.label}</Text>
                    <Text style={s.tableDetail}>{row.detail}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Luggage section */}
          <Text style={[s.sectionTitle, !passengerMode && { marginTop: Spacing.xl }]}>
            {passengerMode ? 'How luggage is counted' : 'Luggage Capacity'}
          </Text>
          <Text style={s.sectionDesc}>
            {passengerMode
              ? <>Each bag you declare is converted to <Text style={s.bold}>medium check-in bag equivalents</Text>. Use the reference below to know how your bag is counted.</>
              : <>Enter how many <Text style={s.bold}>medium check-in bags</Text> fit in your trunk. Use the reference below to estimate.</>
            }
          </Text>
          <View style={s.imageCard}>
            <Image source={luggageSizeImg} style={s.image} resizeMode="contain" />
          </View>
          <View style={s.table}>
            {[
              { label: 'Small',  detail: passengerMode ? '23–24 in carry-on  →  counts as ½ bag' : '23-24 in carry-on  ->  counts as 1/2' },
              { label: 'Medium', detail: passengerMode ? '25–27 in check-in  →  counts as 1 bag' : '25-27 in check-in  ->  counts as 1', highlight: true },
              { label: 'Large',  detail: passengerMode ? '28–32 in check-in  →  counts as 2 bags' : '28-32 in check-in  ->  counts as 2' },
            ].map(row => (
              <View key={row.label} style={[s.tableRow, row.highlight && s.tableRowHL]}>
                <Text style={[s.tableLabel, row.highlight && s.tableLabelHL]}>{row.label}</Text>
                <Text style={s.tableDetail}>{row.detail}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 18,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },

  scroll:       { padding: Spacing.lg },
  sectionTitle: { fontSize: Typography.xl, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary, marginBottom: 6 },
  sectionDesc:  { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  bold:         { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },

  imageCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  image: { width: '100%', height: 180 },

  table:       { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  tableRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRowHL:  { backgroundColor: Colors.primaryBg },
  tableLabel:  { width: 60, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textSecondary },
  tableLabelHL:{ color: Colors.primary },
  tableDetail: { flex: 1, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
});
