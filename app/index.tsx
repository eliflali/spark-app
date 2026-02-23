import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 bg-midnight items-center justify-center">
      <ActivityIndicator size="large" color="#F59E0B" />
    </View>
  );
}
