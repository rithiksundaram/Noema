import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Avatar, Button, Card, Field, IconButton, Screen, TopBar, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

const RELATIONS = ['Son', 'Daughter', 'Grandchild', 'Sister', 'Brother', 'Friend', 'Neighbor', 'Other'];

export default function Family() {
  const { family, removeMember, theme: t } = useStore();
  const [adding, setAdding] = useState(false);
  const dialog = useDialog();

  async function confirmRemove(id: string, name: string) {
    const yes = await dialog.confirm({
      title: 'Are you sure you want to remove this person?',
      message: `${name} will stop getting your messages.`,
      confirmText: 'Remove',
      cancelText: 'Keep',
      destructive: true,
    });
    if (yes) removeMember(id);
  }

  return (
    <Screen edges={['top']}>
      <ProfileHeader />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Txt size="large" weight="800" style={{ flex: 1 }}>My family</Txt>
        <IconButton icon="add" label="Add a family member or friend" filled onPress={() => setAdding(true)} />
      </View>

      {family.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="people-outline" size={40} color={t.colors.muted} />
          <Txt weight="700" center>No one here yet</Txt>
          <Txt muted center>Add the people you want to send your day to.</Txt>
          <Button title="Add someone" icon="add" onPress={() => setAdding(true)} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : (
        family.map((m) => (
          <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <Avatar name={m.name} color={m.color} size={44 * t.scale} />
            <View style={{ flex: 1 }}>
              <Txt weight="700">{m.name}</Txt>
              <Txt size="small" muted>{m.relation}{m.contact ? ` · ${m.contact}` : ''}</Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${m.name}`}
              onPress={() => confirmRemove(m.id, m.name)}
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
          </Card>
        ))
      )}

      <AddMemberModal visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddMemberModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addMember, theme: t } = useStore();
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Grandchild');
  const [contact, setContact] = useState('');

  function save() {
    if (!name.trim()) return;
    addMember({ name: name.trim(), relation, contact: contact.trim() || undefined });
    setName('');
    setContact('');
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen edges={['bottom']} footer={<Button title="Add to my family" big icon="person-add" disabled={!name.trim()} onPress={save} />}>
        <TopBar title="Add someone" onBack={onClose} />
        <Field label="Their name" value={name} onChangeText={setName} placeholder="For example: Iyla" autoFocus />
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
        <Field label="Phone or email (optional)" value={contact} onChangeText={setContact} autoCapitalize="none" placeholder="So you can share messages with them" />
      </Screen>
    </Sheet>
  );
}
