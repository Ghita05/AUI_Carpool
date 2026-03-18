import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Share, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const RIDE = {
  id:'3001', departure:'AUI Main Gate', destination:'Fez Airport',
  departureTime:'14:00', distance:'65 km', duration:'~55 min',
  driver:{ name:'Ghita Nafa', initials:'GN', rating:4.8, rides:23 },
  vehicle:{ brand:'Dacia', model:'Logan', color:'White', plate:'12345-AB-67', size:'Medium', luggage:3 },
  totalSeats:4, availableSeats:2, price:50,
  smoking:false, drivingStyle:'Calm driver',
  stops:['Ifrane Marché','Hay Riad'],
  passengers:[{name:'Ahmed Benali',initials:'AB',seat:1},{name:'Sara Mansour',initials:'SM',seat:2}],
};

const REVIEWS = [
  {name:'Ahmed B.',initials:'AB',rating:5,text:'Great driver, very punctual.',date:'Feb 18',route:'AUI → Fez'},
  {name:'Kenza N.',initials:'KN',rating:5,text:'Comfortable ride, highly recommend!',date:'Feb 01',route:'AUI → Fez'},
  {name:'Salma M.',initials:'SM',rating:3,text:'Late departure.',date:'Jan 10',route:'AUI → Rabat'},
];

function Card({children,style}){return <View style={[st.card,style]}>{children}</View>;}

