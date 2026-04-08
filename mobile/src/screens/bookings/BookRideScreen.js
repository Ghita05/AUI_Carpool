import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { getRideDetails } from '../../services/rideService';
import { bookRide } from '../../services/bookingService';

const LUGGAGE = ['No luggage','1 small bag','1 suitcase','2+ bags'];
function Card({children,style}){return <View style={[st.card,style]}>{children}</View>;}

export default function BookRideScreen({ navigation, route }) {
  const rideId = route?.params?.rideId;
  const [ride,setRide]=useState(null);
  const [loading,setLoading]=useState(true);
  const [booking,setBooking]=useState(false);
  const [seats,setSeats]=useState(1);
  const [selectedStop,setSelectedStop]=useState('');
  const [luggage,setLuggage]=useState('1 suitcase');
  const [suggestedStop,setSuggestedStop]=useState('');

  useEffect(()=>{
    if(!rideId) return;
    getRideDetails(rideId).then(r=>{
      const rd=r.data?.ride;
      setRide(rd);
      if(rd?.stops?.length) setSelectedStop(rd.departureLocation);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[rideId]);

  if(loading) return <SafeAreaView style={st.safe} edges={['top']}><ActivityIndicator color={Colors.primary} style={{flex:1}}/></SafeAreaView>;
  if(!ride) return <SafeAreaView style={st.safe} edges={['top']}><Text style={{textAlign:'center',marginTop:40,color:Colors.textSecondary}}>Ride not found</Text></SafeAreaView>;

  const driver = ride.driverId||{};
  const vehicle = ride.vehicleId||{};
  const total = seats * ride.pricePerSeat;
  const allStops = [ride.departureLocation,...(ride.stops||[])];

  const handleConfirm = async () => {
    setBooking(true);
    try {
      const res = await bookRide(rideId, {
        seatsCount: seats,
        pickupLocation: suggestedStop || selectedStop,
        luggageDeclaration: luggage,
      });
      navigation.navigate('BookingConfirmation', {
        bookingId: res.data?.bookingId,
        seats, stop: suggestedStop||selectedStop, luggage, total,
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
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Departure</Text><Text style={st.summaryVal}>{new Date(ride.departureDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Driver</Text><Text style={st.summaryVal}>{driver.firstName} {driver.lastName}</Text></View>
              <View style={st.summaryItem}><Text style={st.summaryLabel}>Vehicle</Text><Text style={st.summaryVal}>{vehicle.brand} {vehicle.model}</Text></View>
            </View>
          </Card>

          <Card>
            <View style={st.rowBetween}><Text style={st.cardLabel}>Number of Seats</Text><Text style={st.subLabel}>{ride.availableSeats} available</Text></View>
            <View style={st.stepperRow}>
              <TouchableOpacity style={[st.stepBtn,seats<=1&&st.stepBtnDisabled]} onPress={()=>seats>1&&setSeats(s=>s-1)}><Ionicons name="remove" size={16} color={seats<=1?Colors.textDisabled:Colors.textPrimary}/></TouchableOpacity>
              <Text style={st.stepperVal}>{seats}</Text>
              <TouchableOpacity style={[st.stepBtn,seats>=ride.availableSeats&&st.stepBtnDisabled]} onPress={()=>seats<ride.availableSeats&&setSeats(s=>s+1)}><Ionicons name="add" size={16} color={seats>=ride.availableSeats?Colors.textDisabled:Colors.textPrimary}/></TouchableOpacity>
            </View>
          </Card>

          <Card>
            <View style={st.rowBetween}><Text style={st.cardLabel}>Your Stop</Text><Text style={st.subLabel}>{allStops.length} stops</Text></View>
            <Text style={st.stopsHint}>Select where you want to board</Text>
            <View style={st.pillRow}>
              {allStops.map(stop=>(<TouchableOpacity key={stop} style={[st.pill,selectedStop===stop&&st.pillActive]} onPress={()=>setSelectedStop(stop)}><Text style={[st.pillText,selectedStop===stop&&st.pillTextActive]}>{stop}</Text></TouchableOpacity>))}
            </View>
            <Text style={[st.stopsHint,{marginTop:12}]}>Or suggest a new stop</Text>
            <TextInput style={st.stopInput} placeholder="e.g. Ifrane Hay Riad" value={suggestedStop} onChangeText={setSuggestedStop} placeholderTextColor={Colors.textDisabled}/>
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
  totalRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},totalLabel:{fontSize:14,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},totalVal:{fontSize:16,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  bottomBar:{padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border,alignItems:'center'},confirmBtn:{width:'100%',height:52,backgroundColor:Colors.primary,borderRadius:Radius.md,alignItems:'center',justifyContent:'center'},confirmBtnText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},disclaimer:{fontSize:11,color:Colors.textSecondary,marginTop:8},
});
