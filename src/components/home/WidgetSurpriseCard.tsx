import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

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
      <View className="mt-4 gap-6">
        {/* ── Widget Preview Area ── */}
        <View className="relative min-h-[220px] items-center justify-center overflow-hidden rounded-[32px] border-[1.5px] border-dashed border-white/20 p-6">
          {/* Instructional Overlay */}
          <Text
            className="absolute px-8 text-center font-serif text-[12px] italic tracking-wide text-[#F8FAFC] opacity-40"
            style={{ fontWeight: '300' }}>
            Your partner will see your latest surprise on their home screen widget.
          </Text>

          {/* ── Incoming surprise preview ── */}
          {partnerSurprise && (
            <MotiView
              from={{ translateY: 20, opacity: 0, scale: 0.95 }}
              animate={{ translateY: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              style={{ position: 'relative', zIndex: 10 }}>
              {/* Float Animation Wrapper */}
              <MotiView
                from={{ translateY: -4 }}
                animate={{ translateY: 4 }}
                transition={{ type: 'timing', duration: 3000, loop: true }}>
                {/* Visuals Based on Type */}
                {partnerSurprise.type === 'PHOTO' && (
                  <View
                    style={{
                      transform: [{ rotate: '2deg' }],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.4,
                      shadowRadius: 20,
                      elevation: 15,
                    }}
                    className="overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3.5 pb-2">
                    <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFillObject} />
                    <View className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#1E293B]">
                      <Image
                        source={{ uri: partnerSurprise.content }}
                        className="h-[180px] w-[180px]"
                        resizeMode="cover"
                      />
                      {/* Subtle 'grain' overlay effect simulating nostalgia */}
                      <View className="absolute inset-0 bg-white/10 mix-blend-overlay" />
                    </View>
                    <Text className="mb-1 mt-2.5 text-center font-serif text-[10px] uppercase tracking-[0.2em] text-[#E2EAF4]">
                      {partnerSurprise.sender_name?.split(' ')[0] ?? 'Partner'}
                    </Text>
                  </View>
                )}

                {partnerSurprise.type === 'NOTE' && (
                  <View
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.35,
                      shadowRadius: 24,
                      elevation: 15,
                    }}
                    className="min-h-[140px] min-w-[150px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-5 px-6">
                    <BlurView
                      tint="light"
                      intensity={20}
                      style={StyleSheet.absoluteFillObject}
                      className="rounded-2xl"
                    />
                    <Text className="text-center font-serif text-[17px] leading-[26px] text-glacier">
                      {partnerSurprise.content}
                    </Text>
                    <Text className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
                      {partnerSurprise.sender_name?.split(' ')[0] ?? 'Partner'}
                    </Text>
                  </View>
                )}

                {partnerSurprise.type === 'REACTION' && (
                  <View
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.3,
                      shadowRadius: 20,
                      elevation: 15,
                    }}
                    className="items-center justify-center rounded-full border border-white/20 bg-white/10 p-6">
                    <BlurView
                      tint="dark"
                      intensity={40}
                      style={StyleSheet.absoluteFillObject}
                      className="rounded-full"
                    />
                    <Text className="text-[64px]">{partnerSurprise.content}</Text>
                  </View>
                )}
              </MotiView>

              {/* Sparkle entrance effect */}
              <MotiView
                from={{ opacity: 1, scale: 0.5 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ type: 'timing', duration: 1000 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                }}
                pointerEvents="none"
              />
            </MotiView>
          )}
        </View>

        {/* ── Action Bar ── */}
        <View className="flex-row items-center justify-center gap-4">
          <MotiView
            {...(glowProps as any)}
            style={{ flex: 1, shadowColor: '#FBBF24', shadowRadius: 15 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleWidgetPhoto}
              disabled={sendingSurprise}
              className="flex-row items-center justify-center gap-2.5 overflow-hidden rounded-[24px] border border-white/15 bg-white/5 py-4">
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
              <Ionicons name="camera-outline" size={20} color="#F59E0B" />
              <Text className="text-[13px] font-semibold tracking-wide text-[#F8FAFC]">
                Send Photo
              </Text>
            </TouchableOpacity>
          </MotiView>

          <MotiView
            {...(glowProps as any)}
            style={{ flex: 1, shadowColor: '#FBBF24', shadowRadius: 15 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onOpenNoteModal}
              disabled={sendingSurprise}
              className="flex-row items-center justify-center gap-2.5 overflow-hidden rounded-[24px] border border-white/15 bg-white/5 py-4">
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
              <Ionicons name="pencil-outline" size={20} color="#FBBF24" />
              <Text className="text-[13px] font-semibold tracking-wide text-[#F8FAFC]">
                Write Note
              </Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </View>
    </Animated.View>
  );
}
