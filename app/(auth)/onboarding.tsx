import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { WelcomeScreen } from '@/src/components/onboarding/welcome';
import { SurveyGoalScreen } from '@/src/components/onboarding/survey-goal';
import { SurveyStatusScreen } from '@/src/components/onboarding/survey-status';
import { AnalysisScreen } from '@/src/components/onboarding/analysis';
import { CommitmentScreen } from '@/src/components/onboarding/commitment';

const { width } = Dimensions.get('window');

// ─── Survey data ─────────────────────────────────────────────────────────────

const GOALS = [
  { id: 'deepen', icon: require('../../assets/onboarding-icons/intimacy.png'), label: 'Deepen our intimacy' },
  { id: 'communicate', icon: require('../../assets/onboarding-icons/communicate.png'), label: 'Communicate better' },
  { id: 'reignite', icon: require('../../assets/onboarding-icons/spark.png'), label: 'Reignite the spark' },
  { id: 'trust', icon: require('../../assets/onboarding-icons/trust.png'), label: 'Build stronger trust' },
];

const STATUSES = [
  { id: 'new', icon: require('../../assets/onboarding-icons/new-date.png'), label: 'Newly dating' },
  { id: 'together', icon: require('../../assets/onboarding-icons/relationship.png'), label: 'In a relationship' },
  { id: 'engaged', icon: require('../../assets/onboarding-icons/engaged.png'), label: 'Engaged' },
  { id: 'married', icon: require('../../assets/onboarding-icons/married.png'), label: 'Married' },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5; // Welcome | Survey 1 | Survey 2 | Commitment | (Paywall = next screen)

function ProgressBar({ step }: { step: number }) {
  // Use animated values to fluidly transition the progress bar fills
  const widths = useRef(Array.from({ length: TOTAL_STEPS }).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      widths.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i < step ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [step]);

  return (
    <View className="flex-row gap-2 px-6 pt-16 pb-4">
      {widths.map((anim, i) => (
        <View
          key={i}
          className="flex-1 h-1 rounded-full bg-slate-600/40 relative overflow-hidden"
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              backgroundColor: '#F59E0B',
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = 'welcome' | 'survey_goal' | 'survey_status' | 'analysis' | 'commitment';

interface SurveyAnswers {
  goal: string | null;
  status: string | null;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [answers, setAnswers] = useState<SurveyAnswers>({ goal: null, status: null });
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [committed, setCommitted] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Background crossfade animation
  const bgFadeAnim = useRef(new Animated.Value(1)).current;

  // Progress bar step number (1 to 4 visible, paywall is 5)
  let progressStep = 1;
  if (step === 'survey_goal') progressStep = 2;
  if (step === 'survey_status' || step === 'analysis') progressStep = 3;
  if (step === 'commitment') progressStep = 4;

  // Determine dynamic background image
  let bgSource = require('../../assets/onboarding-images/hugging-couple.png');
  if (step === 'survey_goal') bgSource = require('../../assets/onboarding-images/goal-bg.png');
  if (step === 'survey_status') bgSource = require('../../assets/onboarding-images/status-bg.png');

  // ── Transition between steps ────────────────────────────────────────────────
  const goToStep = (next: Step) => {
    // Crossfade both the content and the background
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(bgFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => {
      setStep(next);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(bgFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    });
  };

  // ── AI Analysis auto-advance ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'analysis') return;

    // Animate the fake progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3200,
      useNativeDriver: false,
    }).start();

    // Advance after 3.5 seconds
    const timer = setTimeout(() => goToStep('commitment'), 3500);
    return () => clearTimeout(timer);
  }, [step]);

  const handleCommit = () => {
    setCommitted(true);
    setShowBurst(true);
    setTimeout(() => router.push('/(auth)/paywall'), 1500);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const showPhotoBg = step === 'welcome' || step === 'survey_goal' || step === 'survey_status' || step === 'commitment';

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <StatusBar style="light" />

      {/* ── BACKGROUND IMAGE (Welcome, Survey, & Commitment) ── */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: bgFadeAnim }} pointerEvents="none">
        {showPhotoBg && (
          <ImageBackground
            source={bgSource}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            {step === 'welcome' && (
              <LinearGradient
                colors={['transparent', 'rgba(15,23,42,0.85)', '#0F172A']}
                locations={[0, 0.5, 1]}
                style={{ flex: 1 }}
              />
            )}
            {(step === 'survey_goal' || step === 'survey_status') && ( 
              <LinearGradient
                colors={['rgba(15,23,42,0.6)', 'rgba(15,23,42,0.95)', '#0F172A']}
                locations={[0, 0.5, 1]}
                style={{ flex: 1 }}
              />
            )}
            {step === 'commitment' && ( 
              <LinearGradient
                colors={['rgba(15,23,42,1)', 'rgba(15,23,42,1)', '#0F172A']}
                locations={[0, 0.3, 1]}
                style={{ flex: 1 }}
              />
            )}
          </ImageBackground>
        )}
      </Animated.View>

      {/* The progress bar sits on top of the background */}
      <ProgressBar step={progressStep} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {step === 'welcome' && (
          <WelcomeScreen onNext={() => goToStep('survey_goal')} />
        )}

        {step === 'survey_goal' && (
          <SurveyGoalScreen
            answers={answers}
            setAnswers={setAnswers as any}
            onNext={() => goToStep('survey_status')}
            goals={GOALS}
          />
        )}

        {step === 'survey_status' && (
          <SurveyStatusScreen
            answers={answers}
            setAnswers={setAnswers as any}
            onNext={() => goToStep('analysis')}
            statuses={STATUSES}
          />
        )}

        {step === 'analysis' && (
          <AnalysisScreen progressAnim={progressAnim} />
        )}

        {step === 'commitment' && (
          <CommitmentScreen
            committed={committed}
            onCommit={handleCommit}
          />
        )}

      </Animated.View>

      {/* ── FINAL BURST ANIMATION ── */}
      {showBurst && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <LottieView
            source={require('../../assets/onboarding-icons/Spark.lottie')}
            autoPlay
            loop={false}
            style={{ width: 400, height: 400 }}
          />
        </View>
      )}
    </View>
  );
}
