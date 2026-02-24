import { Text, View } from 'react-native';
import { SelectionCard } from './SelectionCard';

interface SurveyGoalScreenProps {
  answers: { goal: string | null; status: string | null };
  setAnswers: (updater: (prev: { goal: string | null; status: string | null }) => { goal: string | null; status: string | null }) => void;
  onNext: () => void;
  goals: { id: string; icon: any; label: string }[];
}

export function SurveyGoalScreen({ answers, setAnswers, onNext, goals }: SurveyGoalScreenProps) {
  return (
    <View className="flex-1 px-6 pt-8 pb-12">
      <View className="flex-1 justify-center">
        <Text className="text-spark text-xs font-bold uppercase tracking-widest mb-5" style={{ letterSpacing: 1.5 }}>
          Question 1 of 2
        </Text>
        
        <View className="relative mb-10">
          <Text
            className="text-glacier text-3xl font-bold relative z-10"
            style={{ letterSpacing: -0.5, lineHeight: 40 }}>
            What's your relationship goal?
          </Text>
        </View>

        {goals.map((g) => (
          <SelectionCard
            key={g.id}
            icon={g.icon}
            label={g.label}
            selected={answers.goal === g.id}
            onPress={() => {
              setAnswers((a) => ({ ...a, goal: g.id }));
              setTimeout(() => onNext(), 400); // 400ms auto-advance delay
            }}
          />
        ))}
      </View>
    </View>
  );
}
