import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getRideDetails } from '../../services/rideService';
import { bookRide, requestAdditionalStop, validateStopOnRoute } from '../../services/bookingService';
import { autocompleteLocation } from '../../utils/mapsService';

const LUGGAGE = ['No luggage','1 small bag','1 suitcase','2+ bags'];
function Card({children,style}){return <View style={[st.card,style]}>{children}</View>;}

export default function BookRideScreen({ navigation, route }) {
  const { user } = useAuth();
  const rideId = route?.params?.rideId;
  const [ride,setRide]=useState(null);
  const [loading,setLoading]=useState(true);
  const [booking,setBooking]=useState(false);
  const [seats,setSeats]=useState(1);
  const [luggage,setLuggage]=useState('1 suitcase');
  const [suggestedStop,setSuggestedStop]=useState('');
  const suggestedStopRef = useRef('');
  const [stopQuery, setStopQuery] = useState('');
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [validatingStop, setValidatingStop] = useState(false);
  const [stopValid, setStopValid] = useState(null); // null | true | false
  const sessionTokenRef = useRef(`${Date.now()}`);
  const debounceRef = useRef(null);

  useEffect(()=>{
    if(!rideId) return;
    getRideDetails(rideId).then(r=>{
      const rd=r.data?.ride;
      setRide(rd);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[rideId]);

  // ── Stop autocomplete with debounce ──
  const handleStopQueryChange = useCallback((text) => {
    setStopQuery(text);
    setSuggestedStop('');
    suggestedStopRef.current = '';
    setStopValid(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 2) { setStopSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocompleteLocation(text, sessionTokenRef.current);
        setStopSuggestions(results || []);
      } catch { setStopSuggestions([]); }
    }, 400);
  }, []);

  // ── When user picks a suggestion, validate it against the ride route ──
  const handlePickSuggestion = useCallback(async (suggestion) => {
    const label = suggestion.description || suggestion.mainText;
    setStopQuery(label);
    setStopSuggestions([]);
    setValidatingStop(true);
    setStopValid(null);
    try {
      const res = await validateStopOnRoute(rideId, label);
      const data = res.data || res;
      if (data.onRoute) {
        setSuggestedStop(label);
        suggestedStopRef.current = label;
        setStopValid(true);
      } else {
        setStopValid(false);
        setSuggestedStop('');
        suggestedStopRef.current = '';
      }
    } catch {
      setStopValid(false);
    } finally { setValidatingStop(false); }
  }, [rideId]);

  if(loading) return <SafeAreaView style={st.safe} edges={['top']}><ActivityIndicator color={Colors.primary} style={{flex:1}}/></SafeAreaView>;
  if(!ride) return <SafeAreaView style={st.safe} edges={['top']}><Text style={{textAlign:'center',marginTop:40,color:Colors.textSecondary}}>Ride not found</Text></SafeAreaView>;

  const driver = ride.driverId||{};
  const vehicle = ride.vehicleId||{};
  const total = seats * ride.pricePerSeat;

  // ── Compatibility warnings ──
  const warnings = [];

  // Gender check
  if (ride.genderPreference === 'Women-Only' && user?.gender && user.gender !== 'Female') {
    warnings.push({ icon: 'female-outline', color: '#E91E63', text: 'This ride is Women-Only. Your gender may not match this preference.' });
  }

  // Smoking preference check
  if (user?.smokingPreference && vehicle?.smokingPolicy) {
    if (user.smokingPreference === 'Non-smoker' && vehicle.smokingPolicy === 'Allowed') {
      warnings.push({ icon: 'ban-outline', color: '#FF9800', text: 'You prefer non-smoking, but smoking is allowed in this vehicle.' });
    }
    if (user.smokingPreference === 'Smoker' && vehicle.smokingPolicy === 'Not Allowed') {
      warnings.push({ icon: 'ban-outline', color: '#FF9800', text: 'You are a smoker, but smoking is not allowed in this vehicle.' });
    }
  }

  // Driving style check
  if (user?.drivingStyle && driver?.drivingStyle && user.drivingStyle !== driver.drivingStyle) {
    const styleMap = { Calm: 1, Moderate: 2, Fast: 3 };
    const diff = Math.abs((styleMap[user.drivingStyle]||0) - (styleMap[driver.drivingStyle]||0));
    if (diff >= 2) {
      warnings.push({ icon: 'speedometer-outline', color: '#FF9800', text: `Your driving style preference is "${user.drivingStyle}" but the driver's style is "${driver.drivingStyle}".` });
    }
  }

  const handleConfirm = async () => {
    setBooking(true);
    try {
      const stopValue = suggestedStop || suggestedStopRef.current;
      const res = await bookRide(rideId, {
        seatsCount: seats,
        pickupLocation: ride.departureLocation,
        luggageDeclaration: luggage,
      });
      
      const bookingId = res.data?.bookingId;
      
      if (!bookingId) {
        Alert.alert('Error', 'Booking created but ID missing. Please try again.');
        setBooking(false);
        return;
      }
      
      // If passenger suggested a custom stop, submit it after booking
      if (stopValue && stopValue.trim()) {
        try {
          await requestAdditionalStop(bookingId, stopValue.trim());
        } catch (stopErr) {
          Alert.alert('Stop Request Failed', stopErr?.response?.data?.message || 'Could not submit stop request');
        }
      }
      
      navigation.navigate('BookingConfirmation', {
        bookingId,
        seats, stop: stopValue||'', luggage, total,
        ride: { departure: ride.departureLocation, destination: ride.destination, departureTime: ride.departureDateTime, driver: `${driver.firstName} ${driver.lastName}`, vehicle: `${vehicle.brand} ${vehicle.model}` },
      });
    } catch (err) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Could not complete booking.');
    } finally { setBooking(false); }
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}><TouchableOpacity onPress={()=>navigation.goBack()} style={st.headerBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary}/></TouchableOpacity><Text style={st.headerTitle}>Book a Ride</Text><View style={{width:36}}/></View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <ScrollView style={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card style={{marginTop:Spacing.lg}}>
            <View style={st.summaryRoute}><Ionicons name="location" size={14} color={Colors.primary}/><Text style={st.summaryRouteText}>{ride.departureLocation} → {ride.destination}</Text></View>
            <View style={st.divider}/>
            <View style={st.summaryGrid}>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Date</Text><Text style={st.summaryVal}>{new Date(ride.departureDateTime).toLocaleDateString([],{month:'short',day:'numeric'})}</Text></View>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Departure</Text><Text style={st.summaryVal}>{new Date(ride.departureDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Driver</Text><Text style={st.summaryVal}>{driver.firstName} {driver.lastName}</Text></View>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Vehicle</Text><Text style={st.summaryVal}>{vehicle.brand} {vehicle.model}</Text></View>
            </View>
          </Card>

          {/* Compatibility Warnings */}
          {warnings.length > 0 && (
            <View style={st.warningsCard}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                <Ionicons name="information-circle" size={16} color="#FF9800"/>
                <Text style={st.warningsTitle}>Compatibility Notice</Text>
              </View>
              {warnings.map((w, i) => (
                <View key={i} style={st.warningRow}>
                  <Ionicons name={w.icon} size={14} color={w.color}/>
                  <Text style={st.warningText}>{w.text}</Text>
                </View>
              ))}
              <Text style={st.warningsNote}>These are informational only — you can still book this ride.</Text>
            </View>
          )}

          <Card>
            <View style={st.rowBetween}><Text style={st.cardLabel}>Number of Seats</Text><Text style={st.subLabel}>1 available</Text></View>
            <View style={{alignItems: 'center', paddingVertical: 16}}>
              <Text style={st.stepperVal}>1</Text>
              <Text style={[st.stopsHint, {marginTop: 12}]}>Only 1 seat per passenger</Text>
            </View>
          </Card>

          <Card>
            <View style={st.rowBetween}><Text style={st.cardLabel}>Suggest a Stop</Text></View>
            <Text style={st.stopsHint}>
              Suggest a stop along the route — this is not your pickup or dropoff point, just a waypoint you'd like the driver to pass through. Only locations on the ride's route will be accepted.
            </Text>
            <View style={{position:'relative',zIndex:10}}>
              <TextInput 
                style={[st.stopInput, stopValid === true && st.stopInputValid, stopValid === false && st.stopInputInvalid]} 
                placeholder="Search for a city or place along the route" 
                value={stopQuery} 
                onChangeText={handleStopQueryChange}
                placeholderTextColor={Colors.textDisabled}
              />
              {validatingStop && <ActivityIndicator size="small" color={Colors.primary} style={{position:'absolute',right:12,top:12}}/>}
              {stopSuggestions.length > 0 && (
                <View style={st.suggestionsBox}>
                  {stopSuggestions.map((s, i) => (
                    <TouchableOpacity key={s.placeId || i} style={st.suggestionItem} onPress={() => handlePickSuggestion(s)}>
                      <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                      <View style={{flex:1,marginLeft:8}}>
                        <Text style={st.suggestionMain} numberOfLines={1}>{s.mainText}</Text>
                        <Text style={st.suggestionSecondary} numberOfLines={1}>{s.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {stopValid === true && (
              <View style={st.stopFeedback}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50"/>
                <Text style={[st.stopFeedbackText, {color:'#4CAF50'}]}>This stop is on the route</Text>
              </View>
            )}
            {stopValid === false && (
              <View style={st.stopFeedback}>
                <Ionicons name="close-circle" size={14} color="#E53935"/>
                <Text style={[st.stopFeedbackText, {color:'#E53935'}]}>This stop is not on the route — please choose another</Text>
              </View>
            )}
          </Card>

          <Card>
            <Text style={st.cardLabel}>Luggage</Text>
            <Text style={st.stopsHint}>Drivers need to plan space in advance</Text>
            <View style={st.pillRow}>
              {LUGGAGE.map(l=>(<TouchableOpacity key={l} style={[st.pill,luggage===l&&st.pillActive]} onPress={()=>setLuggage(l)}><Text style={[st.pillText,luggage===l&&st.pillTextActive]}>{l}</Text></TouchableOpacity>))}
            </View>
          </Card>

          <Card>
            <View style={st.totalRow}><Text style={st.totalLabel}>{seats} seat{seats>1?'s':''} × {ride.pricePerSeat} MAD</Text><Text style={st.totalVal}>{total} MAD</Text></View>
            <View style={[st.divider,{marginVertical:8}]}/>
            <View style={st.totalRow}><Text style={[st.totalLabel,{fontFamily:'PlusJakartaSans_700Bold',fontSize:16}]}>Total</Text><Text style={[st.totalVal,{fontSize:18}]}>{total} MAD</Text></View>
          </Card>
          <View style={{height:20}}/>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={st.bottomBar}>
        <TouchableOpacity style={st.confirmBtn} onPress={handleConfirm} disabled={booking}>
          <Text style={st.confirmBtnText}>{booking?'Booking...':'Confirm Booking'}</Text>
        </TouchableOpacity>
        <Text style={st.disclaimer}>You won't be charged until the driver confirms</Text>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.background},header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.lg,backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},headerBtn:{width:36,height:36,alignItems:'center',justifyContent:'center'},headerTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  scroll:{flex:1,paddingHorizontal:Spacing.lg},card:{backgroundColor:Colors.surface,borderRadius:Radius.md,padding:Spacing.lg,marginBottom:Spacing.md,...Shadows.card},
  summaryRoute:{flexDirection:'row',alignItems:'center',gap:6},summaryRouteText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},divider:{height:1,backgroundColor:Colors.border,marginVertical:Spacing.md},
  summaryGrid:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.md},summaryItem:{width:'45%'},summaryLabel:{fontSize:10,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5},summaryVal:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary,marginTop:2},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},cardLabel:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},subLabel:{fontSize:Typography.sm,color:Colors.textSecondary},
  stepperRow:{flexDirection:'row',alignItems:'center',gap:16},stepBtn:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},stepBtnDisabled:{borderColor:Colors.divider},stepperVal:{fontSize:22,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,minWidth:28,textAlign:'center'},
  stopsHint:{fontSize:11,color:Colors.textSecondary,marginBottom:8},pillRow:{flexDirection:'row',flexWrap:'wrap',gap:8},pill:{paddingHorizontal:14,paddingVertical:8,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.background},pillActive:{backgroundColor:Colors.primaryBg,borderColor:Colors.primary},pillText:{fontSize:12,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},pillTextActive:{color:Colors.primary,fontFamily:'PlusJakartaSans_600SemiBold'},
  stopInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,fontSize:13,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary,marginTop:4},
  stopInputValid:{borderColor:'#4CAF50',borderWidth:1.5},
  stopInputInvalid:{borderColor:'#E53935',borderWidth:1.5},
  suggestionsBox:{position:'absolute',top:48,left:0,right:0,backgroundColor:Colors.surface,borderRadius:8,borderWidth:1,borderColor:Colors.border,...Shadows.card,zIndex:20,maxHeight:200},
  suggestionItem:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:Colors.border},
  suggestionMain:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  suggestionSecondary:{fontSize:11,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginTop:1},
  stopFeedback:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},
  stopFeedbackText:{fontSize:12,fontFamily:'PlusJakartaSans_500Medium'},
  totalRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},totalLabel:{fontSize:14,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},totalVal:{fontSize:16,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  warningsCard:{backgroundColor:'#FFF8E1',borderRadius:Radius.md,padding:Spacing.lg,marginBottom:Spacing.md,borderWidth:1,borderColor:'#FFE082'},
  warningsTitle:{fontSize:13,fontFamily:'PlusJakartaSans_700Bold',color:'#F57F17'},
  warningRow:{flexDirection:'row',alignItems:'flex-start',gap:8,marginBottom:6},
  warningText:{flex:1,fontSize:12,fontFamily:'PlusJakartaSans_500Medium',color:'#795548',lineHeight:17},
  warningsNote:{fontSize:10,fontFamily:'PlusJakartaSans_400Regular',color:'#9E9E9E',marginTop:6,fontStyle:'italic'},
  bottomBar:{padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border,alignItems:'center'},confirmBtn:{width:'100%',height:52,backgroundColor:Colors.primary,borderRadius:Radius.md,alignItems:'center',justifyContent:'center'},confirmBtnText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},disclaimer:{fontSize:11,color:Colors.textSecondary,marginTop:8},
});
