import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { Txt } from './ui';

const W = 402;
const H = 874;

/**
 * On a computer browser, shows the app inside a phone-sized frame so it looks and
 * sizes exactly like it will on an iPhone. On a real phone (or a narrow window) it does nothing.
 */
export function PhoneFrame({ children, dark }: { children: ReactNode; dark: boolean }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 520) return <>{children}</>;

  const frameH = Math.min(H, height - 48);
  return (
    <View
      style={{
        flex: 1,
        minHeight: height,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dark ? '#0B0E12' : '#EEF1F5',
        gap: 12,
      }}
    >
      <View
        style={{
          width: W,
          height: frameH,
          borderRadius: 48,
          borderWidth: 10,
          borderColor: dark ? '#111418' : '#D5DBE3',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(20, 40, 80, 0.18)',
        }}
      >
        {children}
      </View>
      <Txt size="small" color={dark ? '#6B7684' : '#7A8696'}>Noema · iPhone preview</Txt>
    </View>
  );
}
