import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export default function BookingConfirmationScreen({ navigation, route }) {
  const { seats=1, stop='AUI Main Gate', luggage='1 suitcase', total=50, bookingId, ride: rideInfo } = route?.params || {};

  const departure = rideInfo?.departure || 'AUI Main Gate';
  const destination = rideInfo?.destination || 'Fez Airport';
  const departureTime = rideInfo?.departureTime ? new Date(rideInfo.departureTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '14:00';
  const departureDate = rideInfo?.departureTime ? new Date(rideInfo.departureTime).toLocaleDateString() : 'Today';
  const driverName = rideInfo?.driver || 'Driver';
  const vehicleName = rideInfo?.vehicle || 'Vehicle';

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}><Text style={st.headerTitle}>Booking Confirmed</Text></View>
      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Success Hero */}
        <View style={st.hero}>
          <View style={st.successCircle}><Ionicons name="checkmark" size={36} color="#fff"/></View>
          <Text style={st.heroTitle}>You're all set!</Text>
          <Text style={st.heroSub}>{bookingId ? `Booking confirmed` : 'Booking is confirmed'}</Text>
        </View>
        {/* Ride Details */}
        <View style={st.card}>
          <Text style={st.sectionLabel}>RIDE DETAILS</Text>
          <View style={st.routeRow}><Ionicons name="location" size={14} color={Colors.primary}/><Text style={st.routeText}>{departure} → {destination}</Text></View>
          <View style={st.divider}/>
          <View style={st.infoGrid}>
            {[{icon:'calendar-outline',val:departureDate,label:'Date'},{icon:'time-outline',val:departureTime,label:'Departure'},{icon:'person-outline',val:driverName,label:'Driver'},{icon:'car-outline',val:vehicleName,label:'Vehicle'}].map((item,i)=>(
              <View key={i} style={st.infoItem}><Ionicons name={item.icon} size={13} color={Colors.textSecondary}/><Text style={st.infoVal}>{item.val}</Text><Text style={st.infoLabel}>{item.label}</Text></View>
            ))}
          </View>
          <View style={st.divider}/>
          <View style={st.totalRow}><Text style={st.totalLabel}>Total</Text><Text style={st.totalVal}>{total} MAD</Text></View>
        </View>
        {/* What's Next */}
        <View style={st.card}>
          <Text style={st.sectionLabel}>WHAT'S NEXT?</Text>
          {[{num:'1',title:'Driver confirms your booking',sub:'Usually within a few hours'},{num:'2',title:'You\'ll receive a notification',sub:'Check your alerts tab'},{num:'3',title:'Meet at departure time',sub:`${departure} — be there 10 min early`}].map((s,i)=>(
            <View key={i} style={st.stepRow}>
              <View style={st.stepNum}><Text style={st.stepNumText}>{s.num}</Text></View>
              <View style={{flex:1}}><Text style={st.stepTitle}>{s.title}</Text><Text style={st.stepSub}>{s.sub}</Text></View>
            </View>
          ))}
        </View>
        {/* Rating note */}
        <View style={st.card}>
          <Text style={st.sectionLabel}>RATE YOUR EXPERIENCE</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary}/>
            <Text style={{fontSize:13,color:Colors.textSecondary,flex:1}}>You can rate this ride after it's completed. Check My Rides for past rides.</Text>
          </View>
        </View>
        {/* Info banner */}
        <View style={st.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#92400E"/>
          <Text style={st.infoText}>Payment is handled in cash. Please have the exact amount ready.</Text>
        </View>
        <View style={{height:20}}/>
      </ScrollView>
      {/* Bottom Actions */}
      <View style={st.bottomBar}>
        <TouchableOpacity style={st.outlineBtn} onPress={()=>navigation.navigate('Main')}>
          <Text style={st.outlineBtnText}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.primaryBtn} onPress={()=>navigation.navigate('Main',{screen:'Rides'})}>
          <Text style={st.primaryBtnText}>My Rides</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.background},
  header:{height:56,alignItems:'center',justifyContent:'center',backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},
  headerTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  scroll:{flex:1},
  hero:{alignItems:'center',paddingVertical:Spacing['2xl'],backgroundColor:Colors.primaryBg},
  successCircle:{width:64,height:64,borderRadius:32,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',marginBottom:12},
  heroTitle:{fontSize:Typography['3xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  heroSub:{fontSize:Typography.base,color:Colors.textSecondary,marginTop:4},
  card:{backgroundColor:Colors.surface,marginHorizontal:Spacing.lg,marginTop:Spacing.md,borderRadius:Radius.md,padding:Spacing.lg,...Shadows.card},
  sectionLabel:{fontSize:10,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.8,marginBottom:Spacing.md},
  routeRow:{flexDirection:'row',alignItems:'center',gap:6},
  routeText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  divider:{height:1,backgroundColor:Colors.border,marginVertical:Spacing.md},
  infoGrid:{flexDirection:'row',flexWrap:'wrap'},
  infoItem:{width:'50%',marginBottom:Spacing.md},
  infoVal:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary,marginTop:2},
  infoLabel:{fontSize:Typography.xs,color:Colors.textSecondary,marginTop:1},
  totalRow:{flexDirection:'row',justifyContent:'space-between'},
  totalLabel:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  totalVal:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  driverRow:{flexDirection:'row',alignItems:'center'},
  driverAvatar:{width:44,height:44,borderRadius:22,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},
  driverAvatarText:{fontSize:14,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  driverInfo:{flex:1,marginLeft:Spacing.sm},
  driverName:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  ratingRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:2},
  ratingText:{fontSize:Typography.sm,color:Colors.textSecondary},
  msgBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:Spacing.md,height:36,borderRadius:Radius.sm,borderWidth:1.5,borderColor:Colors.primary},
  msgBtnText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  stepRow:{flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:14},
  stepNum:{width:28,height:28,borderRadius:14,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  stepNumText:{fontSize:12,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  stepTitle:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  stepSub:{fontSize:11,color:Colors.textSecondary,marginTop:2},
  infoBanner:{flexDirection:'row',alignItems:'flex-start',gap:10,marginHorizontal:Spacing.lg,marginTop:Spacing.md,padding:Spacing.md,backgroundColor:'#FFFBEB',borderRadius:Radius.md,borderWidth:1,borderColor:Colors.accent},
  infoText:{flex:1,fontSize:Typography.sm,color:'#92400E'},
  bottomBar:{flexDirection:'row',gap:Spacing.sm,padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border},
  outlineBtn:{flex:1,height:50,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  outlineBtnText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  primaryBtn:{flex:1,height:50,backgroundColor:Colors.primary,borderRadius:Radius.md,alignItems:'center',justifyContent:'center'},
  primaryBtnText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
});
