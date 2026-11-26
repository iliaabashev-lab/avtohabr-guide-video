# Спокойная фоновая музыка без сэмплов и чужих треков: мягкие аккорды синусами, 7 с на аккорд.
import sys, wave, numpy as np
sec = float(sys.argv[2]) if len(sys.argv) > 2 else 600
sr = 44100
n = int(sec * sr)
t = np.arange(n) / sr
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am9 – Fmaj7 – Cmaj7 – G6 (MIDI)
chords = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 69], [48, 55, 59, 64, 67], [43, 55, 59, 62, 64]]
L = 7.0
out = np.zeros(n)
for k in range(int(sec / L) + 2):
    a, b = int(max(0, (k * L - 1.5) * sr)), int(min(n, (k * L + L + 1.5) * sr))
    if a >= n: break
    seg = t[a:b] - k * L
    env = np.clip((seg + 1.5) / 2.5, 0, 1) * np.clip((L + 1.5 - seg) / 2.5, 0, 1)
    for i, m in enumerate(chords[k % 4]):
        f = hz(m)
        w = np.sin(2 * np.pi * f * t[a:b] + i) + 0.18 * np.sin(4 * np.pi * f * t[a:b]) 
        out[a:b] += env * w * (0.9 if i == 0 else 0.5) / (1 + i * 0.25)
# медленное «дыхание» громкости, плавные вход и выход
out *= 0.85 + 0.15 * np.sin(2 * np.pi * t / 23)
out *= np.clip(t / 4, 0, 1) * np.clip((sec - t) / 5, 0, 1)
out = out / np.max(np.abs(out)) * 0.6
st = np.stack([out, np.roll(out, int(0.012 * sr))], 1)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
