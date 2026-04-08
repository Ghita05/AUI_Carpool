import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Share, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getRideDetails, cancelRide, modifyRide } from '../../services/rideService';
import { getPassengerList } from '../../services/rideService';
import { getUserReviews } from '../../services/reviewService';

function Card({children,style}){return <View style={[st.card,style]}>{children}</View>;}

const getInitials = (u) => u ? ((u.firstName?.[0]||'')+(u.lastName?.[0]||'')).toUpperCase() : '??';
const getName = (u) => u ? `${u.firstName||''} ${u.lastName||''}`.trim() : 'Unknown';

function DriverProfileModal({visible,driver,onClose}){
  const [reviews,setReviews]=useState([]);
  const [loadingR,setLoadingR]=useState(true);

  useEffect(()=>{
    if(visible&&driver?._id){
      setLoadingR(true);
      getUserReviews(driver._id).then(r=>setReviews(r.data?.reviews||[])).catch(()=>{}).finally(()=>setLoadingR(false));
    }
  },[visible,driver]);

  if(!driver)return null;
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.profileModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Driver Profile</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={st.profHeader}><View style={st.profAvatar}><Text style={st.profAvatarText}>{getInitials(driver)}</Text></View><View><Text style={st.profName}>{getName(driver)}</Text><Text style={st.profRole}>Student · Driver</Text></View></View>
          <View style={st.profStats}><View style={st.profStat}><Text style={st.profBig}>{driver.totalCompletedRides||0}</Text><Text style={st.profLabel}>Rides</Text></View><View style={st.profStat}><Text style={st.profBig}>{driver.averageRating||0}</Text><Text style={st.profLabel}>Rating</Text></View><View style={st.profStat}><Text style={st.profBig}>{driver.cancellationCount||0}</Text><Text style={st.profLabel}>Cancel</Text></View></View>
          <Text style={st.sectionLabel}>Preferences</Text>
          <View style={{flexDirection:'row',gap:8,marginBottom:Spacing.lg}}>
            {driver.smokingPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={12} color={Colors.primary}/><Text style={st.prefChipText}>{driver.smokingPreference}</Text></View>}
            {driver.drivingStyle&&<View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>{driver.drivingStyle}</Text></View>}
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
  const [saving,setSaving]=useState(false);
  const handleCancel=()=>{
    Alert.alert('Cancel Ride','Are you sure? All passengers will be notified.',[
      {text:'No',style:'cancel'},
      {text:'Yes, Cancel',style:'destructive',onPress:async()=>{
        try{await cancelRide(ride._id,'Driver cancelled');Alert.alert('Cancelled','Ride has been cancelled.');onUpdated();onClose();}catch(e){Alert.alert('Error',e.response?.data?.message||'Failed to cancel');}
      }}
    ]);
  };
  const handleSave=async()=>{setSaving(true);try{await modifyRide(ride._id,{});Alert.alert('Saved','Ride updated.');onUpdated();onClose();}catch(e){Alert.alert('Error',e.response?.data?.message||'Failed to update');}finally{setSaving(false);}};

  if(!ride)return null;
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.manageModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Manage Ride</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView>
          <Text style={st.mngLabel}>Departure</Text><View style={st.mngInput}><Text style={st.mngInputText}>{ride.departureLocation}</Text></View>
          <Text style={st.mngLabel}>Destination</Text><View style={st.mngInput}><Text style={st.mngInputText}>{ride.destination}</Text></View>
          <View style={{flexDirection:'row',gap:12}}>
            <View style={{flex:1}}><Text style={st.mngLabel}>Time</Text><View style={st.mngInput}><Text style={st.mngInputText}>{new Date(ride.departureDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View></View>
            <View style={{flex:1}}><Text style={st.mngLabel}>Price (MAD)</Text><View style={st.mngInput}><Text style={st.mngInputText}>{ride.pricePerSeat}</Text></View></View>
          </View>
          <View style={{flexDirection:'row',gap:10,marginTop:Spacing.lg}}>
            <TouchableOpacity style={st.cancelRideBtn} onPress={handleCancel}><Text style={st.cancelRideBtnText}>Cancel Ride</Text></TouchableOpacity>
            <TouchableOpacity style={st.saveRideBtn} onPress={handleSave}><Text style={st.saveRideBtnText}>{saving?'Saving...':'Save Changes'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

export default function RideDetailsScreen({ navigation, route }) {
  const { isDriver, user } = useAuth();
  const rideId = route?.params?.rideId;
  const [ride,setRide]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showProfile,setShowProfile]=useState(false);
  const [showManagePax,setShowManagePax]=useState(false);
  const [showManageRide,setShowManageRide]=useState(false);

  const fetchRide = async () => {
    try {
      const res = await getRideDetails(rideId);
      setRide(res.data?.ride || null);
    } catch { setRide(null); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(rideId) fetchRide(); },[rideId]);

  if(loading) return <SafeAreaView style={st.safe} edges={['top']}><ActivityIndicator color={Colors.primary} style={{flex:1}}/></SafeAreaView>;
  if(!ride) return <SafeAreaView style={st.safe} edges={['top']}><Text style={{textAlign:'center',marginTop:40,color:Colors.textSecondary}}>Ride not found</Text></SafeAreaView>;

  const driver = ride.driverId || {};
  const vehicle = ride.vehicleId || {};
  const isOwner = user?._id === driver._id;
  const departureTime = new Date(ride.departureDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const distanceKM = ride.route?.distanceKM ? `${ride.route.distanceKM} km` : '—';
  const duration = ride.route?.durationMinutes ? `~${ride.route.durationMinutes} min` : '—';

  const handleShare = () => Share.share({ message: `Ride to ${ride.destination} at ${departureTime} - AUI Carpool` });

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={st.headerBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary}/></TouchableOpacity>
        <Text style={st.headerTitle}>Ride Details</Text>
        <TouchableOpacity onPress={handleShare} style={st.headerBtn}><Ionicons name="share-outline" size={22} color={Colors.textSecondary}/></TouchableOpacity>
      </View>

      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        <Card><View style={st.routeRow}><View style={st.routeDots}><View style={[st.dot,{backgroundColor:Colors.primary}]}/><View style={st.dashed}/><View style={[st.dot,{backgroundColor:Colors.error}]}/></View><View style={{flex:1,gap:16}}><Text style={st.routeCity}>{ride.departureLocation}</Text><Text style={st.routeCity}>{ride.destination}</Text></View></View>
          <View style={st.divider}/>
          <View style={st.statsRow}>{[{icon:'time-outline',val:departureTime,label:'Departure'},{icon:'resize-outline',val:distanceKM,label:'Distance'},{icon:'hourglass-outline',val:duration,label:'Est. time'}].map((s,i)=>(<View key={i} style={st.stat}><Ionicons name={s.icon} size={14} color={Colors.textSecondary}/><Text style={st.statVal}>{s.val}</Text><Text style={st.statLabel}>{s.label}</Text></View>))}</View>
        </Card>

        <TouchableOpacity activeOpacity={isOwner?1:0.7} onPress={!isOwner?()=>setShowProfile(true):undefined}>
          <Card>
            <View style={st.driverRow}>
              <View style={st.driverAv}><Text style={st.driverAvText}>{getInitials(driver)}</Text></View>
              <View style={{flex:1}}><Text style={st.driverName}>{getName(driver)}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="star" size={12} color="#F59E0B"/><Text style={st.driverSub}>{driver.averageRating||0} · {driver.totalCompletedRides||0} rides</Text></View></View>
              {!isOwner && <Text style={st.viewProfile}>View Profile →</Text>}
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              {driver.smokingPreference&&<View style={st.prefChip}><Ionicons name="ban-outline" size={11} color={Colors.primary}/><Text style={st.prefChipText}>{driver.smokingPreference}</Text></View>}
              {driver.drivingStyle&&<View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={11} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>{driver.drivingStyle}</Text></View>}
            </View>
          </Card>
        </TouchableOpacity>

        <Card style={{flexDirection:'row',alignItems:'center',gap:12}}>
          <Ionicons name="car-outline" size={20} color={Colors.textSecondary}/>
          <View style={{flex:1}}><Text style={st.vehicleMain}>{vehicle.brand} {vehicle.model} · {vehicle.color}</Text><Text style={st.vehicleSub}>{vehicle.sizeCategory} · {vehicle.luggageCapacity} luggage spots</Text></View>
          <View style={st.plate}><Text style={st.plateText}>{vehicle.licensePlate}</Text></View>
        </Card>

        <Card>
          <View style={st.rowBetween}><Text style={st.cardLabel}>Available Seats</Text><Text style={st.seatsCount}>{ride.availableSeats} of {ride.totalSeats}</Text></View>
          <View style={{flexDirection:'row',gap:8,marginVertical:8}}>{Array.from({length:ride.totalSeats}).map((_,i)=>(<Ionicons key={i} name={i<(ride.totalSeats-ride.availableSeats)?'person':'person-outline'} size={20} color={i<(ride.totalSeats-ride.availableSeats)?Colors.primary:Colors.border}/>))}</View>
          <Text style={st.priceNote}>{ride.pricePerSeat} MAD per seat</Text>
        </Card>

        <TouchableOpacity style={st.mapThumb} onPress={()=>Alert.alert('Route Map',`${ride.departureLocation} → ${ride.destination}\n${distanceKM} · ${duration}\nStops: ${(ride.stops||[]).join(', ')||'None'}`)}>
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
            <TouchableOpacity style={st.outlineBtn} onPress={()=>setShowManagePax(true)}><Ionicons name="people-outline" size={16} color={Colors.primary}/><Text style={st.outlineBtnText}>Passengers</Text></TouchableOpacity>
            <TouchableOpacity style={st.primaryBtn} onPress={()=>setShowManageRide(true)}><Text style={st.primaryBtnText}>Manage Ride</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>navigation.navigate('Messages')}><Ionicons name="chatbubble-outline" size={16} color={Colors.primary}/><Text style={st.outlineBtnText}>Message</Text></TouchableOpacity>
            <TouchableOpacity style={st.primaryBtn} onPress={()=>navigation.navigate('BookRide',{rideId:ride._id})}><Text style={st.primaryBtnText}>Book Now · {ride.pricePerSeat} MAD</Text></TouchableOpacity>
          </>
        )}
      </View>

      <DriverProfileModal visible={showProfile} driver={driver} onClose={()=>setShowProfile(false)}/>
      <ManagePassengersModal visible={showManagePax} rideId={ride._id} totalSeats={ride.totalSeats} onClose={()=>setShowManagePax(false)}/>
      <ManageRideModal visible={showManageRide} ride={ride} onClose={()=>setShowManageRide(false)} onUpdated={fetchRide}/>
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
  mapThumb:{marginBottom:Spacing.md},mapThumbInner:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:Colors.primaryBg,borderRadius:Radius.md,padding:Spacing.lg,borderWidth:1,borderColor:'rgba(27,94,32,0.15)'},mapThumbText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},mapThumbSub:{fontSize:Typography.xs,color:Colors.textSecondary},
  bottomBar:{flexDirection:'row',gap:Spacing.sm,padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border},
  outlineBtn:{flex:0.45,height:50,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},outlineBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  primaryBtn:{flex:0.55,height:50,backgroundColor:Colors.primary,borderRadius:Radius.md,alignItems:'center',justifyContent:'center'},primaryBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  modalOv:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},profileModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'85%'},manageModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'70%'},
  modalH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.lg},modalTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  sectionLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:8},
  profHeader:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:Spacing.lg},profAvatar:{width:56,height:56,borderRadius:28,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},profAvatarText:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},profName:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},profRole:{fontSize:13,color:Colors.textSecondary},
  profStats:{flexDirection:'row',justifyContent:'space-around',paddingVertical:Spacing.md,borderTopWidth:1,borderBottomWidth:1,borderColor:Colors.divider,marginBottom:Spacing.lg},profStat:{alignItems:'center'},profBig:{fontSize:20,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},profLabel:{fontSize:11,color:Colors.textSecondary},
  reviewCard:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},reviewTop:{flexDirection:'row',alignItems:'flex-start',gap:10},reviewAvatar:{width:32,height:32,borderRadius:16,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},reviewName:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},reviewText:{fontSize:13,color:Colors.textSecondary,marginTop:6,lineHeight:18},
  paxRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},paxAvatar:{width:36,height:36,borderRadius:18,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},paxName:{fontSize:14,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  mngLabel:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4,marginTop:12},mngInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,justifyContent:'center',backgroundColor:Colors.background},mngInputText:{fontSize:13,color:Colors.textPrimary},
  cancelRideBtn:{flex:1,height:46,borderWidth:1.5,borderColor:Colors.error,borderRadius:8,alignItems:'center',justifyContent:'center'},cancelRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.error},
  saveRideBtn:{flex:1,height:46,backgroundColor:Colors.primary,borderRadius:8,alignItems:'center',justifyContent:'center'},saveRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
});
