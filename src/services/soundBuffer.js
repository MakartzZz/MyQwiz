export const SOUND_EFFECT_PATHS = Object.freeze([
  "/sounds/button-hover.mp3",
  "/sounds/button-press.mp3",
  "/sounds/confirm.mp3",
  "/sounds/modal-open.mp3",
  "/sounds/music-change.mp3",
  "/sounds/notification.mp3",
  "/sounds/theme-change.mp3",
  "/sounds/typing.wav",
  "/sounds/cat-eat.mp3",
  "/sounds/cat-happy.mp3",
  "/sounds/cat-reward.mp3",
  "/sounds/cat-purr.mp3",
  "/sounds/game-modes/checkpoint.mp3",
  "/sounds/game-modes/classic.mp3",
  "/sounds/game-modes/lives.mp3",
  "/sounds/game-modes/race.mp3",
  "/sounds/gameplay/bad-answer.mp3",
  "/sounds/gameplay/clock.mp3",
  "/sounds/gameplay/correct-answer.mp3",
  "/sounds/gameplay/lose-life.mp3",
  "/sounds/gameplay/next-question.mp3",
  "/sounds/results/combo.mp3",
  "/sounds/results/combo-lose.mp3",
  "/sounds/results/drumroll.mp3",
  "/sounds/results/reveal.mp3",
]);

let audioContext;
const buffers = new Map();
const loadingBuffers = new Map();

const getAudioContext = () => {
  if (audioContext) return audioContext;
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    audioContext = new AudioContextClass();
  } catch {
    return null;
  }

  return audioContext;
};

const loadSoundBuffer = (path) => {
  if (buffers.has(path)) return Promise.resolve(buffers.get(path));
  if (loadingBuffers.has(path)) return loadingBuffers.get(path);

  const context = getAudioContext();
  if (!context) return Promise.resolve(null);

  const loading = fetch(path)
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudo precargar ${path}`);
      return response.arrayBuffer();
    })
    .then((audioData) => context.decodeAudioData(audioData))
    .then((buffer) => {
      buffers.set(path, buffer);
      return buffer;
    })
    .catch(() => null)
    .finally(() => loadingBuffers.delete(path));

  loadingBuffers.set(path, loading);
  return loading;
};

export const prepareSoundBuffers = () => Promise.all(SOUND_EFFECT_PATHS.map(loadSoundBuffer));

export const unlockSoundBuffers = () => {
  const context = getAudioContext();
  if (!context) return Promise.resolve(false);
  const resume = context.state === "suspended" ? context.resume().catch(() => undefined) : Promise.resolve();
  return Promise.all([resume, prepareSoundBuffers()]).then(() => context.state === "running");
};

const startBufferedSound = (handle, context, buffer, options) => {
  if (handle.stopped || !buffer || context.state !== "running") return false;

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = Boolean(options.loop);
  source.playbackRate.value = options.playbackRate ?? 1;
  gain.gain.value = Math.min(1, Math.max(0, options.volume ?? 1));
  source.connect(gain).connect(context.destination);
  source.onended = () => {
    handle.source = null;
    if (!handle.stopped) options.onEnded?.();
  };
  handle.source = source;
  source.start();
  return true;
};

export const playBufferedSound = (path, options = {}) => {
  const handle = {
    source: null,
    stopped: false,
    stop() {
      this.stopped = true;
      if (!this.source) return;
      try {
        this.source.stop();
      } catch {
        // The source may already have ended.
      }
      this.source = null;
    },
  };

  const context = getAudioContext();
  if (!context) {
    options.onError?.();
    return handle;
  }

  const readyBuffer = buffers.get(path);
  if (readyBuffer && context.state === "running") {
    startBufferedSound(handle, context, readyBuffer, options);
    return handle;
  }

  const resume = context.state === "suspended" ? context.resume().catch(() => undefined) : Promise.resolve();
  Promise.all([resume, loadSoundBuffer(path)])
    .then(([, buffer]) => {
      if (!startBufferedSound(handle, context, buffer, options) && !handle.stopped) options.onError?.();
    })
    .catch(() => options.onError?.());

  return handle;
};

export const stopBufferedSound = (handle) => handle?.stop?.();
