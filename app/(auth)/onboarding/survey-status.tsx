import { Text, View } from 'react-native';
import { SelectionCard } from './SelectionCard';

interface SurveyStatusScreenProps {
  answers: { goal: string | null; status: string | null };
  setAnswers: (updater: (prev: { goal: string | null; status: string | null }) => { goal: string | null; status: string | null }) => void;
  onNext: () => void;
  statuses: { id: string; icon: any; label: string }[];
}

export function SurveyStatusScreen({ answers, setAnswers, onNext, statuses }: SurveyStatusScreenProps) {
  return (
    <View className="flex-1 px-6 pt-8 pb-12">
      <View className="flex-1 justify-center">
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

        {statuses.map((s) => (
          <SelectionCard
            key={s.id}
            icon={s.icon}
            label={s.label}
            selected={answers.status === s.id}
            onPress={() => {
              setAnswers((a) => ({ ...a, status: s.id }));
              setTimeout(() => onNext(), 400); // 400ms auto-advance delay
            }}
          />
        ))}
      </View>
    </View>
  );
}
