import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface Activity {
  id: string;
  title: string;
  mode: string;
  desc: string;
}

interface EnvelopeModeProps {
  activity: Activity;
  scientificBasis: string;
  onComplete: () => void;
}

type Stage = 'sealed' | 'tearing' | 'revealed' | 'done';

export default function EnvelopeMode({ activity, scientificBasis, onComplete }: EnvelopeModeProps) {
  const [stage, setStage] = useState<Stage>('sealed');

  // Flap tear animation values
  const flapTranslateY = useSharedValue(0);
  const flapOpacity = useSharedValue(1);
  const flapRotate = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);

  const handleTear = () => {
    if (stage !== 'sealed') return;
    setStage('tearing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Flap flies off upward with rotation
    flapTranslateY.value = withTiming(-height * 0.35, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    flapRotate.value = withTiming(-15, { duration: 500 });
    flapOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );

    // Card slides in
    setTimeout(() => {
      cardScale.value = withSpring(1, { stiffness: 100 });
      cardOpacity.value = withTiming(1, { duration: 400 });
      setStage('revealed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 450);
  };

  // PanResponder for swipe-up gesture
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 12 && gs.dy < 0,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy < -40 && stage === 'sealed') {
        handleTear();
      }
    },
  });

  const flapAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: flapTranslateY.value },
      { rotate: `${flapRotate.value}deg` },
    ],
    opacity: flapOpacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.sciLabel}>{scientificBasis}</Text>
      <Text style={styles.hint}>
        {stage === 'sealed' ? 'Swipe up or tap to open your envelope' : ''}
      </Text>

      {/* Envelope body */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleTear}
        style={styles.envelopeWrapper}
        {...panResponder.panHandlers}
      >
        {/* Envelope back */}
        <View style={styles.envelope}>
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(245,158,11,0.12)', 'rgba(15,23,42,0.8)', 'rgba(245,158,11,0.06)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Bottom triangle fold */}
          <View style={styles.envelopeBottomFold} />

          {/* Wax seal */}
          {stage === 'sealed' && (
            <View style={styles.seal}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.sealText}>✦</Text>
            </View>
          )}

          {/* Revealed Spark Card inside */}
          {(stage === 'revealed' || stage === 'done') && (
            <Animated.View style={[styles.sparkCard, cardAnimStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>SPARK DATE</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{activity.title}</Text>
              <Text style={styles.cardDesc}>{activity.desc}</Text>

              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <Ionicons name="flask-outline" size={13} color="#F59E0B" />
                <Text style={styles.cardScience}>{scientificBasis}</Text>
              </View>
            </Animated.View>
          )}

          {/* Flap — animated tear away */}
          {stage !== 'done' && (
            <Animated.View style={[styles.envelopeFlap, flapAnimStyle]}>
              <LinearGradient
                colors={['rgba(245,158,11,0.18)', 'rgba(30,41,59,0.95)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              {/* Diagonal cut lines for texture */}
              <View style={styles.flapTearLine} />
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>

      {/* CTA after reveal */}
      {stage === 'revealed' && (
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.photoBtn}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setStage('done');
              onComplete();
            }}
          >
            <Ionicons name="camera-outline" size={18} color="#0F172A" />
            <Text style={styles.photoBtnText}>Take a Photo for Widget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            activeOpacity={0.7}
            onPress={() => {
              setStage('done');
              onComplete();
            }}
          >
            <Text style={styles.skipBtnText}>Skip photo →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const ENVELOPE_W = width - 48;
const ENVELOPE_H = ENVELOPE_W * 0.72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  sciLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  hint: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    minHeight: 20,
  },
  envelopeWrapper: {
    width: ENVELOPE_W,
    height: ENVELOPE_H + 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  envelope: {
    width: ENVELOPE_W,
    height: ENVELOPE_H,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  envelopeBottomFold: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ENVELOPE_H * 0.4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,158,11,0.12)',
    backgroundColor: 'rgba(245,158,11,0.04)',
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ENVELOPE_H * 0.5,
    backgroundColor: 'rgba(30,41,59,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(245,158,11,0.2)',
  },
  flapTearLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(245,158,11,0.3)',
  },
  seal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sealText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
  },
  sparkCard: {
    width: ENVELOPE_W - 32,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    gap: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  cardBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardScience: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    flex: 1,
  },
  ctaRow: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  photoBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
