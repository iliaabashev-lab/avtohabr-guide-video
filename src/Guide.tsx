import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { SCENES, Scene } from "./data";
import SIZES from "./sizes.json";

const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["cyrillic", "latin"] });

export const FPS = 30;
const C = {
  bg: "#0e131a", panel: "#151c26", line: "rgba(214,226,240,0.10)", text: "#e6ecf2", dim: "#8d9aab",
  accent: "#3b82f6", accentSoft: "rgba(59,130,246,0.16)", ok: "#34c38f",
};
const ease = Easing.bezier(0.33, 0, 0.2, 1);

// спокойный темп: 2,2 с на шаг + время чтения (13 знаков в секунду, медленнее обычного чтения)
const stepSec = (t: string) => 2.2 + t.length / 13;
const INTRO = 3.2, OUTRO = 2.4, FADE = 0.7;
export const sceneFrames = (s: Scene) => Math.round((INTRO + s.steps.reduce((a, x) => a + stepSec(x.t), 0) + OUTRO) * FPS);
const OPEN = 7, CLOSE = 7; // заставка и финал, секунды
export const totalFrames = () => Math.round((OPEN + CLOSE) * FPS) + SCENES.reduce((a, s) => a + sceneFrames(s), 0);

const fade = (f: number, dur: number) =>
  Math.min(interpolate(f, [0, FADE * FPS], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [dur - FADE * FPS, dur], [1, 0], { extrapolateLeft: "clamp" }));

// какой шаг сейчас активен и когда он начался
function stepTimeline(s: Scene) {
  let at = INTRO * FPS;
  return s.steps.map((st) => { const start = Math.round(at); at += stepSec(st.t) * FPS; return { ...st, start }; });
}

const Shot: React.FC<{ src: string; local: number; span: number }> = ({ src, local, span }) => {
  const [w, h] = (SIZES as Record<string, number[]>)[src];
  const BW = 980, BH = 760;
  // по ширине (не больше 1,55×); чуть выше рамки — вписать по высоте; намного выше — ехать вниз
  const kw = Math.min(BW / w, 1.55);
  const k = h * kw > BH && h * kw <= BH * 1.15 ? BH / h : kw;
  const dw = w * k, dh = h * k, vis = Math.min(dh, BH);
  // высокий снимок медленно едет сверху вниз; обычный едва заметно приближается
  const pan = dh > BH ? interpolate(local, [FPS * 1.5, span - FPS], [0, dh - BH], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }) : 0;
  const zoom = dh > BH ? 1 : interpolate(local, [0, span], [1, 1.035]);
  const o = interpolate(local, [0, FPS * 0.6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: dw, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, background: C.panel, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", opacity: o }}>
      <div style={{ height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderBottom: `1px solid ${C.line}` }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: "rgba(214,226,240,0.18)" }} />)}
        <div style={{ marginLeft: 14, fontSize: 15, color: C.dim }}>app.avtohabr.ru</div>
      </div>
      <div style={{ height: vis, overflow: "hidden" }}>
        <Img src={staticFile(`img/${src}`)} style={{ width: dw, height: dh, display: "block", transform: `translateY(${-pan}px) scale(${zoom})`, transformOrigin: "50% 30%" }} />
      </div>
    </div>
  );
};

