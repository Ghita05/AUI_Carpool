import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Share, Alert, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getRideDetails, cancelRide, modifyRide, markAttendance, getAttendance, completeRide, getPassengerList } from '../../services/rideService';
import { getUserReviews } from '../../services/reviewService';
import { getCurrentBookings } from '../../services/bookingService';
import DateTimePickerModal from '../../components/DateTimePickerModal';
import StopRequestsModal from '../../components/StopRequestsModal';
// Decode Google's encoded polyline format into [{latitude, longitude}] array
// for the Polyline component. Inline implementation avoids adding a dependency.
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// Better time formatter that allows natural editing
function formatTime(raw) {
  // Strip all non-digits
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  
  // Insert colon after 2 digits
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  
  // Clamp values
  const hhClamped = Math.min(parseInt(hh, 10), 23);
  const mmClamped = Math.min(parseInt(mm, 10), 59);
  
  return `${String(hhClamped).padStart(2, '0')}:${String(mmClamped).padStart(2, '0')}`;
}

// Smart time input handler - allows free typing but enforces constraints
function handleSmartTimeInput(input, setTime) {
  // Strip non-digits and limit to 4
  let digits = input.replace(/\D/g, '').slice(0, 4);
  
  // If user is typing, show raw digits (no colon yet)
  if (digits.length <= 2) {
    setTime(digits);
    return;
  }
  
  // Once they have 3+ digits, start enforcing constraints
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  
  // Clamp hours to 0-23
  const hhClamped = Math.min(parseInt(hh, 10), 23);
  const hourStr = String(hhClamped).padStart(2, '0');
  
  // If they haven't finished typing minutes yet, show with colon but unclamped minutes
  if (digits.length < 4) {
    setTime(hourStr + ':' + mm);
    return;
  }
  
  // They've typed 4 digits - clamp minutes to 0-59
  const mmClamped = Math.min(parseInt(mm, 10), 59);
  const minStr = String(mmClamped).padStart(2, '0');
  setTime(hourStr + ':' + minStr);
}

function Card({children,style}){return <View style={[st.card,style]}>{children}</View>;}

const getInitials = (u) => u ? ((u.firstName?.[0]||'')+(u.lastName?.[0]||'')).toUpperCase() : '??';
const getName = (u) => u ? `${u.firstName||''} ${u.lastName||''}`.trim() : 'Unknown';

