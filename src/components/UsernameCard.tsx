import { useUser } from '@clerk/expo';
import { Platform, Share } from 'react-native';

import { useDialog } from './Overlay';
import { Button, Card, Txt } from './ui';
import { useTheme } from '@/lib/store';

/** Shows a family member's username so they can tell the person sharing their day. */
export function UsernameCard({ title = 'Your username' }: { title?: string }) {
  const { user } = useUser();
  const t = useTheme();
  const dialog = useDialog();
  const username = user?.username ?? '';

  async function share() {
    const text = `Add me on Noema! My username is @${username}`;
    if (Platform.OS === 'web' && !navigator.share) {
      await navigator.clipboard.writeText(`@${username}`);
      return dialog.notify('Copied', `@${username} is copied. Send it to your family member.`);
    }
    try {
      await Share.share({ message: text });
    } catch {}
  }

  return (
    <Card style={{ alignItems: 'center' }}>
      <Txt size="small" weight="700" muted>{title.toUpperCase()}</Txt>
      <Txt size="title" weight="800" color={t.colors.primary} selectable>@{username}</Txt>
      <Button title="Share my username" variant="soft" icon="share-outline" onPress={share} style={{ alignSelf: 'stretch' }} />
    </Card>
  );
}
