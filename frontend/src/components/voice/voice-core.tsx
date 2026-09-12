"use client";

import { motion } from "motion/react";

type VoiceCoreProps = {
  active?: boolean;
};

const waves = Array.from({ length: 9 });

export default function VoiceCore({ active = false }: VoiceCoreProps) {
  return (
    <div className={`voice-core ${active ? "voice-core-active" : ""}`}>
      <div className="voice-core-halo" />

      <div className="voice-core-orbits">
        {waves.map((_, index) => (
          <motion.div
            key={index}
            className="voice-core-wave"
            style={{
              "--wave-index": index,
            } as React.CSSProperties}
            animate={{
              rotate: index % 2 === 0 ? [0, 360] : [360, 0],
              scaleX: active
                ? [1, 1.08 + index * 0.008, 0.96, 1]
                : [1, 1.025, 0.985, 1],
              scaleY: active
                ? [1, 0.94, 1.05, 1]
                : [1, 0.98, 1.02, 1],
            }}
            transition={{
              rotate: {
                duration: 18 + index * 2,
                repeat: Infinity,
                ease: "linear",
              },
              scaleX: {
                duration: 2.8 + index * 0.18,
                repeat: Infinity,
                ease: "easeInOut",
              },
              scaleY: {
                duration: 3.1 + index * 0.16,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
        ))}
      </div>

      <motion.div
        className="voice-core-center"
        animate={{
          scale: active ? [1, 1.06, 0.98, 1] : [1, 1.025, 1],
        }}
        transition={{
          duration: active ? 1.8 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="voice-core-center-mark">
          <span />
          <span />
          <span />
        </span>
      </motion.div>

      <motion.div
        className="voice-core-status"
        animate={{ opacity: active ? [0.55, 1, 0.55] : [0.45, 0.7, 0.45] }}
        transition={{
          duration: active ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {active ? "Listening" : "Voice ready"}
      </motion.div>
    </div>
  );
}