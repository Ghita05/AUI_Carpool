import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, TextInput, Platform, Modal,
  KeyboardAvoidingView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getAvailableRides } from '../../services/rideService';
import { postRideRequest } from '../../services/rideService';
import DateTimePickerModal from '../../components/DateTimePickerModal';

const { width } = Dimensions.get('window');

const PIN_POS = { Fez:{ top:'22%', right:'12%' }, Rabat:{ top:'48%', left:'8%' }, Meknes:{ bottom:'32%', left:'32%' }, Casablanca:{ bottom:'48%', left:'5%' } };

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
  const [dest,setDest]=useState('');
  const [date,setDate]=useState('Today');
  const [gender,setGender]=useState('All');
  const [smoking,setSmoking]=useState('Any');
  const Pill = ({label,active,onPress}) => <TouchableOpacity style={[st.fpill,active&&st.fpillActive]} onPress={onPress}><Text style={[st.fpillText,active&&st.fpillTextActive]}>{label}</Text></TouchableOpacity>;

  const handleApply = () => {
    const filters = {};
    if (dest) filters.destination = dest;
    if (gender === 'Women only') filters.genderPreference = 'Women-Only';
    onApply(filters);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}><View style={st.filterModal}>
        <View style={st.filterHeader}><Text style={st.filterTitle}>Filters</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={st.filterLabel}>DESTINATION</Text>
          <View style={st.pillRow}>{['Fez','Meknes','Casablanca','Rabat'].map(d=><Pill key={d} label={d} active={dest===d} onPress={()=>setDest(prev=>prev===d?'':d)}/>)}</View>
          <Text style={st.filterLabel}>DATE</Text>
          <View style={st.pillRow}>{['Today','Tomorrow'].map(d=><Pill key={d} label={d} active={date===d} onPress={()=>setDate(d)}/>)}</View>
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
  const routes = [{route:'AUI → Fez',count:142,pct:100},{route:'AUI → Rabat',count:98,pct:69},{route:'AUI → Meknes',count:76,pct:54}];
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