function DriverProfileModal({visible,ride,driver,onClose}){
  const [reviews,setReviews]=useState([]);
  const [loadingR,setLoadingR]=useState(true);
  const [gender, setGender] = useState('All');
  useEffect(()=>{
    if(visible&&driver?._id){
      setLoadingR(true);
      getUserReviews(driver._id).then(r=>setReviews(r.data?.reviews||[])).catch(()=>{}).finally(()=>setLoadingR(false));
    }
  },[visible,driver]);

  if(!driver)return null;
  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.profileModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Driver Profile</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={st.profHeader}><View style={st.profAvatar}><Text style={st.profAvatarText}>{getInitials(driver)}</Text></View><View><Text style={st.profName}>{getName(driver)}</Text><Text style={st.profRole}>Student · Driver</Text></View></View>
          <View style={st.profStats}><View style={st.profStat}><Text style={st.profBig}>{driver.totalCompletedRides||0}</Text><Text style={st.profLabel}>Rides</Text></View><View style={st.profStat}><Text style={st.profBig}>{driver.averageRating||0}</Text><Text style={st.profLabel}>Rating</Text></View><View style={st.profStat}><Text style={st.profBig}>{driver.cancellationCount||0}</Text><Text style={st.profLabel}>Cancel</Text></View></View>
          <Text style={st.sectionLabel}>Preferences</Text>
          <View style={{flexDirection:'row',gap:8,marginBottom:Spacing.lg}}>
            {driver.smokingPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={12} color={Colors.primary}/><Text style={st.prefChipText}>{driver.smokingPreference}</Text></View>}
            {driver.drivingStyle&&<View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>{driver.drivingStyle}</Text></View>}
            {ride.genderPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={12} color={Colors.primary}/><Text style={st.prefChipText}>{ride.genderPreference}</Text></View>}
          </View>
          <Text style={st.sectionLabel}>Reviews ({reviews.length})</Text>
          {loadingR?<ActivityIndicator color={Colors.primary}/>:reviews.length===0?<Text style={{color:Colors.textSecondary,fontSize:13}}>No reviews yet</Text>:
          reviews.map((r,i)=>{
            const author=r.authorId||{};
            return(
            <View key={r._id||i} style={st.reviewCard}>
              <View style={st.reviewTop}><View style={st.reviewAvatar}><Text style={{fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>{getInitials(author)}</Text></View><View style={{flex:1}}><Text style={st.reviewName}>{getName(author)}</Text><View style={{flexDirection:'row',gap:2,marginTop:2}}>{[1,2,3,4,5].map(s=><Ionicons key={s} name={s<=r.rating?'star':'star-outline'} size={11} color={s<=r.rating?'#F59E0B':Colors.border}/>)}</View></View><Text style={{fontSize:10,color:Colors.textSecondary}}>{new Date(r.date).toLocaleDateString()}</Text></View>
              <Text style={st.reviewText}>{r.content}</Text>
            </View>);
          })}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function ManagePassengersModal({visible,rideId,totalSeats,onClose}){
  const [passengers,setPassengers]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(visible&&rideId){
      setLoading(true);
      getPassengerList(rideId).then(r=>setPassengers(r.data?.passengers||[])).catch(()=>{}).finally(()=>setLoading(false));
    }
  },[visible,rideId]);

  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.manageModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Manage Passengers</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <Text style={{fontSize:Typography.sm,color:Colors.textSecondary,marginBottom:Spacing.md}}>{passengers.length} of {totalSeats||4} seats booked</Text>
        {loading?<ActivityIndicator color={Colors.primary}/>:passengers.length===0?<Text style={{color:Colors.textSecondary}}>No passengers yet</Text>:
        passengers.map((p,i)=>{
          const pax=p.passenger||{};
          return(
          <View key={p.booking?._id||i} style={st.paxRow}>
            <View style={st.paxAvatar}><Text style={{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>{getInitials(pax)}</Text></View>
            <View style={{flex:1}}><Text style={st.paxName}>{getName(pax)}</Text><Text style={{fontSize:11,color:Colors.textSecondary}}>{p.booking?.seatsCount||1} seat(s) · {p.booking?.luggageDeclaration||'No luggage'}</Text></View>
          </View>);
        })}
      </View></View>
    </Modal>
  );
}

function ManageRideModal({visible,ride,onClose,onUpdated}){
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');
  const [gender, setGender] = useState('All');
  const [saving, setSaving] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [departureDateTime, setDepartureDateTime] = useState(null);
  const [rideStops, setRideStops] = useState([]);
  const [newStop, setNewStop] = useState('');

  useEffect(() => {
    if (visible && ride) {
      setPrice(String(ride.pricePerSeat));
      setSeats(String(ride.totalSeats));
      setGender(ride.genderPreference || 'All');
      setDepartureDateTime(ride.departureDateTime);
      setRideStops(ride.stops || []);
      setNewStop('');
    }
  }, [visible, ride]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      // Only allow seats, gender, and time to be changed
      const parsedSeats = parseInt(seats, 10);
      if (seats && !isNaN(parsedSeats) && parsedSeats > 0 && parsedSeats !== ride.totalSeats) {
        updates.totalSeats = parsedSeats;
      }
      if (gender !== (ride.genderPreference || 'All')) updates.genderPreference = gender;
      if (departureDateTime && departureDateTime !== ride.departureDateTime) {
        updates.departureDateTime = departureDateTime;
      }
      const origStops = ride.stops || [];
      if (JSON.stringify(rideStops) !== JSON.stringify(origStops)) {
        updates.stops = rideStops;
      }
      if (Object.keys(updates).length === 0) {
        Alert.alert('No Changes', 'Nothing was changed.');
        onClose();
        return;
      }
      await modifyRide(ride._id, updates);
      Alert.alert('Saved', 'Ride has been updated.');
      onUpdated();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update ride');
    } finally {
      setSaving(false);
    }
  };

  if (!ride) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOv} behavior="padding" keyboardVerticalOffset={50}>
        <View style={st.manageModal}>
          <View style={st.modalH}>
            <Text style={st.modalTitle}>Manage Ride</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary}/>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: Spacing.xl}}>
            {/* Read-only route — immutable post-posting */}
            <Text style={st.mngSectionLabel}>ROUTE</Text>
            <Text style={st.mngHint}>Route cannot be changed after posting</Text>
            <View style={st.mngReadonlyRow}>
              <View style={[st.routeDotSm, {backgroundColor: Colors.primary}]}/>
              <Text style={st.mngReadonlyText}>{ride.departureLocation}</Text>
            </View>
            <View style={st.mngReadonlyRow}>
              <View style={[st.routeDotSm, {backgroundColor: Colors.error}]}/>
              <Text style={st.mngReadonlyText}>{ride.destination}</Text>
            </View>

            <View style={st.mngDivider}/>

            {/* Editable fields */}
            <Text style={st.mngSectionLabel}>EDITABLE DETAILS</Text>

            <Text style={st.mngLabel}>Departure Date & Time</Text>
            <TouchableOpacity style={st.mngDateTimeButton} onPress={() => setShowDateTimePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{marginRight: 8}}/>
              <View style={{flex: 1}}>
                <Text style={st.mngDateTimeValue}>
                  {new Date(departureDateTime).toLocaleDateString()} {new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/>
            </TouchableOpacity>


            <Text style={st.mngLabel}>Price per Seat (MAD)</Text>
            <View style={st.mngInputRow} pointerEvents="none">
              <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} style={{marginRight: 8}}/>
              <TextInput
                style={[st.mngInputField, {color: Colors.textDisabled}]}
                value={price}
                editable={false}
                selectTextOnFocus={false}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <Text style={st.mngLabel}>Seats</Text>
            <View style={st.mngInputRow}>
              <Ionicons name="people-outline" size={16} color={Colors.textSecondary} style={{marginRight: 8}}/>
              <TextInput
                style={st.mngInputField}
                value={seats}
                onChangeText={setSeats}
                keyboardType="numeric"
                placeholder="Number of seats"
              />
            </View>

            <Text style={st.mngLabel}>Gender Preference</Text>
            <View style={{flexDirection:'row', gap: 8, marginBottom: Spacing.lg}}>
              {['All', 'Women-Only'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[st.genderPill, gender === opt && st.genderPillActive]}
                  onPress={() => setGender(opt)}
                >
                  <Text style={[st.genderPillText, gender === opt && st.genderPillTextActive]}>
                    {opt === 'All' ? 'All Genders' : 'Women Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.mngLabel}>Stops</Text>
            <View style={{flexDirection:'row', gap: 8, marginBottom: rideStops.length ? 8 : Spacing.lg}}>
              <TextInput
                style={[st.mngInputRow, {flex:1}]}
                value={newStop}
                onChangeText={setNewStop}
                placeholder="Add a stop"
                placeholderTextColor={Colors.textDisabled}
              />
              <TouchableOpacity
                style={{height:46,width:46,backgroundColor:Colors.primary,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'}}
                onPress={()=>{
                  const s=newStop.trim();
                  if(s&&!rideStops.includes(s)){setRideStops([...rideStops,s]);setNewStop('');}
                }}
              >
                <Ionicons name="add" size={20} color={Colors.textWhite}/>
              </TouchableOpacity>
            </View>
            {rideStops.length>0&&(
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:Spacing.lg}}>
                {rideStops.map((s,i)=>(
                  <View key={i} style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:10,paddingVertical:4,borderRadius:16}}>
                    <Text style={{color:Colors.primary,fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold'}}>{s}</Text>
                    <TouchableOpacity onPress={()=>setRideStops(rideStops.filter((_,j)=>j!==i))} style={{marginLeft:6}}>
                      <Ionicons name="close-circle" size={14} color={Colors.error}/>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{flexDirection:'row', gap: 10, marginTop: Spacing.sm}}>
              <TouchableOpacity style={st.saveRideBtn} onPress={handleSave} disabled={saving}>
                <Text style={st.saveRideBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <DateTimePickerModal 
        visible={showDateTimePicker} 
        date={departureDateTime}
        time={departureDateTime ? new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false}) : '09:00'}
        onClose={() => setShowDateTimePicker(false)}
        onConfirm={(isoDateTime, timeStr) => setDepartureDateTime(isoDateTime)}
      />
    </Modal>
  );
}

function CancelRideModal({visible, ride, onClose, onCancelledAndBack}) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setCancellationReason('');
  }, [visible]);

  const handleCancel = async () => {
    const now = new Date();
    const departureTime = new Date(ride.departureDateTime);
    const timeToDeparture = departureTime - now;
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (timeToDeparture < twoHoursInMs) {
      Alert.alert('Cannot Cancel', 'You cannot cancel a ride within 2 hours of departure.');
      return;
    }
    if (!cancellationReason.trim()) {
      Alert.alert('Reason Required', "Please tell passengers why you're cancelling this ride.");
      return;
    }

    Alert.alert(
      'Cancel Ride',
      'Are you sure? All confirmed passengers will be notified and their bookings cancelled.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Ride', style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelRide(ride._id, cancellationReason);
              onClose();
              Alert.alert('Ride Cancelled', 'All passengers have been notified.', [
                { text: 'OK', onPress: onCancelledAndBack },
              ]);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to cancel ride');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!ride) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOv} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.manageModal, {maxHeight: '50%'}]}>
          <View style={st.modalH}>
            <Text style={st.modalTitle}>Cancel Ride</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary}/>
            </TouchableOpacity>
          </View>

          <Text style={{fontSize:13,color:Colors.textSecondary,marginBottom:Spacing.md,lineHeight:18}}>
            Cancelling will notify all confirmed passengers and refund their bookings.
          </Text>

          <Text style={st.mngLabel}>Cancellation Reason</Text>
          <TextInput
            style={[st.mngInputRow, {height: 90, paddingVertical: Spacing.md, textAlignVertical: 'top'}]}
            value={cancellationReason}
            onChangeText={setCancellationReason}
            placeholder="Tell passengers why you're cancelling..."
            placeholderTextColor={Colors.textDisabled}
            multiline
            numberOfLines={4}
          />

          <View style={{flexDirection:'row', gap: 10, marginTop: Spacing.lg}}>
            <TouchableOpacity style={[st.cancelRideBtn, {flex:1}]} onPress={handleCancel} disabled={loading}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.error}/>
              <Text style={st.cancelRideBtnText}>{loading ? 'Cancelling…' : 'Cancel Ride'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── RouteMapModal ─────────────────────────────────────────────────────────────
// Full-screen MapView. When the ride is OnGoing it also renders live member
// markers from the memberPositions map so every participant can see each other.
// Falls back gracefully when no polyline stored (Maps unavailable at post time).
function RouteMapModal({ visible, ride, onClose, memberPositions = {}, liveEta, isOnGoing }) {
  if (!ride) return null;
  const hasPolyline = !!ride.route?.polyline;
  const routeCoords = hasPolyline ? decodePolyline(ride.route.polyline) : [];

  const origin = ride.route?.originLatitude
    ? { latitude: ride.route.originLatitude, longitude: ride.route.originLongitude }
    : null;
  const dest = ride.route?.destinationLatitude
    ? { latitude: ride.route.destinationLatitude, longitude: ride.route.destinationLongitude }
    : null;

  const region = origin && dest ? {
    latitude:       (origin.latitude  + dest.latitude)  / 2,
    longitude:      (origin.longitude + dest.longitude) / 2,
    latitudeDelta:  Math.abs(origin.latitude  - dest.latitude)  * 1.6 + 0.05,
    longitudeDelta: Math.abs(origin.longitude - dest.longitude) * 1.6 + 0.05,
  } : null;

  const liveMembers = Object.entries(memberPositions);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#fff', paddingHorizontal: Spacing.lg, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            style={{ marginRight: 14 }}
          >
            <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary }}>
            {isOnGoing ? 'Live Tracking' : 'Full Route'}
          </Text>
        </View>

        {/* Live ETA strip shown when ride is in progress */}
        {isOnGoing && liveEta && (
          <View style={{ backgroundColor: Colors.primary, paddingVertical: 6, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={14} color="#fff"/>
            <Text style={{ color: '#fff', fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              Estimated arrival in ~{liveEta} min
            </Text>
          </View>
        )}

        {region ? (
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            showsCompass={false}
            showsUserLocation={true}      // show the device's own blue dot
            followsUserLocation={isOnGoing} // auto-pan to user when tracking
          >
            {/* Origin marker */}
            {origin && <Marker coordinate={origin} title={ride.departureLocation} pinColor={Colors.primary}/>}

            {/* Destination marker */}
            {dest && <Marker coordinate={dest} title={ride.destination} pinColor="#E53935"/>}

            {/* Route polyline */}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={Colors.primary}
                strokeWidth={4}
                lineDashPattern={[0]}
              />
            )}

            {/* Live member markers — rendered when ride is OnGoing */}
            {isOnGoing && liveMembers.map(([userId, pos]) => (
              <Marker
                key={userId}
                coordinate={{ latitude: pos.latitude, longitude: pos.longitude }}
                title={pos.isDriver ? 'Driver' : 'Passenger'}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                {/* Custom callout-style pin — green circle for driver, amber for passenger */}
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: pos.isDriver ? Colors.primary : Colors.accent,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: '#fff',
                  shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
                }}>
                  <Ionicons
                    name={pos.isDriver ? 'car' : 'person'}
                    size={14}
                    color="#fff"
                  />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
            <Ionicons name="map-outline" size={48} color={Colors.border} style={{ marginBottom: Spacing.md }}/>
            <Text style={{ color: Colors.textSecondary, textAlign: 'center', fontSize: Typography.base }}>
              Route data is not available for this ride.
            </Text>
          </View>
        )}

        <View style={{ padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }}>
          <Text style={{ fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary }}>
            {ride.departureLocation} → {ride.destination}
          </Text>
          {ride.route?.distanceKM && (
            <Text style={{ fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4 }}>
              {ride.route.distanceKM} km · ~{ride.route.durationMinutes} min estimated
            </Text>
          )}
          {isOnGoing && liveMembers.length > 0 && (
            <Text style={{ fontSize: Typography.xs, color: Colors.primary, marginTop: 4, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              {liveMembers.length} member{liveMembers.length > 1 ? 's' : ''} sharing live location
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── AttendanceModal ───────────────────────────────────────────────────────────
// Driver marks each confirmed passenger Present or Absent before completing.
// Absent = no-show: backend increments their cancellationCount.
// The modal fetches the current list via GET /api/rides/:rideId/attendance,
// then submits via PUT /api/rides/:rideId/attendance.
function AttendanceModal({ visible, rideId, onClose, onAttendanceSaved }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Local marks: { [bookingId]: 'Present' | 'Absent' | null }
  const [marks, setMarks] = useState({});

  useEffect(() => {
    if (!visible || !rideId) return;
    setLoading(true);
    getAttendance(rideId)
      .then(res => {
        const att = res.data?.attendance || [];
        setList(att);
        // Pre-populate any previously saved statuses so the driver sees their
        // prior work if they close and reopen the modal
        const initial = {};
        att.forEach(a => { initial[a.bookingId] = a.attendanceStatus; });
        setMarks(initial);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [visible, rideId]);

  const toggle = (bookingId, status) => {
    // Second tap on the same button clears the mark (back to null)
    setMarks(prev => ({
      ...prev,
      [bookingId]: prev[bookingId] === status ? null : status,
    }));
  };

  const handleSave = async () => {
    const attendance = Object.entries(marks)
      .filter(([, status]) => status !== null)
      .map(([bookingId, status]) => ({ bookingId, status }));

    if (attendance.length === 0) {
      Alert.alert('No marks', 'Please mark at least one passenger before saving.');
      return;
    }
    setSaving(true);
    try {
      await markAttendance(rideId, attendance);
      onAttendanceSaved();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (p) => ((p?.firstName?.[0] || '') + (p?.lastName?.[0] || '')).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOv}>
        <View style={[st.manageModal, { maxHeight: '80%' }]}>
          <View style={st.modalH}>
            <Text style={st.modalTitle}>Check In Passengers</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary}/>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.md }}>
            Mark who is present before completing the ride. Absent passengers will be recorded as no-shows.
          </Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ paddingVertical: Spacing.lg }}/>
          ) : list.length === 0 ? (
            <Text style={{ color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg }}>
              No confirmed passengers for this ride.
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {list.map((item) => {
                const p = item.passenger || {};
                const currentMark = marks[item.bookingId];
                return (
                  <View key={String(item.bookingId)} style={[st.paxRow, { paddingVertical: Spacing.md }]}>
                    <View style={st.paxAvatar}>
                      <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary }}>
                        {getInitials(p)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.paxName}>{p.firstName} {p.lastName}</Text>
                      <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                        {item.pickupLocation || 'No stop specified'}
                      </Text>
                    </View>
                    {/* Present / Absent toggle buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => toggle(String(item.bookingId), 'Present')}
                        style={[
                          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5 },
                          currentMark === 'Present'
                            ? { backgroundColor: Colors.primary, borderColor: Colors.primary }
                            : { borderColor: Colors.border, backgroundColor: Colors.background },
                        ]}
                      >
                        <Text style={{
                          fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold',
                          color: currentMark === 'Present' ? '#fff' : Colors.textSecondary,
                        }}>✓</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => toggle(String(item.bookingId), 'Absent')}
                        style={[
                          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5 },
                          currentMark === 'Absent'
                            ? { backgroundColor: Colors.error, borderColor: Colors.error }
                            : { borderColor: Colors.border, backgroundColor: Colors.background },
                        ]}
                      >
                        <Text style={{
                          fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold',
                          color: currentMark === 'Absent' ? '#fff' : Colors.textSecondary,
                        }}>✗</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[st.primaryBtn, { marginTop: Spacing.md }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={st.primaryBtnText}>{saving ? 'Saving...' : 'Save & Continue'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function RideDetailsScreen({ navigation, route }) {
  const { isDriver, user, socket: socketRef } = useAuth();
  const rideId = route?.params?.rideId;
  const [ride,setRide]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showProfile,setShowProfile]=useState(false);
  const [showManagePax,setShowManagePax]=useState(false);
  const [showManageRide,setShowManageRide]=useState(false);
  const [showCancelRide,setShowCancelRide]=useState(false);
  const [showStopRequests,setShowStopRequests]=useState(false);
  const [hasBooking, setHasBooking] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ── Live tracking state ──────────────────────────────────────────────────
  // memberPositions: { [userId]: { latitude, longitude, isDriver } }
  const [memberPositions, setMemberPositions] = useState({});
  // liveEta: recalculated minutes remaining, updated as driver moves
  const [liveEta, setLiveEta]   = useState(null);
  const [isOnGoing, setIsOnGoing] = useState(false);
  const locationWatchRef = useRef(null); // expo-location subscription

  // Haversine in JS — mirrors the backend, used for client-side ETA estimation
  const haversine = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  // ── Socket: join ride room + listen to member-location + ride-started ────
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !rideId) return;

    socket.emit('join-ride', rideId);

    const handleMemberLocation = (data) => {
      if (data.rideId !== rideId) return;
      setMemberPositions(prev => ({
        ...prev,
        [data.userId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          isDriver: data.isDriver,
          updatedAt: data.timestamp,
        },
      }));

      // If this is the driver's position and we have destination coords, estimate ETA
      if (data.isDriver && ride?.route?.destinationLatitude) {
        const distKm = haversine(
          data.latitude, data.longitude,
          ride.route.destinationLatitude, ride.route.destinationLongitude
        );
        // Rough estimate: 60 km/h average on Moroccan intercity roads
        const etaMin = Math.max(1, Math.round((distKm / 60) * 60));
        setLiveEta(etaMin);
      }
    };

    const handleRideStarted = (data) => {
      if (data.rideId !== rideId) return;
      setIsOnGoing(true);
    };

    const handleRideAutoCompleted = (data) => {
      if (data.rideId !== rideId) return;
      Alert.alert('Ride Completed', `Your ride to ${data.destination} has been completed.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    };

    socket.on('member-location',    handleMemberLocation);
    socket.on('ride-started',       handleRideStarted);
    socket.on('ride-auto-completed',handleRideAutoCompleted);

    return () => {
      socket.emit('leave-ride', rideId);
      socket.off('member-location',    handleMemberLocation);
      socket.off('ride-started',       handleRideStarted);
      socket.off('ride-auto-completed',handleRideAutoCompleted);
    };
  }, [rideId, socketRef, ride?.route, haversine, navigation]);

  // ── GPS broadcasting: start when ride is OnGoing ─────────────────────────
  // The driver's device sends its position every 5 seconds via Socket.IO.
  // Passengers also send their position so the late-departure check works.
  useEffect(() => {
    const socket = socketRef?.current;
    const rideState = ride?.state;

    // Broadcast for driver (OnGoing) and all members around departure time
    const shouldBroadcast = rideState === 'OnGoing' ||
      (rideState === 'Active' || rideState === 'Full');

    if (!shouldBroadcast || !socket || !rideId) return;

    let watchSub = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      watchSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,   // 5 s
          distanceInterval: 10, // or 10 m, whichever comes first
        },
        ({ coords }) => {
          socket.emit('location-update', {
            rideId,
            latitude:  coords.latitude,
            longitude: coords.longitude,
          });
        }
      );
      locationWatchRef.current = watchSub;
    })();

    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [ride?.state, rideId, socketRef]);

  const fetchRide = async () => {
    try {
      const res = await getRideDetails(rideId);
      setRide(res.data?.ride || null);
    } catch { setRide(null); }
    finally { setLoading(false); }
  };

  const checkExistingBooking = async () => {
    try {
      const res = await getCurrentBookings();
      const bookings = res.data?.bookings || [];
      const alreadyBooked = bookings.some(b => b.rideId?._id === rideId && b.status === 'Confirmed');
      setHasBooking(alreadyBooked);
    } catch {
      setHasBooking(false);
    }
  };

  useEffect(()=>{ 
    if(rideId) {
      fetchRide(); 
      checkExistingBooking();
    }
  },[rideId]);

  // Auto-open modals when navigated with params
  useEffect(() => {
    if (!loading && ride) {
      if (route?.params?.openManage) setShowManageRide(true);
      if (route?.params?.openCancel) setShowCancelRide(true);
      if (route?.params?.openStops) setShowStopRequests(true);
    }
  }, [loading, ride]);

  if(loading) return <SafeAreaView style={st.safe} edges={['top']}><ActivityIndicator color={Colors.primary} style={{flex:1}}/></SafeAreaView>;
  if(!ride) return <SafeAreaView style={st.safe} edges={['top']}><Text style={{textAlign:'center',marginTop:40,color:Colors.textSecondary}}>Ride not found</Text></SafeAreaView>;

  const driver = ride.driverId || {};
  const vehicle = ride.vehicleId || {};
  const isOwner = user?._id === driver._id;
  const isRideFull = ride.status === 'Full' || ride.availableSeats <= 0;
  const dt = new Date(ride.departureDateTime);
  const departureTime = dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  // Short date: "Feb 20" — matches the Figma mockup (08-Book_Ride, 09-Booking_Confirmation)
  const departureDate = dt.toLocaleDateString([],{month:'short',day:'numeric'});
  const distanceKM = ride.route?.distanceKM ? `${ride.route.distanceKM} km` : '—';
  const duration = ride.route?.durationMinutes ? `~${ride.route.durationMinutes} min` : '—';

  const handleShare = () => Share.share({ message: `Ride to ${ride.destination} at ${departureTime} - AUI Carpool` });

  // Complete ride — called after attendance is saved.
  // Separated from the attendance save so the driver has a distinct confirmation step.
  const handleCompleteRide = async () => {
    Alert.alert(
      'Complete Ride',
      'Mark this ride as completed? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            try {
              await completeRide(ride._id);
              Alert.alert('Ride Completed', 'The ride has been marked as complete. Passengers will be prompted to leave a review.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to complete ride.');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const isOnGoingState = ride?.state === 'OnGoing' || isOnGoing;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={st.headerBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary}/></TouchableOpacity>
        <Text style={st.headerTitle}>Ride Details</Text>
        <TouchableOpacity onPress={handleShare} style={st.headerBtn}><Ionicons name="share-outline" size={22} color={Colors.textSecondary}/></TouchableOpacity>
      </View>

      {/* Live ETA banner — shown when ride is OnGoing */}
      {isOnGoingState && (
        <View style={st.etaBanner}>
          <View style={st.etaPulse}/>
          <Ionicons name="navigate" size={14} color="#fff" style={{ marginRight: 6 }}/>
          <Text style={st.etaText}>
            Ride in progress
            {liveEta ? ` · ~${liveEta} min remaining` : ''}
          </Text>
        </View>
      )}

      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        <Card><View style={st.routeRow}><View style={st.routeDots}><View style={[st.dot,{backgroundColor:Colors.primary}]}/><View style={st.dashed}/><View style={[st.dot,{backgroundColor:Colors.error}]}/></View><View style={{flex:1,gap:16}}><Text style={st.routeCity}>{ride.departureLocation}</Text><Text style={st.routeCity}>{ride.destination}</Text></View></View>
          <View style={st.divider}/>
          <View style={st.statsRow}>{[{icon:'calendar-outline',val:departureDate,label:'Date'},{icon:'time-outline',val:departureTime,label:'Departure'},{icon:'resize-outline',val:distanceKM,label:'Distance'},{icon:'hourglass-outline',val:duration,label:'Est. time'}].map((s,i)=>(<View key={i} style={st.stat}><Ionicons name={s.icon} size={14} color={Colors.textSecondary}/><Text style={st.statVal}>{s.val}</Text><Text style={st.statLabel}>{s.label}</Text></View>))}</View>
        </Card>

        {/* Driver card — always navigates to the full profile screen */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UserProfile', { userId: driver._id })}
        >
          <Card>
            <View style={st.driverRow}>
              <View style={st.driverAv}><Text style={st.driverAvText}>{getInitials(driver)}</Text></View>
              <View style={{flex:1}}><Text style={st.driverName}>{getName(driver)}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="star" size={12} color="#F59E0B"/><Text style={st.driverSub}>{driver.averageRating||0} · {driver.totalCompletedRides||0} rides</Text></View></View>
              <Text style={st.viewProfile}>Profile →</Text>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              {driver.smokingPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={11} color={Colors.primary}/><Text style={st.prefChipText}>{driver.smokingPreference}</Text></View>}
              {driver.drivingStyle&&<View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={11} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>{driver.drivingStyle}</Text></View>}
              {ride.genderPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={11} color={Colors.primary}/><Text style={st.prefChipText}>{ride.genderPreference}</Text></View>}
            </View>
          </Card>
        </TouchableOpacity>

        <Card style={{flexDirection:'row',alignItems:'center',gap:12}}>
          <Ionicons name="car-outline" size={20} color={Colors.textSecondary}/>
          <View style={{flex:1}}><Text style={st.vehicleMain}>{vehicle.brand} {vehicle.model} · {vehicle.color}</Text><Text style={st.vehicleSub}>{vehicle.sizeCategory} · {vehicle.luggageCapacity} luggage spots</Text></View>
          <View style={st.plate}><Text style={st.plateText}>{vehicle.licensePlate}</Text></View>
        </Card>

        <Card>
          <View style={st.rowBetween}><Text style={st.cardLabel}>Available Seats</Text>{isRideFull ? <View style={st.fullBadge}><Text style={st.fullBadgeText}>FULL</Text></View> : <Text style={st.seatsCount}>{ride.availableSeats} of {ride.totalSeats}</Text>}</View>
          <View style={{flexDirection:'row',gap:8,marginVertical:8}}>{Array.from({length:ride.totalSeats}).map((_,i)=>(<Ionicons key={i} name={i<(ride.totalSeats-ride.availableSeats)?'person':'person-outline'} size={20} color={i<(ride.totalSeats-ride.availableSeats)?Colors.primary:Colors.border}/>))}</View>
          <Text style={st.priceNote}>{ride.pricePerSeat} MAD per seat</Text>
        </Card>

        <TouchableOpacity style={st.mapThumb} onPress={()=>setShowRouteMap(true)}>
          <View style={st.mapThumbInner}>
            <Ionicons name="map-outline" size={24} color={Colors.primary}/>
            <View><Text style={st.mapThumbText}>View Full Route</Text><Text style={st.mapThumbSub}>{ride.departureLocation} → {ride.destination}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{marginLeft:'auto'}}/>
          </View>
        </TouchableOpacity>

        <Card>
          <View style={st.rowBetween}><Text style={st.cardLabel}>Route & Stops</Text><Text style={st.seatsCount}>{(ride.stops||[]).length} stops</Text></View>
          <Text style={{fontSize:11,color:Colors.textSecondary,marginBottom:8}}>You can request a stop when booking</Text>
          {[ride.departureLocation,...(ride.stops||[]),ride.destination].map((stop,i,arr)=>(
            <View key={i} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:6}}>
              <View style={{width:10,height:10,borderRadius:5,backgroundColor:i===0||i===arr.length-1?Colors.primary:Colors.border}}/>
              <Text style={{fontSize:13,fontFamily:i===0||i===arr.length-1?'PlusJakartaSans_600SemiBold':'PlusJakartaSans_400Regular',color:i===0||i===arr.length-1?Colors.textPrimary:Colors.textSecondary}}>{stop}</Text>
            </View>
          ))}
        </Card>
        <View style={{height:100}}/>
      </ScrollView>

      <View style={st.bottomBar}>
        {isOwner ? (
          <>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>setShowManagePax(true)}>
              <Ionicons name="people-outline" size={16} color={Colors.primary}/>
              <Text style={st.outlineBtnText}>Passengers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>setShowStopRequests(true)}>
              <Ionicons name="flag-outline" size={16} color={Colors.primary}/>
              <Text style={st.outlineBtnText}>Stops</Text>
            </TouchableOpacity>
            {isOnGoingState ? (
              /* Ride is in progress — driver can complete when near destination */
              <TouchableOpacity
                style={[st.primaryBtn, completing && { opacity: 0.7 }]}
                onPress={handleCompleteRide}
                disabled={completing}
              >
                <Text style={st.primaryBtnText}>{completing ? 'Completing...' : 'Complete Ride'}</Text>
              </TouchableOpacity>
            ) : ['Active', 'Full'].includes(ride.state) ? (
              !attendanceSaved ? (
                <TouchableOpacity style={st.primaryBtn} onPress={()=>setShowAttendance(true)}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{marginRight:4}}/>
                  <Text style={st.primaryBtnText}>Check In</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[st.primaryBtn, completing && { opacity: 0.7 }]}
                  onPress={handleCompleteRide}
                  disabled={completing}
                >
                  <Text style={st.primaryBtnText}>{completing ? 'Completing...' : 'Complete Ride'}</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity style={st.primaryBtn} onPress={()=>setShowManageRide(true)}>
                <Text style={st.primaryBtnText}>Manage Ride</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>navigation.navigate('Messages', {driverId: driver._id, driverName: `${driver.firstName} ${driver.lastName}`})}><Ionicons name="chatbubble-outline" size={16} color={Colors.primary}/><Text style={st.outlineBtnText}>Message</Text></TouchableOpacity>
            {isOnGoingState ? (
              <TouchableOpacity style={st.primaryBtn} onPress={()=>setShowRouteMap(true)}>
                <Ionicons name="navigate-outline" size={16} color="#fff" style={{marginRight:4}}/>
                <Text style={st.primaryBtnText}>Track Live</Text>
              </TouchableOpacity>
            ) : isRideFull ? (
              <View style={[st.primaryBtn, {backgroundColor: Colors.textDisabled}]}>
                <Text style={st.primaryBtnText}>Ride Full</Text>
              </View>
            ) : hasBooking ? (
              <View style={[st.primaryBtn, {backgroundColor: Colors.textDisabled}]}>
                <Text style={st.primaryBtnText}>Already Booked</Text>
              </View>
            ) : (
              <TouchableOpacity style={st.primaryBtn} onPress={()=>navigation.navigate('BookRide',{rideId:ride._id})}><Text style={st.primaryBtnText}>Book Now · {ride.pricePerSeat} MAD</Text></TouchableOpacity>
            )}
          </>
        )}
      </View>

      <ManagePassengersModal visible={showManagePax} rideId={ride._id} totalSeats={ride.totalSeats} onClose={()=>setShowManagePax(false)}/>
      <StopRequestsModal visible={showStopRequests} rideId={ride._id} onClose={()=>setShowStopRequests(false)}/>
      <ManageRideModal
        visible={showManageRide}
        ride={ride}
        onClose={() => setShowManageRide(false)}
        onUpdated={fetchRide}
      />
      <CancelRideModal
        visible={showCancelRide}
        ride={ride}
        onClose={() => setShowCancelRide(false)}
        onCancelledAndBack={() => navigation.goBack()}
      />
      {/* Route map / live tracking — passes member positions when OnGoing */}
      <RouteMapModal
        visible={showRouteMap}
        ride={ride}
        onClose={() => setShowRouteMap(false)}
        memberPositions={memberPositions}
        liveEta={liveEta}
        isOnGoing={isOnGoingState}
      />
      {/* Attendance check-in — driver marks Present/Absent before completing */}
      <AttendanceModal
        visible={showAttendance}
        rideId={ride._id}
        onClose={() => setShowAttendance(false)}
        onAttendanceSaved={() => setAttendanceSaved(true)}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.background},
  header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.lg,backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},
  headerBtn:{width:36,height:36,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  scroll:{flex:1,padding:Spacing.lg},
  card:{backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.lg,marginBottom:Spacing.md,...Shadows.card},
  routeRow:{flexDirection:'row',gap:12,marginBottom:12},routeDots:{alignItems:'center'},dot:{width:10,height:10,borderRadius:5},dashed:{width:2,height:24,backgroundColor:Colors.border,marginVertical:3},routeCity:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  divider:{height:1,backgroundColor:Colors.border,marginVertical:12},
  statsRow:{flexDirection:'row',justifyContent:'space-around'},stat:{alignItems:'center',gap:4},statVal:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},statLabel:{fontSize:Typography.xs,color:Colors.textSecondary},
  driverRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},driverAv:{width:44,height:44,borderRadius:22,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},driverAvText:{fontSize:14,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},driverName:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},driverSub:{fontSize:Typography.sm,color:Colors.textSecondary},viewProfile:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  prefChip:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:4,borderRadius:Radius.full,backgroundColor:Colors.primaryBg},prefChipText:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  vehicleMain:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},vehicleSub:{fontSize:Typography.sm,color:Colors.textSecondary},plate:{paddingHorizontal:8,paddingVertical:4,borderRadius:6,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.background},plateText:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},cardLabel:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},seatsCount:{fontSize:Typography.sm,color:Colors.textSecondary},priceNote:{fontSize:Typography.sm,color:Colors.textSecondary},
  fullBadge:{backgroundColor:'#FFEBEE',paddingHorizontal:10,paddingVertical:4,borderRadius:Radius.full},fullBadgeText:{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',color:Colors.error},
  mapThumb:{marginBottom:Spacing.md},mapThumbInner:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:Colors.primaryBg,borderRadius:Radius.md,padding:Spacing.lg,borderWidth:1,borderColor:'rgba(27,94,32,0.15)'},mapThumbText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},mapThumbSub:{fontSize:Typography.xs,color:Colors.textSecondary},
  bottomBar:{flexDirection:'row',gap:Spacing.sm,padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border},
  outlineBtn:{flex:0.45,height:50,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},outlineBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  primaryBtn:{flex:0.55,height:50,backgroundColor:Colors.primary,borderRadius:Radius.md,flexDirection:'row',alignItems:'center',justifyContent:'center'},primaryBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  modalOv:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'flex-end'},profileModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'85%'},manageModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'85%'},
  modalH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.lg},modalTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  sectionLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:8},
  profHeader:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:Spacing.lg},profAvatar:{width:56,height:56,borderRadius:28,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},profAvatarText:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},profName:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},profRole:{fontSize:13,color:Colors.textSecondary},
  profStats:{flexDirection:'row',justifyContent:'space-around',paddingVertical:Spacing.md,borderTopWidth:1,borderBottomWidth:1,borderColor:Colors.divider,marginBottom:Spacing.lg},profStat:{alignItems:'center'},profBig:{fontSize:20,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},profLabel:{fontSize:11,color:Colors.textSecondary},
  reviewCard:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},reviewTop:{flexDirection:'row',alignItems:'flex-start',gap:10},reviewAvatar:{width:32,height:32,borderRadius:16,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},reviewName:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},reviewText:{fontSize:13,color:Colors.textSecondary,marginTop:6,lineHeight:18},
  paxRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},paxAvatar:{width:36,height:36,borderRadius:18,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},paxName:{fontSize:14,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  mngLabel:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4,marginTop:12},mngInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,justifyContent:'center',backgroundColor:Colors.background},mngInputText:{fontSize:13,color:Colors.textPrimary},
  // Manage Ride Modal — new entries
  mngSectionLabel:{fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textSecondary,letterSpacing:1,marginBottom:4,marginTop:4},
  mngHint:{fontSize:11,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textDisabled,marginBottom:8},
  mngReadonlyRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:6,paddingHorizontal:4},
  mngReadonlyText:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary},
  mngDivider:{height:1,backgroundColor:Colors.border,marginVertical:Spacing.md},
  mngInputRow:{flexDirection:'row',alignItems:'center',height:44,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,backgroundColor:Colors.background,marginBottom:4},
  mngInputField:{flex:1,fontSize:13,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary},
  routeDotSm:{width:8,height:8,borderRadius:4},
  genderPill:{flex:1,height:40,borderRadius:Radius.sm,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  genderPillActive:{backgroundColor:Colors.primaryBg,borderColor:Colors.primary},
  genderPillText:{fontSize:12,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary},
  genderPillTextActive:{color:Colors.primary},
  cancelRideBtn:{flex:1,height:46,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:1.5,borderColor:Colors.error,borderRadius:8},cancelRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.error},
  saveRideBtn:{flex:1,height:46,backgroundColor:Colors.primary,borderRadius:8,alignItems:'center',justifyContent:'center'},saveRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  mngDateTimeButton:{flexDirection:'row',alignItems:'center',height:44,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,backgroundColor:Colors.background,marginBottom:4},
  mngDateTimeValue:{fontSize:13,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary},
  cancelIconBtn:{width:42,height:42,borderWidth:1.5,borderColor:Colors.error,borderRadius:8,alignItems:'center',justifyContent:'center'},
  // Live tracking banner
  etaBanner:{
    flexDirection:'row',alignItems:'center',backgroundColor:Colors.primary,
    paddingVertical:8,paddingHorizontal:Spacing.md,
  },
  etaPulse:{
    width:8,height:8,borderRadius:4,backgroundColor:'#4CAF50',marginRight:8,
  },
  etaText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:'#fff'},
});
