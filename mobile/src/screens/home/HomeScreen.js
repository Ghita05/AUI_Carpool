import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, TextInput, Platform, Modal,
  KeyboardAvoidingView, ActivityIndicator, Alert,
  Animated, Easing, Image
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import MapView, { Marker, Callout, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getAvailableRides, postRideRequest, validateStopOnRoute, getRouteAlternatives } from '../../services/rideService';
import DateTimePickerModal from '../../components/DateTimePickerModal';
import RouteSelectionModal from '../../components/RouteSelectionModal';
import { autocompleteLocation, geocodePlace } from '../../utils/mapsService';

const { width } = Dimensions.get('window');

/* ── Decode Google encoded polyline into [{latitude,longitude}] ── */
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

/* ── Animated Car Logo — MaterialCommunityIcons car-side + spinning wheel overlays ── */
function AnimatedCarLogo({ wheelSpin }) {
  const spinDeg = wheelSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // car-side at size 88 inside a 130×90 container:
  // MDI car-side wheel centers in 24×24 viewBox: rear (6,15), front (18,15).
  // Scaled to 88px (×3.667): rear center (22,55), front center (66,55).
  // Overlay is 26px diameter → offset by 13px from center.
  const WHEEL_D = 26;
  const WHEEL_R = WHEEL_D / 2;

  const Wheel = ({ left }) => (
    <Animated.View style={{
      position: 'absolute',
      bottom: 22,
      left,
      width: WHEEL_D,
      height: WHEEL_D,
      transform: [{ rotate: spinDeg }],
    }}>
      <Svg width={WHEEL_D} height={WHEEL_D} viewBox="0 0 26 26">
        {/* Cover the icon's flat wheel with primary color fill */}
        <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R} fill={Colors.primary} />
        {/* Tyre ring */}
        <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R - 1.5} fill="none" stroke="#fff" strokeWidth={2.5} />
        {/* Inner rim */}
        <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R * 0.38} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
        {/* 5 spokes */}
        {[0, 72, 144, 216, 288].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x2 = WHEEL_R + Math.cos(rad) * (WHEEL_R - 3);
          const y2 = WHEEL_R + Math.sin(rad) * (WHEEL_R - 3);
          return <Line key={i} x1={WHEEL_R} y1={WHEEL_R} x2={x2} y2={y2} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />;
        })}
        {/* Hub */}
        <Circle cx={WHEEL_R} cy={WHEEL_R} r={3} fill="#fff" />
      </Svg>
    </Animated.View>
  );

  return (
    <View style={{ width: 130, height: 90, alignItems: 'center', justifyContent: 'center' }}>
      {/* car-side: true left-facing side profile */}
      <View style={{ width: 88, height: 88 }}>
        <MaterialCommunityIcons
          name="car-side"
          size={88}
          color="#fff"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        {/* Rear wheel center (22,55), front wheel center (66,55) at 88px scale */}
        <Wheel left={9} />
        <Wheel left={53} />
      </View>
    </View>
  );
}

// Route color palette for polylines
const ROUTE_COLORS = ['#1B5E20', '#0D47A1', '#E65100', '#6A1B9A', '#B71C1C', '#00695C'];

// Default map center — Ifrane area
const DEFAULT_CENTER = { latitude: 33.5046, longitude: -5.1069 };

