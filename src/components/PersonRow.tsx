import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { PersonView } from '@/server/state';
import { colorFor, useTheme } from '@/lib/store';
import { Avatar, Card, Txt } from './ui';

/** One person in a list: photo, name, a small line under it, and buttons on the right. */
export function PersonRow({ person, subtitle, right, highlight }: { person: PersonView; subtitle: string; right?: ReactNode; highlight?: boolean }) {
  const t = useTheme();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderColor: highlight ? t.colors.primary : t.colors.border, borderWidth: highlight ? 2 : 1 }}>
      <Avatar name={person.name} uri={person.imageUrl} color={colorFor(person.id)} size={44 * t.scale} />
      <View style={{ flex: 1 }}>
        <Txt weight="700" numberOfLines={1}>{person.name}</Txt>
        <Txt size="small" muted numberOfLines={2}>{subtitle}</Txt>
      </View>
      {right}
    </Card>
  );
}
