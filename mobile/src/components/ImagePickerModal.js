import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Bottom-sheet modal for picking an image from the camera or gallery, with built-in cropping.
// Props: visible, onClose, onImage(uri), aspect, quality, title
export default function ImagePickerModal({ visible, onClose, onImage, aspect, quality = 0.8, title = 'Upload Photo' }) {
  const [localVisible, setLocalVisible] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, mass: 1, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start(() => setLocalVisible(false));
    }
  }, [visible]);

  const launch = async (mode) => {
    try {
      // Request the right permission
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please grant camera access in your device settings.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please grant photo library access in your device settings.');
          return;
        }
      }

      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,   // built-in crop
        quality,
        ...(aspect ? { aspect } : {}),
      };

      const result = mode === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]?.uri) {
        onImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong while picking the image.');
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={localVisible} transparent animationType="none" onRequestClose={onClose}>
      {/* Animated backdrop — tap outside to dismiss */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      {/* Sliding sheet */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <TouchableOpacity style={styles.option} onPress={() => launch('camera')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>  
              <Ionicons name="camera" size={22} color={Colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Take Photo</Text>
              <Text style={styles.optionSub}>Use your camera to capture the document</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => launch('gallery')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>  
              <Ionicons name="images" size={22} color="#1976D2" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Choose from Gallery</Text>
              <Text style={styles.optionSub}>Pick an existing photo from your library</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
