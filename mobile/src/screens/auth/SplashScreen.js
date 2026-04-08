import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { isAuthenticated, loading } = useAuth();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  // Use refs to avoid stale closures in the animation callback
  const animDone = useRef(false);
  const loadingRef = useRef(loading);
  const authRef = useRef(isAuthenticated);
  const navigated = useRef(false);

  // Keep refs in sync with latest state
  loadingRef.current = loading;
  authRef.current = isAuthenticated;

  const tryNavigate = () => {
    if (navigated.current) return;
    if (!animDone.current || loadingRef.current) return;
    navigated.current = true;
    navigation?.replace(authRef.current ? 'Main' : 'Login');
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(barWidth, { toValue: width * 0.5, duration: 1200, useNativeDriver: false }),
    ]).start(() => {
      animDone.current = true;
      tryNavigate();
    });
  }, []);

  // Also try navigating when loading state changes
  useEffect(() => {
    tryNavigate();
  }, [loading, isAuthenticated]);

  return (
    <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <Animated.View style={[styles.logoCircle, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Ionicons name="car-outline" size={48} color="rgba(255,255,255,0.9)" />
      </Animated.View>

      <Animated.View style={[styles.textGroup, { opacity: textOpacity }]}>
        <Text style={styles.appName}>AUI Carpool</Text>
        <Text style={styles.tagline}>A Peer-to-Peer Ride Sharing Platform</Text>
      </Animated.View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  textGroup: { alignItems: 'center', marginBottom: 64 },
  appName: { fontSize: Typography['4xl'], fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  tagline: { fontSize: Typography.md, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  barTrack: { width: width * 0.5, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', position: 'absolute', bottom: 80 },
  barFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2 },
});
