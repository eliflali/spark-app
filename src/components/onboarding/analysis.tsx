import { Animated, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

interface AnalysisScreenProps {
  progressAnim: Animated.Value;
}

export function AnalysisScreen({ progressAnim }: AnalysisScreenProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <LottieView
        source={require('../../../assets/onboarding-icons/Spark.lottie')}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />

      <Text
        className="text-glacier text-3xl font-bold text-center mt-4"
        style={{ letterSpacing: -0.5 }}>
        Analysing your relationship profile…
      </Text>
      <Text className="text-slate-muted text-lg text-center mt-4 px-4 leading-6">
        Curating your personalised Spark journey.
      </Text>

      {/* Progress bar */}
      <View
        className="w-full mt-10 h-1 rounded-full"
        style={{ backgroundColor: 'rgba(71,85,105,0.3)' }}
      >
        <Animated.View
          className="h-full rounded-full bg-spark"
          style={{
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
    </View>
  );
}
