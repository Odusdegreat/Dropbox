"use client";

import React, { useEffect, useState } from "react";
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "../../lib/firebase";
import { LiaFileSolid } from "react-icons/lia";
import { LuTrash } from "react-icons/lu";
import { CiStar } from "react-icons/ci";
import filesize from "filesize"; // ✅ replacement for prettysize

interface FileData {
  name: string;
  fullPath: string;
  url: string;
  size: number;
  updated: string;
  contentType: string;
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath] = useState("uploads/");
  const [starred, setStarred] = useState<string[]>([]);
  const [trashed, setTrashed] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "trash">(
    "all"
  );

  useEffect(() => {
    listFolder(currentPath);
  }, [currentPath]);

  // List files from Firebase
  const listFolder = async (path: string) => {
    setLoading(true);
    try {
      const listRef = ref(storage, path);
      const res = await listAll(listRef);

      const fileData = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);

          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            size: metadata.size || 0,
            updated: metadata.updated || "",
            contentType: metadata.contentType || "",
          };
        })
      );

      setFiles(fileData);
    } catch (error) {
      console.error("Error listing files:", error);
    }
    setLoading(false);
  };

  // Toggle Star
  const toggleStar = (path: string) => {
    setStarred((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Move to Trash
  const moveToTrash = (path: string) => {
    setTrashed((prev) => [...prev, path]);
  };

  // Handle Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `${currentPath}${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      () => {},
      (error) => console.error("Upload error:", error),
      () => listFolder(currentPath)
    );
  };

  return (
    <div className="flex-1 p-6 bg-[#0a0a0a] text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-semibold">Your Files</h1>

        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => listFolder(currentPath)}
            className="bg-[#1f1f1f] px-4 py-2 rounded-md border border-gray-800 hover:border-gray-600 transition"
          >
            Refresh
          </button>

          <label className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600 transition">
            Upload File
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-6 text-sm mt-3 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 pb-0.5 cursor-pointer ${
            activeTab === "all"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-white"
          }`}
        >
          <LiaFileSolid /> All Files
        </button>

        <button
          onClick={() => setActiveTab("starred")}
          className={`flex items-center gap-2 pb-0.5 cursor-pointer ${
            activeTab === "starred"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-white"
          }`}
        >
          <CiStar className="text-lg" /> Starred
          <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
            {starred.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("trash")}
          className={`flex items-center gap-2 pb-0.5 cursor-pointer ${
            activeTab === "trash"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-white"
          }`}
        >
          <LuTrash /> Trash
          <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded">
            {trashed.length}
          </span>
        </button>
      </div>

      {/* Files */}
      {loading ? (
        <p className="mt-6 text-gray-400">Loading files...</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files
            .filter((f) => {
              if (activeTab === "all") return !trashed.includes(f.fullPath);
              if (activeTab === "starred")
                return (
                  starred.includes(f.fullPath) && !trashed.includes(f.fullPath)
                );
              if (activeTab === "trash") return trashed.includes(f.fullPath);
              return true;
            })
            .map((f) => {
              const isImage = (f.contentType || "").startsWith("image/");
              return (
                <li
                  key={f.fullPath}
                  className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a]"
                  title={f.name}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate">
                      {isImage ? "🖼" : "📄"} {f.name}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Star Button */}
                      <button
                        onClick={() => toggleStar(f.fullPath)}
                        className={`p-1 rounded ${
                          starred.includes(f.fullPath)
                            ? "text-yellow-400"
                            : "text-gray-400"
                        }`}
                        aria-label={
                          starred.includes(f.fullPath)
                            ? "Unstar file"
                            : "Star file"
                        }
                        title={
                          starred.includes(f.fullPath)
                            ? "Unstar file"
                            : "Star file"
                        }
                      >
                        <CiStar />
                      </button>

                      {/* Trash Button */}
                      <button
                        onClick={() => moveToTrash(f.fullPath)}
                        className="p-1 rounded text-red-400 hover:text-red-600"
                        title="Move to Trash"
                        aria-label="Move to Trash"
                      >
                        <LuTrash />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400">
                    {filesize(f.size)}{" "}
                    {f.updated && (
                      <span className="ml-2">
                        • {new Date(f.updated).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {isImage && f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3"
                    >
                      <img
                        src={f.url}
                        alt={f.name}
                        className="w-full h-32 object-cover rounded"
                      />
                    </a>
                  )}

                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm underline mt-2 inline-block"
                    >
                      View File
                    </a>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
