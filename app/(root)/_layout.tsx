import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ── Custom Floating Tab Bar ─────────────────────────────────────────────────

const TABS = [
  { name: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'dates', label: 'Dates', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'memories', label: 'Memories', icon: 'images-outline', iconActive: 'images' },
] as const;

function TabButton({
  label,
  icon,
  iconActive,
  focused,
  onPress,
}: {
  label: string;
  icon: string;
  iconActive: string;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1.15 : 1);

  useEffect(() => {
    scale.value = withTiming(focused ? 1.15 : 1, { duration: 250 });
  }, [focused]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={1}
      style={styles.tabButton}
    >
      <View style={styles.tabInner}>
        <Animated.View style={iconAnimStyle}>
          <Ionicons
            name={(focused ? iconActive : icon) as any}
            size={22}
            color={focused ? '#F59E0B' : '#475569'}
          />
        </Animated.View>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <BlurView tint="dark" intensity={70} style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const tab = TABS.find((t) => t.name === route.name);
            if (!tab) return null;
            const focused = state.index === index;
            return (
              <TabButton
                key={route.key}
                label={tab.label}
                icon={tab.icon}
                iconActive={tab.iconActive}
                focused={focused}
                onPress={() => navigation.navigate(route.name)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────

export default function RootGroupLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="dates" />
      <Tabs.Screen name="memories" />
    </Tabs>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 24,
    right: 24,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBarBlur: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#F59E0B',
  },
});
