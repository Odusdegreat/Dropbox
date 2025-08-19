"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaFolderPlus, FaFileImage, FaRegUser } from "react-icons/fa";
import { MdCloudUpload, MdRefresh, MdUploadFile } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { GrNotes } from "react-icons/gr";
import { IoCloudUploadOutline } from "react-icons/io5";
import { LiaFileSolid } from "react-icons/lia";
import { CiStar } from "react-icons/ci";
import { LuTrash } from "react-icons/lu";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();

  type FileItem = {
    id: string;
    name: string;
    createdAt: string;
    url?: string;
  };

  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch saved files from API (if you’re storing metadata in DB)
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

  // Upload logic
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(percent));
      },
      (error) => {
        console.error(error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          console.log("✅ File available at:", url);

          // Add uploaded file to state
          setFiles((prev) => [
            ...prev,
            {
              id: file.name,
              name: file.name,
              createdAt: new Date().toLocaleString(),
              url,
            },
          ]);
          setUploading(false);
          setProgress(0);
        });
      }
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#0f0f0f] border-b border-[#2a2a2a]">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <IoCloudUploadOutline className="text-blue-400" />
          Dropbox
        </h1>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm text-white hover:text-blue-400 transition cursor-pointer">
            <GrNotes /> My Files
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 text-sm text-white hover:text-blue-400 transition cursor-pointer"
          >
            <FaRegUser /> Profile
          </button>
          <span className="text-sm text-gray-400 hidden sm:inline">
            {user?.emailAddresses[0]?.emailAddress || ""}
          </span>
        </div>
      </nav>

      {/* Dashboard Layout */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <MdUploadFile /> Upload
            </h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md cursor-pointer">
                  <FaFolderPlus /> New Folder
                </button>
                <button className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md cursor-pointer">
                  <FaFileImage /> Add Image
                </button>
              </div>

              {/* Upload Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="mt-6 border border-dashed border-gray-600 rounded-md p-8 h-[250px] flex flex-col justify-center items-center text-center cursor-pointer"
              >
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  onChange={handleBrowse}
                />
                <label
                  htmlFor="fileInput"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <MdCloudUpload className="text-4xl text-blue-400 mb-3" />
                  {uploading ? (
                    <p>Uploading... {progress}%</p>
                  ) : (
                    <>
                      <p>
                        Drag & drop your image here, or{" "}
                        <span className="text-blue-400 underline">browse</span>
                      </p>
                      <p className="text-sm mt-1 text-gray-400">
                        Images up to 5MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Upload Tips */}
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
                <div className="flex flex-wrap gap-6 text-sm mt-3">
                  <button className="flex items-center gap-2 text-blue-400 border-b-2 border-blue-400 pb-0.5 cursor-pointer mr-25">
                    <LiaFileSolid /> All Files
                  </button>
                  <button className="flex items-center gap-2 text-white cursor-pointer mr-25">
                    <CiStar className="text-lg" /> Starred
                    <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                      0
                    </span>
                  </button>
                  <button className="flex items-center gap-2 text-white cursor-pointer mr-25">
                    <LuTrash /> Trash
                    <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded">
                      1
                    </span>
                  </button>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition cursor-pointer">
                <MdRefresh /> Refresh
              </button>
            </div>

            <div className="mb-4">
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 transition cursor-pointer">
                <IoMdHome /> Home
              </button>
            </div>

            {/* Files List */}
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-600 py-20 rounded-lg text-gray-400">
                <MdCloudUpload className="text-5xl mb-2 text-blue-400" />
                <p>No files available</p>
                <p className="text-sm mt-1">
                  Upload your first file to get started with your personal cloud
                  storage.
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
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm underline mt-2 inline-block"
                      >
                        View File
                      </a>
                    )}
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
