import { useUser } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { clerkMessage } from '@/lib/clerkError';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { Sheet, useDialog } from './Overlay';
import { SentTag } from './SentTag';
import { Avatar, Button, Field, IconButton, Screen, TopBar, Txt } from './ui';

/** Top of the profile page: photo, name, username, and the settings button. */
export function ProfileHeader() {
  const { user } = useUser();
  const { theme: t } = useStore();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const name = user.fullName || user.username || 'Me';
  const role = (user.unsafeMetadata?.role as Role) ?? 'operator';

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => setEditing(true)} accessibilityLabel="Change profile photo or name">
          <Avatar name={name} uri={user.hasImage ? user.imageUrl : null} size={64 * t.scale} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: t.colors.stamp,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: t.colors.bg,
            }}
          >
            <Txt size="small" color="#fff" weight="800" style={{ fontSize: 12, lineHeight: 14 }}>✎</Txt>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size="large" weight="800" numberOfLines={1}>{name}</Txt>
          <Txt size="small" muted>@{user.username} · {role === 'operator' ? 'Operator' : 'Member'}</Txt>
        </View>
        <IconButton icon="settings-sharp" label="Settings" onPress={() => router.push('/settings')} />
      </View>
      <SentTag />
      <EditProfileModal visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

export function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [first, setFirst] = useState(user?.firstName ?? '');
  const [last, setLast] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const dialog = useDialog();
  if (!user) return null;

  async function pickPhoto(from: 'camera' | 'library') {
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return dialog.notify('Permission needed', 'Please allow access to choose a photo.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true };
    const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset?.base64) return;
    setPhotoBusy(true);
    try {
      await user!.setProfileImage({ file: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` });
    } catch (e) {
      void dialog.notify('Could not save photo', clerkMessage(e));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    if (!first.trim()) return dialog.notify('Please enter your first name.');
    setSaving(true);
    try {
      await user!.update({ firstName: first.trim(), lastName: last.trim() });
      onClose();
    } catch (e) {
      void dialog.notify('Could not save', clerkMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen edges={['bottom']} footer={<Button title="Save" big loading={saving} onPress={save} />}>
        <TopBar title="Edit profile" onBack={onClose} />
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Avatar name={user.fullName ?? first} uri={user.hasImage ? user.imageUrl : null} size={96} />
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
            <Button title="Take photo" icon="camera" variant="soft" loading={photoBusy} onPress={() => pickPhoto('camera')} style={{ flex: 1 }} />
            <Button title="Choose" icon="images" variant="soft" loading={photoBusy} onPress={() => pickPhoto('library')} style={{ flex: 1 }} />
          </View>
          {user.hasImage ? (
            <Button title="Remove photo" variant="ghost" onPress={() => user.setProfileImage({ file: null })} />
          ) : null}
        </View>
        <Field label="First name" value={first} onChangeText={setFirst} />
        <Field label="Last name" value={last} onChangeText={setLast} />
      </Screen>
    </Sheet>
  );
}
