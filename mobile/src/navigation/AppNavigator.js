import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupEmailScreen from '../screens/auth/SignupEmailScreen';
import SignupCheckInboxScreen from '../screens/auth/SignupCheckInboxScreen';
import SignupCompleteProfileScreen from '../screens/auth/SignupCompleteProfileScreen';

// Home screens
import HomeScreen from '../screens/home/HomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignupEmail" component={SignupEmailScreen} />
        <Stack.Screen name="SignupCheckInbox" component={SignupCheckInboxScreen} />
        <Stack.Screen name="SignupCompleteProfile" component={SignupCompleteProfileScreen} />

        {/* Main app */}
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
