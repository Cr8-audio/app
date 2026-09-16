export const formatDuration = (duration: string | number | null): string => {
  // Handle empty or null duration
  if (!duration || duration === 'EMPTY') {
    return '-';
  }

  // If duration is already in MM:SS format, return it
  if (typeof duration === 'string' && duration.includes(':')) {
    return duration;
  }

  // If duration is a string without ":", try to parse it as seconds
  if (typeof duration === 'string') {
    duration = parseInt(duration);
  }

  // Handle invalid duration
  if (isNaN(duration)) {
    return '-';
  }

  const minutes = Math.floor(duration / 60);
  const remainingSeconds = Math.floor(duration % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
