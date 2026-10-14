import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/store';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type TxtProps = TextProps & {
  size?: 'small' | 'body' | 'large' | 'title' | 'huge';
  weight?: '400' | '600' | '700' | '800';
  color?: string;
  muted?: boolean;
  center?: boolean;
};

export function Txt({ size = 'body', weight = '400', color, muted, center, style, ...rest }: TxtProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: t.font[size],
          lineHeight: t.font[size] * 1.35,
          fontWeight: weight,
          color: color ?? (muted ? t.colors.muted : t.colors.text),
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
};

/** Page wrapper: safe area, background, optional scrolling, and a footer pinned above the keyboard. */
export function Screen({ children, scroll = true, padded = true, footer, edges = ['top', 'bottom'], contentStyle }: ScreenProps) {
  const t = useTheme();
  const pad = padded ? { paddingHorizontal: 20, paddingVertical: 10 } : null;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={[pad, { gap: 14, flexGrow: 1 }, contentStyle]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, gap: 14 }, pad, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, big, style, textStyle, accessibilityLabel }: ButtonProps) {
  const t = useTheme();
  const c = t.colors;
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.card, fg: c.primary, border: c.primary },
    soft: { bg: c.soft, fg: c.primary, border: c.soft },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: big ? t.bigTap : t.tap,
          borderRadius: t.radius,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 2,
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={big ? t.font.large : t.font.body + 2} color={palette.fg} /> : null}
          <Text style={[{ color: palette.fg, fontSize: big ? t.font.large : t.font.body, fontWeight: '700', textAlign: 'center' }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  size,
  filled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
  filled?: boolean;
}) {
  const t = useTheme();
  const s = size ?? 44 * t.scale;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: s,
        height: s,
        borderRadius: s / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? t.colors.primary : t.colors.soft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={s * 0.5} color={filled ? t.colors.onPrimary : (color ?? t.colors.primary)} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.colors.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.colors.border, padding: 14, gap: 10 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string; error?: string; hint?: string };

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, hint, style, ...rest }, ref) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Txt size="small" weight="700">{label}</Txt>
      <TextInput
        ref={ref}
        placeholderTextColor={t.colors.muted}
        {...rest}
        style={[
          {
            minHeight: t.tap,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: error ? t.colors.danger : t.colors.border,
            backgroundColor: t.colors.card,
            color: t.colors.text,
            fontSize: t.font.body,
            paddingHorizontal: 14,
            paddingVertical: 10,
          },
          style,
        ]}
      />
      {error ? <Txt size="small" color={t.colors.danger}>{error}</Txt> : hint ? <Txt size="small" muted>{hint}</Txt> : null}
    </View>
  );
});

/** A big selectable answer, used in the quiz and settings. */
export function Choice({
  label,
  selected,
  onPress,
  icon,
  description,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  description?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: t.tap,
        borderRadius: t.radius,
        borderWidth: 2,
        borderColor: selected ? t.colors.primary : t.colors.border,
        backgroundColor: selected ? t.colors.soft : t.colors.card,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={t.font.large} color={t.colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <Txt weight="600">{label}</Txt>
        {description ? <Txt size="small" muted>{description}</Txt> : null}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={t.font.large + 2} color={selected ? t.colors.primary : t.colors.border} />
    </Pressable>
  );
}

export function Avatar({ name, uri, color, size = 56 }: { name: string; uri?: string | null; color?: string; size?: number }) {
  const t = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? t.colors.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}

/** Simple top bar with a back button, a title, and an optional right-side control. */
export function TopBar({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      <IconButton icon="chevron-back" label="Go back" onPress={onBack ?? (() => router.back())} />
      <Txt size="large" weight="700" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
        {title ?? ''}
      </Txt>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: '100%', backgroundColor: t.colors.primary, borderRadius: 4 }} />
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Txt size="small" weight="700" muted style={{ textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

/** Small pill button for secondary actions (edits, filters). */
export function Chip({
  label,
  icon,
  onPress,
  active,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  const fg = active ? t.colors.onPrimary : t.colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 40 * t.scale,
        paddingHorizontal: 14,
        borderRadius: 20 * t.scale,
        borderWidth: 1.5,
        borderColor: active ? t.colors.primary : t.colors.border,
        backgroundColor: active ? t.colors.primary : t.colors.card,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={t.font.body} color={fg} /> : null}
      <Text style={{ color: active ? fg : t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
