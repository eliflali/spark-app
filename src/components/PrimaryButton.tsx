import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';

export type ButtonTheme = 'primary' | 'commit' | 'success';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  theme?: ButtonTheme;
  loading?: boolean;
}

export function PrimaryButton({
  label,
  theme = 'primary',
  disabled,
  loading,
  style,
  ...props
}: PrimaryButtonProps) {
  const isCommit = theme === 'commit';
  const isSuccess = theme === 'success';

  let bgColor = '#F59E0B'; // spark
  let shadowColor = '#F59E0B';
  let textColor = '#0F172A'; // midnight

  if (disabled) {
    bgColor = 'rgba(71,85,105,0.3)';
    shadowColor = 'transparent';
    textColor = '#475569';
  } else if (isSuccess) {
    bgColor = '#10b981'; // emerald
    shadowColor = '#10b981';
    textColor = '#0F172A';
  } else if (isCommit) {
    bgColor = '#F8FAFC'; // glacier
    shadowColor = '#F8FAFC';
    textColor = '#0F172A';
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      activeOpacity={0.85}
      className={`rounded-full py-4 items-center flex-row justify-center w-full`}
      style={[
        {
          backgroundColor: bgColor,
          shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0 : 0.45,
          shadowRadius: 20,
        },
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          className="text-lg font-bold"
          style={{ color: textColor, letterSpacing: -0.3 }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
