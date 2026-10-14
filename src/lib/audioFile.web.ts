/** Adds a recording (a blob: URL in the browser) to an upload form. */
export async function appendRecording(form: FormData, uri: string) {
  const blob = await (await fetch(uri)).blob();
  // Chrome records webm, Safari records mp4. OpenAI uses the file extension to tell.
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('file', blob, `speech.${ext}`);
}
