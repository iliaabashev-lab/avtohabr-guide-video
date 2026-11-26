import React from "react";
import { Composition } from "remotion";
import { Guide, FPS, totalFrames } from "./Guide";

export const RemotionRoot: React.FC = () => (
  <Composition id="OwnerGuide" component={Guide} durationInFrames={totalFrames()} fps={FPS} width={1920} height={1080} />
);
