import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const CONVERSATIONS = [
  {
    id: '1', name: 'Ghita Nafa', initials: 'GN',
    lastMsg: 'See you at 2pm at the main gate!', time: '14:32', unread: 2, rideTag: 'AUI → Fez',
  },
  {
    id: '2', name: 'Ahmed Benali', initials: 'AB',
    lastMsg: 'The car is white Dacia Logan', time: '11:05', unread: 0, rideTag: 'AUI → Rabat',
  },
  {
    id: '3', name: 'Kenza Nouri', initials: 'KN',
    lastMsg: 'Great, see you tomorrow!', time: 'Yesterday', unread: 0, rideTag: 'AUI → Meknes',
  },
];

const MOCK_MESSAGES = [
  { id: '1', text: 'Hi! I booked your ride to Fez. Where exactly is the meeting point?', sender: 'them', time: '14:00' },
  { id: '2', text: 'Hey! At the AUI main gate, right by the security booth.', sender: 'me', time: '14:05' },
  { id: '3', text: 'Perfect! And what time should I be there exactly?', sender: 'them', time: '14:10' },
  { id: '4', text: 'Please be there by 13:50 so we can leave on time 🙏', sender: 'me', time: '14:15' },
  { id: '5', text: 'See you at 2pm at the main gate!', sender: 'them', time: '14:32' },
];

function ConversationItem({ conv, onPress }) {
  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.convAvatar}>
        <Text style={styles.convAvatarText}>{conv.initials}</Text>
      </View>
      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName}>{conv.name}</Text>
          <Text style={styles.convTime}>{conv.time}</Text>
        </View>
        <View style={styles.convBottomRow}>
          <Text style={styles.convPreview} numberOfLines={1}>{conv.lastMsg}</Text>
          {conv.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conv.unread}</Text>
            </View>
          )}
        </View>
        <View style={styles.rideTagRow}>
          <Ionicons name="location-outline" size={10} color={Colors.primary} />
          <Text style={styles.rideTagText}>{conv.rideTag}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatView({ conv, onBack }) {
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const send = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, {
      id: String(prev.length + 1), text: msg.trim(), sender: 'me', time: 'Now'
    }]);
    setMsg('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{conv.initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={styles.chatName}>{conv.name}</Text>
          <Text style={styles.chatRideTag}>{conv.rideTag}</Text>
        </View>
        <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.sender === 'me' && styles.bubbleRowMe]}>
            <View style={[styles.bubble, item.sender === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, item.sender === 'me' && styles.bubbleTextMe]}>
                {item.text}
              </Text>
              <Text style={[styles.bubbleTime, item.sender === 'me' && { color: 'rgba(255,255,255,0.7)' }]}>
                {item.time}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textDisabled}
          value={msg}
          onChangeText={setMsg}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !msg.trim() && styles.sendBtnDisabled]} onPress={send}>
          <Ionicons name="send" size={16} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [activeConv, setActiveConv] = useState(null);

  const filtered = CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.rideTag.toLowerCase().includes(search.toLowerCase())
  );

  if (activeConv) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ChatView conv={activeConv} onBack={() => setActiveConv(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ConversationItem conv={item} onPress={() => setActiveConv(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={36} color={Colors.border} />
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  searchContainer: { backgroundColor: Colors.surface, padding: Spacing.lg, paddingTop: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, height: 40,
  },
  searchInput: { flex: 1, fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  convItem: { flexDirection: 'row', padding: Spacing.lg, backgroundColor: Colors.surface },
  convAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  convAvatarText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  convName: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  convTime: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convPreview: { flex: 1, fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  unreadBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm,
  },
  unreadText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
  rideTagRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rideTagText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.primary },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  chatHeader: {
    height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chatAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm,
  },
  chatAvatarText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  chatName: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  chatRideTag: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.primary },
  messagesList: { padding: Spacing.lg, gap: Spacing.sm },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 12, gap: 3,
  },
  bubbleThem: { backgroundColor: Colors.surface, borderRadius: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12, ...Shadows.sm },
  bubbleMe: { backgroundColor: Colors.primary, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 0 },
  bubbleText: { fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
  bubbleTextMe: { color: Colors.textWhite },
  bubbleTime: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  chatInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.base, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
