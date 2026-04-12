import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { postRideRequest, searchUsers } from '../../services/rideService';
import { useAuth } from '../../context/AuthContext';
import DateTimePickerModal from '../../components/DateTimePickerModal';
import RequestConfirmationModal from '../../components/RequestConfirmationModal';

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
}


export default function PostRideRequestScreen({ navigation }) {
  const { user } = useAuth();
  const [from, setFrom] = useState('AUI Campus');
  const [to, setTo] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupUsers, setGroupUsers] = useState([]); // [{_id, firstName, lastName, email, ...}]
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState([]);
  const [newStop, setNewStop] = useState('');
  const [posting, setPosting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastRequest, setLastRequest] = useState(null);

  const handlePost = async () => {
    if (!from.trim()) { alert('Please enter a departure location.'); return; }
    if (!to.trim())   { alert('Please enter a destination.'); return; }
    if (!departureDateTime) { alert('Please select a date and time.'); return; }
    if (!maxPrice)    { alert('Please enter a max budget.'); return; }
    if (groupMode && groupUsers.length < 2) { alert('Add at least 1 other person for a group request.'); return; }

    setPosting(true);
    try {
      let reqObj;
      if (groupMode) {
        reqObj = {
          departureLocation: from.trim(),
          destination: to.trim(),
          travelDateTime: departureDateTime.toISOString(),
          passengerCount: groupUsers.length,
          maxPrice: parseInt(maxPrice) || 100,
          notes,
          groupPassengerIds: groupUsers.map(u => u._id),
          stops,
        };
      } else {
        reqObj = {
          departureLocation: from.trim(),
          destination: to.trim(),
          travelDateTime: departureDateTime.toISOString(),
          passengerCount: 1,
          maxPrice: parseInt(maxPrice) || 100,
          notes,
          stops,
        };
      }
      await postRideRequest(reqObj);
      setLastRequest(reqObj);
      setShowConfirmation(true);
      setGroupUsers([]);
      setUserSearch('');
      setUserSearchResults([]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to post request.';
      alert(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Ride Request</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.bannerText}>
            No rides matching your route? Post a request and let drivers find you.
          </Text>
        </View>

        {/* Route */}
        <SectionCard>
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <TextInput
              style={styles.routeInput}
              value={from}
              onChangeText={setFrom}
              placeholder="Departure location"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>
          <View style={{ height: Spacing.sm }} />
          <View style={styles.routeFieldWrap}>
            <Ionicons name="location" size={14} color={Colors.error} />
            <TextInput
              style={styles.routeInput}
              value={to}
              onChangeText={setTo}
              placeholder="Destination"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>
        </SectionCard>

        {/* Stops */}
        <SectionCard title="Stops (Optional)">
          <View style={{flexDirection:'row',gap:8,marginBottom:stops.length?8:0}}>
            <TextInput
              style={[styles.input,{flex:1}]}
              value={newStop}
              onChangeText={setNewStop}
              placeholder="Add a stop along the way"
              placeholderTextColor={Colors.textDisabled}
            />
            <TouchableOpacity
              style={{height:46,width:46,backgroundColor:Colors.primary,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'}}
              onPress={()=>{
                const s=newStop.trim();
                if(s&&!stops.includes(s)){setStops([...stops,s]);setNewStop('');}
              }}
            >
              <Ionicons name="add" size={20} color={Colors.textWhite}/>
            </TouchableOpacity>
          </View>
          {stops.length>0&&(
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
              {stops.map((s,i)=>(
                <View key={i} style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:10,paddingVertical:4,borderRadius:16}}>
                  <Text style={{color:Colors.primary,fontSize:13,fontFamily:'PlusJakartaSans_600SemiBold'}}>{s}</Text>
                  <TouchableOpacity onPress={()=>setStops(stops.filter((_,j)=>j!==i))} style={{marginLeft:6}}>
                    <Ionicons name="close-circle" size={14} color={Colors.error}/>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Date & Time">
          <TouchableOpacity style={styles.dateTimePickerButton} onPress={() => setShowDateTimePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{marginRight: 8}}/>
            <View style={{flex: 1}}>
              <Text style={styles.dateTimePickerText}>
                {departureDateTime 
                  ? `${new Date(departureDateTime).toLocaleDateString()} ${new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
                  : 'Select Date & Time'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary}/>
          </TouchableOpacity>
        </SectionCard>

        {/* Group Mode Toggle & Group UI */}
        <SectionCard title="Group & Budget">
          <View style={{flexDirection:'row',alignItems:'center',marginBottom:10}}>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:6,padding:6,borderRadius:8,borderWidth:1,borderColor:groupMode?Colors.primary:Colors.border,backgroundColor:groupMode?Colors.primaryBg:Colors.background,marginRight:10}}
              onPress={()=>{
                setGroupMode(g => {
                  const next = !g;
                  if (next && user) {
                    setGroupUsers(prev => prev.some(u => u._id === user._id) ? prev : [{ _id: user._id, firstName: user.firstName, lastName: user.lastName }, ...prev]);
                  } else if (!next) {
                    setGroupUsers([]);
                  }
                  return next;
                });
              }}
            >
              <Ionicons name={groupMode?"checkbox-outline":"square-outline"} size={18} color={groupMode?Colors.primary:Colors.textSecondary}/>
              <Text style={{color:groupMode?Colors.primary:Colors.textSecondary,fontFamily:'PlusJakartaSans_600SemiBold',fontSize:13}}>Group Request</Text>
            </TouchableOpacity>
              <Text style={{color:Colors.textSecondary,fontSize:12}}>Request for multiple users</Text>
          </View>
          {groupMode && (
            <>
              <Text style={styles.fieldLabel}>Add Users to Group</Text>
              <TextInput
                style={styles.input}
                value={userSearch}
                onChangeText={async (txt) => {
                  setUserSearch(txt);
                  if (txt.length >= 2) {
                    setUserSearchLoading(true);
                    try {
                      const res = await searchUsers(txt);
                      setUserSearchResults(res.users.filter(u => !groupUsers.some(g => g._id === u._id) && u._id !== user?._id));
                    } catch { setUserSearchResults([]); }
                    setUserSearchLoading(false);
                  } else {
                    setUserSearchResults([]);
                  }
                }}
                placeholder="Search by name or email"
                placeholderTextColor={Colors.textDisabled}
              />
              {userSearchLoading && <Text style={{color:Colors.textSecondary,fontSize:12,marginTop:4}}>Searching...</Text>}
              {userSearchResults.length > 0 && (
                <View style={{backgroundColor:Colors.background,borderWidth:1,borderColor:Colors.border,borderRadius:8,marginTop:4}}>
                  {userSearchResults.map(u => (
                    <TouchableOpacity key={u._id} style={{padding:10,flexDirection:'row',alignItems:'center',gap:8}} onPress={()=>{
                      setGroupUsers([...groupUsers,u]);
                      setUserSearch('');
                      setUserSearchResults([]);
                    }}>
                      <Ionicons name="person-add-outline" size={16} color={Colors.primary}/>
                      <Text style={{fontSize:13,color:Colors.textPrimary}}>{u.firstName} {u.lastName} <Text style={{color:Colors.textSecondary,fontSize:12}}>({u.email})</Text></Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {groupUsers.length > 0 && (
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
                  {groupUsers.map(u => (
                    <View key={u._id} style={{flexDirection:'row',alignItems:'center',backgroundColor:Colors.primaryBg,paddingHorizontal:10,paddingVertical:4,borderRadius:16}}>
                      <Text style={{color:Colors.primary,fontSize:13}}>{u.firstName} {u.lastName}{u._id === user?._id ? ' (You)' : ''}</Text>
                      {u._id !== user?._id && (
                        <TouchableOpacity onPress={()=>setGroupUsers(groupUsers.filter(g=>g._id!==u._id))} style={{marginLeft:6}}>
                          <Ionicons name="close-circle" size={14} color={Colors.error}/>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          {!groupMode && (
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Passengers</Text>
                <View style={styles.stepperRowInline}>
                  <Text style={styles.stepVal}>1</Text>
                </View>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Max Budget (MAD)</Text>
                <TextInput
                  style={styles.input}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  placeholder="e.g. 80"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </View>
          )}
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Additional Notes">
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any preferences or extra info for drivers..."
            placeholderTextColor={Colors.textDisabled}
            multiline
            numberOfLines={4}
          />
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      <DateTimePickerModal
        visible={showDateTimePicker}
        date={departureDateTime}
        time={departureDateTime ? new Date(departureDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '09:00'}
        onClose={() => setShowDateTimePicker(false)}
        onConfirm={(selectedDateTime) => {
          setDepartureDateTime(selectedDateTime);
          setShowDateTimePicker(false);
        }}
      />
      <RequestConfirmationModal
        visible={showConfirmation}
        request={lastRequest}
        onClose={() => {
          setShowConfirmation(false);
          navigation.navigate('Main', { screen: 'Home' });
        }}
      />

      {/* Post Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={posting}>
          <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post Request'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    margin: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary,
  },
  bannerText: {
    flex: 1, fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.primary, lineHeight: 18,
  },
  card: { backgroundColor: Colors.surface, padding: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: {
    fontSize: Typography.md, fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  routeFieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, height: 48, backgroundColor: Colors.background,
  },
  routeInput: {
    flex: 1, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  fieldInputText: {
    flex: 1, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  stepperRowInline: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, height: 46,
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepVal: {
    fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary,
  },
  input: {
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, fontSize: Typography.md,
    fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
  },
  notesInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary,
    minHeight: 100, textAlignVertical: 'top',
  },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm,
  },
  postBtn: {
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtnText: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: {
    fontSize: Typography.base, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary,
  },
  dateTimePickerButton: {
    flexDirection: 'row', alignItems: 'center',
    height: 46, backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  dateTimePickerText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textPrimary },
});
