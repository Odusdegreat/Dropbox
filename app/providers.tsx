"use client";

import { ThemeProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { ImageKitProvider } from "imagekitio-next";
import { HeroUIProvider } from "@heroui/react";

export interface ProviderProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

const authenticator = async () => {
  try {
    const response = await fetch("/app/api/imagekit-auth");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
};

export function Providers({ children, themeProps }: ProviderProps) {
  return (
    <ThemeProvider {...themeProps}>
      <ImageKitProvider
        authenticator={authenticator}
        publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || ""}
        urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""}
      >
        <HeroUIProvider>{children}</HeroUIProvider>
      </ImageKitProvider>
    </ThemeProvider>
  );
}
