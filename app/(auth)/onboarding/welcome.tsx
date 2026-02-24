import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PrimaryButton } from '@/src/components/PrimaryButton';

interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <View className="flex-1 px-6 justify-end pb-12">
      <View className="mb-10">
        <Text className="text-glacier text-4xl font-bold" style={{ letterSpacing: -1 }}>
          Every relationship{'\n'}deserves a spark.
        </Text>

        <Text className="text-slate-muted text-lg mt-4 leading-7">
          Break the routine. Rediscover the magic in your relationship through small, daily moments.
        </Text>
      </View>

      <PrimaryButton
        label="Let's Begin →"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
      />
    </View>
  );
}
