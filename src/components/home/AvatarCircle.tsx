import { View, Text, Image } from 'react-native';

export function AvatarCircle({
  name,
  avatarUrl,
  size = 48,
  color = '#F59E0B',
}: {
  name: string | null;
  avatarUrl: string | null;
  size?: number;
  color?: string;
}) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: color,
      }}
      className="items-center justify-center overflow-hidden border-2 bg-spark/15"
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color, fontSize: size * 0.4 }} className="font-bold">
          {initial}
        </Text>
      )}
    </View>
  );
}
