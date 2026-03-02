import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DeckData } from './ConversationDeckCard';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

interface Props {
  visible: boolean;
  deck: DeckData | null;
  onClose: () => void;
}

const getGradientsForVibe = (vibe: string): readonly [string, string, string] => {
  switch (vibe) {
    case 'Curious & Light':
      return ['rgba(20, 184, 166, 0.5)', 'rgba(45, 212, 191, 0.25)', 'transparent']; // Teal
    case 'Meaningful':
      return ['rgba(245, 158, 11, 0.5)', 'rgba(251, 191, 36, 0.25)', 'transparent']; // Amber
    case 'Intimate':
      return ['rgba(244, 63, 94, 0.5)', 'rgba(251, 113, 133, 0.25)', 'transparent']; // Rose
    case 'Soulful':
      return ['rgba(139, 92, 246, 0.5)', 'rgba(167, 139, 250, 0.25)', 'transparent']; // Violet
    default:
      return ['rgba(56, 189, 248, 0.5)', 'rgba(125, 211, 252, 0.25)', 'transparent']; // Sky
  }
};

const Card = ({
  question,
  index,
  currentIndex,
  onSwiped,
}: {
  question: string;
  index: number;
  currentIndex: number;
  onSwiped: () => void;
}) => {
  const isCurrent = index === currentIndex;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const visualIndex = useSharedValue(index - currentIndex);

  useEffect(() => {
    visualIndex.value = withSpring(index - currentIndex);
  }, [currentIndex, index, visualIndex]);

  const panGesture = Gesture.Pan()
    .enabled(isCurrent)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const distance = Math.sqrt(event.translationX ** 2 + event.translationY ** 2);
      if (distance > SWIPE_THRESHOLD) {
        // Swipe away smoothly with maintained momentum
        const directionX = event.translationX > 0 ? 1 : -1;
        const directionY = event.translationY > 0 ? 1 : -1;
        
        translateX.value = withSpring(directionX * width * 1.5, { velocity: event.velocityX });
        translateY.value = withSpring(directionY * height * 0.5, { velocity: event.velocityY });
        runOnJS(onSwiped)();
      } else {
        // Snap back smoothly
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const rStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateX.value,
      [-width, 0, width],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    // Using visualIndex allows smooth scaling and movement into view
    const diff = Math.max(0, visualIndex.value);
    const scale = Math.max(0.8, 1 - diff * 0.05);
    const cardTranslateY = translateY.value + diff * 20;

    let opacity = 1;
    if (index < currentIndex) {
      // Swiped away card gracefully fades out
      opacity = interpolate(
        Math.abs(translateX.value),
        [0, width],
        [1, 0],
        Extrapolate.CLAMP
      );
    } else {
      opacity = interpolate(
        visualIndex.value,
        [0, 1, 2],
        [1, 0.8, 0],
        Extrapolate.CLAMP
      );
    }

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: cardTranslateY },
        { rotateZ: `${rotateZ}deg` },
        { scale },
      ],
      opacity,
      zIndex: 100 - index,
    };
  });

  // Render nothing if too far ahead, or too far in the past (only keep immediately swiped card)
  if (index > currentIndex + 2 || index < currentIndex - 1) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute w-full h-[60%] items-center justify-center p-6"
        style={rStyle}
      >
        <BlurView
          tint="light"
          intensity={80}
          className="w-full h-full rounded-[32px] border border-white/20 p-8 justify-center items-center shadow-2xl"
        >
          <Text className="text-[#0F172A] text-[28px] font-bold text-center leading-[38px] tracking-tight">
            {question}
          </Text>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
};

export function ConversationDeckController({ visible, deck, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Breathing background
  const breatheValue = useSharedValue(0.4);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      breatheValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, deck]);

  const handleSwiped = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    if (deck && currentIndex < deck.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      if (currentIndex === deck.questions.length - 1) {
        // Completed the deck
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      opacity: breatheValue.value,
      transform: [
        { scale: interpolate(breatheValue.value, [0.4, 1], [1, 1.1]) }
      ]
    };
  });

  if (!deck) return null;

  const gradients = getGradientsForVibe(deck.vibe);
  const isFinished = currentIndex >= deck.questions.length;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 bg-[#0F172A]">
          {/* Dynamic Breathing Mesh Background */}
          <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]} pointerEvents="none">
            <LinearGradient
              colors={gradients}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Overlay a blur to make it feel like a mesh */}
            <BlurView tint="dark" intensity={100} style={StyleSheet.absoluteFill} />
          </Animated.View>

          {/* Header */}
          <Animated.View entering={SlideInDown.duration(400)} className="pt-16 px-6 flex-row items-center justify-between z-50">
            <View>
              <Text className="text-white/60 text-[12px] font-bold uppercase tracking-widest mb-1">{deck.tag}</Text>
              <Text className="text-white text-[24px] font-bold tracking-tight">{deck.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/10"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>

          {/* Card Stack */}
          <View className="flex-1 items-center justify-center -mt-10">
            {deck.questions.map((question, index) => (
              <Card
                key={index}
                question={question}
                index={index}
                currentIndex={currentIndex}
                onSwiped={handleSwiped}
              />
            ))}

            {/* Finished State */}
            {isFinished && (
              <Animated.View entering={FadeIn.delay(300)} className="items-center px-8 z-10 w-full absolute">
                <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center mb-4">
                  <Ionicons name="checkmark" size={32} color="white" />
                </View>
                <Text className="text-white text-[24px] font-bold tracking-tight mb-2 text-center">Deck Complete</Text>
                <Text className="text-white/60 text-[15px] text-center mb-3">
                  You&apos;ve reached the end of this conversation starter deck.
                </Text>
                <Text className="text-slate-muted text-[14px] text-center font-medium italic">
                  The final step of this journey is silence. Gaze into each other’s eyes for 4 minutes without speaking. This is where the real connection happens. Are you ready to just be together?
                </Text>
              </Animated.View>
            )}
          </View>

          {/* Progress Indicator (Glowing Dots) */}
          <View className="absolute bottom-12 w-full flex-row justify-center gap-2 px-10 flex-wrap">
            {deck.questions.map((_, i) => (
              <Animated.View
                key={i}
                className={`h-1.5 rounded-full ${i === currentIndex ? 'bg-white shadow-lg' : i < currentIndex ? 'bg-white/40' : 'bg-white/10'}`}
                style={{
                  width: i === currentIndex ? 24 : 6,
                  shadowColor: i === currentIndex ? 'white' : 'transparent',
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                  elevation: i === currentIndex ? 4 : 0,
                }}
              />
            ))}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
