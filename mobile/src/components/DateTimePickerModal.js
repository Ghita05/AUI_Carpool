import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Simple calendar date picker
function DatePicker({ date, onDateChange }) {
  const [currentDate, setCurrentDate] = useState(new Date(date || Date.now()));

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= days; i++) {
    calendarDays.push(i);
  }

  const handleDayPress = (day) => {
    if (day) {
      const newDate = new Date(year, month, day);
      onDateChange(newDate);
      setCurrentDate(newDate);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedDay = currentDate.getDate();
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  const isCurrentMonth = selectedYear === year && selectedMonth === month;

  return (
    <View style={styles.datePicker}>
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDayPress(day)}
            style={[
              styles.dayButton,
              !day && styles.dayEmpty,
              day && isCurrentMonth && day === selectedDay && styles.daySelected,
            ]}
          >
            {day && <Text style={[styles.dayText, day && isCurrentMonth && day === selectedDay && styles.dayTextSelected]}>{day}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// iOS-style wheel time picker
function TimePicker({ time, onTimeChange }) {
  const [hours, setHours] = useState(parseInt(time.split(':')[0], 10) || 0);
  const [minutes, setMinutes] = useState(parseInt(time.split(':')[1], 10) || 0);
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const ITEM_HEIGHT = 50;
  const VISIBLE_ITEMS = 5;

  useEffect(() => {
    onTimeChange(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }, [hours, minutes]);

  // Generate array of hours (0-23)
  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  // Generate array of minutes (0-59)
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  const renderHourItem = ({ item, index }) => {
    const isSelected = item === hours;
    return (
      <TouchableOpacity
        onPress={() => {
          setHours(item);
          hoursScrollRef.current?.scrollToIndex({ index, animated: true });
        }}
        style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}
      >
        <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
          {String(item).padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMinuteItem = ({ item, index }) => {
    const isSelected = item === minutes;
    return (
      <TouchableOpacity
        onPress={() => {
          setMinutes(item);
          minutesScrollRef.current?.scrollToIndex({ index, animated: true });
        }}
        style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}
      >
        <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
          {String(item).padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.timePicker}>
      <View style={styles.wheelContainer}>
        {/* Hours wheel */}
        <View style={styles.wheelColumn}>
          <Text style={styles.wheelLabel}>Hours</Text>
          <View style={styles.wheelWrapper}>
            <View style={styles.wheelIndicator} />
            <FlatList
              ref={hoursScrollRef}
              data={hoursList}
              keyExtractor={(item) => String(item)}
              renderItem={renderHourItem}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              scrollEnabled
              scrollEventThrottle={16}
              nestedScrollEnabled
              contentContainerStyle={{
                paddingTop: ITEM_HEIGHT * 2,
                paddingBottom: ITEM_HEIGHT * 2,
              }}
              initialScrollIndex={hours}
              getItemLayout={(data, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.y;
                const index = Math.round(offset / ITEM_HEIGHT);
                setHours(Math.max(0, Math.min(23, index)));
              }}
            />
          </View>
        </View>

        {/* Colon separator */}
        <Text style={styles.wheelSeparator}>:</Text>

        {/* Minutes wheel */}
        <View style={styles.wheelColumn}>
          <Text style={styles.wheelLabel}>Minutes</Text>
          <View style={styles.wheelWrapper}>
            <View style={styles.wheelIndicator} />
            <FlatList
              ref={minutesScrollRef}
              data={minutesList}
              keyExtractor={(item) => String(item)}
              renderItem={renderMinuteItem}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              scrollEnabled
              scrollEventThrottle={16}
              nestedScrollEnabled
              contentContainerStyle={{
                paddingTop: ITEM_HEIGHT * 2,
                paddingBottom: ITEM_HEIGHT * 2,
              }}
              initialScrollIndex={minutes}
              getItemLayout={(data, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.y;
                const index = Math.round(offset / ITEM_HEIGHT);
                setMinutes(Math.max(0, Math.min(59, index)));
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// Main modal component
export default function DateTimePickerModal({ visible, date, time, onClose, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState(date ? new Date(date) : new Date());
  const [selectedTime, setSelectedTime] = useState(time || '14:00');

  const handleConfirm = () => {
    const [hh, mm] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hh, mm, 0, 0);
    onConfirm(finalDate.toISOString(), selectedTime);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date & Time</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.scrollContent}>
            <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
            <TimePicker time={selectedTime} onTimeChange={setSelectedTime} />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography['2xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.primary,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#fff',
  },

  // Date picker styles
  datePicker: {
    marginBottom: Spacing.xl,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthTitle: {
    fontSize: Typography.lg,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: Typography.xs,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  dayEmpty: {
    backgroundColor: 'transparent',
  },
  daySelected: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: Typography.base,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
  },
  dayTextSelected: {
    color: '#fff',
  },

  // Time picker styles
  timePicker: {
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  wheelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    height: 280,
  },
  wheelColumn: {
    flex: 0.4,
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: Typography.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  wheelWrapper: {
    flex: 1,
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 50,
    marginTop: -25,
    backgroundColor: 'rgba(63, 137, 226, 0.15)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.primary,
    zIndex: 10,
    pointerEvents: 'none',
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemSelected: {
    backgroundColor: 'transparent',
  },
  wheelItemText: {
    fontSize: Typography.lg,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
  },
  wheelItemTextSelected: {
    fontSize: Typography['2xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.primary,
  },
  wheelSeparator: {
    fontSize: Typography['3xl'],
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
});
