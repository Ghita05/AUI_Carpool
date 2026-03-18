import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const INITIAL = [
  { group:'Bookings', items:[
    { id:'1',title:'Booking Confirmed',preview:'Your ride to Fez on Feb 20 is confirmed. Meet at AUI Main Gate at 13:50.',time:'5 min ago',type:'booking_confirmed',unread:true,nav:'RideDetails' },
    { id:'2',title:'New Booking',preview:'Ahmed Benali booked a seat on your Rabat ride (Feb 25, 09:00)',time:'1 hr ago',type:'booking_new',unread:true },
    { id:'3',title:'Booking Cancelled',preview:'Your booking for Meknes was cancelled by the driver',time:'2 hrs ago',type:'booking_cancelled',unread:false },
  ]},
  { group:'Rides', items:[
    { id:'4',title:'Departure Reminder',preview:'Your ride to Fez departs in 1 hour. Don\'t forget your luggage!',time:'3 hrs ago',type:'ride_reminder',unread:true,nav:'RideDetails' },
    { id:'5',title:'Ride Published',preview:'Your ride AUI → Casablanca (Feb 28) is now live. 4 seats available.',time:'Yesterday',type:'ride_posted',unread:false },
    { id:'6',title:'Ride Completed',preview:'Your trip to Meknes is complete. Rate your experience!',time:'Yesterday',type:'ride_completed',unread:false },
  ]},
  { group:'Ride Requests', items:[
    { id:'7',title:'Ride Request Submitted',preview:'Your request for a ride to Tangier has been submitted.',time:'2 days ago',type:'ride_request',unread:false },
    { id:'8',title:'Ride Request Match!',preview:'A new ride to Tangier was just posted — check it out!',time:'3 days ago',type:'ride_request_match',unread:true,nav:'Home' },
  ]},
  { group:'System', items:[
    { id:'9',title:'Welcome to AUI Carpool',preview:'Your account has been verified successfully.',time:'Feb 15',type:'system',unread:false },
  ]},
];

const ICON_CFG = {
  booking_confirmed:{ icon:'checkmark-circle',bg:Colors.primaryBg,color:Colors.primary },
  booking_new:{ icon:'person-add',bg:Colors.primaryBg,color:Colors.primary },
  booking_cancelled:{ icon:'close-circle',bg:'#FEF2F2',color:Colors.error },
  ride_reminder:{ icon:'time',bg:'#FEF3C7',color:Colors.accent },
  ride_completed:{ icon:'flag',bg:Colors.primaryBg,color:Colors.primary },
  ride_posted:{ icon:'car',bg:Colors.primaryBg,color:Colors.primary },
  ride_request:{ icon:'search',bg:'#FFFBEB',color:'#D97706' },
  ride_request_match:{ icon:'checkmark-circle',bg:Colors.successBg,color:Colors.success },
  system:{ icon:'information-circle',bg:Colors.background,color:Colors.textSecondary },
};

const FILTERS = ['All','Unread','Bookings','Rides','Requests','System'];

export default function NotificationsScreen({ navigation }) {
  const [notifs, setNotifs] = useState(INITIAL);
  const [filter, setFilter] = useState('All');

  const allItems = notifs.flatMap(g => g.items);
  const unreadCount = allItems.filter(i => i.unread).length;

  const markAllRead = () => setNotifs(p => p.map(g => ({ ...g, items: g.items.map(i => ({ ...i, unread: false })) })));
  const markRead = (id) => setNotifs(p => p.map(g => ({ ...g, items: g.items.map(i => i.id === id ? { ...i, unread: false } : i) })));

  const handlePress = (item) => {
    markRead(item.id);
    if (item.nav) navigation.navigate(item.nav);
  };

  let filtered = notifs;
  if (filter === 'Unread') filtered = notifs.map(g => ({ ...g, items: g.items.filter(i => i.unread) })).filter(g => g.items.length > 0);
  else if (filter !== 'All') filtered = notifs.filter(g => g.group.toLowerCase().startsWith(filter.toLowerCase().replace('requests','ride request')));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        <TouchableOpacity onPress={markAllRead}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && <Text style={s.empty}>No notifications to show</Text>}
        {filtered.map(group => (
          <View key={group.group}>
            <View style={s.groupHeader}><Text style={s.groupLabel}>{group.group.toUpperCase()}</Text></View>
            {group.items.map(item => {
              const cfg = ICON_CFG[item.type] || ICON_CFG.system;
              return (
                <TouchableOpacity key={item.id} style={[s.notifItem, item.unread && s.notifUnread]} onPress={() => handlePress(item)} activeOpacity={0.7}>
                  {item.unread && <View style={s.unreadDot} />}
                  <View style={[s.iconCircle, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={20} color={cfg.color} /></View>
                  <View style={s.notifContent}>
                    <View style={s.notifTopRow}>
                      <Text style={[s.notifTitle, item.unread && s.notifTitleBold]} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.notifTime}>{item.time}</Text>
                    </View>
                    <Text style={s.notifPreview} numberOfLines={2}>{item.preview}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{ flex:1,backgroundColor:Colors.background },
  header:{ height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.lg,backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border },
  headerTitle:{ fontSize:Typography.lg,fontFamily:'PlusJakartaSans_700Bold',color:Colors.textPrimary },
  markAll:{ fontSize:Typography.sm,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.primary },
  filterBar:{ backgroundColor:Colors.surface,borderBottomWidth:1,borderBottomColor:Colors.border,maxHeight:48 },
  filterContent:{ paddingHorizontal:Spacing.lg,paddingVertical:8,gap:8,flexDirection:'row' },
  filterPill:{ paddingHorizontal:14,paddingVertical:6,borderRadius:Radius.full,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface },
  filterPillActive:{ backgroundColor:Colors.primary,borderColor:Colors.primary },
  filterPillText:{ fontSize:Typography.sm,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textSecondary },
  filterPillTextActive:{ color:'#fff' },
  scroll:{ flex:1 },
  empty:{ textAlign:'center',padding:40,color:Colors.textSecondary,fontSize:Typography.md },
  groupHeader:{ backgroundColor:Colors.background,paddingHorizontal:Spacing.lg,paddingVertical:8 },
  groupLabel:{ fontSize:Typography.xs,fontFamily:'PlusJakartaSans_600SemiBold',color:Colors.textSecondary,letterSpacing:0.8 },
  notifItem:{ flexDirection:'row',alignItems:'flex-start',gap:Spacing.md,paddingHorizontal:Spacing.lg,paddingVertical:Spacing.md,backgroundColor:Colors.surface,position:'relative',borderBottomWidth:1,borderBottomColor:Colors.border },
  notifUnread:{ borderLeftWidth:3,borderLeftColor:Colors.primary,backgroundColor:'#FBFFFE' },
  unreadDot:{ position:'absolute',top:18,left:6,width:8,height:8,borderRadius:4,backgroundColor:Colors.primary },
  iconCircle:{ width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',flexShrink:0 },
  notifContent:{ flex:1 },
  notifTopRow:{ flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3 },
  notifTitle:{ fontSize:Typography.base,fontFamily:'PlusJakartaSans_500Medium',color:Colors.textPrimary,flex:1 },
  notifTitleBold:{ fontFamily:'PlusJakartaSans_700Bold' },
  notifTime:{ fontSize:Typography.xs,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,marginLeft:Spacing.sm },
  notifPreview:{ fontSize:Typography.sm,fontFamily:'PlusJakartaSans_400Regular',color:Colors.textSecondary,lineHeight:18 },
});
