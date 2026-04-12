import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import * as msgService from '../../services/messageService';

function timeLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString();
}

function ConversationItem({ conv, onPress }) {
  const other = conv.otherUser || {};
  const initials = ((other.firstName?.[0] || '') + (other.lastName?.[0] || '')).toUpperCase();
  const name = `${other.firstName || ''} ${other.lastName || ''}`.trim();
  return (
    <TouchableOpacity style={s.convItem} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvatar}><Text style={s.convAvatarText}>{initials}</Text></View>
      <View style={s.convContent}>
        <View style={s.convTopRow}>
          <Text style={s.convName}>{name}</Text>
          <Text style={s.convTime}>{timeLabel(conv.lastDate)}</Text>
        </View>
        <View style={s.convBottomRow}>
          <Text style={s.convPreview} numberOfLines={1}>{conv.lastMessage}</Text>
          {conv.unreadCount > 0 && (
            <View style={s.unreadBadge}><Text style={s.unreadText}>{conv.unreadCount}</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatView({ conv, onBack, navigation }) {
  const { user } = useAuth();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const otherId = conv._id;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await msgService.getMessageHistory(otherId);
        setMessages(res.data?.messages || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchMessages();
  }, [otherId]);

  const send = async () => {
    if (!msg.trim()) return;
    try {
      const res = await msgService.sendMessage({ receiverId: otherId, content: msg.trim() });
      if (res.data?.message) {
        setMessages(prev => [...prev, res.data.message]);
      }
      setMsg('');
    } catch {}
  };

  const other = conv.otherUser || {};
  const initials = ((other.firstName?.[0] || '') + (other.lastName?.[0] || '')).toUpperCase();
  const name = `${other.firstName || ''} ${other.lastName || ''}`.trim();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.chatAvatar}><Text style={s.chatAvatarText}>{initials}</Text></View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={s.chatName}>{name}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item._id}
          contentContainerStyle={s.messagesList}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?._id || item.senderId?._id === user?._id;
            const hasAction = item.action?.type === 'stop_request';
            return (
              <View style={[s.bubbleRow, isMe && s.bubbleRowMe]}>
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem, hasAction && s.bubbleWithAction]}>
                  <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.content}</Text>
                  {hasAction && !isMe && (
                    <TouchableOpacity 
                      style={s.actionButton}
                      onPress={() => {
                        if (item.action?.rideId) {
                          const rideId = item.action.rideId;
                          navigation.navigate('RideDetails', { rideId, openStops: true });
                        }
                      }}
                    >
                      <Ionicons name="flag-outline" size={14} color="#fff" />
                      <Text style={s.actionButtonText}>View Stop Requests</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[s.bubbleTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={s.inputBar}>
        <TextInput style={s.chatInput} placeholder="Type a message..." placeholderTextColor={Colors.textDisabled} value={msg} onChangeText={setMsg} multiline />
        <TouchableOpacity style={[s.sendBtn, !msg.trim() && s.sendBtnDisabled]} onPress={send}>
          <Ionicons name="send" size={16} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [activeConv, setActiveConv] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const driverId = route?.params?.driverId;
  const driverName = route?.params?.driverName;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await msgService.getConversations();
      setConversations(res.data?.conversations || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchConversations();
    // If driverId is passed, set up direct conversation
    if (driverId) {
      setActiveConv({
        _id: driverId,
        otherUser: { _id: driverId, firstName: driverName?.split(' ')[0] || 'Driver', lastName: driverName?.split(' ')[1] || '' }
      });
    }
  }, [fetchConversations, driverId, driverName]);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const name = `${c.otherUser?.firstName || ''} ${c.otherUser?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (activeConv) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ChatView conv={activeConv} onBack={() => { setActiveConv(null); fetchConversations(); }} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Messages</Text>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
        <TextInput style={s.searchInput} placeholder="Search conversations..." placeholderTextColor={Colors.textDisabled} value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 40 }} />
      ) : filtered.length === 0 ? (
        <Text style={{ textAlign: 'center', padding: 40, color: Colors.textSecondary }}>No conversations yet</Text>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item._id} renderItem={({ item }) => (
          <ConversationItem conv={item} onPress={() => setActiveConv(item)} />
        )} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  convItem: { flexDirection: 'row', padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  convAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  convAvatarText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convName: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  convTime: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  convBottomRow: { flexDirection: 'row', alignItems: 'center' },
  convPreview: { flex: 1, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  // Chat
  chatHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  chatName: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  messagesList: { padding: Spacing.lg },
  bubbleRow: { marginBottom: 8, flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },
  bubbleWithAction: { paddingBottom: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginTop: 10 },
  actionButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  chatInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
