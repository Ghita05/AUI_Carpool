import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, TextInput, Platform, Modal,
  KeyboardAvoidingView, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const RIDES = [
  { id:1,from:'AUI Main Gate',to:'Fez Airport',dest:'Fez',price:50,time:'14:00 today',driver:'Ghita N.',initials:'GN',rating:4.8,seats:4,taken:2,color:Colors.primary },
  { id:2,from:'AUI Main Gate',to:'Rabat Agdal',dest:'Rabat',price:100,time:'17:30 today',driver:'Ahmed B.',initials:'AB',rating:3.9,seats:4,taken:3,color:'#F59E0B' },
  { id:3,from:'AUI Main Gate',to:'Meknes Centre',dest:'Meknes',price:40,time:'15:30 today',driver:'Kenza N.',initials:'KN',rating:5.0,seats:4,taken:4,color:Colors.textSecondary },
];

const PIN_POS = { Fez:{ top:'22%', right:'12%' }, Rabat:{ top:'48%', left:'8%' }, Meknes:{ bottom:'32%', left:'32%' } };

/* ── Filter Modal ── */
function FilterModal({ visible, onClose }) {
  const [maxPrice,setMaxPrice]=useState(100);
  const [dest,setDest]=useState('Fez');
  const [date,setDate]=useState('Today');
  const [gender,setGender]=useState('All');
  const [smoking,setSmoking]=useState('Any');
  const Pill = ({label,active,onPress}) => <TouchableOpacity style={[st.fpill,active&&st.fpillActive]} onPress={onPress}><Text style={[st.fpillText,active&&st.fpillTextActive]}>{label}</Text></TouchableOpacity>;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}><View style={st.filterModal}>
        <View style={st.filterHeader}><Text style={st.filterTitle}>Filters</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary}/></TouchableOpacity></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={st.filterLabel}>DESTINATION</Text>
          <View style={st.pillRow}>{['Fez','Meknes','Casablanca','Rabat'].map(d=><Pill key={d} label={d} active={dest===d} onPress={()=>setDest(d)}/>)}</View>
          <Text style={st.filterLabel}>DATE</Text>
          <View style={st.pillRow}>{['Today','Tomorrow'].map(d=><Pill key={d} label={d} active={date===d} onPress={()=>setDate(d)}/>)}</View>
          <Text style={st.filterLabel}>MAX PRICE: {maxPrice} MAD</Text>
          <View style={st.pillRow}>{['All','Women only'].map(g=><Pill key={g} label={g} active={gender===g} onPress={()=>setGender(g)}/>)}</View>
          <Text style={st.filterLabel}>SMOKING</Text>
          <View style={st.pillRow}>{['Any','Non-smoking'].map(s=><Pill key={s} label={s} active={smoking===s} onPress={()=>setSmoking(s)}/>)}</View>
        </ScrollView>
        <TouchableOpacity style={st.filterApply} onPress={onClose}><Text style={st.filterApplyText}>Show Rides</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

