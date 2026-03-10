import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

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
  category: string;
  onComplete: (photoUrl?: string) => void;
}

type Stage = 'sealed' | 'tearing' | 'revealed' | 'polaroid' | 'done';

export default function EnvelopeMode({ activity, scientificBasis, category, onComplete }: EnvelopeModeProps) {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>('sealed');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Animation values
  const flapRotateX = useSharedValue(0);
  const flapZIndex = useSharedValue(20);
  const cardTranslateY = useSharedValue(20);
  const cardScale = useSharedValue(0.85);
  const cardZIndex = useSharedValue(10);
  const pulseScale = useSharedValue(1);

  // Context-aware colors
  const getColorScheme = () => {
    switch (category) {
      case 'Inner Worlds':
      case 'Attachment Security':
        return {
          glow: 'rgba(15,118,110,0.15)', // Deep Teal/Indigo
          border: 'rgba(20,184,166,0.3)',
          gradientStart: 'rgba(20,184,166,0.12)',
          gradientEnd: 'rgba(15,23,42,0.8)',
          seal: ['#2DD4BF', '#14B8A6', '#0F766E'] as readonly [string, string, ...string[]],
          shadow: '#14B8A6',
          textColor: '#CCFBF1'
        };
      case 'New Horizons':
      case 'Playful Discovery':
        return {
          glow: 'rgba(234,88,12,0.15)', // Sunset Orange
          border: 'rgba(249,115,22,0.3)',
          gradientStart: 'rgba(249,115,22,0.12)',
          gradientEnd: 'rgba(15,23,42,0.8)',
          seal: ['#FDBA74', '#F97316', '#C2410C'] as readonly [string, string, ...string[]],
          shadow: '#F97316',
          textColor: '#FFEDD5'
        };
      case 'Pure Presence':
        return {
          glow: 'rgba(250,204,21,0.15)', // Soft Golden Glow
          border: 'rgba(250,204,21,0.3)',
          gradientStart: 'rgba(250,204,21,0.12)',
          gradientEnd: 'rgba(15,23,42,0.8)',
          seal: ['#FEF08A', '#EAB308', '#A16207'] as readonly [string, string, ...string[]],
          shadow: '#EAB308',
          textColor: '#FEF08A'
        };
      default:
        // Default (original amber colors)
        return {
          glow: 'rgba(245,158,11,0.15)',
          border: 'rgba(245,158,11,0.25)',
          gradientStart: 'rgba(245,158,11,0.12)',
          gradientEnd: 'rgba(15,23,42,0.8)',
          seal: ['#FBBF24', '#F59E0B', '#D97706'] as readonly [string, string, ...string[]],
          shadow: '#F59E0B',
          textColor: '#FDE68A'
        };
    }
  };
  const theme = getColorScheme();

  // Pulse effect for CTA
  useEffect(() => {
    if (stage === 'revealed') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [stage]);

  const handleTear = () => {
    if (stage !== 'sealed') return;
    setStage('tearing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 3D Flap opening
    flapRotateX.value = withTiming(-180, { duration: 600, easing: Easing.bezier(0.25, 1, 0.5, 1) });
    
    // Switch zIndex so the flap goes behind the card
    setTimeout(() => {
      flapZIndex.value = 5; 
      cardZIndex.value = 15;
    }, 200);

    // Card slides out with a slight bounce effect
    setTimeout(() => {
      cardTranslateY.value = withSpring(-110, { damping: 14, stiffness: 100 });
      cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      setStage('revealed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 300);
  };

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    // Launch camera
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for polaroid
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImageUri(result.assets[0].uri);
      setStage('polaroid');
      
      // Optimize and upload in the background
      setIsUploading(true);
      try {
        if (!user) throw new Error('No authenticated user');

        // Optimize image
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }], // Resize width, maintain aspect ratio
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress
        );

        // Prepare for upload
        const photoExt = 'jpg';
        const photoPath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${photoExt}`;
        const formData = new FormData();
        
        formData.append('file', {
          uri: manipResult.uri,
          name: photoPath,
          type: `image/${photoExt}`,
        } as any);

        const { data, error } = await supabase.storage
          .from('session_photos')
          .upload(photoPath, formData);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('session_photos')
          .getPublicUrl(photoPath);

        setUploadedUrl(publicUrl);
        
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to save photo. You can still keep the memory, but the photo won\'t be synced.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const finishDate = () => {
    setStage('done');
    onComplete(uploadedUrl || undefined);
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 12 && gs.dy < 0,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy < -40 && stage === 'sealed') {
        handleTear();
      }
    },
  });

  const flapAnimStyle = useAnimatedStyle(() => {
    return {
      transformOrigin: ['50%', '0%', 0] as any,
      transform: [
        { perspective: 800 },
        { rotateX: `${flapRotateX.value}deg` }
      ],
      zIndex: flapZIndex.value,
    };
  });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardTranslateY.value },
      { scale: cardScale.value }
    ],
    zIndex: cardZIndex.value,
  }));

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));

  const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

  return (
    <View className="flex-1 items-center justify-center px-6 gap-7">
      <Animated.View className="absolute top-[-100px] w-[500px] h-[500px] rounded-full" style={[{ backgroundColor: theme.glow }, { opacity: stage === 'polaroid' ? 0.3 : 1 }]} pointerEvents="none" />

      {stage === 'polaroid' ? (
        <Animated.View entering={FadeIn.duration(500)} className="items-center w-full mt-10">
          {/* Polaroid Frame */}
          <View className="bg-[#F8FAFC] w-full p-[18px] pb-16 rounded-[2px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 15, transform: [{ rotate: '-2.5deg' }] }}>
            <View className="w-full aspect-square bg-[#0F172A] items-center justify-center overflow-hidden">
               {capturedImageUri ? (
                 <Image source={{ uri: capturedImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
               ) : (
                 <>
                   <LinearGradient colors={['#1E293B', '#0F172A']} className="absolute inset-0" />
                   <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                     <Ionicons name="camera" size={32} color="#94A3B8" />
                   </View>
                   <Text className="text-[#64748B] text-[13px] font-medium mt-4 tracking-widest uppercase">Captured</Text>
                 </>
               )}
               <View className="absolute inset-0 border-[2px] border-[#0F172A]/20" pointerEvents="none" />
            </View>
            
            {/* 'Ink-bleed' Date Stamp */}
            <View className="absolute bottom-5 right-6 opacity-85">
              <Text className="text-[#334155] text-[18px] font-bold" style={{ fontFamily: 'Courier', transform: [{ rotate: '-4deg' }], letterSpacing: 1, textShadowColor: 'rgba(51, 65, 85, 0.4)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 3 }}>
                {todayDate}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="mt-14 py-4 px-10 w-full items-center justify-center rounded-[20px] flex-row gap-2"
            style={{ backgroundColor: isUploading ? theme.glow : theme.shadow, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
            activeOpacity={0.8}
            onPress={finishDate}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color={theme.textColor} />
                <Text className="font-extrabold tracking-wide text-[16px]" style={{ color: theme.textColor }}>Saving Photo...</Text>
              </>
            ) : (
              <Text className="text-[#0F172A] font-extrabold tracking-wide text-[16px]">Keep Memory ✦</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          <View className="items-center gap-2 z-0">
             <Text className="text-[13px] font-bold uppercase tracking-[2px]" style={{ color: theme.textColor }}>{category}</Text>
             <Text className="text-slate-muted text-[14px] min-h-[20px] font-medium">
               {stage === 'sealed' ? 'Swipe up or tap to open your envelope' : ''}
             </Text>
          </View>

          <View className="items-center justify-end" style={{ width: ENVELOPE_W, height: ENVELOPE_H + 80 }}>
            {/* Touchable Wrapper for PanResponder */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={handleTear}
              className="items-center justify-center relative"
              style={{ width: ENVELOPE_W, height: ENVELOPE_H }}
              {...panResponder.panHandlers}
            >
              
              {/* Envelope Back */}
              <View className="absolute inset-0 rounded-[12px] overflow-hidden bg-midnight/95 border-[1.5px]" style={{ borderColor: theme.border, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 }}>
                <BlurView tint="dark" intensity={60} className="absolute inset-0" />
                <LinearGradient
                  colors={[theme.gradientStart, theme.gradientEnd]}
                  className="absolute inset-0"
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
              </View>

              {/* Sophisticated Card Inside */}
              <Animated.View style={[cardAnimStyle, { width: ENVELOPE_W - 24, position: 'absolute' }]} className="bg-[#1E293B] rounded-[16px] p-6 pt-7 border border-white/10 shadow-2xl overflow-hidden">
                <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} className="absolute inset-0" />
                
                 {/* Scientific Basis Badge */}
                 <View className="absolute top-4 right-4 bg-black/30 px-2.5 py-1 rounded-[6px] border border-white/5">
                   <Text className="text-white/60 text-[9px] font-bold uppercase tracking-widest">{scientificBasis}</Text>
                 </View>

                {/* Typography: Serif Title, Sans-Serif Desc */}
                <Text className="text-[#F8FAFC] text-[26px] leading-[32px] mt-4 pr-6" style={{ fontFamily: serifFont }}>{activity.title}</Text>
                
                <View className="w-10 h-[1px] bg-white/20 my-4" />
                
                <Text className="text-[#CBD5E1] text-[15px] leading-[23px]">{activity.desc}</Text>
              </Animated.View>

              {/* Envelope Front Flap / Pocket */}
              <View className="absolute bottom-0 left-0 right-0 border-t z-30 rounded-b-[12px] overflow-hidden" style={{ height: ENVELOPE_H * 0.45, borderColor: theme.border, backgroundColor: theme.gradientEnd }}>
                 <LinearGradient colors={[theme.gradientStart, 'transparent']} className="absolute inset-0 opacity-80" />
                 {/* Triangle Fold Illusion */}
                 <View className="absolute top-0 left-[-20%] right-[-20%] h-[1px] opacity-40" style={{ backgroundColor: theme.border, transform: [{ rotate: '15deg' }, { translateY: 30 }] }} />
                 <View className="absolute top-0 left-[-20%] right-[-20%] h-[1px] opacity-40" style={{ backgroundColor: theme.border, transform: [{ rotate: '-15deg' }, { translateY: 30 }] }} />
              </View>

              {/* Top Animated Flap (3D) */}
              <Animated.View 
                className="absolute top-0 left-0 right-0 rounded-t-[12px] overflow-hidden border-b-[2px]"
                style={[flapAnimStyle, { height: ENVELOPE_H * 0.55, borderColor: theme.border, backgroundColor: theme.gradientEnd }]}
              >
                <LinearGradient
                  colors={[theme.gradientStart, 'rgba(15,23,42,0.98)']}
                  className="absolute inset-0"
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
              </Animated.View>

              {/* Wax Seal */}
              {stage === 'sealed' && (
                <View className="absolute w-14 h-14 rounded-full items-center justify-center overflow-hidden z-40" style={{ top: (ENVELOPE_H * 0.55) - 28, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }}>
                  <LinearGradient
                    colors={theme.seal}
                    className="absolute inset-0"
                  />
                  <Text className="text-[#0F172A] text-[20px] font-black">✦</Text>
                </View>
              )}
              
            </TouchableOpacity>
          </View>

          {/* CTA after reveal */}
          {stage === 'revealed' && (
            <Animated.View entering={FadeInDown.delay(500).springify()} className="w-full gap-4 items-center z-50 mt-10">
              <TouchableOpacity activeOpacity={0.85} onPress={handleTakePhoto} className="w-full">
                <Animated.View
                  className="flex-row items-center gap-3 rounded-[20px] py-[18px] px-7 w-full justify-center"
                  style={[{ backgroundColor: theme.shadow, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 10 }, pulseAnimStyle]}
                >
                  <Ionicons name="camera" size={20} color="#0F172A" />
                  <Text className="text-midnight font-extrabold text-[16px] tracking-wide">Take a Photo</Text>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2 px-4"
                activeOpacity={0.7}
                onPress={finishDate}
              >
                <Text className="text-slate-muted text-[15px] font-semibold">Skip photo →</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const ENVELOPE_W = width - 48;
const ENVELOPE_H = ENVELOPE_W * 0.8;
