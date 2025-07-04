"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { FaRegUser, FaEnvelope } from "react-icons/fa";

export default function ProfilePage() {
  const { user } = useUser();

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white px-4 py-10">
      <div className="max-w-md mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4 text-blue-400">
          <FaRegUser />
          <h2 className="text-xl font-semibold">User Profile</h2>
        </div>

        <div className="flex flex-col items-center mb-6">
          <img
            src={user?.imageUrl || "/default-avatar.png"}
            alt="User Avatar"
            className="w-20 h-20 rounded-full border-2 border-gray-600 mb-2"
          />
          <p className="text-gray-300 text-sm flex items-center gap-1">
            <FaEnvelope />
            {user?.emailAddresses[0]?.emailAddress || "user@example.com"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center border-t border-b border-[#2a2a2a] py-3">
            <p className="flex items-center gap-2 text-gray-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
              Account Status
            </p>
            <span className="bg-green-600 text-xs px-3 py-1 rounded-full">
              Active
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-[#2a2a2a] py-3">
            <p className="flex items-center gap-2 text-gray-300">
              <FaEnvelope className="text-sm" />
              Email Verification
            </p>
            <span className="bg-emerald-600 text-xs px-3 py-1 rounded-full">
              Verified
            </span>
          </div>
        </div>

        <div className="text-center">
          <SignOutButton>
            <button className="flex items-center justify-center gap-2 bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 transition">
              <FaRegUser className="text-sm" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