/* ── Community Modal ── */
function CommunityModal({ visible, onClose }) {
  const members = [{label:'Top Driver',name:'Ghita Nafa',stat:'4.8 avg · 23 rides',initials:'GN'},{label:'Top Passenger',name:'Ahmed Benali',stat:'4.9 avg · 15 trips',initials:'AB'},{label:'Most Active',name:'Kenza Nouri',stat:'5.0 avg · 31 rides',initials:'KN'}];
  const routes = [{route:'AUI → Fez',count:142,pct:100},{route:'AUI → Rabat',count:98,pct:69},{route:'AUI → Meknes',count:76,pct:54}];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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

/* ── Ride Request Modal ── */
function RideRequestModal({ visible, destination, onClose }) {
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [seats,setSeats]=useState('1');
  const [notes,setNotes]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const handleClose = () => { setSubmitted(false);setDate('');setTime('');setSeats('1');setNotes('');onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={st.modalOverlayCenter}>
          <View style={st.requestModal}>
            {submitted ? (
              <View style={{alignItems:'center',padding:Spacing.xl}}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.primary}/>
                <Text style={st.requestTitle}>Request Submitted!</Text>
                <Text style={st.requestSub}>We'll notify you when a driver posts a ride to <Text style={{fontFamily:'PlusJakartaSans_700Bold'}}>{destination}</Text>.</Text>
                <TouchableOpacity style={st.requestBtn} onPress={handleClose}><Text style={st.requestBtnText}>Done</Text></TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={st.filterHeader}><Text style={st.requestTitle}>No rides to "{destination}"</Text><TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={Colors.textSecondary}/></TouchableOpacity></View>
                <Text style={st.requestSub}>Submit a request and matching drivers will be notified.</Text>
                <Text style={st.inputLabel}>PREFERRED DATE</Text>
                <TextInput style={st.reqInput} placeholder="e.g. Feb 28" value={date} onChangeText={setDate} placeholderTextColor={Colors.textDisabled}/>
                <Text style={st.inputLabel}>PREFERRED TIME</Text>
                <TextInput style={st.reqInput} placeholder="e.g. 09:00" value={time} onChangeText={setTime} placeholderTextColor={Colors.textDisabled}/>
                <Text style={st.inputLabel}>NUMBER OF SEATS</Text>
                <TextInput style={st.reqInput} placeholder="1" value={seats} onChangeText={setSeats} keyboardType="numeric" placeholderTextColor={Colors.textDisabled}/>
                <Text style={st.inputLabel}>NOTES (OPTIONAL)</Text>
                <TextInput style={[st.reqInput,{height:60,textAlignVertical:'top'}]} placeholder="Any preferences..." value={notes} onChangeText={setNotes} multiline placeholderTextColor={Colors.textDisabled}/>
                <TouchableOpacity style={st.requestBtn} onPress={()=>setSubmitted(true)}><Text style={st.requestBtnText}>Submit Ride Request</Text></TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RideCard({ ride, onPress }) {
  const avail = ride.seats - ride.taken;
  return (
    <TouchableOpacity style={st.rideCard} onPress={onPress} activeOpacity={0.7}>
      <View style={st.rideCardRow}><View style={[st.destDot,{backgroundColor:ride.color}]}/><Text style={st.rideDestText}>{ride.dest}</Text><Text style={st.ridePriceText}>{ride.price} MAD</Text></View>
      <View style={st.rideMetaRow}><Ionicons name="time-outline" size={12} color={Colors.textSecondary}/><Text style={st.rideMetaText}>{ride.time}</Text><View style={{flex:1}}/><Text style={[st.rideMetaText,{color:avail===0?Colors.textSecondary:avail===1?Colors.accent:Colors.primary,fontFamily:'PlusJakartaSans_600SemiBold'}]}>{avail===0?'Full':`${avail} seats`}</Text></View>
      <View style={st.rideDriverRow}><View style={st.driverAvatar}><Text style={st.driverAvatarText}>{ride.initials}</Text></View><Text style={st.driverName}>{ride.driver}</Text><Ionicons name="star" size={11} color="#F59E0B" style={{marginLeft:'auto'}}/><Text style={st.ratingText}>{ride.rating}</Text></View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { isDriver } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestDest, setRequestDest] = useState('');
  const [highlightedPin, setHighlightedPin] = useState(null);

  const handleSearch = () => {
    if (!searchText.trim()) return;
    const match = RIDES.find(r => r.dest.toLowerCase().includes(searchText.toLowerCase()));
    if (match) {
      setHighlightedPin(match.dest);
      setTimeout(() => navigation.navigate('RideDetails', { ride: match }), 600);
    } else {
      setRequestDest(searchText.trim());
      setShowRequest(true);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (text.trim()) {
      const match = RIDES.find(r => r.dest.toLowerCase().includes(text.toLowerCase()));
      setHighlightedPin(match ? match.dest : null);
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
          {/* Map grid */}
          {[0.2,0.4,0.6,0.8].map(p=><View key={`h${p}`} style={[st.gridH,{top:`${p*100}%`}]}/>)}
          {[0.25,0.5,0.75].map(p=><View key={`v${p}`} style={[st.gridV,{left:`${p*100}%`}]}/>)}

          {/* Morocco cities text */}
          <Text style={[st.cityLabel,{top:'15%',right:'8%'}]}>FEZ</Text>
          <Text style={[st.cityLabel,{top:'42%',left:'5%'}]}>RABAT</Text>
          <Text style={[st.cityLabel,{bottom:'25%',left:'28%'}]}>MEKNES</Text>
          <Text style={[st.cityLabel,{bottom:'10%',right:'10%'}]}>IFRANE</Text>

          {/* AUI marker */}
          <View style={[st.auiMarker,{bottom:'12%',right:'15%'}]}><Text style={st.auiText}>AUI</Text></View>

          {/* Ride pins */}
          {RIDES.map(ride => {
            const pos = PIN_POS[ride.dest] || {};
            const isHL = highlightedPin === ride.dest;
            return (
              <TouchableOpacity key={ride.id} style={[st.ridePin,pos,{borderColor:ride.color},isHL&&st.ridePinHL]} onPress={()=>navigation.navigate('RideDetails',{ride})} activeOpacity={0.7}>
                <View style={[st.pinDot,{backgroundColor:ride.color}]}/>
                <View><Text style={st.pinLabel}>{ride.dest}</Text><Text style={st.pinPrice}>{ride.price} MAD</Text></View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Bar */}
        <View style={st.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={{marginRight:Spacing.sm}}/>
          <TextInput style={st.searchInput} placeholder="Where are you going?" placeholderTextColor={Colors.textDisabled} value={searchText} onChangeText={handleSearchChange} onSubmitEditing={handleSearch} returnKeyType="search"/>
          <TouchableOpacity onPress={()=>setShowFilter(true)}><Ionicons name="options-outline" size={18} color={Colors.textSecondary}/></TouchableOpacity>
        </View>

        {/* Community badge */}
        <TouchableOpacity style={st.communityBadge} onPress={()=>setShowCommunity(true)}>
          <Ionicons name="trophy-outline" size={14} color={Colors.primary}/>
          <Text style={st.communityText}>Community</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={st.bottomSheet}>
        <View style={st.handle}/>
        <View style={st.sheetHeader}><Text style={st.sheetTitle}>Available Rides</Text><Text style={st.sheetCount}>{RIDES.length} rides</Text></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {RIDES.map(ride=><RideCard key={ride.id} ride={ride} onPress={()=>navigation.navigate('RideDetails',{ride})}/>)}
        </ScrollView>
      </View>

      <FilterModal visible={showFilter} onClose={()=>setShowFilter(false)}/>
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
  // Modals shared
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},
  modalOverlayCenter:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'center',padding:Spacing.lg},
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
  // Community
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
  // Ride request
  requestTitle:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary,flex:1,marginBottom:8},
  requestSub:{fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,lineHeight:20,marginBottom:Spacing.lg},
  inputLabel:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:.5,marginBottom:4},
  reqInput:{height:44,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,paddingHorizontal:12,fontSize:Typography.base,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textPrimary,marginBottom:Spacing.md},
  requestBtn:{backgroundColor:Colors.primary,borderRadius:Radius.md,paddingVertical:14,alignItems:'center',marginTop:Spacing.sm},
  requestBtnText:{color:'#fff',fontSize:Typography.md,fontFamily:'PlusJakartaSans_700Bold'},
});