// Default map region
const INITIAL_REGION = {
  latitude: DEFAULT_CENTER.latitude,
  longitude: DEFAULT_CENTER.longitude,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

/* ── helpers ── */
const getDestColor = (ride) => {
  if (ride.availableSeats === 0) return Colors.textSecondary;
  if (ride.availableSeats === 1) return Colors.accent;
  return Colors.primary;
};
const getInitials = (driver) => {
  if (!driver) return '??';
  return ((driver.firstName?.[0] || '') + (driver.lastName?.[0] || '')).toUpperCase();
};
const getDriverName = (driver) => {
  if (!driver) return 'Unknown';
  return `${driver.firstName} ${driver.lastName?.[0] || ''}.`;
};

/* ── Filter Modal ── */
function FilterModal({ visible, onClose, onApply }) {
  const [time,setTime]=useState('');
  const [maxPrice,setMaxPrice]=useState('');
  const [gender,setGender]=useState('All');
  const [smoking,setSmoking]=useState('Any');
  const [driverSearch,setDriverSearch]=useState('');
  const [driverResults,setDriverResults]=useState([]);
  const [selectedDriver,setSelectedDriver]=useState(null);
  const [driverLoading,setDriverLoading]=useState(false);
  const driverDebounce = useRef(null);

  const Pill = ({label,active,onPress}) => <TouchableOpacity style={[st.fpill,active&&st.fpillActive]} onPress={onPress}><Text style={[st.fpillText,active&&st.fpillTextActive]}>{label}</Text></TouchableOpacity>;

  const handleDriverSearch = (txt) => {
    setDriverSearch(txt);
    clearTimeout(driverDebounce.current);
    if (txt.length < 2) { setDriverResults([]); return; }
    driverDebounce.current = setTimeout(async () => {
      setDriverLoading(true);
      try {
        const res = await searchUsers(txt);
        setDriverResults(res.users || []);
      } catch { setDriverResults([]); }
      setDriverLoading(false);
    }, 300);
  };

  const handleApply = () => {
    const filters = {};
    if (time) filters.afterTime = time;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (gender === 'Women only') filters.genderPreference = 'Women-Only';
    if (smoking === 'Non-smoking') filters.smokingPolicy = 'No Smoking';
    if (selectedDriver) filters.driverId = selectedDriver._id;
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setTime(''); setMaxPrice(''); setGender('All'); setSmoking('Any');
    setDriverSearch(''); setDriverResults([]); setSelectedDriver(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}><View style={st.filterModal}>
        <View style={st.filterHeader}>
          <Text style={st.filterTitle}>Filters</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <TouchableOpacity onPress={handleReset}><Text style={{fontSize:Typography.sm,color:Colors.primary,fontFamily:'PlusJakartaSans_600SemiBold'}}>Reset</Text></TouchableOpacity>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={st.filterLabel}>DEPARTURE TIME</Text>
          <TextInput
            style={[st.fpill, { minWidth: '100%', paddingHorizontal: 12, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary }]}
            placeholder="HH:MM (e.g. 14:00)"
            placeholderTextColor={Colors.textSecondary}
            value={time}
            onChangeText={(t) => setTime(formatTime(t))}
            keyboardType="number-pad"
            maxLength={5}
          />
          <Text style={st.filterLabel}>MAX PRICE (MAD)</Text>
          <TextInput
            style={[st.fpill, { minWidth: '100%', paddingHorizontal: 12, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary }]}
            placeholder="e.g. 50"
            placeholderTextColor={Colors.textSecondary}
            value={maxPrice}
            onChangeText={(t) => setMaxPrice(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Text style={st.filterLabel}>DRIVER</Text>
          {selectedDriver ? (
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:12,paddingVertical:8,borderRadius:Radius.full,gap:8,marginBottom:4}}>
              <Ionicons name="person" size={14} color={Colors.primary}/>
              <Text style={{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary,flex:1}}>
                {selectedDriver.firstName} {selectedDriver.lastName}
              </Text>
              <TouchableOpacity onPress={()=>{setSelectedDriver(null);setDriverSearch('');}}>
                <Ionicons name="close-circle" size={18} color={Colors.primary}/>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={[st.fpill, { minWidth: '100%', paddingHorizontal: 12, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textPrimary }]}
              placeholder="Search by name or email"
              placeholderTextColor={Colors.textSecondary}
              value={driverSearch}
              onChangeText={handleDriverSearch}
            />
          )}
          {driverLoading && <Text style={{color:Colors.textSecondary,fontSize:12,marginTop:4}}>Searching...</Text>}
          {driverResults.length > 0 && !selectedDriver && (
            <View style={{backgroundColor:Colors.background,borderWidth:1,borderColor:Colors.border,borderRadius:8,marginTop:4}}>
              {driverResults.map(u => (
                <TouchableOpacity key={u._id} style={{padding:10,flexDirection:'row',alignItems:'center',gap:8}} onPress={()=>{
                  setSelectedDriver(u);
                  setDriverSearch('');
                  setDriverResults([]);
                }}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary}/>
                  <Text style={{fontSize:13,color:Colors.textPrimary}}>{u.firstName} {u.lastName} <Text style={{color:Colors.textSecondary,fontSize:12}}>({u.email})</Text></Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={st.filterLabel}>GENDER</Text>
          <View style={st.pillRow}>{['All','Women only'].map(g=><Pill key={g} label={g} active={gender===g} onPress={()=>setGender(g)}/>)}</View>
          <Text style={st.filterLabel}>SMOKING</Text>
          <View style={st.pillRow}>{['Any','Non-smoking'].map(s=><Pill key={s} label={s} active={smoking===s} onPress={()=>setSmoking(s)}/>)}</View>
        </ScrollView>
        <TouchableOpacity style={st.filterApply} onPress={handleApply}><Text style={st.filterApplyText}>Show Rides</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

/* ── Community Modal (stays static for now — would need aggregate endpoints) ── */
function CommunityModal({ visible, onClose }) {
  const members = [{label:'Top Driver',name:'Ghita Nafa',stat:'4.8 avg · 23 rides',initials:'GN'},{label:'Top Passenger',name:'Ahmed Benali',stat:'4.9 avg · 15 trips',initials:'AB'},{label:'Most Active',name:'Kenza Nouri',stat:'5.0 avg · 31 rides',initials:'KN'}];
  const routes = [];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}><View style={st.communityModal}>
        <View style={st.filterHeader}><Text style={st.filterTitle}>Community</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={st.filterLabel}>TOP MEMBERS</Text>
          {members.map((m,i)=>(
            <View key={i} style={st.memberRow}>
              <Text style={st.memberRank}>#{i+1}</Text>
              <View style={st.memberAvatar}><Text style={st.memberAvatarText}>{m.initials}</Text></View>
              <View style={{flex:1}}><Text style={st.memberName}>{m.name}</Text><Text style={st.memberSub}>{m.label} · {m.stat}</Text></View>
            </View>
          ))}
          <Text style={[st.filterLabel,{marginTop:Spacing.lg}]}>POPULAR ROUTES</Text>
          {routes.map((r,i)=>(
            <View key={i} style={st.routeRow}>
              <Text style={st.routeName}>{r.route}</Text>
              <View style={st.barTrack}><View style={[st.barFill,{width:`${r.pct}%`}]}/></View>
              <Text style={st.routeCount}>{r.count}</Text>
            </View>
          ))}
          <View style={st.statsRow}>
            <View style={st.statBox}><Text style={st.statBig}>248</Text><Text style={st.statLabel}>Users</Text></View>
            <View style={st.statBox}><Text style={st.statBig}>1,042</Text><Text style={st.statLabel}>Rides</Text></View>
            <View style={st.statBox}><Text style={st.statBig}>4.6</Text><Text style={st.statLabel}>Avg Rating</Text></View>
          </View>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

// ── Date / time input formatters ──────────────────────────────────────────
// formatDate: keeps only digits, auto-inserts '-' after YYYY and MM.
// Clamps month to 01–12 and day to 01–31 so the user can't type nonsense.
// Output is always a valid YYYY-MM-DD prefix as the user types.
function formatDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits;
  if (digits.length > 4) {
    const mm = Math.min(parseInt(digits.slice(4, 6) || '0', 10), 12);
    out = digits.slice(0, 4) + '-' + String(mm).padStart(2, '0');
    if (digits.length > 6) {
      const dd = Math.min(parseInt(digits.slice(6, 8) || '0', 10), 31);
      out += '-' + String(dd).padStart(2, '0');
    }
  }
  return out;
}
// formatTime: keeps only digits, auto-inserts ':' after HH.
// Clamps hour to 00–23 and minute to 00–59.
function formatTime(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  const hh = Math.min(parseInt(digits.slice(0, 2), 10), 23);
  const mm = Math.min(parseInt(digits.slice(2, 4), 10), 59);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}


import { searchUsers } from '../../services/rideService';

function RideRequestModal({ visible, departure, destination, onClose }) {
  const { user: currentUser } = useAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  // Group request state
  const [groupMode, setGroupMode] = useState(false);
  const [groupUsers, setGroupUsers] = useState([]); // [{_id, firstName, lastName, email, ...}]
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [stops, setStops] = useState([]);
  const [newStop, setNewStop] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [validatingStop, setValidatingStop] = useState(false);
  const [stopValidations, setStopValidations] = useState({});
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [activeStopField, setActiveStopField] = useState(false);
  const stopDebounce = useRef(null);
  const stopSessionToken = useRef(Math.random().toString(36).substring(2));

  // Build a Date object from current date+time for the picker’s initial value
  const getInitialDateForPicker = () => {
    if (date && time) {
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const d = new Date(year, month - 1, day, hours, minutes);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(); // fallback to now
  };

  const handleClose = () => {
    setSubmitted(false);
    setDate('');
    setTime('');
    setSeats(1);
    setNotes('');
    setGroupMode(false);
    setGroupUsers([]);
    setUserSearch('');
    setUserSearchResults([]);
    setUserSearchLoading(false);
    setStops([]);
    setNewStop('');
    setSelectedRoute(null);
    setStopValidations({});
    setStopSuggestions([]);
    setActiveStopField(false);
    onClose();
  };

  const handleStopTextChange = (text) => {
    setNewStop(text);
    clearTimeout(stopDebounce.current);
    if (text.trim().length < 2) { setStopSuggestions([]); return; }
    stopDebounce.current = setTimeout(async () => {
      const results = await autocompleteLocation(text, stopSessionToken.current);
      setStopSuggestions(results);
    }, 300);
  };

  const handleStopSuggestionSelect = (suggestion) => {
    const value = suggestion.mainText.trim();
    if (value && !stops.includes(value)) {
      setNewStop('');
      setStopSuggestions([]);
      setActiveStopField(false);
      stopSessionToken.current = Math.random().toString(36).substring(2);
      addAndValidateStop(value);
    }
  };

  const refetchRoute = async (currentStops) => {
    if (!departure || !destination) return;
    try {
      const res = await getRouteAlternatives(departure, destination, currentStops);
      const fetched = res.data?.routes || res.routes || [];
      if (fetched.length > 0) setSelectedRoute(fetched[0]);
      else setSelectedRoute(null);
    } catch { setSelectedRoute(null); }
  };

  const addAndValidateStop = async (stopName) => {
    const updatedStops = [...stops, stopName];
    setStops(updatedStops);
    setSelectedRoute(null);
    if (!departure || !destination) return;
    setValidatingStop(true);
    try {
      const res = await validateStopOnRoute(departure, destination, stopName);
      const validation = res.data || res;
      setStopValidations(prev => ({ ...prev, [stopName]: validation }));
      if (validation.onRoute) {
        await refetchRoute(updatedStops);
        Alert.alert('Route updated', `Route adjusted to include "${stopName}".`);
      } else {
        Alert.alert(
          'Stop off route',
          `"${stopName}" adds ${validation.deviationKM} km detour. The route will be adjusted, but the ride will be longer.`,
          [
            { text: 'Keep & update route', onPress: async () => { await refetchRoute(updatedStops); }},
            { text: 'Remove', style: 'destructive', onPress: () => {
              setStops(prev => prev.filter(s => s !== stopName));
              setStopValidations(prev => { const copy = {...prev}; delete copy[stopName]; return copy; });
              refetchRoute(updatedStops.filter(s => s !== stopName));
            }},
          ]
        );
      }
    } catch (e) {
      console.warn('Stop validation failed:', e.message);
      await refetchRoute(updatedStops);
    } finally { setValidatingStop(false); }
  };

  const handleRemoveStop = (index) => {
    const removed = stops[index];
    const updatedStops = stops.filter((_, i) => i !== index);
    setStops(updatedStops);
    setStopValidations(prev => { const copy = {...prev}; delete copy[removed]; return copy; });
    refetchRoute(updatedStops);
  };

  const handleSubmit = async () => {
    if (!date || !time) {
      Alert.alert('Missing Info', 'Please select a date and time.');
      return;
    }
    if (groupMode && groupUsers.length < 2) {
      Alert.alert('Group Request', 'Add at least 1 other person for a group request.');
      return;
    }
    const travelDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(travelDateTime.getTime())) {
      Alert.alert('Invalid Date/Time', 'The selected date or time is invalid.');
      return;
    }
    setLoading(true);
    try {
      let reqObj;
      if (groupMode) {
        reqObj = {
          departureLocation: departure,
          destination,
          travelDateTime: travelDateTime.toISOString(),
          passengerCount: groupUsers.length,
          maxPrice: 200,
          notes,
          groupPassengerIds: groupUsers.map(u => u._id),
          stops,
          selectedRoute: selectedRoute || undefined,
        };
      } else {
        reqObj = {
          departureLocation: departure,
          destination,
          travelDateTime: travelDateTime.toISOString(),
          passengerCount: seats,
          maxPrice: 200,
          notes,
          stops,
          selectedRoute: selectedRoute || undefined,
        };
      }
      await postRideRequest(reqObj);
      setSubmitted(true);
      setGroupUsers([]);
      setUserSearch('');
      setUserSearchResults([]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to submit request.';
      const status = err.response?.status ? ` (${err.response.status})` : '';
      Alert.alert('Error' + status, msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={st.modalOverlayCenter}>
          <View style={st.requestModal}>
            {submitted ? (
              <View style={{ alignItems: 'center', padding: Spacing.xl }}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
                <Text style={[st.requestTitle, { textAlign: 'center', marginBottom: Spacing.sm }]}>
                  Request Posted!
                </Text>
                <Text style={[st.requestSub, { textAlign: 'center' }]}>
                  Your request to <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{destination}</Text>{' '}
                  is now visible to drivers. They can choose to accept it — you'll be notified if one does.
                </Text>
                <TouchableOpacity style={st.requestBtn} onPress={handleClose}>
                  <Text style={st.requestBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={st.filterHeader}>
                  <Text style={st.requestTitle}>No rides to "{destination}"</Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={st.requestSub}>Submit a request and matching drivers will be notified.</Text>

                {/* Date & Time selection replaced with touchable fields */}
                <View style={st.reqTwoCol}>
                  <View style={st.reqCol}>
                    <Text style={st.inputLabel}>DATE</Text>
                    <TouchableOpacity
                      style={st.reqFieldInput}
                      onPress={() => setPickerVisible(true)}
                    >
                      <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                      <Text style={[st.reqFieldText, !date && { color: Colors.textDisabled }]}>
                        {date || 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={st.reqCol}>
                    <Text style={st.inputLabel}>TIME</Text>
                    <TouchableOpacity
                      style={st.reqFieldInput}
                      onPress={() => setPickerVisible(true)}
                    >
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={[st.reqFieldText, !time && { color: Colors.textDisabled }]}>
                        {time || 'HH:MM'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>


                {/* Group Mode Toggle & Group UI */}
                <View style={{flexDirection:'row',alignItems:'center',marginTop:Spacing.md,marginBottom:10}}>
                  <TouchableOpacity
                    style={{flexDirection:'row',alignItems:'center',gap:6,padding:6,borderRadius:8,borderWidth:1,borderColor:groupMode?Colors.primary:Colors.border,backgroundColor:groupMode?Colors.primaryBg:Colors.background,marginRight:10}}
                    onPress={()=>{
                      setGroupMode(g => {
                        const next = !g;
                        if (next && currentUser) {
                          setGroupUsers(prev => prev.some(u => u._id === currentUser._id) ? prev : [{ _id: currentUser._id, firstName: currentUser.firstName, lastName: currentUser.lastName }, ...prev]);
                        } else if (!next) {
                          setGroupUsers([]);
                        }
                        return next;
                      });
                    }}
                  >
                    <Ionicons name={groupMode?"checkbox-outline":"square-outline"} size={18} color={groupMode?Colors.primary:Colors.textSecondary}/>
                    <Text style={{color:groupMode?Colors.primary:Colors.textSecondary,fontFamily:'PlusJakartaSans_600SemiBold',fontSize:13}}>Group Request</Text>
                  </TouchableOpacity>
                  <Text style={{color:Colors.textSecondary,fontSize:12}}>Request for multiple users</Text>
                </View>
                {groupMode ? (
                  <>
                    <Text style={st.inputLabel}>Add Users to Group</Text>
                    <TextInput
                      style={st.reqInput}
                      value={userSearch}
                      onChangeText={async (txt) => {
                        setUserSearch(txt);
                        if (txt.length >= 2) {
                          setUserSearchLoading(true);
                          try {
                            const res = await searchUsers(txt);
                            setUserSearchResults(res.users.filter(u => !groupUsers.some(g => g._id === u._id) && u._id !== currentUser?._id));
                          } catch { setUserSearchResults([]); }
                          setUserSearchLoading(false);
                        } else {
                          setUserSearchResults([]);
                        }
                      }}
                      placeholder="Search by name or email"
                      placeholderTextColor={Colors.textDisabled}
                    />
                    {userSearchLoading && <Text style={{color:Colors.textSecondary,fontSize:12,marginTop:4}}>Searching...</Text>}
                    {userSearchResults.length > 0 && (
                      <View style={{backgroundColor:Colors.background,borderWidth:1,borderColor:Colors.border,borderRadius:8,marginTop:4}}>
                        {userSearchResults.map(u => (
                          <TouchableOpacity key={u._id} style={{padding:10,flexDirection:'row',alignItems:'center',gap:8}} onPress={()=>{
                            setGroupUsers([...groupUsers,u]);
                            setUserSearch('');
                            setUserSearchResults([]);
                          }}>
                            <Ionicons name="person-add-outline" size={16} color={Colors.primary}/>
                            <Text style={{fontSize:13,color:Colors.textPrimary}}>{u.firstName} {u.lastName} <Text style={{color:Colors.textSecondary,fontSize:12}}>({u.email})</Text></Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {groupUsers.length > 0 && (
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
                        {groupUsers.map(u => (
                          <View key={u._id} style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:10,paddingVertical:4,borderRadius:16}}>
                            <Text style={{color:Colors.primary,fontSize:13}}>{u.firstName} {u.lastName}{u._id === currentUser?._id ? ' (You)' : ''}</Text>
                            {u._id !== currentUser?._id && (
                              <TouchableOpacity onPress={()=>setGroupUsers(groupUsers.filter(g=>g._id!==u._id))} style={{marginLeft:6}}>
                                <Ionicons name="close-circle" size={14} color={Colors.error}/>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={[st.inputLabel, { marginTop: Spacing.md }]}>NUMBER OF SEATS</Text>
                    <View style={st.reqStepperRow}>
                      <TouchableOpacity
                        style={st.reqStepBtn}
                        onPress={() => seats > 1 && setSeats(s => s - 1)}
                      >
                        <Ionicons name="remove" size={14} color={seats <= 1 ? Colors.textDisabled : Colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={st.reqStepVal}>{seats}</Text>
                      <TouchableOpacity style={st.reqStepBtn} onPress={() => setSeats(s => s + 1)}>
                        <Ionicons name="add" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Route indicator */}
                {selectedRoute && (
                  <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:Spacing.md,paddingHorizontal:12,paddingVertical:10,backgroundColor:Colors.primaryBg,borderRadius:Radius.sm,borderWidth:1,borderColor:Colors.primary}}>
                    <Ionicons name="navigate" size={14} color={Colors.primary} />
                    <View style={{flex:1}}>
                      <Text style={{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary}}>{selectedRoute.summary || 'Selected route'}</Text>
                      <Text style={{fontSize:11,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:1}}>{selectedRoute.distanceKM} km · {selectedRoute.durationMinutes} min</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowRouteModal(true)}>
                      <Text style={{fontSize:12,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>View on map</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!selectedRoute && destination && (
                  <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:Spacing.md}} onPress={() => setShowRouteModal(true)}>
                    <Ionicons name="map-outline" size={14} color={Colors.primary} />
                    <Text style={{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary}}>Choose route on map</Text>
                  </TouchableOpacity>
                )}

                <Text style={[st.inputLabel, { marginTop: Spacing.md }]}>STOPS (OPTIONAL)</Text>
                <View style={{flexDirection:'row',gap:8,marginBottom:stops.length?8:0}}>
                  <TextInput
                    style={[st.reqInput,{flex:1}]}
                    value={newStop}
                    onChangeText={handleStopTextChange}
                    onFocus={() => setActiveStopField(true)}
                    onBlur={() => setTimeout(() => setActiveStopField(false), 200)}
                    placeholder="Add a stop along the way"
                    placeholderTextColor={Colors.textDisabled}
                  />
                  <TouchableOpacity
                    style={{height:42,width:42,backgroundColor:Colors.primary,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'}}
                    onPress={()=>{ const s=newStop.trim(); if(s&&!stops.includes(s)){addAndValidateStop(s);setNewStop('');setStopSuggestions([]);} }}
                  >
                    <Ionicons name="add" size={20} color="#fff"/>
                  </TouchableOpacity>
                </View>
                {activeStopField && stopSuggestions.length > 0 && (
                  <View style={{backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,marginBottom:8}}>
                    {stopSuggestions.map((s) => (
                      <TouchableOpacity
                        key={s.placeId}
                        style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.border}}
                        onPress={() => handleStopSuggestionSelect(s)}
                      >
                        <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary}}>{s.mainText}</Text>
                          {s.secondaryText ? <Text style={{fontSize:11,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:1}}>{s.secondaryText}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {stops.length>0&&(
                  <View style={{gap:6,marginBottom:4}}>
                    {stops.map((s,i)=>{
                      const v = stopValidations[s];
                      return (
                        <View key={i} style={{flexDirection:'row',alignItems:'center',backgroundColor:v?(v.onRoute?Colors.successBg:Colors.warningBg):Colors.primaryBg,paddingHorizontal:10,paddingVertical:6,borderRadius:Radius.sm,borderWidth:1,borderColor:v?(v.onRoute?Colors.success:Colors.warning):Colors.border}}>
                          {v ? (
                            <Ionicons name={v.onRoute?'checkmark-circle':'warning'} size={14} color={v.onRoute?Colors.success:Colors.warning} style={{marginRight:6}} />
                          ) : (
                            <Ionicons name="ellipse" size={6} color={Colors.textSecondary} style={{marginRight:6}} />
                          )}
                          <View style={{flex:1}}>
                            <Text style={{color:Colors.textPrimary,fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold'}}>{s}</Text>
                            {v && !v.onRoute && (
                              <Text style={{color:Colors.warning,fontSize:11,marginTop:1}}>+{v.deviationKM} km detour</Text>
                            )}
                          </View>
                          <TouchableOpacity onPress={()=>handleRemoveStop(i)} style={{marginLeft:6}}>
                            <Ionicons name="close-circle" size={14} color={Colors.error}/>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    {validatingStop && (
                      <View style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4}}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={{fontSize:12,color:Colors.textSecondary}}>Checking stop…</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={[st.inputLabel, { marginTop: Spacing.md }]}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={[st.reqInput, { height: 72, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                  placeholder="Any preferences..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholderTextColor={Colors.textDisabled}
                />

                <TouchableOpacity style={st.requestBtn} onPress={handleSubmit} disabled={loading}>
                  <Text style={st.requestBtnText}>{loading ? 'Submitting...' : 'Submit Ride Request'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Integrated DateTimePickerModal */}
      <DateTimePickerModal
        visible={pickerVisible}
        date={getInitialDateForPicker()}    // pass a Date object
        time={time || '14:00'}              // default hour if none selected
        onClose={() => setPickerVisible(false)}
        onConfirm={(isoString, timeString) => {
          // isoString example: "2026-04-20T14:30:00.000Z"
          const datePart = isoString.split('T')[0]; // "YYYY-MM-DD"
          setDate(datePart);
          setTime(timeString);               // "HH:MM"
          setPickerVisible(false);
        }}
      />
      <RouteSelectionModal
        visible={showRouteModal}
        origin={departure}
        destination={destination}
        stops={stops}
        onSelect={(route) => { setSelectedRoute(route); setShowRouteModal(false); }}
        onClose={() => setShowRouteModal(false)}
      />
    </Modal>
  );
}

function RideCard({ ride, onPress }) {
  const avail = ride.availableSeats;
  const color = getDestColor(ride);
  const driver = ride.driverId;
  return (
    <TouchableOpacity style={st.rideCard} onPress={onPress} activeOpacity={0.7}>
      <View style={st.rideCardRow}><View style={[st.destDot,{backgroundColor:color}]}/><Text style={st.rideDestText}>{ride.destination}</Text><Text style={st.ridePriceText}>{ride.pricePerSeat} MAD</Text></View>
      <View style={st.rideMetaRow}><Ionicons name="time-outline" size={12} color={Colors.textSecondary}/><Text style={st.rideMetaText}>{new Date(ride.departureDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text><View style={{flex:1}}/><Text style={[st.rideMetaText,{color,fontFamily:'PlusJakartaSans_600SemiBold'}]}>{avail===0?'Full':`${avail} seats`}</Text></View>
      <View style={st.rideDriverRow}><View style={st.driverAvatar}><Text style={st.driverAvatarText}>{getInitials(driver)}</Text></View><Text style={st.driverName}>{getDriverName(driver)}</Text><Ionicons name="star" size={11} color="#F59E0B" style={{marginLeft:'auto'}}/><Text style={st.ratingText}>{driver?.averageRating || '—'}</Text></View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, isDriver } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestDest, setRequestDest] = useState('');
  const [highlightedPin, setHighlightedPin] = useState(null);
  const [filters, setFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Autocomplete state
  const [depSuggestions, setDepSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [depCoords, setDepCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const sessionToken = useRef(Math.random().toString(36).substring(2));
  const debounceTimer = useRef(null);
  const mapRef = useRef(null);

  // Animation values
  const landingOpacity = useRef(new Animated.Value(1)).current;
  const resultsOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const welcomeTranslateY = useRef(new Animated.Value(20)).current;
  const wheelSpin = useRef(new Animated.Value(0)).current;

  // Entrance animation + wheel spin loop
  useEffect(() => {
    // Wheel spins continuously whenever the landing view is visible
    const startWheelSpin = () => {
      wheelSpin.setValue(0);
      Animated.loop(
        Animated.timing(wheelSpin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
      ).start();
    };

    if (!hasSearched) {
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(welcomeTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      startWheelSpin();
    }
  }, [hasSearched]);

  // ── Autocomplete handler (debounced 300ms) ──
  const handleAutocomplete = useCallback((text, field) => {
    if (field === 'departure') setDeparture(text);
    else setDestination(text);

    clearTimeout(debounceTimer.current);
    if (text.trim().length < 2) {
      if (field === 'departure') setDepSuggestions([]);
      else setDestSuggestions([]);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      const results = await autocompleteLocation(text, sessionToken.current);
      if (field === 'departure') setDepSuggestions(results);
      else setDestSuggestions(results);
    }, 300);
  }, []);

  const handleSuggestionSelect = useCallback(async (suggestion, field) => {
    const value = suggestion.mainText;
    if (field === 'departure') {
      setDeparture(value);
      setDepSuggestions([]);
    } else {
      setDestination(value);
      setDestSuggestions([]);
    }
    // Geocode to get coordinates
    const geo = await geocodePlace(suggestion.placeId, sessionToken.current);
    if (geo) {
      if (field === 'departure') setDepCoords({ latitude: geo.lat, longitude: geo.lng });
      else setDestCoords({ latitude: geo.lat, longitude: geo.lng });
    }
    sessionToken.current = Math.random().toString(36).substring(2);
  }, []);

  const handleFilterApply = useCallback((newFilters) => {
    setFilters(newFilters);
    if (hasSearched && destination.trim()) {
      // Re-search with new filters immediately
      (async () => {
        setLoading(true);
        try {
          const params = {
            ...newFilters,
            destination: destination.trim(),
          };
          if (departure.trim()) params.departureLocation = departure.trim();
          if (date) params.date = date;
          const res = await getAvailableRides(params);
          setRides(res.data?.rides || []);
        } catch { setRides([]); }
        finally { setLoading(false); }
      })();
    }
  }, [hasSearched, destination, departure, date]);

  const performSearch = useCallback(async (dest, overrideFilters) => {
    if (!dest.trim()) return 0;
    setLoading(true);
    try {
      const activeFilters = overrideFilters !== undefined ? overrideFilters : filters;
      const params = {
        ...activeFilters,
        destination: dest.trim(),
      };
      if (departure.trim()) params.departureLocation = departure.trim();
      if (date) params.date = date;
      const res = await getAvailableRides(params);
      const found = res.data?.rides || [];
      setRides(found);
      return found.length;
    } catch {
      setRides([]);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [filters, departure, date]);

  const transitionToResults = useCallback(() => {
    setHasSearched(true);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!destination.trim()) return;
    setDepSuggestions([]);
    setDestSuggestions([]);
    transitionToResults();
    await performSearch(destination);
  }, [destination, transitionToResults, performSearch]);

  const handleChipSelect = useCallback((dest) => {
    setDestination(dest);
    transitionToResults();
    performSearch(dest);
  }, [transitionToResults, performSearch]);

  const handleBack = useCallback(() => {
    setHasSearched(false);
    setRides([]);
    landingOpacity.setValue(1);
    resultsOpacity.setValue(1);
    logoScale.setValue(0.85);
    welcomeTranslateY.setValue(20);
    wheelSpin.setValue(0);
    setDepSuggestions([]);
    setDestSuggestions([]);
  }, [landingOpacity, resultsOpacity, logoScale, welcomeTranslateY, wheelSpin]);

  const handleDateConfirm = (isoString) => {
    const datePart = isoString.split('T')[0];
    setDate(datePart);
    setShowDatePicker(false);
  };

  // Fit map to ride coordinates whenever rides change
  useEffect(() => {
    if (!hasSearched || !mapRef.current) return;
    const allCoords = [];
    if (depCoords) allCoords.push(depCoords);
    if (destCoords) allCoords.push(destCoords);
    rides.forEach(r => {
      if (r.route?.polyline) {
        const pts = decodePolyline(r.route.polyline);
        if (pts.length > 0) { allCoords.push(pts[0]); allCoords.push(pts[pts.length - 1]); }
      }
      if (r.route?.originLatitude) allCoords.push({ latitude: r.route.originLatitude, longitude: r.route.originLongitude });
      if (r.route?.destinationLatitude) allCoords.push({ latitude: r.route.destinationLatitude, longitude: r.route.destinationLongitude });
    });
    if (allCoords.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoords, { edgePadding: { top: 80, right: 40, bottom: 40, left: 40 }, animated: true });
      }, 300);
    }
  }, [rides, hasSearched, depCoords, destCoords]);

  const firstName = user?.firstName || 'there';

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background}/>

      {!hasSearched ? (
        /* ═══════════════════════════════════════════════
           LANDING VIEW — centered column, no map
           ═══════════════════════════════════════════════ */
        <View style={st.landingContainer}>
          <Animated.View style={[st.landingContent, { opacity: landingOpacity }]}>

            {/* Welcome text */}
            <Animated.Text
              style={[st.welcomeText, { transform: [{ translateY: welcomeTranslateY }] }]}
            >
              Welcome back ! {firstName}
            </Animated.Text>

            {/* Logo circle with animated spinning wheels */}
            <Animated.View style={[st.logoCircle, { transform: [{ scale: logoScale }] }]}>
              <AnimatedCarLogo wheelSpin={wheelSpin} />
            </Animated.View>

            {/* Brand name + tagline */}
            <Animated.View style={{ alignItems: 'center', transform: [{ translateY: welcomeTranslateY }] }}>
              <Text style={st.brandTitle}>AUI Carpool</Text>
              <Text style={st.brandSubtitle}>A Peer-to-Peer Ride-Sharing Platform</Text>
            </Animated.View>

            {/* Search bar — integrated into the centered column */}
            <View style={st.landingSearchWrap}>
              <View style={st.landingSearchBar}>
                <View style={st.searchSegment}>
                  <TextInput
                    style={st.searchSegInput}
                    placeholder="Departure"
                    placeholderTextColor={Colors.textSecondary}
                    value={departure}
                    onChangeText={(t) => handleAutocomplete(t, 'departure')}
                    returnKeyType="next"
                  />
                </View>
                <View style={st.searchDivider} />
                <View style={[st.searchSegment, { flex: 1.2 }]}>
                  <TextInput
                    style={st.searchSegInput}
                    placeholder="Destination"
                    placeholderTextColor={Colors.textSecondary}
                    value={destination}
                    onChangeText={(t) => handleAutocomplete(t, 'destination')}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                  />
                </View>
                <View style={st.searchDivider} />
                {/* Date segment — icon and text on the same row, vertically centered */}
                <TouchableOpacity
                  style={[st.searchSegment, st.searchSegDate]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={14} color={date ? Colors.primary : Colors.textSecondary} />
                  <Text style={[st.searchSegInput, { marginLeft: 4, flex: 0 }, date && { color: Colors.primary }]}>
                    {date || 'Date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.searchBtn} onPress={handleSearch}>
                  <Ionicons name="search" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Autocomplete dropdowns */}
              {depSuggestions.length > 0 && (
                <View style={st.suggestionsBox}>
                  {depSuggestions.map(s => (
                    <TouchableOpacity key={s.placeId} style={st.suggestionRow} onPress={() => handleSuggestionSelect(s, 'departure')}>
                      <Ionicons name="location-outline" size={16} color={Colors.primary} />
                      <View style={{flex:1}}>
                        <Text style={st.suggestionMain}>{s.mainText}</Text>
                        {!!s.secondaryText && <Text style={st.suggestionSub}>{s.secondaryText}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {destSuggestions.length > 0 && (
                <View style={st.suggestionsBox}>
                  {destSuggestions.map(s => (
                    <TouchableOpacity key={s.placeId} style={st.suggestionRow} onPress={() => handleSuggestionSelect(s, 'destination')}>
                      <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                      <View style={{flex:1}}>
                        <Text style={st.suggestionMain}>{s.mainText}</Text>
                        {!!s.secondaryText && <Text style={st.suggestionSub}>{s.secondaryText}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Community button */}
            <TouchableOpacity
              style={st.communityFab}
              onPress={() => navigation.navigate('Community')}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={14} color={Colors.primary} />
              <Text style={st.communityFabText}>Community</Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      ) : (
        /* ═══════════════════════════════════════════════
           RESULTS VIEW — map + ride list after search
           ═══════════════════════════════════════════════ */
        <View style={{ flex: 1 }}>
          {/* Map Area */}
          <View style={st.mapArea}>
            <MapView
              ref={mapRef}
              style={st.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={INITIAL_REGION}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={false}
              toolbarEnabled={false}
            >
              {/* Departure marker */}
              {depCoords && (
                <Marker coordinate={depCoords} title={departure || 'Departure'} pinColor={Colors.primary} />
              )}
              {/* Destination marker */}
              {destCoords && (
                <Marker coordinate={destCoords} title={destination || 'Destination'} pinColor="#E65100" />
              )}
              {/* Draw polyline for each ride that has route data */}
              {rides.map((ride, idx) => {
                if (!ride.route?.polyline) return null;
                const coords = decodePolyline(ride.route.polyline);
                if (coords.length === 0) return null;
                return (
                  <Polyline
                    key={ride._id}
                    coordinates={coords}
                    strokeColor={ROUTE_COLORS[idx % ROUTE_COLORS.length]}
                    strokeWidth={3}
                    lineDashPattern={idx === 0 ? undefined : [6, 4]}
                  />
                );
              })}

              {/* Dynamic ride destination markers from route data */}
              {rides.map((ride) => {
                const coord = ride.route?.destinationLatitude
                  ? { latitude: ride.route.destinationLatitude, longitude: ride.route.destinationLongitude }
                  : null;
                if (!coord) return null;
                const color = getDestColor(ride);
                const isHL = highlightedPin === ride._id;
                return (
                  <Marker key={ride._id} coordinate={coord} tracksViewChanges={false}>
                    <View style={[st.mapPin, { borderColor: color }, isHL && st.mapPinHL]}>
                      <View style={[st.mapPinDot, { backgroundColor: color }]} />
                      <View>
                        <Text style={st.mapPinLabel}>{ride.destination}</Text>
                        <Text style={[st.mapPinPrice, { color }]}>{ride.pricePerSeat} MAD</Text>
                      </View>
                    </View>
                    <Callout
                      tooltip
                      onPress={() => navigation.navigate('RideDetails', { rideId: ride._id })}
                    >
                      <View style={st.callout}>
                        <Text style={st.calloutTitle}>{ride.destination}</Text>
                        <Text style={st.calloutSub}>{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} · {ride.pricePerSeat} MAD</Text>
                        <Text style={[st.calloutAction, { color: Colors.primary }]}>Tap to view →</Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>

            {/* Back button + search bar + filter on results view */}
            <View style={st.resultsTopWrap}>
              <View style={st.resultsTopBar}>
                <TouchableOpacity style={st.backBtn} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={[st.landingSearchBar, { flex: 1 }]}>
                  <View style={st.searchSegment}>
                    <TextInput
                      style={st.searchSegInput}
                      placeholder="Departure"
                      placeholderTextColor={Colors.textSecondary}
                      value={departure}
                      onChangeText={(t) => handleAutocomplete(t, 'departure')}
                      returnKeyType="next"
                    />
                  </View>
                  <View style={st.searchDivider} />
                  <View style={[st.searchSegment, { flex: 1.2 }]}>
                    <TextInput
                      style={st.searchSegInput}
                      placeholder="Destination"
                      placeholderTextColor={Colors.textSecondary}
                      value={destination}
                      onChangeText={(t) => handleAutocomplete(t, 'destination')}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                  </View>
                  <View style={st.searchDivider} />
                  <TouchableOpacity
                    style={[st.searchSegment, st.searchSegDate]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={14} color={date ? Colors.primary : Colors.textSecondary} />
                    <Text style={[st.searchSegInput, { marginLeft: 4, flex: 0 }, date && { color: Colors.primary }]}>
                      {date || 'Date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.searchBtn} onPress={handleSearch}>
                    <Ionicons name="search" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={st.filterIconBtn} onPress={() => setShowFilter(true)}>
                  <Ionicons name="options-outline" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Autocomplete suggestions in results view */}
              {depSuggestions.length > 0 && (
                <View style={[st.suggestionsBox, { marginHorizontal: 0, marginLeft: 48 }]}>
                  {depSuggestions.map(s => (
                    <TouchableOpacity key={s.placeId} style={st.suggestionRow} onPress={() => handleSuggestionSelect(s, 'departure')}>
                      <Ionicons name="location-outline" size={16} color={Colors.primary} />
                      <View style={{flex:1}}>
                        <Text style={st.suggestionMain}>{s.mainText}</Text>
                        {!!s.secondaryText && <Text style={st.suggestionSub}>{s.secondaryText}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {destSuggestions.length > 0 && (
                <View style={[st.suggestionsBox, { marginHorizontal: 0, marginLeft: 48 }]}>
                  {destSuggestions.map(s => (
                    <TouchableOpacity key={s.placeId} style={st.suggestionRow} onPress={() => handleSuggestionSelect(s, 'destination')}>
                      <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                      <View style={{flex:1}}>
                        <Text style={st.suggestionMain}>{s.mainText}</Text>
                        {!!s.secondaryText && <Text style={st.suggestionSub}>{s.secondaryText}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Bottom Sheet — ride results */}
          <View style={st.bottomSheet}>
            <View style={st.handle} />
            <View style={st.sheetHeader}>
              <Text style={st.sheetTitle}>
                {destination ? `Rides to ${destination}` : 'Available Rides'}
              </Text>
              <Text style={st.sheetCount}>{rides.length} found</Text>
            </View>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 20 }} />
            ) : rides.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: Colors.textSecondary, fontSize: Typography.base, marginBottom: 12 }}>
                  No rides found to {destination}
                </Text>
                <TouchableOpacity
                  style={st.postRequestBtn}
                  onPress={() => { setRequestDest(destination); setShowRequest(true); }}
                >
                  <Text style={st.postRequestBtnText}>Post a Ride Request instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {rides.map(ride => (
                  <RideCard key={ride._id} ride={ride} onPress={() => navigation.navigate('RideDetails', { rideId: ride._id })} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <FilterModal visible={showFilter} onClose={() => setShowFilter(false)} onApply={handleFilterApply} />
      <RideRequestModal visible={showRequest} departure={departure} destination={requestDest} onClose={() => { setShowRequest(false); if (rides.length === 0) handleBack(); }} />
      <DateTimePickerModal
        visible={showDatePicker}
        date={new Date()}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(isoString) => handleDateConfirm(isoString)}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background},

  /* ── Landing View ── */
  landingContainer:{flex:1,backgroundColor:Colors.background},
  // Single centered column — everything flows naturally inside this flex container
  landingContent:{
    flex:1,
    alignItems:'center',
    justifyContent:'center',
    paddingHorizontal:Spacing.xl,
    gap: 20,
  },
  landingSearchWrap:{width:'100%',zIndex:100},
  landingSearchBar:{
    flexDirection:'row',alignItems:'center',
    backgroundColor:Colors.surface,borderRadius:Radius.full,
    paddingHorizontal:4,paddingVertical:4,
    borderWidth:1,borderColor:Colors.border,...Shadows.sm,
  },
  // All three segments use flexDirection row so text and icons sit on the same baseline
  searchSegment:{flex:1,flexDirection:'row',alignItems:'center',paddingVertical:11,paddingHorizontal:14},
  searchSegDate:{flex:0.9,flexDirection:'row',alignItems:'center',paddingVertical:11,paddingHorizontal:12,gap:5},
  searchSegText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},
  searchSegTextFilled:{color:Colors.textPrimary,fontFamily:'PlusJakartaSans_600SemiBold'},
  searchSegInput:{flex:1,fontSize:Typography.sm,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary,padding:0,margin:0},
  searchDivider:{width:1,height:22,backgroundColor:Colors.border},
  searchBtn:{width:38,height:38,borderRadius:19,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',marginRight:2},

  welcomeText:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary,textAlign:'center'},
  logoCircle:{width:160,height:160,borderRadius:80,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',...Shadows.lg,overflow:'hidden'},
  brandTitle:{fontSize:Typography['3xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary,textAlign:'center',marginBottom:2},
  brandSubtitle:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,textAlign:'center'},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center',width:'100%'},
  chip:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:8,borderRadius:Radius.full,backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border},
  communityFab:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'center',paddingHorizontal:16,paddingVertical:9,borderRadius:Radius.full,backgroundColor:Colors.surface,borderWidth:1.5,borderColor:Colors.primary},
  communityFabText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  chipText:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary},
  logoImage:{width:90,height:90},


  /* ── Results View ── */
  mapArea:{flex:1,position:'relative'},
  map:{...StyleSheet.absoluteFillObject},
  mapPin:{flexDirection:'row',alignItems:'center',gap:Spacing.xs,backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.sm,borderWidth:2,...Shadows.card},
  mapPinHL:{transform:[{scale:1.1}],...Shadows.lg},
  mapPinDot:{width:10,height:10,borderRadius:5},
  mapPinLabel:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  mapPinPrice:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',marginTop:1},
  callout:{backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.md,...Shadows.card,minWidth:140},
  calloutTitle:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  calloutSub:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:2},
  calloutAction:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',marginTop:4},
  resultsTopWrap:{position:'absolute',top:Platform.OS==='ios'?12:16,left:Spacing.md,right:Spacing.md,zIndex:100},
  resultsTopBar:{flexDirection:'row',alignItems:'center',gap:8},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:Colors.surface,alignItems:'center',justifyContent:'center',...Shadows.sm},
  filterIconBtn:{width:40,height:40,borderRadius:20,backgroundColor:Colors.surface,alignItems:'center',justifyContent:'center',...Shadows.sm},
  bottomSheet:{backgroundColor:Colors.surface,borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:Spacing.lg,paddingTop:Spacing.sm,...Shadows.lg,maxHeight:'35%'},
  handle:{width:36,height:4,borderRadius:2,backgroundColor:Colors.border,alignSelf:'center',marginBottom:Spacing.sm},
  sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.sm},
  sheetTitle:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  sheetCount:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary},
  rideCard:{backgroundColor:Colors.background,borderRadius:Radius.md,padding:Spacing.md,marginBottom:Spacing.sm,borderWidth:1,borderColor:Colors.border},
  rideCardRow:{flexDirection:'row',alignItems:'center',marginBottom:6},
  destDot:{width:8,height:8,borderRadius:4,marginRight:6},
  rideDestText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,flex:1},
  ridePriceText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  rideMetaRow:{flexDirection:'row',alignItems:'center',gap:3,marginBottom:6},
  rideMetaText:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary},
  rideDriverRow:{flexDirection:'row',alignItems:'center'},
  driverAvatar:{width:22,height:22,borderRadius:11,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center',marginRight:6},
  driverAvatarText:{fontSize:9,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  driverName:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary},
  ratingText:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,marginLeft:2},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'flex-end'},
  modalOverlayCenter:{flex:1,backgroundColor:'rgba(0,0,0,0.35)',justifyContent:'center',padding:Spacing.lg},
  filterModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'80%'},
  communityModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'85%'},
  requestModal:{backgroundColor:Colors.surface,borderRadius:Radius.lg,padding:Spacing.xl,maxHeight:'90%'},
  filterHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.lg},
  filterTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  filterLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:8,marginTop:Spacing.md},
  pillRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  fpill:{paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface},
  fpillActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  fpillText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},
  fpillTextActive:{color:'#fff'},
  filterApply:{backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:14,alignItems:'center',marginTop:Spacing.lg},
  filterApplyText:{color:'#fff',fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold'},
  memberRow:{flexDirection:'row',alignItems:'center',gap:Spacing.md,paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.divider},
  memberRank:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.accent,width:28},
  memberAvatar:{width:36,height:36,borderRadius:18,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  memberAvatarText:{fontSize:12,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  memberName:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  memberSub:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary},
  routeRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},
  routeName:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary,width:90},
  barTrack:{flex:1,height:6,backgroundColor:Colors.divider,borderRadius:3,overflow:'hidden'},
  barFill:{height:'100%',backgroundColor:Colors.primary,borderRadius:3},
  routeCount:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary,width:30,textAlign:'right'},
  statsRow:{flexDirection:'row',justifyContent:'space-around',marginTop:Spacing.lg,paddingTop:Spacing.lg,borderTopWidth:1,borderTopColor:Colors.border},
  statBox:{alignItems:'center'},
  statBig:{fontSize:Typography['3xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  statLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:2},
  requestTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,flex:1,marginBottom:8},
  requestSub:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,lineHeight:20,marginBottom:Spacing.lg},
  inputLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4},
  reqInput:{height:44,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,paddingHorizontal:12,fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary,marginBottom:Spacing.md},
  reqTwoCol:{flexDirection:'row',gap:Spacing.md,marginBottom:Spacing.sm},
  reqCol:{flex:1},
  reqFieldInput:{flexDirection:'row',alignItems:'center',gap:6,height:44,backgroundColor:Colors.background,borderRadius:Radius.sm,borderWidth:1,borderColor:Colors.border,paddingHorizontal:Spacing.sm},
  reqFieldText:{flex:1,fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary},
  reqStepperRow:{flexDirection:'row',alignItems:'center',gap:Spacing.lg,height:44,marginBottom:Spacing.sm},
  reqStepBtn:{width:32,height:32,borderRadius:16,backgroundColor:Colors.background,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  reqStepVal:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,minWidth:24,textAlign:'center'},
  requestBtn:{backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:14,alignItems:'center',alignSelf:'stretch',marginTop:Spacing.md},
  requestBtnText:{color:'#fff',fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold'},
  scopeRow:{flexDirection:'row',gap:8,marginBottom:Spacing.md,marginTop:Spacing.sm},
  scopePill:{flex:1,paddingVertical:8,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,alignItems:'center'},
  scopePillActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  scopePillText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary},
  scopePillTextActive:{color:'#fff'},
  postRequestBtn:{backgroundColor:Colors.accent,paddingHorizontal:20,paddingVertical:10,borderRadius:Radius.md},
  postRequestBtnText:{color:'#fff',fontFamily:'PlusJakartaSans_600SemiBold',fontSize:Typography.sm},

  /* ── Autocomplete suggestion dropdown ── */
  suggestionsBox:{backgroundColor:Colors.surface,marginHorizontal:Spacing.lg,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.border,...Shadows.card,marginTop:4,maxHeight:200},
  suggestionRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,paddingHorizontal:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:Colors.divider},
  suggestionMain:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  suggestionSub:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:1},
});
