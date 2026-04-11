import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getMyRides } from '../../services/rideService';
import { getCurrentBookings, getBookingHistory } from '../../services/bookingService';
import CancelBookingModal from '../../components/CancelBookingModal';
import { getMyRideRequests, modifyRideRequest, deleteRideRequest, leaveGroupRideRequest, transferGroupOwner, getUsersByIds } from '../../services/rideService';
import EditRideRequestModal from '../../components/EditRideRequestModal';

// Data fetched from API — see useEffect below

const STATUS_STYLES = {
  confirmed:   { bg: Colors.primaryBg,   text: Colors.primary,        label: 'Upcoming' },
  open:        { bg: Colors.primaryBg,   text: Colors.primary,        label: 'Pending' },
  accepted:    { bg: Colors.background,  text: Colors.textSecondary,  label: 'Accepted' },
  completed:   { bg: Colors.background,  text: Colors.textSecondary,  label: 'Completed' },
  cancelled:   { bg: '#FEF2F2',          text: Colors.error,          label: 'Cancelled' },
  expired:     { bg: '#FEF2F2',          text: Colors.error,          label: 'Expired' },
};

function StatusBadge({ status }) {
  let normalized = status?.toLowerCase();
  // Map backend statuses to display
  if (normalized === 'confirmed') normalized = 'confirmed';
  else if (normalized === 'open') normalized = 'open';
  else if (normalized === 'accepted') normalized = 'accepted';
  else if (normalized === 'completed') normalized = 'completed';
  else if (normalized === 'cancelled') normalized = 'cancelled';
  else if (normalized === 'expired') normalized = 'expired';
  else normalized = 'completed';
  const s = STATUS_STYLES[normalized] || STATUS_STYLES.completed;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}> 
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function PassengerRideCard({ ride, navigation, onCancel }) {
  const isPast = ride.status !== 'upcoming';
  return (
    <View style={styles.rideCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <View style={styles.routeDotRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeCity}>{ride.from}</Text>
            <Text style={styles.routeCity}>{ride.to}</Text>
          </View>
        </View>
        <StatusBadge status={ride.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.cost} MAD</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.driverChip}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{ride.driverInitials}</Text>
          </View>
          <Text style={styles.driverName}>{ride.driver}</Text>
          <Ionicons name="star" size={11} color={Colors.accent} style={{ marginLeft: 4 }} />
          <Text style={styles.driverRating}>{ride.driverRating}</Text>
        </View>
        {!isPast ? (
          <View style={styles.actionBtnGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => onCancel(ride)}
            >
              <Ionicons name="close-circle-outline" size={12} color={Colors.error} />
              <Text style={[styles.actionBtnText, {color: Colors.error}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('RideDetails', { rideId: ride.rideId || ride.id })}>
              <Text style={styles.actionBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ) : ride.status === 'completed' && !ride.rated ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAccent]}
            onPress={() => navigation.navigate('RideDetails', { rideId: ride.rideId || ride.id })}
          >
            <Ionicons name="star-outline" size={12} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Rate Ride</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function DriverRideCard({ ride, navigation }) {
  const isPast = ride.status !== 'upcoming';
  return (
    <View style={styles.rideCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <View style={styles.routeDotRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeCity}>{ride.from}</Text>
            <Text style={styles.routeCity}>{ride.to}</Text>
          </View>
        </View>
        <StatusBadge status={ride.status} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{ride.price} MAD</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.passengerChip}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.passengerText}>{ride.passengers}/{ride.totalSeats} passengers · Booked</Text>
        </View>
        {!isPast && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('RideDetails', { rideId: ride.rideId || ride.id })}
          >
            <Text style={styles.actionBtnText}>Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RideRequestCard({ request, isPast, onEdit, onCancel }) {
  // Determine status for badge
  let status = request.status?.toLowerCase();
  const now = new Date();
  const travelDate = new Date(request.travelDateTime);
  if (status === 'open') {
    if (travelDate < now) status = 'expired';
    else status = 'pending';
  }
  if (status === 'accepted') status = 'completed';
  return (
    <View style={styles.rideCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <View style={styles.routeDotRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.accent }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeCity}>{request.departureLocation}</Text>
            <Text style={styles.routeCity}>{request.destination}</Text>
          </View>
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{travelDate.toLocaleDateString()}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{travelDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{request.maxPrice} MAD</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.driverName}>Requested for {request.passengerCount} {request.passengerCount > 1 ? 'people' : 'person'}</Text>
        {!isPast && status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit?.(request)}>
              <Ionicons name="create-outline" size={14} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onCancel?.(request)}>
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function MyRidesScreen({ navigation }) {
  const { user, isDriver } = useAuth();
  const [role, setRole] = useState(isDriver ? 'Driver' : 'Passenger');
  const [tab, setTab] = useState('upcoming');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRideToCancel, setSelectedRideToCancel] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pastRequests, setPastRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  // Edit ride request handler: open modal
  // Only owner can edit
  const handleEditRequest = async (request) => {
    if (user && request.passengerId && user._id === request.passengerId) {
      let groupUsers = [];
      if (request.groupPassengerIds && request.groupPassengerIds.length > 0) {
        try {
          const res = await getUsersByIds(request.groupPassengerIds);
          groupUsers = res.users || [];
        } catch { groupUsers = []; }
      }
      // Always include the owner
      if (request.passenger && !groupUsers.some(u => u && u._id === request.passenger._id)) {
        groupUsers = [request.passenger, ...groupUsers];
      }
      setEditingRequest({ ...request, groupUsers });
    } else {
      alert('Only the group owner can edit this request.');
    }
  };

  // Save edit
  const handleSaveEdit = async (updates) => {
    setEditLoading(true);
    try {
      await modifyRideRequest(editingRequest._id, updates);
      // Update local state for instant feedback
      setPendingRequests(prev => prev.map(r => r._id === editingRequest._id ? { ...r, ...updates } : r));
      setEditingRequest(null);
    } catch {}
    setEditLoading(false);
  };

  // Cancel ride request handler
  // useAuth is already called at the top-level, do not redeclare user here
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerTransferRequest, setOwnerTransferRequest] = useState(null);
  const [ownerCandidates, setOwnerCandidates] = useState([]);
  const handleCancelRequest = async (request) => {
    alert('Cancel handler called. Request _id: ' + request?._id + ', passengerId: ' + request?.passengerId);
    console.log('CANCEL REQUEST:', request);
    setEditLoading(true);
    try {
      const isOwner = user && request.passengerId && user._id === request.passengerId;
      const groupIds = (request.groupPassengerIds || []).filter(id => id !== request.passengerId);
      console.log('[handleCancelRequest] isOwner:', isOwner, 'groupIds:', groupIds);
      if (isOwner) {
        if (groupIds.length === 0) {
          console.log('[handleCancelRequest] About to call deleteRideRequest for', request._id);
          await deleteRideRequest(request._id);
          alert('DELETE endpoint called for ' + request._id);
          setPendingRequests(prev => prev.filter(r => r._id !== request._id));
        } else if (groupIds.length === 1) {
          // Only one other member, transfer automatically
          await transferGroupOwner(request._id, groupIds[0]);
          await leaveGroupRideRequest(request._id);
          setPendingRequests(prev => prev.filter(r => r._id !== request._id));
        } else {
          // Multiple candidates, show modal to select new owner
          setOwnerCandidates(groupIds);
          setOwnerTransferRequest(request);
          setShowOwnerModal(true);
        }
      } else {
        await leaveGroupRideRequest(request._id);
        setPendingRequests(prev => prev.filter(r => r._id !== request._id));
      }
    } catch (err) {
      console.log('[handleCancelRequest] Error:', err);
      alert('Error: ' + (err?.response?.data?.message || err?.message || 'Failed to cancel request.'));
    }
    setEditLoading(false);
  };

  // Owner transfer modal handler
  const handleSelectNewOwner = async (newOwnerId) => {
    if (!ownerTransferRequest) return;
    setEditLoading(true);
    try {
      await transferGroupOwner(ownerTransferRequest._id, newOwnerId);
      await leaveGroupRideRequest(ownerTransferRequest._id);
      setPendingRequests(prev => prev.filter(r => r._id !== ownerTransferRequest._id));
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to transfer ownership.');
    }
    setShowOwnerModal(false);
    setOwnerTransferRequest(null);
    setOwnerCandidates([]);
    setEditLoading(false);
  };
      <EditRideRequestModal
        visible={!!editingRequest}
        request={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSave={handleSaveEdit}
        currentUser={user}
        onCancelRequest={handleCancelRequest}
      />

      {/* Owner transfer modal */}
      {showOwnerModal && ownerTransferRequest && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Select New Owner</Text>
              {(ownerTransferRequest.groupUsers || []).filter(u => ownerCandidates.includes(u._id)).map(u => (
                <TouchableOpacity key={u._id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={() => handleSelectNewOwner(u._id)}>
                  <Text style={{ fontSize: 16 }}>{u.firstName} {u.lastName} <Text style={{ color: '#888', fontSize: 13 }}>({u.email})</Text></Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowOwnerModal(false)}>
                <Text style={{ color: 'red', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

  const handleCancelPress = (ride) => {
    setSelectedRideToCancel(ride);
    setShowCancelModal(true);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (role === 'Passenger') {
        // Fetch bookings and ride requests in parallel
        const [bookingsRes, requestsRes] = await Promise.all([
          getCurrentBookings(),
          getMyRideRequests()
        ]);

        // Bookings (actual rides)
        const bookings = (bookingsRes.data?.bookings || []).map(b => {
          const ride = b.rideId || {};
          const driver = ride.driverId || {};
          return {
            id: b._id,
            rideId: ride._id,
            from: ride.departureLocation,
            to: ride.destination,
            date: new Date(ride.departureDateTime).toLocaleDateString(),
            time: new Date(ride.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cost: b.price,
            driver: driver.firstName ? `${driver.firstName} ${driver.lastName || ''}` : '',
            driverInitials: driver.firstName ? (driver.firstName[0] + (driver.lastName ? driver.lastName[0] : '')).toUpperCase() : '',
            driverRating: driver.rating || '',
            rated: b.rated,
            status: b.status,
          };
        });

        // Ride requests
        const now = new Date();
        const requests = requestsRes.data?.requests || [];
        // Upcoming requests: status 'Open' and future date
        const upcomingRequests = requests.filter(r => {
          const travelDate = new Date(r.travelDateTime);
          return r.status === 'Open' && travelDate >= now;
        });
        // Past/expired requests: all others
        const expiredRequests = requests.filter(r => {
          const travelDate = new Date(r.travelDateTime);
          return r.status !== 'Open' || travelDate < now;
        });
        setPendingRequests(upcomingRequests);
        setPastRequests(expiredRequests);

        if (tab === 'upcoming') {
          // Show bookings with status 'Confirmed' and future ride date
          setData(bookings.filter(b => b.status === 'Confirmed' && new Date(b.date.split('/').reverse().join('-')) >= now));
        } else {
          // For past tab, fetch booking history
          const historyRes = await getBookingHistory();
          const pastBookings = (historyRes.data?.bookings || []).map(b => {
            const ride = b.rideId || {};
            const driver = ride.driverId || {};
            return {
              id: b._id,
              rideId: ride._id,
              from: ride.departureLocation,
              to: ride.destination,
              date: new Date(ride.departureDateTime).toLocaleDateString(),
              time: new Date(ride.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cost: b.price,
              driver: driver.firstName ? `${driver.firstName} ${driver.lastName || ''}` : '',
              driverInitials: driver.firstName ? (driver.firstName[0] + (driver.lastName ? driver.lastName[0] : '')).toUpperCase() : '',
              driverRating: driver.rating || '',
              rated: b.rated,
              status: b.status,
            };
          });
          // Show bookings with status 'Completed' or 'Cancelled', or past ride date
          setData(pastBookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || new Date(b.date.split('/').reverse().join('-')) < now));
        }
      } else {
        // Driver view
        const res = await getMyRides(tab === 'upcoming' ? 'upcoming' : 'past');
        setData((res.data?.rides || []).map(r => {
          const v = r.vehicleId || {};
          return {
            id: r._id, from: r.departureLocation, to: r.destination,
            date: new Date(r.departureDateTime).toLocaleDateString(),
            time: new Date(r.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: r.pricePerSeat,
            status: ['Active', 'Full'].includes(r.status) ? 'upcoming' : r.status?.toLowerCase() || 'completed',
            passengers: r.totalSeats - r.availableSeats, totalSeats: r.totalSeats,
            rideId: r._id,
          };
        }));
        setPendingRequests([]);
        setPastRequests([]);
      }
    } catch {
      setData([]); setPendingRequests([]); setPastRequests([]);
    }
    finally { setLoading(false); }
  }, [role, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <EditRideRequestModal
        visible={!!editingRequest}
        request={editingRequest}
        onClose={() => setEditingRequest(null)}
        onSave={handleSaveEdit}
        currentUser={user}
        onCancelRequest={handleCancelRequest}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rides</Text>
        {/* Role toggle — only for drivers */}
        {isDriver && (
        <View style={styles.roleToggle}>
          {['Passenger', 'Driver'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => { setRole(r); setTab('upcoming'); }}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['upcoming', 'past'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg }}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            {role === 'Passenger' && tab === 'upcoming' && (
              <>
                {data.length > 0 && (
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.lg, marginBottom: 8, color: Colors.primary }}>Upcoming Rides</Text>
                    {data.map(ride => (
                      <PassengerRideCard key={ride.id} ride={ride} navigation={navigation} onCancel={handleCancelPress} />
                    ))}
                  </View>
                )}
                {pendingRequests.length > 0 && (
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.lg, marginBottom: 8, color: Colors.primary }}>Pending Ride Requests</Text>
                    {pendingRequests.map(req => (
                      <RideRequestCard
                        key={req._id}
                        request={req}
                        isPast={false}
                        onEdit={handleEditRequest}
                        onCancel={handleCancelRequest}
                      />
                    ))}
                  </View>
                )}
                {data.length === 0 && pendingRequests.length === 0 && (
                  <View style={styles.empty}>
                    <Ionicons name="car-outline" size={40} color={Colors.border} />
                    <Text style={styles.emptyText}>No upcoming rides or requests</Text>
                  </View>
                )}
              </>
            )}
            {role === 'Passenger' && tab === 'past' && (
              <>
                {data.length > 0 && (
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.lg, marginBottom: 8, color: Colors.primary }}>Past Rides</Text>
                    {data.map(ride => (
                      <PassengerRideCard key={ride.id} ride={ride} navigation={navigation} onCancel={handleCancelPress} />
                    ))}
                  </View>
                )}
                {pastRequests.length > 0 && (
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: Typography.lg, marginBottom: 8, color: Colors.primary }}>Expired Ride Requests</Text>
                    {pastRequests.map(req => (
                      <RideRequestCard
                        key={req._id}
                        request={req}
                        isPast={true}
                      />
                    ))}
                  </View>
                )}
                {data.length === 0 && pastRequests.length === 0 && (
                  <View style={styles.empty}>
                    <Ionicons name="car-outline" size={40} color={Colors.border} />
                    <Text style={styles.emptyText}>No past rides or expired requests</Text>
                  </View>
                )}
              </>
            )}
            {role !== 'Passenger' && (
              <>
                {data.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="car-outline" size={40} color={Colors.border} />
                    <Text style={styles.emptyText}>No {tab} rides</Text>
                  </View>
                ) : data.map(ride => (
                  <DriverRideCard key={ride.id} ride={ride} navigation={navigation} />
                ))}
              </>
            )}
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {role === 'Passenger' ? (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="search-outline" size={16} color={Colors.textWhite} />
            <Text style={styles.ctaBtnText}>Find a Ride</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('CreateRide')}>
              <Ionicons name="add" size={16} color={Colors.textWhite} />
              <Text style={styles.ctaBtnText}>Post a Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtn, { marginTop: 10, backgroundColor: Colors.primaryLight }]} onPress={() => navigation.navigate('RideRequestsScreen')}>
              <Ionicons name="list-outline" size={16} color={Colors.textWhite} />
              <Text style={styles.ctaBtnText}>View Ride Requests</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <CancelBookingModal
        visible={showCancelModal}
        booking={selectedRideToCancel?.bookingData}
        ride={selectedRideToCancel?.rideData}
        onClose={() => setShowCancelModal(false)}
        onCancelled={() => {
          setShowCancelModal(false);
          fetchData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography['2xl'], fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  roleToggle: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 2 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm - 2 },
  roleBtnActive: { backgroundColor: Colors.surface, ...Shadows.sm },
  roleBtnText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  roleBtnTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textPrimary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary },
  tabTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  scroll: { flex: 1 },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  routeBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.sm },
  routeDotRow: { alignItems: 'center', marginRight: Spacing.sm },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1.5, height: 16, backgroundColor: Colors.border, marginVertical: 2 },
  routeCity: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary, lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_600SemiBold' },
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverChip: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  driverAvatarText: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  driverName: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  driverRating: { fontSize: Typography.xs, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary, marginLeft: 2 },
  passengerChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  passengerText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnSecondary: { borderColor: Colors.error, backgroundColor: 'transparent' },
  actionBtnAccent: { borderColor: Colors.accent },
  actionBtnText: { fontSize: Typography.sm, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.textSecondary },
  bottomBar: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  ctaBtnText: { fontSize: Typography.lg, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textWhite },
});
