"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();
  type FileItem = {
    id: string;
    name: string;
    createdAt: string;
    // Add other fields as needed
  };

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    // Fetch user files from your backend
    const fetchFiles = async () => {
      try {
        const res = await fetch("/api/files"); // Update with your actual API route
        const data = await res.json();
        setFiles(data.files || []);
      } catch (error) {
        console.error("Failed to fetch files", error);
      }
    };

    fetchFiles();
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        Welcome {user?.firstName || "User"} 👋
      </h1>

      <section className="bg-white border rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-semibold mb-3">Your Files</h2>

        {files.length === 0 ? (
          <p className="text-gray-500">You have no files yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <li
                key={file.id}
                className="border p-4 rounded-lg hover:shadow-md transition"
              >
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">{file.createdAt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
