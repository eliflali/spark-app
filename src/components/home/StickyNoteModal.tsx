import { Modal, KeyboardAvoidingView, Pressable, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function StickyNoteModal({
  visible,
  onClose,
  draftNote,
  setDraftNote,
  handleSubmit,
  sendingSurprise,
}: {
  visible: boolean;
  onClose: () => void;
  draftNote: string;
  setDraftNote: (text: string) => void;
  handleSubmit: () => void;
  sendingSurprise: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/55"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <BlurView tint="dark" intensity={60} className="overflow-hidden rounded-t-[32px]">
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.75)', 'rgba(15, 23, 42, 0.95)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View className="gap-3 px-6 pb-10 pt-6">
            <View className="mb-1 h-1 w-9 self-center rounded-full bg-white/15" />
            <View className="flex-row items-center gap-2">
              <Ionicons name="pencil" size={24} color="#F8FAFC" />
              <Text className="text-xl font-bold tracking-tight text-glacier"> Write a Sticky Note</Text>
            </View>
            <Text className="text-[13px] leading-[19px] text-glacier">Only your partner will see this on their widget.</Text>

            <TextInput
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Type something sweet..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={140}
              autoFocus
              className="mt-1 min-h-[110px] max-h-[200px] rounded-2xl border border-white/10 bg-white/5 p-4 text-base leading-6 text-[#E2EAF4]"
              style={{ textAlignVertical: 'top' }}
            />
            <Text className="text-right text-xs text-glacier">{draftNote.length}/140</Text>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!draftNote.trim() || sendingSurprise}
              activeOpacity={0.85}
              className={`mt-1 items-center rounded-2xl bg-spark py-4 shadow-[0_4px_12px_rgba(245,158,11,0.4)] ${!draftNote.trim() || sendingSurprise ? 'opacity-40' : ''}`}
            >
              {sendingSurprise ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text className="text-[15px] font-extrabold tracking-[0.2px] text-midnight">Send to Widget ✦</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
