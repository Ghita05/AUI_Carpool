import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';

// Auth screens
import SplashScreen               from '../screens/auth/SplashScreen';
import LoginScreen                from '../screens/auth/LoginScreen';
import SignupEmailScreen           from '../screens/auth/SignupEmailScreen';
import SignupCheckInboxScreen      from '../screens/auth/SignupCheckInboxScreen';
import SignupCompleteProfileScreen from '../screens/auth/SignupCompleteProfileScreen';

// Home / Map
import HomeScreen from '../screens/home/HomeScreen';

// Rides
import RideDetailsScreen     from '../screens/rides/RideDetailsScreen';
import MyRidesScreen         from '../screens/rides/MyRidesScreen';
import CreateRideScreen      from '../screens/rides/CreateRideScreen';
import PostRideRequestScreen from '../screens/rides/PostRideRequestScreen';
import RideRequestsScreen    from '../screens/rides/RideRequestsScreen';

// Bookings
import BookRideScreen           from '../screens/bookings/BookRideScreen';
import BookingConfirmationScreen from '../screens/bookings/BookingConfirmationScreen';

// Profile & Settings
import UserProfileScreen     from '../screens/profile/UserProfileScreen';
import AccountSettingsScreen from '../screens/settings/AccountSettingsScreen';

// Messages
import MessagesScreen from '../screens/messages/MessagesScreen';

// Notifications
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 83,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.xs,
          fontFamily: 'PlusJakartaSans_600SemiBold',
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:          focused ? 'map'           : 'map-outline',
            Rides:         focused ? 'car'           : 'car-outline',
            Messages:      focused ? 'chatbubble'   : 'chatbubble-outline',
            Notifications: focused ? 'notifications': 'notifications-outline',
            Profile:       focused ? 'person'       : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeScreen} />
      <Tab.Screen name="Rides"         component={MyRidesScreen} />
      <Tab.Screen name="Messages"      component={MessagesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile"       component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {/* Auth flow */}
        <Stack.Screen name="Splash"                component={SplashScreen} />
        <Stack.Screen name="Login"                 component={LoginScreen} />
        <Stack.Screen name="SignupEmail"           component={SignupEmailScreen} />
        <Stack.Screen name="SignupCheckInbox"      component={SignupCheckInboxScreen} />
        <Stack.Screen name="SignupCompleteProfile" component={SignupCompleteProfileScreen} />

        {/* Main tab app */}
        <Stack.Screen name="Main" component={TabNavigator} />

        {/* Full-screen stack screens */}
        <Stack.Screen name="RideDetails"          component={RideDetailsScreen} />
        <Stack.Screen name="BookRide"             component={BookRideScreen} />
        <Stack.Screen name="BookingConfirmation"  component={BookingConfirmationScreen} />
        <Stack.Screen name="CreateRide"           component={CreateRideScreen} />
        <Stack.Screen name="PostRideRequest"      component={PostRideRequestScreen} />
        <Stack.Screen name="RideRequestsScreen"   component={RideRequestsScreen} />
        <Stack.Screen name="UserProfile"          component={UserProfileScreen} />
        <Stack.Screen name="AccountSettings"      component={AccountSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
