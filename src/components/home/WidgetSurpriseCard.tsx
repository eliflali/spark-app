import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useState } from 'react';

export function WidgetSurpriseCard({
  partnerSurprise,
  latestSurprise,
  myUserId,
  partnerFirstName,
  sendingSurprise,
  onOpenNoteModal,
  handleWidgetPhoto,
  handleWidgetReaction,
}: {
  partnerSurprise: any;
  latestSurprise: any;
  myUserId: string | undefined;
  partnerFirstName: string;
  sendingSurprise: boolean;
  onOpenNoteModal: () => void;
  handleWidgetPhoto: () => void;
  handleWidgetReaction: (emoji: string) => void;
}) {
  const [showTip, setShowTip] = useState(true);
  const isIdle =
    !latestSurprise ||
    latestSurprise.sender_id !== myUserId ||
    Date.now() - new Date(latestSurprise.created_at).getTime() > 24 * 60 * 60 * 1000;

  const glowProps = isIdle
    ? {
        from: { opacity: 0.6, scale: 1, shadowOpacity: 0 },
        animate: { opacity: 1, scale: 1.02, shadowOpacity: 0.3 },
        transition: {
          type: 'timing',
          duration: 1800,
          loop: true,
        },
      }
    : {
        animate: { opacity: 1, scale: 1, shadowOpacity: 0 },
      };

  return (
    <Animated.View entering={FadeInDown.delay(220).springify()}>
      <View className="mt-0 gap-6">
        {/* ── Widget Preview Area ── */}
        
        {partnerSurprise && (
          <View className="relative min-h-[220px] items-center justify-center p-6">
            {/* ── Incoming surprise preview ── */}
            <MotiView
              from={{ translateY: 20, opacity: 0, scale: 0.95 }}
              animate={{ translateY: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              style={{ position: 'relative', zIndex: 10, marginTop: 24 }}>
              {/* Float Animation Wrapper */}
              <MotiView
                from={{ translateY: -6 }}
                animate={{ translateY: 6 }}
                transition={{ type: 'timing', duration: 4000, loop: true }}>
                {/* Visuals Based on Type */}
                {partnerSurprise.type === 'PHOTO' && (
                  <View
                    style={{
                      transform: [{ rotate: '-2deg' }],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 15 },
                      shadowOpacity: 0.5,
                      shadowRadius: 30,
                      elevation: 20,
                    }}
                    className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-3 pb-2.5">
                    <BlurView tint="dark" intensity={70} style={StyleSheet.absoluteFillObject} />
                    <View className="relative overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]">
                      <Image
                        source={{ uri: partnerSurprise.content }}
                        className="h-[190px] w-[190px]"
                        resizeMode="cover"
                      />
                      {/* Subtle 'grain' overlay effect simulating nostalgia */}
                      <View className="absolute inset-0 bg-white/10 mix-blend-overlay opacity-30" />
                    </View>
                    <Text className="mb-1.5 mt-3 text-center font-serif text-[11px] uppercase tracking-[0.2em] text-[#E2EAF4]">
                      {partnerSurprise.sender_name?.split(' ')[0] ?? 'Partner'}
                    </Text>
                  </View>
                )}

                {partnerSurprise.type === 'NOTE' && (
                  <View className="min-h-[100px] min-w-[170px] items-center justify-center p-6 bg-white/5 rounded-[28px] overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 }}>
                    <BlurView tint="light" intensity={25} style={StyleSheet.absoluteFillObject} />
                    <Text className="text-center font-serif text-[20px] leading-[30px] text-glacier tracking-tight" style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                      {partnerSurprise.content}
                    </Text>
                    <Text className="mt-4 text-[10px] uppercase tracking-[0.2em] text-slate-muted font-bold">
                      {partnerSurprise.sender_name?.split(' ')[0] ?? 'Partner'}
                    </Text>
                  </View>
                )}

                {partnerSurprise.type === 'REACTION' && (
                  <View
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.35,
                      shadowRadius: 24,
                      elevation: 20,
                    }}
                    className="items-center justify-center rounded-full border border-white/20 bg-white/10 p-7">
                    <BlurView
                      tint="dark"
                      intensity={50}
                      style={StyleSheet.absoluteFillObject}
                      className="rounded-full"
                    />
                    <Text className="text-[72px]">{partnerSurprise.content}</Text>
                  </View>
                )}
              </MotiView>

              {/* Sparkle entrance effect */}
              <MotiView
                from={{ opacity: 1, scale: 0.5 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ type: 'timing', duration: 1200 }}
                style={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: 32,
                  borderWidth: 1.5,
                  borderColor: '#F59E0B',
                }}
                pointerEvents="none"
              />
            </MotiView>
          </View>
        )}

        {/* ── Action Bar (Translucent Pill) ── */}
        <View className="relative mt-2">
          <Text
            className="px-8 text-center font-semibold text-[16px] tracking-wide text-glacier w-full mb-8 mt-8"
            style={{ fontWeight: '300' }}>
            Would you like to surprise your partner?
          </Text>
          <MotiView
            {...(glowProps as any)}
            style={{ width: '100%' }}>
            <View className="flex-row items-center justify-center gap-3 px-6">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleWidgetPhoto}
                disabled={sendingSurprise}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-3.5 shadow-sm">
                <Ionicons name="camera" size={20} color="#F59E0B" />
                <Text className="text-[#E2EAF4] text-[13px] font-semibold">Send Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onOpenNoteModal}
                disabled={sendingSurprise}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-3.5 shadow-sm">
                <Ionicons name="pencil" size={18} color="#FBBF24" />
                <Text className="text-[#E2EAF4] text-[13px] font-semibold">Write Note</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
          
          {/* Dismissible Tip Card */}
          {showTip && (
            <Animated.View entering={FadeInDown.springify()} exiting={FadeOut.duration(200)} className="mt-6 px-6">
              <View className="flex-row items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 items-center justify-center shadow-inner">
                    <Ionicons name={Platform.OS === 'ios' ? 'apps' : 'grid'} size={20} color="#94A3B8" />
                  </View>
                  <View>
                    <Text className="text-white text-[13px] font-bold">Add Spark to Home Screen</Text>
                    <Text className="text-slate-muted text-[11px] mt-0.5 max-w-[200px]" numberOfLines={2}>
                      Surprises appear instantly on their widget. Tell them to add it!
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowTip(false)} hitSlop={10} className="w-8 h-8 items-center justify-center rounded-full bg-white/10">
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
