import React from 'react';
import { View } from 'react-native';

export type BlobConfig = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  color: string;
  size: number;
};

export function AnimatedBlob({ config }: { config: BlobConfig }) {
  return (
    <View
      pointerEvents="none"
      className="absolute opacity-[0.55]"
      style={{
        left: config.startX,
        top: config.startY,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
      }}
    />
  );
}
