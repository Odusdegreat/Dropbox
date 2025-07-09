// app/theme-provider.tsx
"use client";

import { useEffect, useState } from "react";
// import "./theme-provider/";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark"); // or detect user preference

  useEffect(() => {
    // Example: auto-detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);
  return (
    <div data-theme={theme} className={`theme-${theme}`}>
      {children}
    </div>
  );
}
