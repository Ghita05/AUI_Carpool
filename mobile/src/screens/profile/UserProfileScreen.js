import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getUserReviews } from '../../services/reviewService';

function StarRow({rating,size=14}){return(<View style={{flexDirection:'row',gap:2}}>{[1,2,3,4,5].map(i=>(<Ionicons key={i} name={i<=rating?'star':'star-outline'} size={size} color={i<=rating?Colors.accent:Colors.border}/>))}</View>);}

export default function UserProfileScreen({ navigation }) {
  const { user, isDriver, logout } = useAuth();
  const [tab,setTab]=useState('received');
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (user?._id) {
      getUserReviews(user._id).then(r => setReviews(r.data?.reviews || [])).catch(() => {}).finally(() => setLoadingReviews(false));
    }
  }, [user?._id]);

  const handleLogout=()=>{logout();navigation.reset({index:0,routes:[{name:'Splash'}]});};

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface}/>
      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={st.profileHeader}>
          <View style={st.avatar}><Text style={st.avatarText}>{user.initials||'GN'}</Text></View>
          <Text style={st.name}>{user.firstName} {user.lastName}</Text>
          <View style={st.emailRow}><Ionicons name="mail-outline" size={13} color={Colors.textSecondary}/><Text style={st.email}>{user.email||'g.nafa@aui.ma'}</Text></View>
          <View style={st.roleBadge}><Text style={st.roleText}>{isDriver?'Driver':'Passenger'}</Text></View>
        </View>

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={st.statItem}><Text style={st.statBig}>{user.rating||4.8}</Text><Text style={st.statLabel}>Rating</Text></View>
          <View style={[st.statItem,st.statBorder]}><Text style={st.statBig}>{user.rides||23}</Text><Text style={st.statLabel}>Rides</Text></View>
          <View style={st.statItem}><Text style={st.statBig}>0</Text><Text style={st.statLabel}>Cancels</Text></View>
        </View>

        {/* Preferences */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Preferences</Text>
          <View style={{flexDirection:'row',gap:8,marginTop:8}}>
            <View style={st.chip}><Ionicons name="ban-outline" size={12} color={Colors.primary}/><Text style={st.chipText}>Non-smoker</Text></View>
            {isDriver && <View style={[st.chip,{backgroundColor:Colors.background}]}><Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary}/><Text style={[st.chipText,{color:Colors.textSecondary}]}>Calm driver</Text></View>}
          </View>
        </View>

        {/* Reviews */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Reviews</Text>
          <View style={st.tabRow}>
            {['received','given'].map(t=>(<TouchableOpacity key={t} style={[st.tab,tab===t&&st.tabActive]} onPress={()=>setTab(t)}><Text style={[st.tabText,tab===t&&st.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text></TouchableOpacity>))}
          </View>
          {reviews.map(r=>(
            <View key={r.id} style={st.reviewCard}>
              <View style={st.reviewTop}>
                <View style={st.reviewAvatar}><Text style={{fontSize:10,fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary}}>{r.initials}</Text></View>
                <View style={{flex:1}}><Text style={st.reviewAuthor}>{r.author}</Text><StarRow rating={r.rating} size={11}/></View>
                <View><Text style={{fontSize:10,color:Colors.textSecondary}}>{r.date}</Text><View style={st.routeTag}><Text style={st.routeTagText}>{r.route}</Text></View></View>
              </View>
              <Text style={st.reviewText}>{r.text}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={st.card}>
          <TouchableOpacity style={st.menuRow} onPress={()=>navigation.navigate('AccountSettings')}>
            <Ionicons name="settings-outline" size={18} color={Colors.textPrimary}/>
            <Text style={st.menuText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/>
          </TouchableOpacity>
          <View style={st.menuDivider}/>
          <TouchableOpacity style={st.menuRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error}/>
            <Text style={[st.menuText,{color:Colors.error}]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/>
          </TouchableOpacity>
        </View>
        <View style={{height:40}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.background},
  scroll:{flex:1},
  profileHeader:{alignItems:'center',paddingVertical:Spacing['2xl'],backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border},
  avatar:{width:72,height:72,borderRadius:36,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center',marginBottom:12},
  avatarText:{fontSize:24,fontFamily:'PlusJakartaSans_700Bold',color:'#fff'},
  name:{fontSize:Typography['2xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  emailRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:4},
  email:{fontSize:Typography.sm,color:Colors.textSecondary},
  roleBadge:{marginTop:8,paddingHorizontal:12,paddingVertical:4,backgroundColor:Colors.primaryBg,borderRadius:Radius.full},
  roleText:{fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  statsRow:{flexDirection:'row',backgroundColor:Colors.surface,marginHorizontal:Spacing.lg,marginTop:Spacing.md,borderRadius:Radius.md,...Shadows.card},
  statItem:{flex:1,alignItems:'center',paddingVertical:Spacing.lg},
  statBorder:{borderLeftWidth:1,borderRightWidth:1,borderColor:Colors.divider},
  statBig:{fontSize:Typography['3xl'],fontFamily:'PlusJakartaSans_700Bold',color:Colors.primary},
  statLabel:{fontSize:Typography.xs,color:Colors.textSecondary,marginTop:2},
  card:{backgroundColor:Colors.surface,marginHorizontal:Spacing.lg,marginTop:Spacing.md,borderRadius:Radius.md,padding:Spacing.lg,...Shadows.card},
  cardTitle:{fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary},
  chip:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:4,borderRadius:Radius.full,backgroundColor:Colors.primaryBg},
  chipText:{fontSize:11,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  tabRow:{flexDirection:'row',gap:0,marginTop:12,marginBottom:8,borderBottomWidth:1,borderBottomColor:Colors.border},
  tab:{paddingVertical:8,paddingHorizontal:16,borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:Colors.primary},
  tabText:{fontSize:Typography.sm,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary},
  tabTextActive:{color:Colors.primary,fontFamily:'PlusJakartaSans_600SemiBold'},
  reviewCard:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:Colors.divider},
  reviewTop:{flexDirection:'row',alignItems:'flex-start',gap:10},
  reviewAvatar:{width:32,height:32,borderRadius:16,backgroundColor:Colors.primaryBg,alignItems:'center',justifyContent:'center'},
  reviewAuthor:{fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textPrimary},
  reviewText:{fontSize:13,color:Colors.textSecondary,marginTop:6,lineHeight:18},
  routeTag:{backgroundColor:Colors.primaryBg,paddingHorizontal:6,paddingVertical:2,borderRadius:4,marginTop:4},
  routeTagText:{fontSize:9,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary},
  menuRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14},
  menuText:{flex:1,fontSize:14,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary},
  menuDivider:{height:1,backgroundColor:Colors.divider},
});
