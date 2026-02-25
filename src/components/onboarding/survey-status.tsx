import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { SelectionCard } from './SelectionCard';

interface SurveyStatusScreenProps {
  answers: { goal: string | null; status: string | null };
  setAnswers: (updater: (prev: { goal: string | null; status: string | null }) => { goal: string | null; status: string | null }) => void;
  onNext: () => void;
  statuses: { id: string; icon: any; label: string }[];
}

export function SurveyStatusScreen({ answers, setAnswers, onNext, statuses }: SurveyStatusScreenProps) {
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(20)).current;
  const optionAnims = useRef(statuses.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true })
      ]),
      Animated.stagger(
        150,
        optionAnims.map((anim) =>
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
        )
      )
    ]).start();
  }, []);

  return (
    <View className="flex-1 px-6 pt-8 pb-12">
      <View className="flex-1 justify-center">
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }}>
          <Text className="text-spark text-xs font-bold uppercase tracking-widest mb-3" style={{ letterSpacing: 1.5 }}>
            Question 2 of 2
          </Text>

          <View className="relative mb-10">
            <Text
              className="text-glacier text-3xl font-bold relative z-10"
              style={{ letterSpacing: -0.5, lineHeight: 40 }}>
              What is your relationship status?
            </Text>
          </View>
        </Animated.View>

        {statuses.map((s, index) => (
          <Animated.View
            key={s.id}
            style={{
              opacity: optionAnims[index],
              transform: [
                {
                  translateY: optionAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }
              ]
            }}
          >
            <SelectionCard
              icon={s.icon}
              label={s.label}
              selected={answers.status === s.id}
              onPress={() => {
                setAnswers((a) => ({ ...a, status: s.id }));
                setTimeout(() => onNext(), 400); // 400ms auto-advance delay
              }}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
