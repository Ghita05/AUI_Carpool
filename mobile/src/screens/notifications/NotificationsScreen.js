import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import * as notifService from '../../services/notificationService';

const ICON_CFG = {
  Booking:{ icon:'checkmark-circle',bg:Colors.primaryBg,color:Colors.primary },
  Reminder:{ icon:'time',bg:'#FEF3C7',color:Colors.accent },
  Cancellation:{ icon:'close-circle',bg:'#FEF2F2',color:Colors.error },
  Alert:{ icon:'information-circle',bg:Colors.primaryBg,color:Colors.primary },
  System:{ icon:'information-circle',bg:Colors.background,color:Colors.textSecondary },
};

const GROUP_MAP = { Booking:'Bookings', Reminder:'Rides', Cancellation:'Bookings', Alert:'Alerts', System:'System' };
const FILTERS = ['All','Unread','Bookings','Rides','Alerts','System'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notifService.getNotifications(1, 50);
      setNotifications(res.data?.notifications || []);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.readStatus).length;

  const handleMarkAllRead = async () => {
    try {
      await notifService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, readStatus: true })));
    } catch {}
  };

  const handlePress = async (item) => {
    if (!item.readStatus) {
      try {
        await notifService.markAsRead(item._id);
        setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, readStatus: true } : n));
      } catch {}
    }
  };

  // Group notifications by type for display
  const grouped = notifications.reduce((acc, n) => {
    const group = GROUP_MAP[n.type] || 'System';
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  let filteredGroups = Object.entries(grouped).map(([group, items]) => ({ group, items }));

  if (filter === 'Unread') {
    filteredGroups = filteredGroups.map(g => ({ ...g, items: g.items.filter(i => !i.readStatus) })).filter(g => g.items.length > 0);
  } else if (filter !== 'All') {
    filteredGroups = filteredGroups.filter(g => g.group === filter);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        <TouchableOpacity onPress={handleMarkAllRead}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 40 }} />
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {filteredGroups.length === 0 && <Text style={s.empty}>No notifications to show</Text>}
          {filteredGroups.map(group => (
            <View key={group.group}>
              <View style={s.groupHeader}><Text style={s.groupLabel}>{group.group.toUpperCase()}</Text></View>
              {group.items.map(item => {
                const cfg = ICON_CFG[item.type] || ICON_CFG.System;
                const unread = !item.readStatus;
                return (
                  <TouchableOpacity key={item._id} style={[s.notifItem, unread && s.notifUnread]} onPress={() => handlePress(item)} activeOpacity={0.7}>
                    {unread && <View style={s.unreadDot} />}
                    <View style={[s.iconCircle, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={20} color={cfg.color} /></View>
                    <View style={s.notifContent}>
                      <View style={s.notifTopRow}>
                        <Text style={[s.notifTitle, unread && s.notifTitleBold]} numberOfLines={1}>{item.title}</Text>
                        <Text style={s.notifTime}>{timeAgo(item.date)}</Text>
                      </View>
                      <Text style={s.notifPreview} numberOfLines={2}>{item.content}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
