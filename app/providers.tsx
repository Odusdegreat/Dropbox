"use client";
import type { ThemeProviderProps } from "next-themes";
import { ThemeProviderProps as NextThemesProvider } from "next-themes";
export interface ProviderProps {
  children: React.ReactNode;
  themeProp?: ThemeProviderProps;
}

export function Providers({ children, ThemeProps }: ProviderProps) {
  return <h1>{children}</h1>;
}
