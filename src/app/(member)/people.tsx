import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { InviteCard } from '@/components/InviteCard';
import { useDialog } from '@/components/Overlay';
import { PersonRow } from '@/components/PersonRow';
import { ProfileHeader } from '@/components/ProfileHeader';
import { UsernameCard } from '@/components/UsernameCard';
import { Screen, Txt } from '@/components/ui';
import { useConnections, type LinkView } from '@/lib/connections';
import { useTheme } from '@/lib/store';

/** Family member's connections: who they get messages from, plus new invites. */
export default function People() {
  const t = useTheme();
  const { family, pending, removeLink } = useConnections();
  const dialog = useDialog();

  async function leave(l: LinkView) {
    const yes = await dialog.confirm({
      title: `Stop getting ${l.other.name}'s messages?`,
      message: 'You will leave their family on Noema. They would need to invite you again.',
      confirmText: 'Leave',
      destructive: true,
    });
    if (!yes) return;
    try {
      await removeLink(l.id);
    } catch (e) {
      void dialog.notify('Something went wrong', e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <Screen edges={['top']}>
      <ProfileHeader />
      {pending.map((l) => (
        <InviteCard key={l.id} link={l} />
      ))}
      <Txt size="large" weight="800" style={{ marginTop: 4 }}>Connected with</Txt>
      {family.map((l) => (
        <PersonRow
          key={l.id}
          person={l.other}
          subtitle={`@${l.other.username} · you're their ${l.relation.toLowerCase()}`}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Leave ${l.other.name}'s family`}
              onPress={() => leave(l)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.colors.dangerSoft,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="exit-outline" size={20} color={t.colors.danger} />
            </Pressable>
          }
        />
      ))}
      <UsernameCard title="Your username, for more family" />
    </Screen>
  );
}
