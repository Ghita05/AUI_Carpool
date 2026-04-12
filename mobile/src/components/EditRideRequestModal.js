import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from './common/Input';
import { Colors, Spacing, Radius, Typography } from '../theme';
import DateTimePickerModal from './DateTimePickerModal';
import { searchUsers } from '../services/rideService';

export default function EditRideRequestModal({ visible, onClose, onSave, request, currentUser, onCancelRequest }) {
  const [maxPrice, setMaxPrice] = useState(request?.maxPrice?.toString() || '');
  const [notes, setNotes] = useState(request?.notes || '');
  const [loading, setLoading] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [travelDateTime, setTravelDateTime] = useState(request?.travelDateTime ? new Date(request.travelDateTime) : null);
  const [dateTimeChanged, setDateTimeChanged] = useState(false);
  const [groupPassengerIds, setGroupPassengerIds] = useState(request?.groupPassengerIds || []);
  // Always include the owner in groupUsers
  const initialGroupUsers = React.useMemo(() => {
    const users = request?.groupUsers || [];
    if (request?.passenger && !users.some(u => u._id === request.passenger._id)) {
      return [request.passenger, ...users];
    }
    return users;
  }, [request]);
  const [groupUsers, setGroupUsers] = useState(initialGroupUsers);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [stops, setStops] = useState(request?.stops || []);
  const [newStop, setNewStop] = useState('');

  // Reset modal state when request changes
  React.useEffect(() => {
    setMaxPrice(request?.maxPrice?.toString() || '');
    setNotes(request?.notes || '');
    setTravelDateTime(request?.travelDateTime ? new Date(request.travelDateTime) : null);
    setDateTimeChanged(false);
    setGroupPassengerIds(request?.groupPassengerIds || []);
    setGroupUsers(request?.groupUsers || []);
    setUserSearch('');
    setUserSearchResults([]);
    setStops(request?.stops || []);
    setNewStop('');
  }, [request]);

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      maxPrice: Number(maxPrice),
      notes,
      stops,
    };
    // Only send travelDateTime if the user explicitly changed it
    if (dateTimeChanged && travelDateTime) {
      payload.travelDateTime = travelDateTime.toISOString();
    }
    // Only send group fields for group requests
    if (groupUsers.length > 0) {
      payload.groupPassengerIds = groupUsers.map(u => u._id);
      payload.passengerCount = groupUsers.length;
    }
    await onSave(payload);
    setLoading(false);
  };


  // Only allow group member editing if group request (more than 1 member)
  const isGroupRequest = (request?.groupPassengerIds?.length || 0) > 1;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Edit Ride Request</Text>
          <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Date & Time Picker */}
          <TouchableOpacity
            style={{ marginBottom: Spacing.md, padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => setShowDateTimePicker(true)}
          >
            <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
              {travelDateTime
                ? `${travelDateTime.toLocaleDateString()} ${travelDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Select Date & Time'}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            visible={showDateTimePicker}
            date={travelDateTime}
            time={travelDateTime ? travelDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00'}
            onClose={() => setShowDateTimePicker(false)}
            onConfirm={(selectedDate, selectedTime) => {
              setTravelDateTime(new Date(selectedDate));
              setDateTimeChanged(true);
              setShowDateTimePicker(false);
            }}
          />

          {/* Group Members Section */}
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.md, marginBottom: 6, color: Colors.textPrimary }}>Group Members</Text>
          {/* Always show chips for added users */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {groupUsers.length === 0 && (
              <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>No group members yet.</Text>
            )}
            {groupUsers.map(u => (
              <View key={u._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginBottom: 4 }}>
                <Text style={{ color: Colors.primary, fontSize: 13 }}>{u.firstName} {u.lastName}{currentUser && u._id === currentUser._id ? ' (You)' : ''}</Text>
                {/* View-only: no remove button */}
              </View>
            ))}
          </View>

          {/* Only allow adding users if group request */}
          {isGroupRequest ? (
            <>
              <TextInput
                style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, marginBottom: 6, fontSize: 15 }}
                value={userSearch}
                onChangeText={async (txt) => {
                  setUserSearch(txt);
                  if (txt.length >= 2) {
                    setUserSearchLoading(true);
                    try {
                      const res = await searchUsers(txt);
                      setUserSearchResults(res.users.filter(u => !groupUsers.some(g => g._id === u._id) && (!currentUser || u._id !== currentUser._id)));
                    } catch { setUserSearchResults([]); }
                    setUserSearchLoading(false);
                  } else {
                    setUserSearchResults([]);
                  }
                }}
                placeholder="Search by name or email"
                placeholderTextColor={Colors.textDisabled}
              />
              {userSearchLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: 6 }} />}
              {userSearchResults.length > 0 && (
                <View style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: 6 }}>
                  {userSearchResults.map(u => (
                    <TouchableOpacity
                      key={u._id}
                      style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: groupUsers.some(g => g._id === u._id) || (currentUser && u._id === currentUser._id) ? 0.5 : 1 }}
                      disabled={groupUsers.some(g => g._id === u._id) || (currentUser && u._id === currentUser._id)}
                      onPress={() => {
                        if (!groupUsers.some(g => g._id === u._id) && (!currentUser || u._id !== currentUser._id)) {
                          setGroupUsers([...groupUsers, u]);
                          setUserSearch('');
                          setUserSearchResults([]);
                        }
                      }}
                    >
                      <Text style={{ fontSize: 15, color: Colors.textPrimary }}>{u.firstName} {u.lastName} <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>({u.email})</Text></Text>
                      {groupUsers.some(g => g._id === u._id) && <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>(Added)</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 8 }}>To add group members, this must be a group request (more than 1 member).</Text>
          )}

          {/* Stops Section */}
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.md, marginBottom: 6, color: Colors.textPrimary }}>Stops (Optional)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: stops.length ? 8 : 0 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 15, color: Colors.textPrimary }}
              value={newStop}
              onChangeText={setNewStop}
              placeholder="Add a stop along the way"
              placeholderTextColor={Colors.textDisabled}
            />
            <TouchableOpacity
              style={{ height: 42, width: 42, backgroundColor: Colors.primary, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { const s = newStop.trim(); if (s && !stops.includes(s)) { setStops([...stops, s]); setNewStop(''); } }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {stops.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {stops.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
                  <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{s}</Text>
                  <TouchableOpacity onPress={() => setStops(stops.filter((_, j) => j !== i))} style={{ marginLeft: 6 }}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Input
            label="Max Price (MAD)"
            keyboardType="numeric"
            value={maxPrice}
            onChangeText={setMaxPrice}
            style={{ marginBottom: Spacing.md }}
          />
          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ marginBottom: Spacing.md }}
          />
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: Spacing.md }}>
            {/* Robust owner check for cancel button: allow if currentUser is the owner (by _id or passenger._id) */}
            {onCancelRequest && currentUser && (
              ((request?.passengerId && request.passengerId === currentUser._id) ||
               (request?.passenger && request.passenger._id === currentUser._id)) && (
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1, backgroundColor: Colors.error, opacity: loading ? 0.7 : 1 }]} 
                  onPress={async () => {
                    setLoading(true);
                    try {
                      await onCancelRequest(request);
                      onClose();
                    } catch (err) {
                      alert(err?.response?.data?.message || err?.message || 'Failed to cancel request.');
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.saveText}>{loading ? 'Cancelling...' : 'Cancel Request'}</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSave} disabled={loading}>
              <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    elevation: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: Typography.xl,
    marginBottom: Spacing.lg,
    color: Colors.textPrimary,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
    backgroundColor: Colors.divider,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.md,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  saveText: {
    color: Colors.textWhite,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: Typography.md,
  },
});
