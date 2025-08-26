"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { FaFolderPlus, FaFileImage, FaRegUser } from "react-icons/fa";
import { MdCloudUpload, MdRefresh, MdUploadFile } from "react-icons/md";
import { IoMdHome } from "react-icons/io";
import { GrNotes } from "react-icons/gr";
import { IoCloudUploadOutline } from "react-icons/io5";
import { LiaFileSolid } from "react-icons/lia";
import { CiStar } from "react-icons/ci";
import { LuTrash } from "react-icons/lu";

import {
  ref,
  listAll,
  getMetadata,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

// Types
type FileItem = {
  name: string;
  fullPath: string;
  url?: string;
  size?: number;
  contentType?: string;
  updated?: string;
};

type Tab = "all" | "starred" | "trash";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();

  // Folder state
  const ROOT = "uploads";
  const [currentPath, setCurrentPath] = useState<string>(ROOT);
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // File states
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [trash, setTrash] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Hidden inputs (browse + add image)
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((_, idx) => parts.slice(0, idx + 1).join("/"));
  }, [currentPath]);

  // -------- Listing --------
  const listFolder = async (path: string) => {
    setLoadingList(true);
    try {
      const listRef = ref(storage, path.endsWith("/") ? path : `${path}/`);
      const res = await listAll(listRef);

      // Folders
      setFolders(res.prefixes.map((p) => p.name));

      // Files
      const fileItems: FileItem[] = await Promise.all(
        res.items.map(async (itemRef) => {
          const meta = await getMetadata(itemRef);
          let url: string | undefined;
          try {
            url = await getDownloadURL(itemRef);
          } catch {}
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            size: meta.size,
            contentType: meta.contentType,
            updated: meta.updated,
          };
        })
      );
      setFiles(fileItems.filter((f) => f.name !== ".keep"));
    } catch (e) {
      console.error("Error listing folder:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    listFolder(currentPath);
  }, [currentPath]);

  // -------- Uploads --------
  const handleFiles = (fileList: FileList | null, targetPath?: string) => {
    if (!fileList?.length) return;
    const file = fileList[0];
    const fileRef = ref(storage, `${targetPath ?? currentPath}/${file.name}`);
    const task = uploadBytesResumable(fileRef, file);

    setUploading(true);
    setProgress(0);

    task.on(
      "state_changed",
      (snap) => {
        const percent = (snap.bytesTransferred / snap.totalBytes) * 100;
        setProgress(Math.round(percent));
      },
      (error) => {
        console.error(error);
        setUploading(false);
      },
      async () => {
        setUploading(false);
        setProgress(0);
        await listFolder(currentPath);
      }
    );
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.currentTarget.value = "";
  };

  // -------- Folder & Image --------
  const createFolder = async () => {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const safe = name.replace(/[\\:*?"<>|]/g, "-");
    const placeholderRef = ref(storage, `${currentPath}/${safe}/.keep`);
    await uploadBytesResumable(placeholderRef, new Blob([""]));
    await listFolder(currentPath);
  };

  const addImageToCurrentFolder = () => addImageInputRef.current?.click();

  // -------- Star / Trash actions --------
  const toggleStar = (file: FileItem) => {
    setStarred((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(file.fullPath)) newSet.delete(file.fullPath);
      else newSet.add(file.fullPath);
      return newSet;
    });
  };

  const moveToTrash = (file: FileItem) => {
    setTrash((prev) => new Set(prev).add(file.fullPath));
    setStarred((prev) => {
      const newSet = new Set(prev);
      newSet.delete(file.fullPath);
      return newSet;
    });
  };

  const restoreFromTrash = (file: FileItem) => {
    setTrash((prev) => {
      const newSet = new Set(prev);
      newSet.delete(file.fullPath);
      return newSet;
    });
  };

  // -------- Filtered files --------
  const displayedFiles = files.filter((f) => {
    if (activeTab === "starred") return starred.has(f.fullPath);
    if (activeTab === "trash") return trash.has(f.fullPath);
    return !trash.has(f.fullPath); // default all
  });

  // -------- Render --------
  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <IoCloudUploadOutline className="text-blue-400" /> Dropbox
        </h1>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm hover:text-blue-400">
            <GrNotes /> My Files
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 text-sm hover:text-blue-400"
          >
            <FaRegUser /> Profile
          </button>
          <span className="text-sm text-gray-400 hidden sm:inline">
            {user?.emailAddresses?.[0]?.emailAddress || ""}
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="bg-[#1a1a1a] p-5 rounded-lg border border-[#2a2a2a]">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <MdUploadFile /> Upload
            </h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button onClick={createFolder} className="btn">
                  <FaFolderPlus /> New Folder
                </button>
                <button onClick={addImageToCurrentFolder} className="btn">
                  <FaFileImage /> Add Image
                </button>
                <input
                  ref={addImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onBrowseChange}
                />
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="border border-dashed border-gray-600 rounded-md p-8 h-[250px] flex flex-col justify-center items-center text-center cursor-pointer"
              >
                <input
                  ref={browseInputRef}
                  type="file"
                  className="hidden"
                  onChange={onBrowseChange}
                />
                <button onClick={() => browseInputRef.current?.click()}>
                  <MdCloudUpload className="text-4xl text-blue-400 mb-3" />
                  {uploading ? (
                    <p>Uploading… {progress}%</p>
                  ) : (
                    <>
                      <p>
                        Drag & drop your file here, or{" "}
                        <span className="text-blue-400 underline">browse</span>
                      </p>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="col-span-2 bg-[#1a1a1a] p-5 rounded-lg border border-[#2a2a2a]">
            {/* Tabs */}
            <div className="flex gap-6 mb-5">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 ${
                  activeTab === "all"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-white"
                }`}
              >
                <LiaFileSolid /> All Files
              </button>
              <button
                onClick={() => setActiveTab("starred")}
                className={`flex items-center gap-2 ${
                  activeTab === "starred"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-white"
                }`}
              >
                <CiStar /> Starred{" "}
                <span className="text-xs bg-yellow-500 text-black px-2 rounded">
                  {starred.size}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("trash")}
                className={`flex items-center gap-2 ${
                  activeTab === "trash"
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-white"
                }`}
              >
                <LuTrash /> Trash{" "}
                <span className="text-xs bg-red-500 text-black px-2 rounded">
                  {trash.size}
                </span>
              </button>
            </div>

            {/* Files List */}
            {loadingList ? (
              <p>Loading...</p>
            ) : displayedFiles.length === 0 ? (
              <p className="text-gray-400">No files here.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedFiles.map((f) => {
                  const isImage = (f.contentType || "").startsWith("image/");
                  return (
                    <li
                      key={f.fullPath}
                      className="bg-[#111827] p-4 rounded-md border border-[#2a2a2a]"
                    >
                      <p className="font-medium truncate">{f.name}</p>
                      {f.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          className="text-blue-400 text-sm underline"
                        >
                          View
                        </a>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => toggleStar(f)}
                          className="text-yellow-400"
                        >
                          {starred.has(f.fullPath) ? "★ Unstar" : "☆ Star"}
                        </button>
                        {activeTab === "trash" ? (
                          <button
                            onClick={() => restoreFromTrash(f)}
                            className="text-green-400"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => moveToTrash(f)}
                            className="text-red-400"
                          >
                            Trash
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
