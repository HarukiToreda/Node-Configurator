const NOTE_OFFSETS: Record<string, number> = {
  c: 0,
  "c#": 1,
  d: 2,
  "d#": 3,
  e: 4,
  f: 5,
  "f#": 6,
  g: 7,
  "g#": 8,
  a: 9,
  "a#": 10,
  b: 11,
};

export interface ParsedRtttlNote {
  frequency: number | null;
  durationMs: number;
}

export interface RtttlPlaybackController {
  stop: () => void;
  done: Promise<void>;
}

export function parseRtttl(rtttl: string): ParsedRtttlNote[] {
  const parts = rtttl.split(":");
  if (parts.length !== 3) {
    throw new Error("RTTTL must use name:defaults:notes format.");
  }

  const [, defaultsSection, notesSection] = parts;
  const defaults = parseDefaults(defaultsSection);
  const noteTokens = notesSection
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (noteTokens.length === 0) {
    throw new Error("RTTTL must contain at least one note.");
  }

  return noteTokens.map((token) => parseNoteToken(token, defaults));
}

export async function playRtttl(
  rtttl: string,
): Promise<RtttlPlaybackController> {
  const notes = parseRtttl(rtttl);
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error("This browser does not support audio preview.");
  }

  const audioContext = new AudioContextCtor();
  await audioContext.resume();

  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(audioContext.destination);

  const oscillators: OscillatorNode[] = [];
  let currentTime = audioContext.currentTime + 0.02;

  for (const note of notes) {
    const noteDurationSeconds = note.durationMs / 1000;

    if (note.frequency !== null) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(note.frequency, currentTime);

      gain.gain.setValueAtTime(0.0001, currentTime);
      gain.gain.linearRampToValueAtTime(1, currentTime + 0.01);
      gain.gain.setValueAtTime(1, currentTime + noteDurationSeconds * 0.82);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        currentTime + noteDurationSeconds,
      );

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(currentTime);
      oscillator.stop(currentTime + noteDurationSeconds);
      oscillators.push(oscillator);
    }

    currentTime += noteDurationSeconds;
  }

  let stopped = false;
  let stopTimeout: ReturnType<typeof setTimeout> | undefined;
  let resolveDone: (() => void) | undefined;

  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
    const totalDurationMs = Math.max(
      50,
      Math.ceil((currentTime - audioContext.currentTime) * 1000) + 50,
    );
    stopTimeout = setTimeout(() => {
      void stopPlayback();
    }, totalDurationMs);
  });

  const stopPlayback = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    stopped = true;
    if (stopTimeout) {
      clearTimeout(stopTimeout);
    }

    for (const oscillator of oscillators) {
      try {
        oscillator.stop();
      } catch {
        // Oscillator may already be stopped by the schedule.
      }
    }

    await audioContext.close();
    resolveDone?.();
  };

  return {
    stop: () => {
      void stopPlayback();
    },
    done,
  };
}

function parseDefaults(defaultsSection: string): {
  duration: number;
  octave: number;
  bpm: number;
} {
  let duration = 4;
  let octave = 6;
  let bpm = 63;

  for (const assignment of defaultsSection.split(",")) {
    const [rawKey, rawValue] = assignment.split("=");
    const key = rawKey?.trim().toLowerCase();
    const value = Number.parseInt(rawValue?.trim() ?? "", 10);

    if (!key || Number.isNaN(value)) {
      continue;
    }

    if (key === "d") {
      duration = value;
    } else if (key === "o") {
      octave = value;
    } else if (key === "b") {
      bpm = value;
    }
  }

  if (duration <= 0 || octave < 0 || bpm <= 0) {
    throw new Error("RTTTL defaults must use positive values.");
  }

  return { duration, octave, bpm };
}

function parseNoteToken(
  token: string,
  defaults: { duration: number; octave: number; bpm: number },
): ParsedRtttlNote {
  let cursor = 0;
  let durationDigits = "";

  while (cursor < token.length && /\d/.test(token[cursor] ?? "")) {
    durationDigits += token[cursor];
    cursor += 1;
  }

  const duration = durationDigits
    ? Number.parseInt(durationDigits, 10)
    : defaults.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid RTTTL duration in note "${token}".`);
  }

  const noteLetter = token[cursor];
  if (!noteLetter || !/[a-gp]/.test(noteLetter)) {
    throw new Error(`Invalid RTTTL note "${token}".`);
  }
  cursor += 1;

  let noteName = noteLetter;
  if (token[cursor] === "#") {
    noteName += "#";
    cursor += 1;
  }

  let octaveDigits = "";
  while (cursor < token.length && /\d/.test(token[cursor] ?? "")) {
    octaveDigits += token[cursor];
    cursor += 1;
  }

  const dotted = token.slice(cursor).includes(".");
  const octave = octaveDigits
    ? Number.parseInt(octaveDigits, 10)
    : defaults.octave;

  const wholeNoteMs = ((60 * 1000) / defaults.bpm) * 4;
  const durationMs = wholeNoteMs / duration * (dotted ? 1.5 : 1);

  if (noteName === "p") {
    return { frequency: null, durationMs };
  }

  const semitone = NOTE_OFFSETS[noteName];
  if (semitone === undefined) {
    throw new Error(`Unsupported RTTTL note "${token}".`);
  }

  const midiNumber = (octave + 1) * 12 + semitone;
  const frequency = 440 * 2 ** ((midiNumber - 69) / 12);

  return { frequency, durationMs };
}
