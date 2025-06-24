"use client";
import type { ThemeProviderProps } from "next-themes";
import { ThemeProviderProps as NextThemesProvider } from "next-themes";
import { ImageKitProvider } from "imagekitio-next";

export interface ProviderProps {
  children: React.ReactNode;
  themeProp?: ThemeProviderProps;
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
    <ImageKitProvider
      authenticator={authenticator}
      publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || ""}
      urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""}
    >
      {children}
    </ImageKitProvider>
  );
}
