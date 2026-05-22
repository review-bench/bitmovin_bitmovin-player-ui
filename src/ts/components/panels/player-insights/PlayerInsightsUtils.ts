import { PlayerAPI } from 'bitmovin-player';

interface QualityInsight {
  id?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
}

export function formatVideoInsight(player: PlayerAPI): string {
  const playbackVideo = safe(() => player.getPlaybackVideoData() as QualityInsight);
  const downloadedVideo = safe(() => player.getDownloadedVideoData() as QualityInsight);

  if (!playbackVideo) {
    return '-';
  }

  const resolution =
    playbackVideo.width && playbackVideo.height
      ? `${playbackVideo.width}x${playbackVideo.height}${playbackVideo.frameRate ? ` @ ${playbackVideo.frameRate} fps` : ''}`
      : '-';
  const codec = playbackVideo.codec || '?';
  const downloaded =
    downloadedVideo && !sameQuality(playbackVideo, downloadedVideo)
      ? `, downloaded ${formatBitrate(downloadedVideo.bitrate)}`
      : '';

  return `${resolution}, ${formatBitrate(playbackVideo.bitrate)}, ${codec}${downloaded}`;
}

export function formatAudioInsight(player: PlayerAPI): string {
  const playbackAudio = safe(() => player.getPlaybackAudioData() as QualityInsight);
  const downloadedAudio = safe(() => player.getDownloadedAudioData() as QualityInsight);

  if (!playbackAudio) {
    return '-';
  }

  const downloaded =
    downloadedAudio && !sameQuality(playbackAudio, downloadedAudio)
      ? `, downloaded ${formatBitrate(downloadedAudio.bitrate)}`
      : '';

  return `${formatBitrate(playbackAudio.bitrate)}, ${playbackAudio.codec || '?'}${downloaded}`;
}

export function formatBufferInsight(player: PlayerAPI): string {
  const videoBuffer = safe(() => player.getVideoBufferLength());
  const audioBuffer = safe(() => player.getAudioBufferLength());
  const parts = [];

  if (typeof videoBuffer === 'number') {
    parts.push(`v ${videoBuffer.toFixed(2)}s`);
  }
  if (typeof audioBuffer === 'number') {
    parts.push(`a ${audioBuffer.toFixed(2)}s`);
  }

  return parts.length > 0 ? parts.join(' / ') : '-';
}

export function formatDroppedFramesInsight(player: PlayerAPI): string {
  const droppedFrames = safe(() => player.getDroppedVideoFrames());
  return typeof droppedFrames === 'number' ? droppedFrames.toString() : '-';
}

export function formatTimeInsight(player: PlayerAPI): string {
  const currentTime = safe(() => player.getCurrentTime()) ?? 0;
  const duration = safe(() => player.getDuration());
  const speed = safe(() => player.getPlaybackSpeed()) ?? 1;
  const speedText = speed !== 1 ? ` @ ${speed.toFixed(2)}x` : '';

  if (safe(() => player.isLive()) === true) {
    const timeShift = safe(() => player.getTimeShift());
    const latencyText = typeof timeShift === 'number' ? `, ${(-timeShift).toFixed(2)}s behind live` : '';
    return `${formatSeconds(currentTime)}${latencyText}${speedText}`;
  }

  return typeof duration === 'number' && isFinite(duration)
    ? `${formatSeconds(currentTime)} / ${formatSeconds(duration)}${speedText}`
    : `${formatSeconds(currentTime)}${speedText}`;
}

export function formatStreamInsight(player: PlayerAPI): string {
  const streamType = safe(() => player.getStreamType());
  const playerType = safe(() => player.getPlayerType());

  if (!streamType && !playerType) {
    return '-';
  }

  return [streamType, playerType ? `(${playerType})` : null].filter(Boolean).join(' ');
}

function sameQuality(a: QualityInsight, b: QualityInsight): boolean {
  if (a.id && b.id) {
    return a.id === b.id;
  }

  return a.bitrate === b.bitrate;
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function formatBitrate(bitrate: number | undefined): string {
  if (!bitrate || !isFinite(bitrate)) {
    return '? kbps';
  }

  if (bitrate >= 1_000_000) {
    return `${(bitrate / 1_000_000).toFixed(2)} Mbps`;
  }

  return `${Math.round(bitrate / 1000)} kbps`;
}

export function formatSeconds(seconds: number): string {
  if (!isFinite(seconds)) {
    return 'Infinity';
  }

  const sign = seconds < 0 ? '-' : '';
  const total = Math.floor(Math.abs(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  const pad = (value: number) => (value < 10 ? `0${value}` : value.toString());

  return hours > 0
    ? `${sign}${hours}:${pad(minutes)}:${pad(remainingSeconds)}`
    : `${sign}${minutes}:${pad(remainingSeconds)}`;
}
