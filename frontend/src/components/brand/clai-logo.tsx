"use client";

import { motion } from "motion/react";

type ClaiLogoProps = {
  onClick?: () => void;
};

export default function ClaiLogo({ onClick }: ClaiLogoProps) {
  return (
    <motion.button
      type="button"
      className="clai-logo"
      onClick={onClick}
      whileHover={{ opacity: 0.68 }}
      whileTap={{ scale: 0.97 }}
      aria-label="Go to Clai home"
    >
      <span className="clai-logo-mark" aria-hidden="true">
        <span className="clai-logo-orbit" />
        <span className="clai-logo-core" />
      </span>

      <span className="clai-logo-word">Clai</span>
    </motion.button>
  );
}