function RideRequestModal({ visible, destination, onClose }) {
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
    onClose();
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
          departureLocation: 'AUI Campus',
          destination,
          travelDateTime: travelDateTime.toISOString(),
          passengerCount: groupUsers.length,
          maxPrice: 200,
          notes,
          groupPassengerIds: groupUsers.map(u => u._id),
          stops,
        };
      } else {
        reqObj = {
          departureLocation: 'AUI Campus',
          destination,
          travelDateTime: travelDateTime.toISOString(),
          passengerCount: seats,
          maxPrice: 200,
          notes,
          stops,
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

                <Text style={[st.inputLabel, { marginTop: Spacing.md }]}>STOPS (OPTIONAL)</Text>
                <View style={{flexDirection:'row',gap:8,marginBottom:stops.length?8:0}}>
                  <TextInput style={[st.reqInput,{flex:1}]} value={newStop} onChangeText={setNewStop} placeholder="Add a stop along the way" placeholderTextColor={Colors.textDisabled} />
                  <TouchableOpacity
                    style={{height:42,width:42,backgroundColor:Colors.primary,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'}}
                    onPress={()=>{ const s=newStop.trim(); if(s&&!stops.includes(s)){setStops([...stops,s]);setNewStop('');} }}
                  >
                    <Ionicons name="add" size={20} color="#fff"/>
                  </TouchableOpacity>
                </View>
                {stops.length>0&&(
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:4}}>
                    {stops.map((s,i)=>(
                      <View key={i} style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:10,paddingVertical:4,borderRadius:16}}>
                        <Text style={{color:Colors.primary,fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold'}}>{s}</Text>
                        <TouchableOpacity onPress={()=>setStops(stops.filter((_,j)=>j!==i))} style={{marginLeft:6}}>
                          <Ionicons name="close-circle" size={14} color={Colors.error}/>
                        </TouchableOpacity>
                      </View>
                    ))}
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
  const { isDriver } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestDest, setRequestDest] = useState('');
  const [highlightedPin, setHighlightedPin] = useState(null);
  const [filters, setFilters] = useState({});

  const fetchRides = useCallback(async (params = {}, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAvailableRides({ ...filters, ...params });
      setRides(res.data?.rides || []);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  // Re-fetch when screen regains focus — ensures rides cancelled by drivers
  // are removed from the available list without requiring a manual pull-to-refresh
  useFocusEffect(useCallback(() => { fetchRides({}, true); }, [fetchRides]));

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    if (!searchText.trim()) return;
    const match = rides.find(r => r.destination.toLowerCase().includes(searchText.toLowerCase()));
    if (match) {
      setHighlightedPin(match.destination);
      setTimeout(() => navigation.navigate('RideDetails', { rideId: match._id }), 600);
    } else {
      setRequestDest(searchText.trim());
      setShowRequest(true);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (text.trim()) {
      const match = rides.find(r => r.destination.toLowerCase().includes(text.toLowerCase()));
      setHighlightedPin(match ? match.destination : null);
    } else {
      setHighlightedPin(null);
    }
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background}/>

      {/* Map Area */}
      <View style={st.mapArea}>
        <View style={st.mapBg}>
          {[0.2,0.4,0.6,0.8].map(p=><View key={`h${p}`} style={[st.gridH,{top:`${p*100}%`}]}/>)}
          {[0.25,0.5,0.75].map(p=><View key={`v${p}`} style={[st.gridV,{left:`${p*100}%`}]}/>)}

          <Text style={[st.cityLabel,{top:'15%',right:'8%'}]}>FEZ</Text>
          <Text style={[st.cityLabel,{top:'42%',left:'5%'}]}>RABAT</Text>
          <Text style={[st.cityLabel,{bottom:'25%',left:'28%'}]}>MEKNES</Text>
          <Text style={[st.cityLabel,{bottom:'10%',right:'10%'}]}>IFRANE</Text>

          <View style={[st.auiMarker,{bottom:'12%',right:'15%'}]}><Text style={st.auiText}>AUI</Text></View>

          {/* Dynamic ride pins */}
          {rides.map(ride => {
            const pos = PIN_POS[ride.destination] || PIN_POS[Object.keys(PIN_POS).find(k => ride.destination.includes(k))] || {};
            if (!Object.keys(pos).length) return null;
            const color = getDestColor(ride);
            const isHL = highlightedPin === ride.destination;
            return (
              <TouchableOpacity key={ride._id} style={[st.ridePin,pos,{borderColor:color},isHL&&st.ridePinHL]} onPress={()=>navigation.navigate('RideDetails',{rideId:ride._id})} activeOpacity={0.7}>
                <View style={[st.pinDot,{backgroundColor:color}]}/>
                <View><Text style={st.pinLabel}>{ride.destination}</Text><Text style={st.pinPrice}>{ride.pricePerSeat} MAD</Text></View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={st.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={{marginRight:Spacing.sm}}/>
          <TextInput style={st.searchInput} placeholder="Where are you going?" placeholderTextColor={Colors.textDisabled} value={searchText} onChangeText={handleSearchChange} onSubmitEditing={handleSearch} returnKeyType="search"/>
          <TouchableOpacity onPress={()=>setShowFilter(true)}><Ionicons name="options-outline" size={18} color={Colors.textSecondary}/></TouchableOpacity>
        </View>

        <TouchableOpacity style={st.communityBadge} onPress={()=>setShowCommunity(true)}>
          <Ionicons name="trophy-outline" size={14} color={Colors.primary}/>
          <Text style={st.communityText}>Community</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={st.bottomSheet}>
        <View style={st.handle}/>
        <View style={st.sheetHeader}><Text style={st.sheetTitle}>Available Rides</Text><Text style={st.sheetCount}>{rides.length} rides</Text></View>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{paddingVertical:20}}/>
        ) : rides.length === 0 ? (
          <Text style={{textAlign:'center',color:Colors.textSecondary,paddingVertical:20,fontSize:Typography.base}}>No rides available right now</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {rides.map(ride=><RideCard key={ride._id} ride={ride} onPress={()=>navigation.navigate('RideDetails',{rideId:ride._id})}/>)}
          </ScrollView>
        )}
      </View>

      <FilterModal visible={showFilter} onClose={()=>setShowFilter(false)} onApply={handleFilterApply}/>
      <CommunityModal visible={showCommunity} onClose={()=>setShowCommunity(false)}/>
      <RideRequestModal visible={showRequest} destination={requestDest} onClose={()=>setShowRequest(false)}/>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background},
  mapArea:{flex:1,position:'relative',overflow:'hidden'},
  mapBg:{flex:1,backgroundColor:'#E8F5E9',position:'relative'},
  gridH:{position:'absolute',left:0,right:0,height:1,backgroundColor:'rgba(27,94,32,0.06)'},
  gridV:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:'rgba(27,94,32,0.06)'},
  cityLabel:{position:'absolute',fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:'rgba(27,94,32,0.2)',letterSpacing:2},
  auiMarker:{position:'absolute',backgroundColor:Colors.primary,paddingHorizontal:12,paddingVertical:5,borderRadius:14,...Shadows.md},
  auiText:{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  ridePin:{position:'absolute',flexDirection:'row',alignItems:'center',gap:Spacing.xs,backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.sm,borderWidth:2,...Shadows.card},
  ridePinHL:{transform:[{scale:1.1}],...Shadows.lg},
  pinDot:{width:10,height:10,borderRadius:5},
  pinLabel:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  pinPrice:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary,marginTop:1},
  searchBar:{position:'absolute',top:Platform.OS==='ios'?12:16,left:Spacing.lg,right:Spacing.lg,flexDirection:'row',alignItems:'center',backgroundColor:Colors.surface,borderRadius:Radius.full,paddingHorizontal:Spacing.md,paddingVertical:10,...Shadows.card},
  searchInput:{flex:1,fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary},
  communityBadge:{position:'absolute',top:Platform.OS==='ios'?62:66,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:Colors.surface,paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,...Shadows.sm},
  communityText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
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
  // Date + Time side-by-side layout inside the request modal
  reqTwoCol:{flexDirection:'row',gap:Spacing.md,marginBottom:Spacing.sm},
  reqCol:{flex:1},
  reqFieldInput:{flexDirection:'row',alignItems:'center',gap:6,height:44,backgroundColor:Colors.background,borderRadius:Radius.sm,borderWidth:1,borderColor:Colors.border,paddingHorizontal:Spacing.sm},
  reqFieldText:{flex:1,fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary},
  // Stepper for seats
  reqStepperRow:{flexDirection:'row',alignItems:'center',gap:Spacing.lg,height:44,marginBottom:Spacing.sm},
  reqStepBtn:{width:32,height:32,borderRadius:16,backgroundColor:Colors.background,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
  reqStepVal:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,minWidth:24,textAlign:'center'},
  requestBtn:{backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:14,alignItems:'center',marginTop:Spacing.sm},
  requestBtnText:{color:'#fff',fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold'},
});
