"use client";

import { Moon, Sun, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import ClaiLogo from "@/components/brand/clai-logo";
import VoiceCore from "@/components/voice/voice-core";

type LandingScreenProps = {
  onStart: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
};

export default function LandingScreen({
  onStart,
  darkMode,
  onToggleTheme,
}: LandingScreenProps) {
  return (
    <main className="clai-screen landing-screen">
      <header className="landing-navigation">
        <ClaiLogo />

        <nav className="landing-links">
          <button type="button">How it works</button>
          <button type="button">About</button>

          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <motion.div
          className="landing-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="landing-kicker">
            <span className="landing-kicker-dot" />
            VOICE-FIRST AGREEMENT INTELLIGENCE
          </div>

          <h1 className="landing-heading">
            Talk to your
            <br />
            <em>agreements.</em>
          </h1>

          <p className="landing-subheading">
            Understand what matters,
            <br />
            simply by talking.
          </p>

          <motion.button
            type="button"
            className="talk-button"
            onClick={onStart}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="talk-button-icon">
              <span />
              <span />
              <span />
            </span>

            <span>Talk to Clai</span>

            <ArrowUpRight size={18} />
          </motion.button>
        </motion.div>

        <motion.div
          className="landing-voice"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 1,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="voice-decoration voice-decoration-one" />
          <div className="voice-decoration voice-decoration-two" />

          <VoiceCore />

          <div className="voice-caption">
            <span>Speak naturally.</span>
            <span>Clai listens.</span>
          </div>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <span>UNDERSTAND · QUESTION · CONVERSE</span>

        <span className="landing-footer-center">
          <i />
          REAL-TIME VOICE
        </span>

        <span>CLAI</span>
      </footer>
    </main>
  );
}