// сцены без снимка: путь по меню и кнопки, которые загораются по очереди вместе с шагами
const PathCard: React.FC<{ s: Scene; active: number; local: number }> = ({ s, active, local }) => {
  const o = interpolate(local, [0, FPS * 0.6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: 900, padding: 48, borderRadius: 18, background: C.panel, border: `1px solid ${C.line}`, opacity: o }}>
      <div style={{ fontSize: 22, color: C.dim, marginBottom: 18 }}>Где найти</div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 46 }}>
        {s.path!.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && <span style={{ fontSize: 30, color: C.dim }}>›</span>}
            <span style={{ fontSize: 32, fontWeight: 700, color: C.text, padding: "10px 20px", borderRadius: 10, background: "rgba(214,226,240,0.06)" }}>{p}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {s.buttons!.map((b, i) => {
          const on = i === Math.min(active, s.buttons!.length - 1) && active >= 0;
          const done = i < active;
          return (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 600, padding: "16px 22px", borderRadius: 12,
              color: on ? "#fff" : done ? C.text : C.dim, background: on ? C.accent : done ? C.accentSoft : "transparent",
              border: `1px solid ${on ? C.accent : C.line}`, transition: "none" }}>
              <span style={{ width: 30, textAlign: "center", color: done && !on ? C.ok : "inherit" }}>{done && !on ? "✓" : i + 1}</span>{b}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SceneView: React.FC<{ s: Scene; index: number; dur: number }> = ({ s, index, dur }) => {
  const f = useCurrentFrame();
  const tl = stepTimeline(s);
  const active = tl.reduce((a, st, i) => (f >= st.start ? i : a), -1);
  let img = s.img, imgFrom = 0;
  for (let i = 0; i <= active; i++) if (tl[i].img) { img = tl[i].img; imgFrom = tl[i].start; }
  const titleY = interpolate(f, [0, FPS * 0.9], [18, 0], { extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ opacity: fade(f, dur) }}>
      <div style={{ position: "absolute", left: 120, top: 110, width: 700 }}>
        <div style={{ fontSize: 22, color: C.accent, fontWeight: 700, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
          {String(index + 1).padStart(2, "0")} / {SCENES.length} · {s.chapter}
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-0.035em", marginTop: 18, transform: `translateY(${titleY}px)` }}>{s.title}</div>
        <div style={{ marginTop: 54, display: "flex", flexDirection: "column", gap: 26 }}>
          {tl.map((st, i) => {
            if (f < st.start || i < active - 2) return null; // на экране текущий шаг и два предыдущих
            const a = interpolate(f, [st.start, st.start + FPS * 0.7], [0, 1], { extrapolateRight: "clamp", easing: ease });
            const cur = i === active;
            return (
              <div key={i} style={{ display: "flex", gap: 20, opacity: a * (cur ? 1 : 0.42), transform: `translateY(${(1 - a) * 14}px)` }}>
                <div style={{ flex: "0 0 44px", height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700,
                  background: cur ? C.accent : "transparent", border: `1.5px solid ${cur ? C.accent : C.dim}`, color: cur ? "#fff" : C.dim, fontVariantNumeric: "tabular-nums" }}>{i + 1}</div>
                <div style={{ fontSize: cur ? 31 : 26, lineHeight: 1.45, color: C.text, fontWeight: cur ? 600 : 500, maxWidth: 620 }}>{st.t}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 860, right: 80, top: 0, bottom: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img ? <Shot key={img} src={img} local={f - imgFrom} span={dur - imgFrom} /> : <PathCard s={s} active={active} local={f} />}
      </div>
    </AbsoluteFill>
  );
};

const Progress: React.FC<{ starts: number[] }> = ({ starts }) => {
  const f = useCurrentFrame();
  const cur = starts.reduce((a, st, i) => (f >= st ? i : a), -1);
  return (
    <div style={{ position: "absolute", left: 120, right: 120, bottom: 52, display: "flex", gap: 8 }}>
      {SCENES.map((s, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < cur ? "rgba(59,130,246,0.55)" : i === cur ? C.accent : "rgba(214,226,240,0.10)" }} />
      ))}
    </div>
  );
};

const Card: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: fade(f, dur), alignItems: "center", justifyContent: "center", textAlign: "center" }}>{children}</AbsoluteFill>;
};

export const Guide: React.FC = () => {
  let at = OPEN * FPS;
  const starts = SCENES.map((s) => { const st = at; at += sceneFrames(s); return st; });
  const end = at;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily, color: C.text }}>
      <Audio src={staticFile("music.wav")} volume={0.22} />
      <Sequence durationInFrames={OPEN * FPS}>
        <Card dur={OPEN * FPS}>
          <div style={{ fontSize: 26, color: C.accent, fontWeight: 700 }}>AVTOHABR · инструкция для владельца</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.98, marginTop: 26 }}>Как подключить<br />автосервис</div>
          <div style={{ fontSize: 30, color: C.dim, marginTop: 34, lineHeight: 1.5 }}>Всё делается в браузере, без программиста.<br />Ставьте на паузу, где нужно.</div>
        </Card>
      </Sequence>
      {SCENES.map((s, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={sceneFrames(s)}>
          <SceneView s={s} index={i} dur={sceneFrames(s)} />
        </Sequence>
      ))}
      <Sequence from={starts[0]} durationInFrames={end - starts[0]}>
        <Progress starts={starts.map((x) => x - starts[0])} />
      </Sequence>
      <Sequence from={end} durationInFrames={CLOSE * FPS}>
        <Card dur={CLOSE * FPS}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.04em" }}>Готово</div>
          <div style={{ fontSize: 32, color: C.dim, marginTop: 30, lineHeight: 1.5 }}>Что не нужно сейчас, включите позже<br />в разделе «Настройка сервиса».</div>
          <div style={{ fontSize: 30, color: C.accent, marginTop: 40, fontWeight: 700 }}>app.avtohabr.ru/business</div>
        </Card>
      </Sequence>
    </AbsoluteFill>
  );
};
