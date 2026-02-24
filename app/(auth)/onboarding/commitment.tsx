import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { PrimaryButton } from '@/src/components/PrimaryButton';

interface CommitmentScreenProps {
  committed: boolean;
  onCommit: () => void;
}

export function CommitmentScreen({
  committed,
  onCommit,
}: CommitmentScreenProps) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [pledgesChecked, setPledgesChecked] = useState([false, false, false]);

  // Phase 1 Anims
  const quoteOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2 Anims
  const commitHeaderAnim = useRef(new Animated.Value(0)).current;
  const lottieScaleAnim = useRef(new Animated.Value(0)).current;
  const pledgeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const checkmarkAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const commitButtonOpacity = useRef(new Animated.Value(0.3)).current;
  const commitScale = useRef(new Animated.Value(1)).current;

  // ── Phase 1: Quote Animation ───────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(quoteOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(() => {
      setPhase(2);
    });
  }, []);

  // ── Phase 2: Entrance Sequence ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 2) {
      Animated.parallel([
        Animated.timing(commitHeaderAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(lottieScaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(400),
          Animated.stagger(
            200,
            pledgeAnims.map((anim) =>
              Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true })
            )
          ),
        ]),
      ]).start();
    }
  }, [phase]);

  // ── Phase 2: Button Activation ─────────────────────────────────────────────
  const allChecked = pledgesChecked.every(Boolean);

  useEffect(() => {
    if (phase === 2) {
      Animated.timing(commitButtonOpacity, {
        toValue: allChecked ? 1 : 0.3,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [allChecked, phase]);

  useEffect(() => {
    if (committed || !allChecked || phase === 1) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(commitScale, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(commitScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [committed, allChecked, phase]);

  if (phase === 1) {
    return (
      <View className="flex-1 items-center justify-center px-10">
        <Animated.Text
          style={{ opacity: quoteOpacity, lineHeight: 36 }}
          className="text-glacier text-2xl text-center font-medium italic mb-20"
        >
          Great relationships aren't accidental.{'\n'}They're built with intention, daily.
        </Animated.Text>
      </View>
    );
  }

  return (
    <View className="flex-1 px-6 justify-between pb-12 pt-8">
      <Animated.View
        className="items-center mt-4"
        style={{
          opacity: commitHeaderAnim,
          transform: [
            {
              translateY: commitHeaderAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Animated.View style={{ transform: [{ scale: lottieScaleAnim }] }}>
          <LottieView
            source={require('../../../assets/onboarding-icons/Relationship.lottie')}
            autoPlay
            loop
            style={{ width: 180, height: 180, opacity: 1 }}
          />
        </Animated.View>

        <Text
          className="text-glacier text-4xl font-bold text-center mt-2 mb-6"
          style={{ letterSpacing: -1, lineHeight: 44 }}
        >
          Make the <Text className="text-spark">commitment.</Text>
        </Text>

        <View className="w-full mt-2">
          {[
            'I will show up for my relationship daily.',
            'I will be curious, not reactive.',
            'I will choose connection over comfort.',
          ].map((pledge, idx) => {
            const isChecked = pledgesChecked[idx];
            return (
              <Animated.View
                key={idx}
                style={{
                  opacity: pledgeAnims[idx],
                  transform: [
                    {
                      translateY: pledgeAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isChecked) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPledgesChecked((prev) => {
                      const next = [...prev];
                      next[idx] = true;

                      checkmarkAnims[idx].setValue(0);
                      Animated.spring(checkmarkAnims[idx], {
                        toValue: 1,
                        friction: 4,
                        tension: 50,
                        useNativeDriver: true,
                      }).start();

                      if (next.every(Boolean) && !prev.every(Boolean)) {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success
                        );
                      }
                      return next;
                    });
                  }}
                  className="flex-row items-center gap-4 mb-3 px-5 py-4 rounded-2xl"
                  style={{
                    backgroundColor: isChecked
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(255,255,255,0.05)',
                    borderWidth: 1.5,
                    borderColor: isChecked
                      ? '#F59E0B'
                      : 'rgba(255,255,255,0.1)',
                    shadowColor: isChecked ? '#F59E0B' : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isChecked ? 0.4 : 0,
                    shadowRadius: 12,
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isChecked ? '#F59E0B' : 'transparent',
                      borderWidth: isChecked ? 0 : 1.5,
                      borderColor: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {isChecked && (
                      <Animated.View
                        style={{ transform: [{ scale: checkmarkAnims[idx] }] }}
                      >
                        <Text
                          style={{
                            color: '#0F172A',
                            fontSize: 13,
                            fontWeight: '800',
                          }}
                        >
                          ✓
                        </Text>
                      </Animated.View>
                    )}
                  </View>

                  <Text
                    className="flex-1 leading-5"
                    style={{
                      color: isChecked ? '#FFF' : '#cbd5e1',
                      fontWeight: isChecked ? '600' : '400',
                      fontSize: 15,
                    }}
                  >
                    {pledge}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* The big commitment button - now absolutely positioned at the bottom or justified */}
      <View className="flex-1 justify-end">
        <Animated.View
          style={{
            transform: [{ scale: committed ? 1 : commitScale }],
            opacity: commitButtonOpacity,
          }}
        >
          <PrimaryButton
            label={
              committed ? '✓ Committed!' : 'I commit to growing my relationship'
            }
            theme={committed ? 'success' : 'commit'}
            disabled={!allChecked || committed}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onCommit();
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
