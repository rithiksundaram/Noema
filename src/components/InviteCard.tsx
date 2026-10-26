import { useState } from 'react';
import { View } from 'react-native';

import { useConnections, type LinkView } from '@/lib/connections';
import { colorFor, useTheme } from '@/lib/store';
import { useDialog } from './Overlay';
import { Avatar, Button, Card, Txt } from './ui';

/** An invite a family member received. Nothing is shared until they tap Accept. */
export function InviteCard({ link }: { link: LinkView }) {
  const t = useTheme();
  const { respond } = useConnections();
  const dialog = useDialog();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  async function answer(accept: boolean) {
    if (!accept) {
      const yes = await dialog.confirm({
        title: `Decline ${link.other.name}'s invite?`,
        message: "They won't be able to send you messages. They can invite you again later.",
        confirmText: 'Decline',
        destructive: true,
      });
      if (!yes) return;
    }
    setBusy(accept ? 'accept' : 'decline');
    try {
      await respond(link.id, accept);
    } catch (e) {
      void dialog.notify('Something went wrong', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={{ borderColor: t.colors.primary, borderWidth: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={link.other.name} uri={link.other.imageUrl} color={colorFor(link.other.id)} size={48 * t.scale} />
        <View style={{ flex: 1 }}>
          <Txt weight="700">{link.other.name} wants to add you</Txt>
          <Txt size="small" muted>
            @{link.other.username} · as their {link.relation.toLowerCase()}
          </Txt>
        </View>
      </View>
      <Txt size="small" muted>If you accept, you’ll get the messages they send about their day.</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Decline" variant="secondary" loading={busy === 'decline'} disabled={!!busy} onPress={() => answer(false)} style={{ flex: 1 }} />
        <Button title="Accept" icon="checkmark" loading={busy === 'accept'} disabled={!!busy} onPress={() => answer(true)} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
