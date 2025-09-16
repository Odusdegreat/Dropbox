"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { FaFolderPlus, FaFileImage, FaRegUser } from "react-icons/fa";
import { MdCloudUpload, MdRefresh, MdUploadFile } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { AiOutlineStar, AiOutlineDelete } from "react-icons/ai";

import {
  getStorage,
  ref,
  listAll,
  getDownloadURL,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { app } from "@/lib/firebase";

interface FileItem {
  name: string;
  url: string;
  starred: boolean;
  trashed: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("files");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storage = getStorage(app);

  // Load files/folders
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchFilesAndFolders();
  }, [isLoaded, isSignedIn, currentPath]);

  async function fetchFilesAndFolders() {
    if (!user) return;
    setLoading(true);
    try {
      const pathRef = ref(storage, `${user.id}/${currentPath}`);
      const listResult = await listAll(pathRef);

      // Folders
      setFolders(listResult.prefixes.map((p) => p.name));

      // Files
      const filePromises = listResult.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          url,
          starred: false,
          trashed: false,
        };
      });
      const fileList = await Promise.all(filePromises);
      setFiles(fileList);
    } catch (error) {
      console.error("Error fetching files/folders:", error);
    } finally {
      setLoading(false);
    }
  }

  // Upload handler
  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !event.target.files) return;
    const filesToUpload = Array.from(event.target.files);

    for (const file of filesToUpload) {
      const fileRef = ref(storage, `${user.id}/${currentPath}/${file.name}`);
      await uploadBytes(fileRef, file);
    }
    fetchFilesAndFolders();
  }

  // Delete handler
  async function handleDelete(fileName: string) {
    if (!user) return;
    const fileRef = ref(storage, `${user.id}/${currentPath}/${fileName}`);
    await deleteObject(fileRef);
    fetchFilesAndFolders();
  }

  // Visible folders (search included)
  const visibleFolders = useMemo(() => {
    let list = folders;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((name) => name.toLowerCase().includes(q));
    }
    return list;
  }, [folders, searchTerm]);

  // Visible files (search + filter)
  const visibleFiles = useMemo(() => {
    let list = files;
    if (activeTab === "starred") list = list.filter((f) => f.starred);
    if (activeTab === "trash") list = list.filter((f) => f.trashed);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [files, activeTab, searchTerm]);

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-64 p-6 border-r border-[#2a2a2a]">
        <h1 className="text-2xl font-bold mb-8">Droply</h1>
        <nav className="space-y-2">
          <button
            className={`flex items-center gap-2 p-2 rounded w-full text-left ${
              activeTab === "all" ? "bg-[#2a2a2a]" : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            <IoMdHome /> Home
          </button>
          <button
            className={`flex items-center gap-2 p-2 rounded w-full text-left ${
              activeTab === "starred" ? "bg-[#2a2a2a]" : ""
            }`}
            onClick={() => setActiveTab("starred")}
          >
            <AiOutlineStar /> Starred
          </button>
          <button
            className={`flex items-center gap-2 p-2 rounded w-full text-left ${
              activeTab === "trash" ? "bg-[#2a2a2a]" : ""
            }`}
            onClick={() => setActiveTab("trash")}
          >
            <AiOutlineDelete /> Trash
          </button>
        </nav>
        <div className="mt-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded"
          >
            <MdUploadFile /> Upload
          </button>
          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef}
            onChange={handleUpload}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <input
            type="text"
            placeholder="Search files and folders..."
            className="bg-[#111827] px-4 py-2 rounded w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={fetchFilesAndFolders}
            className="flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 rounded"
          >
            <MdRefresh /> Refresh
          </button>
        </div>

        {/* Folders */}
        {visibleFolders.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mb-2 text-gray-300">
              Folders
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {visibleFolders.map((name) => (
                <li
                  key={name}
                  className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a] cursor-pointer"
                  onClick={() => setCurrentPath(`${currentPath}/${name}`)}
                >
                  <div className="font-medium flex items-center gap-2">
                    📁 {name}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Files */}
        <h3 className="text-sm font-semibold mb-2 text-gray-300">Files</h3>
        {loading ? (
          <p>Loading...</p>
        ) : visibleFiles.length === 0 ? (
          <p className="text-gray-500">No files found.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleFiles.map((file) => (
              <li
                key={file.name}
                className="bg-[#111827] p-4 rounded-md border border-[#2a2a2a]"
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-2 font-medium truncate"
                >
                  {file.name}
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="w-64 p-6 border-l border-[#2a2a2a]">
        <h3 className="font-semibold mb-4">Profile</h3>
        <div className="flex items-center gap-2">
          <FaRegUser />
          <span>{user.fullName}</span>
        </div>
      </aside>
    </div>
  );
}
