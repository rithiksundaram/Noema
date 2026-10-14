import { Image } from 'expo-image';

/** The Noema "N" mark. Transparent background, so it works in light and dark mode. */
export function Logo({ size = 120 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/noema-logo.png')}
      style={{ width: size * 1.5, height: size * 1.5 }}
      contentFit="contain"
      accessibilityLabel="Noema logo"
    />
  );
}
