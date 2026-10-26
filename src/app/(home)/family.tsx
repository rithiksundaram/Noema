import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { PersonRow } from '@/components/PersonRow';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Button, Card, Field, IconButton, Screen, TopBar, Txt } from '@/components/ui';
import { ApiError, useConnections, type LinkView } from '@/lib/connections';
import { useTheme } from '@/lib/store';

const RELATIONS = ['Son', 'Daughter', 'Grandchild', 'Sister', 'Brother', 'Friend', 'Neighbor', 'Other'];

/** Operator's family: accepted members, plus invites still waiting for an answer. */
export default function Family() {
  const t = useTheme();
  const { ready, family, pending, removeLink, error } = useConnections();
  const [adding, setAdding] = useState(false);
  const dialog = useDialog();

  async function confirmRemove(l: LinkView) {
    const isInvite = l.status === 'pending';
    const yes = await dialog.confirm({
      title: isInvite ? 'Cancel this invite?' : 'Are you sure you want to remove this person?',
      message: isInvite ? `${l.other.name} won't be able to accept it.` : `${l.other.name} will stop getting your messages.`,
      confirmText: isInvite ? 'Cancel invite' : 'Remove',
      cancelText: 'Keep',
      destructive: true,
    });
    if (!yes) return;
    try {
      await removeLink(l.id);
    } catch (e) {
      void dialog.notify('Could not remove', e instanceof Error ? e.message : undefined);
    }
  }

  const removeButton = (l: LinkView) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${l.other.name}`}
      onPress={() => confirmRemove(l)}
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
      <Ionicons name="close" size={22} color={t.colors.danger} />
    </Pressable>
  );

  return (
    <Screen edges={['top']}>
      <ProfileHeader />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Txt size="large" weight="800" style={{ flex: 1 }}>My family</Txt>
        <IconButton icon="add" label="Add a family member" filled onPress={() => setAdding(true)} />
      </View>

      {error && !ready ? <Txt size="small" color={t.colors.danger}>{error}</Txt> : null}
      {!ready ? <ActivityIndicator color={t.colors.primary} /> : null}

      {ready && family.length === 0 && pending.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="people-outline" size={40} color={t.colors.muted} />
          <Txt weight="700" center>No one here yet</Txt>
          <Txt size="small" muted center>Ask your family to make a Noema account, then add them by their username.</Txt>
          <Button title="Add someone" icon="add" onPress={() => setAdding(true)} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : null}

      {family.map((l) => (
        <PersonRow key={l.id} person={l.other} subtitle={`${l.relation} · @${l.other.username}`} right={removeButton(l)} />
      ))}

      {pending.length > 0 ? <Txt size="small" weight="700" muted style={{ marginTop: 4 }}>WAITING TO ACCEPT</Txt> : null}
      {pending.map((l) => (
        <PersonRow key={l.id} person={l.other} subtitle={`Invite sent · @${l.other.username} needs to accept`} right={removeButton(l)} />
      ))}

      <InviteSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function InviteSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { invite } = useConnections();
  const [username, setUsername] = useState('');
  const [relation, setRelation] = useState('Grandchild');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  async function send() {
    setBusy(true);
    setError('');
    try {
      await invite(username, relation);
      const who = username.replace(/^@/, '');
      setUsername('');
      onClose();
      void dialog.notify('Invite sent', `@${who} will see your invite next time they open Noema. Once they accept, they'll get your messages.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the invite. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen edges={['bottom']} footer={<Button title="Send invite" big icon="paper-plane" loading={busy} disabled={!username.trim()} onPress={send} />}>
        <TopBar title="Add family" onBack={onClose} />
        <Txt size="small" muted>
          They need their own Noema account set up as a family member. Ask them for their username.
        </Txt>
        <Field
          label="Their username"
          value={username}
          onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="@username"
          autoFocus
          error={error}
          onSubmitEditing={send}
        />
        <Txt size="small" weight="700">Who are they to you?</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RELATIONS.map((r) => {
            const on = r === relation;
            return (
              <Pressable
                key={r}
                onPress={() => setRelation(r)}
                style={{
                  minHeight: 40 * t.scale,
                  paddingHorizontal: 14,
                  borderRadius: 20 * t.scale,
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: on ? t.colors.primary : t.colors.border,
                  backgroundColor: on ? t.colors.soft : t.colors.card,
                }}
              >
                <Txt size="small" weight="700" color={on ? t.colors.primary : t.colors.text}>{r}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    </Sheet>
  );
}
