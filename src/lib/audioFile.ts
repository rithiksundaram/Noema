import { File } from 'expo-file-system';

/** Adds a recording (a file on the phone) to an upload form. */
export async function appendRecording(form: FormData, uri: string) {
  // Expo's fetch needs a real file object (the old React Native {uri, name, type} shape is rejected).
  form.append('file', new File(uri) as unknown as Blob, 'speech.m4a');
}
