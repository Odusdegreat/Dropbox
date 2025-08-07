// components/LogoutButton.tsx
"use client";

import { useClerk } from "@clerk/nextjs";

export default function SignoutButton() {
  const { signOut, loaded } = useClerk();

  if (!loaded) return null;

  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
    >
      Logout
    </button>
  );
}

