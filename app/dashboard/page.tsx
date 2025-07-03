"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  FaFolderPlus,
  FaFileImage,
  FaStar,
  FaTrashAlt,
  FaRegUser,
} from "react-icons/fa";
import { MdCloudUpload, MdRefresh } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { GrNotes } from "react-icons/gr";

export default function DashboardPage() {
  const { user } = useUser();

  type FileItem = {
    id: string;
    name: string;
    createdAt: string;
  };

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch("/api/files");
        const data = await res.json();
        setFiles(data.files || []);
      } catch (error) {
        console.error("Failed to fetch files", error);
      }
    };

    fetchFiles();
  }, []);

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#111827] border-b border-[#2a2a2a]">
        <h1 className="text-2xl font-bold text-white">📦 Droply</h1>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm text-white hover:text-blue-400 transition">
            <GrNotes /> My Files
          </button>
          <button className="flex items-center gap-2 text-sm text-white hover:text-blue-400 transition">
            <FaRegUser /> Profile
          </button>
          <span className="text-sm text-gray-400 hidden sm:inline">
            {user?.emailAddresses[0]?.emailAddress || ""}
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Upload and File Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Upload</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md">
                <FaFolderPlus /> New Folder
              </button>
              <button className="w-full flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md">
                <FaFileImage /> Add Image
              </button>
              <div className="mt-6 border border-dashed border-gray-600 rounded-md p-5 text-center">
                <MdCloudUpload className="text-3xl mx-auto mb-2" />
                <p>
                  Drag and drop your image here, or{" "}
                  <span className="text-blue-400 cursor-pointer underline">
                    browse
                  </span>
                </p>
                <p className="text-sm mt-1 text-gray-400">Images up to 5MB</p>
              </div>
              <div className="text-xs mt-4 text-gray-500">
                <p>Tips:</p>
                <ul className="list-disc ml-4 mt-1">
                  <li>Images are private and only visible to you</li>
                  <li>Supported formats: JPG, PNG, GIF, WebP</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-semibold mb-1">Your Files</h2>
                <div className="flex gap-3 text-sm">
                  <button className="text-blue-400 border-b-2 border-blue-400 pb-0.5">
                    All Files
                  </button>
                  <button className="flex items-center gap-1 text-yellow-400">
                    <FaStar /> Starred{" "}
                    <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                      0
                    </span>
                  </button>
                  <button className="flex items-center gap-1 text-red-400">
                    <FaTrashAlt /> Trash{" "}
                    <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded">
                      1
                    </span>
                  </button>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition">
                <MdRefresh /> Refresh
              </button>
            </div>

            <div className="mb-4">
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 transition">
                <IoMdHome /> Home
              </button>
            </div>

            {/* Files List */}
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-600 py-16 rounded-lg text-gray-400">
                <MdCloudUpload className="text-4xl mb-2 text-blue-400" />
                <p>No files available</p>
                <p className="text-sm mt-1">
                  Upload your first file to get started with your personal cloud
                  storage
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a]"
                  >
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{file.createdAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
