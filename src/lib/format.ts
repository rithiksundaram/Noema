export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const formatTime = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
