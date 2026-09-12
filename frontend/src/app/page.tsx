"use client";

import { useState } from "react";
import LandingScreen from "@/components/landing/landing-screen";

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);

  const handleStart = () => {
    console.log("Clai voice session starting...");
  };

  return (
    <div className={`clai-app ${darkMode ? "theme-dark" : "theme-light"}`}>
      <LandingScreen
        onStart={handleStart}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((value) => !value)}
      />
    </div>
  );
}