/* Driver Profile Modal */
function DriverProfileModal({visible,driver,onClose}){
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.profileModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Driver Profile</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={st.profHeader}><View style={st.profAvatar}><Text style={st.profAvatarText}>{driver.initials}</Text></View><View><Text style={st.profName}>{driver.name}</Text><Text style={st.profRole}>Student · Driver</Text></View></View>
          <View style={st.profStats}><View style={st.profStat}><Text style={st.profBig}>{driver.rides}</Text><Text style={st.profLabel}>Rides</Text></View><View style={st.profStat}><Text style={st.profBig}>{driver.rating}</Text><Text style={st.profLabel}>Rating</Text></View><View style={st.profStat}><Text style={st.profBig}>0</Text><Text style={st.profLabel}>Cancel</Text></View></View>
          <Text style={st.sectionLabel}>Preferences</Text>
          <View style={{flexDirection:'row',gap:8,marginBottom:Spacing.lg}}>
            <View style={st.prefChip}><Ionicons name="ban-outline" size={12} color={Colors.primary}/><Text style={st.prefChipText}>Non-smoker</Text></View>
            <View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>Calm driver</Text></View>
          </View>
          <Text style={st.sectionLabel}>Reviews ({REVIEWS.length})</Text>
          {REVIEWS.map((r,i)=>(
            <View key={i} style={st.reviewCard}>
              <View style={st.reviewTop}><View style={st.reviewAvatar}><Text style={{fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>{r.initials}</Text></View><View style={{flex:1}}><Text style={st.reviewName}>{r.name}</Text><View style={{flexDirection:'row',gap:2,marginTop:2}}>{[1,2,3,4,5].map(s=><Ionicons key={s} name={s<=r.rating?'star':'star-outline'} size={11} color={s<=r.rating?'#F59E0B':Colors.border}/>)}</View></View><View><Text style={{fontSize:10,color:Colors.textSecondary}}>{r.date}</Text><View style={st.routeTag}><Text style={st.routeTagText}>{r.route}</Text></View></View></View>
              <Text style={st.reviewText}>{r.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

/* Manage Passengers Modal */
function ManagePassengersModal({visible,onClose}){
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.manageModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Manage Passengers</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <Text style={{fontSize:Typography.sm,color:Colors.textSecondary,marginBottom:Spacing.md}}>{RIDE.passengers.length} of {RIDE.totalSeats} seats booked</Text>
        {RIDE.passengers.map((p,i)=>(
          <View key={i} style={st.paxRow}>
            <View style={st.paxAvatar}><Text style={{fontSize:11,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>{p.initials}</Text></View>
            <View style={{flex:1}}><Text style={st.paxName}>{p.name}</Text><Text style={{fontSize:11,color:Colors.textSecondary}}>Seat {p.seat}</Text></View>
            <TouchableOpacity style={st.removeBtn} onPress={()=>Alert.alert('Remove',`Remove ${p.name}?`)}><Text style={st.removeBtnText}>Remove</Text></TouchableOpacity>
          </View>
        ))}
      </View></View>
    </Modal>
  );
}

/* Manage Ride Modal */
function ManageRideModal({visible,onClose}){
  const [saved,setSaved]=useState(false);
  const handleSave=()=>{setSaved(true);setTimeout(()=>{setSaved(false);onClose();},1500);};
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOv}><View style={st.manageModal}>
        <View style={st.modalH}><Text style={st.modalTitle}>Manage Ride</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        {saved ? <View style={{alignItems:'center',padding:Spacing['2xl']}}><Ionicons name="checkmark-circle" size={48} color={Colors.primary}/><Text style={{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',marginTop:12}}>Ride Updated!</Text></View> : (
          <ScrollView>
            <Text style={st.mngLabel}>Departure</Text><View style={st.mngInput}><Text style={st.mngInputText}>{RIDE.departure}</Text></View>
            <Text style={st.mngLabel}>Destination</Text><View style={st.mngInput}><Text style={st.mngInputText}>{RIDE.destination}</Text></View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={st.mngLabel}>Time</Text><View style={st.mngInput}><Text style={st.mngInputText}>{RIDE.departureTime}</Text></View></View>
              <View style={{flex:1}}><Text style={st.mngLabel}>Price (MAD)</Text><View style={st.mngInput}><Text style={st.mngInputText}>{RIDE.price}</Text></View></View>
            </View>
            <View style={{flexDirection:'row',gap:10,marginTop:Spacing.lg}}>
              <TouchableOpacity style={st.cancelRideBtn} onPress={()=>Alert.alert('Cancel Ride','Are you sure?')}><Text style={st.cancelRideBtnText}>Cancel Ride</Text></TouchableOpacity>
              <TouchableOpacity style={st.saveRideBtn} onPress={handleSave}><Text style={st.saveRideBtnText}>Save Changes</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View></View>
    </Modal>
  );
}

export default function RideDetailsScreen({ navigation, route }) {
  const { isDriver } = useAuth();
  const passedRide = route?.params?.ride;
  const [showProfile,setShowProfile]=useState(false);
  const [showManagePax,setShowManagePax]=useState(false);
  const [showManageRide,setShowManageRide]=useState(false);

  const handleShare = () => Share.share({ message: `Ride to ${RIDE.destination} at ${RIDE.departureTime} - AUI Carpool` });

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <View style={st.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={st.headerBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary}/></TouchableOpacity>
        <Text style={st.headerTitle}>Ride Details</Text>
        <TouchableOpacity onPress={handleShare} style={st.headerBtn}><Ionicons name="share-outline" size={22} color={Colors.textSecondary}/></TouchableOpacity>
      </View>

      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Route */}
        <Card><View style={st.routeRow}><View style={st.routeDots}><View style={[st.dot,{backgroundColor:Colors.primary}]}/><View style={st.dashed}/><View style={[st.dot,{backgroundColor:Colors.error}]}/></View><View style={{flex:1,gap:16}}><Text style={st.routeCity}>{RIDE.departure}</Text><Text style={st.routeCity}>{RIDE.destination}</Text></View></View>
          <View style={st.divider}/>
          <View style={st.statsRow}>{[{icon:'time-outline',val:RIDE.departureTime,label:'Departure'},{icon:'resize-outline',val:RIDE.distance,label:'Distance'},{icon:'hourglass-outline',val:RIDE.duration,label:'Est. time'}].map((s,i)=>(<View key={i} style={st.stat}><Ionicons name={s.icon} size={14} color={Colors.textSecondary}/><Text style={st.statVal}>{s.val}</Text><Text style={st.statLabel}>{s.label}</Text></View>))}</View>
        </Card>

        {/* Driver - clickable for passengers */}
        <TouchableOpacity activeOpacity={isDriver?1:0.7} onPress={!isDriver?()=>setShowProfile(true):undefined}>
          <Card>
            <View style={st.driverRow}>
              <View style={st.driverAv}><Text style={st.driverAvText}>{RIDE.driver.initials}</Text></View>
              <View style={{flex:1}}><Text style={st.driverName}>{RIDE.driver.name}</Text><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="star" size={12} color="#F59E0B"/><Text style={st.driverSub}>{RIDE.driver.rating} · {RIDE.driver.rides} rides</Text></View></View>
              {!isDriver && <Text style={st.viewProfile}>View Profile →</Text>}
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <View style={st.prefChip}><Ionicons name="ban-outline" size={11} color={Colors.primary}/><Text style={st.prefChipText}>Non-smoking</Text></View>
              <View style={[st.prefChip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={11} color={Colors.textSecondary}/><Text style={[st.prefChipText,{color:Colors.textSecondary}]}>{RIDE.drivingStyle}</Text></View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Vehicle */}
        <Card style={{flexDirection:'row',alignItems:'center',gap:12}}>
          <Ionicons name="car-outline" size={20} color={Colors.textSecondary}/>
          <View style={{flex:1}}><Text style={st.vehicleMain}>{RIDE.vehicle.brand} {RIDE.vehicle.model} · {RIDE.vehicle.color}</Text><Text style={st.vehicleSub}>{RIDE.vehicle.size} · {RIDE.vehicle.luggage} luggage spots</Text></View>
          <View style={st.plate}><Text style={st.plateText}>{RIDE.vehicle.plate}</Text></View>
        </Card>

        {/* Seats */}
        <Card>
          <View style={st.rowBetween}><Text style={st.cardLabel}>Available Seats</Text><Text style={st.seatsCount}>{RIDE.availableSeats} of {RIDE.totalSeats}</Text></View>
          <View style={{flexDirection:'row',gap:8,marginVertical:8}}>{Array.from({length:RIDE.totalSeats}).map((_,i)=>(<Ionicons key={i} name={i<(RIDE.totalSeats-RIDE.availableSeats)?'person':'person-outline'} size={20} color={i<(RIDE.totalSeats-RIDE.availableSeats)?Colors.primary:Colors.border}/>))}</View>
          <Text style={st.priceNote}>{RIDE.price} MAD per seat</Text>
        </Card>

        {/* Route Map thumbnail */}
        <TouchableOpacity style={st.mapThumb} onPress={()=>Alert.alert('Route Map',`${RIDE.departure} → ${RIDE.destination}\n${RIDE.distance} · ${RIDE.duration}\nStops: ${RIDE.stops.join(', ')}`)}>
          <View style={st.mapThumbInner}>
            <Ionicons name="map-outline" size={24} color={Colors.primary}/>
            <View><Text style={st.mapThumbText}>View Full Route</Text><Text style={st.mapThumbSub}>{RIDE.departure} → {RIDE.destination}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{marginLeft:'auto'}}/>
          </View>
        </TouchableOpacity>

        {/* Stops */}
        <Card>
          <View style={st.rowBetween}><Text style={st.cardLabel}>Route & Stops</Text><Text style={st.seatsCount}>{RIDE.stops.length} stops</Text></View>
          <Text style={{fontSize:11,color:Colors.textSecondary,marginBottom:8}}>You can request a stop when booking</Text>
          {[RIDE.departure,...RIDE.stops,RIDE.destination].map((stop,i,arr)=>(
            <View key={i} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:6}}>
              <View style={{width:10,height:10,borderRadius:5,backgroundColor:i===0||i===arr.length-1?Colors.primary:Colors.border}}/>
              <Text style={{fontSize:13,fontFamily:i===0||i===arr.length-1?'PlusJakartaSans_600SemiBold':'PlusJakartaSans_400Regular',color:i===0||i===arr.length-1?Colors.textPrimary:Colors.textSecondary}}>{stop}</Text>
            </View>
          ))}
        </Card>
        <View style={{height:100}}/>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={st.bottomBar}>
        {isDriver ? (
          <>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>setShowManagePax(true)}><Ionicons name="people-outline" size={16} color={Colors.primary}/><Text style={st.outlineBtnText}>Passengers</Text></TouchableOpacity>
            <TouchableOpacity style={st.primaryBtn} onPress={()=>setShowManageRide(true)}><Text style={st.primaryBtnText}>Manage Ride</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={st.outlineBtn} onPress={()=>navigation.navigate('Messages')}><Ionicons name="chatbubble-outline" size={16} color={Colors.primary}/><Text style={st.outlineBtnText}>Message</Text></TouchableOpacity>
            <TouchableOpacity style={st.primaryBtn} onPress={()=>navigation.navigate('BookRide',{ride:RIDE})}><Text style={st.primaryBtnText}>Book Now · {RIDE.price} MAD</Text></TouchableOpacity>
          </>
        )}
      </View>

      <DriverProfileModal visible={showProfile} driver={RIDE.driver} onClose={()=>setShowProfile(false)}/>
      <ManagePassengersModal visible={showManagePax} onClose={()=>setShowManagePax(false)}/>
      <ManageRideModal visible={showManageRide} onClose={()=>setShowManageRide(false)}/>
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
  routeRow:{flexDirection:'row',gap:12,marginBottom:12},
  routeDots:{alignItems:'center'},
  dot:{width:10,height:10,borderRadius:5},
  dashed:{width:2,height:24,backgroundColor:Colors.border,marginVertical:3},
  routeCity:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  divider:{height:1,backgroundColor:Colors.border,marginVertical:12},
  statsRow:{flexDirection:'row',justifyContent:'space-around'},
  stat:{alignItems:'center',gap:4},
  statVal:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  statLabel:{fontSize:Typography.xs,color:Colors.textSecondary},
  driverRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},
  driverAv:{width:44,height:44,borderRadius:22,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},
  driverAvText:{fontSize:14,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  driverName:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  driverSub:{fontSize:Typography.sm,color:Colors.textSecondary},
  viewProfile:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  prefChip:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:4,borderRadius:Radius.full,backgroundColor:Colors.primaryBg},
  prefChipText:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  vehicleMain:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  vehicleSub:{fontSize:Typography.sm,color:Colors.textSecondary},
  plate:{paddingHorizontal:8,paddingVertical:4,borderRadius:6,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.background},
  plateText:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  cardLabel:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  seatsCount:{fontSize:Typography.sm,color:Colors.textSecondary},
  priceNote:{fontSize:Typography.sm,color:Colors.textSecondary},
  mapThumb:{marginBottom:Spacing.md},
  mapThumbInner:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:Colors.primaryBg,borderRadius:Radius.md,padding:Spacing.lg,borderWidth:1,borderColor:'rgba(27,94,32,0.15)'},
  mapThumbText:{fontSize:Typography.md,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  mapThumbSub:{fontSize:Typography.xs,color:Colors.textSecondary},
  bottomBar:{flexDirection:'row',gap:Spacing.sm,padding:Spacing.lg,paddingBottom:Spacing.xl,backgroundColor:Colors.surface,borderTopWidth:1,borderTopColor:Colors.border},
  outlineBtn:{flex:0.45,height:50,borderRadius:Radius.md,borderWidth:1.5,borderColor:Colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  outlineBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  primaryBtn:{flex:0.55,height:50,backgroundColor:Colors.primary,borderRadius:Radius.md,alignItems:'center',justifyContent:'center'},
  primaryBtnText:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  // Modals
  modalOv:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},
  profileModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'85%'},
  manageModal:{backgroundColor:Colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,maxHeight:'70%'},
  modalH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.lg},
  modalTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  sectionLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:8},
  profHeader:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:Spacing.lg},
  profAvatar:{width:56,height:56,borderRadius:28,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  profAvatarText:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  profName:{fontSize:18,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  profRole:{fontSize:13,color:Colors.textSecondary},
  profStats:{flexDirection:'row',justifyContent:'space-around',paddingVertical:Spacing.md,borderTopWidth:1,borderBottomWidth:1,borderColor:Colors.divider,marginBottom:Spacing.lg},
  profStat:{alignItems:'center'},
  profBig:{fontSize:20,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  profLabel:{fontSize:11,color:Colors.textSecondary},
  reviewCard:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},
  reviewTop:{flexDirection:'row',alignItems:'flex-start',gap:10},
  reviewAvatar:{width:32,height:32,borderRadius:16,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},
  reviewName:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  reviewText:{fontSize:13,color:Colors.textSecondary,marginTop:6,lineHeight:18},
  routeTag:{backgroundColor:Colors.primaryBg,paddingHorizontal:6,paddingVertical:2,borderRadius:4,marginTop:4},
  routeTagText:{fontSize:9,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  paxRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},
  paxAvatar:{width:36,height:36,borderRadius:18,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},
  paxName:{fontSize:14,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  removeBtn:{paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:Colors.error,borderRadius:6},
  removeBtnText:{fontSize:12,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.error},
  mngLabel:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4,marginTop:12},
  mngInput:{height:42,borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,justifyContent:'center',backgroundColor:Colors.background},
  mngInputText:{fontSize:13,color:Colors.textPrimary},
  cancelRideBtn:{flex:1,height:46,borderWidth:1.5,borderColor:Colors.error,borderRadius:8,alignItems:'center',justifyContent:'center'},
  cancelRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.error},
  saveRideBtn:{flex:1,height:46,backgroundColor:Colors.primary,borderRadius:8,alignItems:'center',justifyContent:'center'},
  saveRideBtnText:{fontSize:13,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
});
