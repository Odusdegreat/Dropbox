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

  // Hidden inputs (browse + add image)
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "trash">("all");
  const [starred, setStarred] = useState<string[]>([]);
  const [trash, setTrash] = useState<FileItem[]>([]);

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((_, idx) => parts.slice(0, idx + 1).join("/"));
  }, [currentPath]);

  // -------- Helpers --------
  const sanitizeFolderName = (name: string) =>
    name
      .trim()
      .replace(/[\\:*?"<>|]/g, "-")
      .replace(/^\.+$/, "-")
      .slice(0, 60);

  const prettySize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // -------- Listing --------
  const listFolder = async (path: string) => {
    setLoadingList(true);
    try {
      const listRef = ref(storage, path.endsWith("/") ? path : `${path}/`);
      const res = await listAll(listRef);

      // Folders
      const folderNames = res.prefixes.map((p) => p.name);
      setFolders(folderNames);

      // Files
      const fileItems: FileItem[] = await Promise.all(
        res.items.map(async (itemRef) => {
          const meta = await getMetadata(itemRef);
          let url: string | undefined;
          try {
            url = await getDownloadURL(itemRef);
          } catch {
            url = undefined;
          }

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
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const folderPath = targetPath ?? currentPath;

    const fileRef = ref(storage, `${folderPath}/${file.name}`);
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

  // -------- New Folder --------
  const createFolder = async () => {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const safe = sanitizeFolderName(name);
    if (!safe) return;

    const placeholderRef = ref(storage, `${currentPath}/${safe}/.keep`);
    const emptyBlob = new Blob([""], { type: "text/plain" });
    const task = uploadBytesResumable(placeholderRef, emptyBlob);

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

  // -------- Add Image --------
  const addImageToCurrentFolder = () => {
    addImageInputRef.current?.click();
  };

  // -------- Star / Trash --------
  const toggleStar = (file: FileItem) => {
    if (starred.includes(file.fullPath)) {
      setStarred((prev) => prev.filter((id) => id !== file.fullPath));
    } else {
      setStarred((prev) => [...prev, file.fullPath]);
    }
  };

  const moveToTrash = (file: FileItem) => {
    setTrash((prev) => [...prev, file]);
    setFiles((prev) => prev.filter((f) => f.fullPath !== file.fullPath));
  };

  // -------- Render --------
  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#0f0f0f] border-b border-[#2a2a2a]">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <IoCloudUploadOutline className="text-blue-400" />
          Dropbox
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
          {/* Upload Box */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <MdUploadFile /> Upload
            </h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={createFolder}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] px-4 py-2 rounded-md"
                >
                  <FaFolderPlus /> New Folder
                </button>
                <button
                  onClick={addImageToCurrentFolder}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] px-4 py-2 rounded-md"
                >
                  <FaFileImage /> Add Image
                </button>
                <input
                  ref={addImageInputRef}
                  id="addImageInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onBrowseChange}
                />
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="mt-6 border border-dashed border-gray-600 rounded-md p-8 h-[250px] flex flex-col justify-center items-center text-center cursor-pointer"
              >
                <input
                  ref={browseInputRef}
                  id="browseInput"
                  type="file"
                  className="hidden"
                  onChange={onBrowseChange}
                />
                <button
                  type="button"
                  onClick={() => browseInputRef.current?.click()}
                  className="flex flex-col items-center"
                >
                  <MdCloudUpload className="text-4xl text-blue-400 mb-3" />
                  {uploading ? (
                    <p>Uploading… {progress}%</p>
                  ) : (
                    <>
                      <p>
                        Drag & drop your file here, or{" "}
                        <span className="text-blue-400 underline">browse</span>
                      </p>
                      <p className="text-sm mt-1 text-gray-400">
                        Images up to 5MB
                      </p>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-semibold mb-1">Your Files</h2>
                {/* Breadcrumbs */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300 mt-2">
                  <button onClick={() => setCurrentPath(ROOT)}>
                    <IoMdHome className="inline mr-1 -mt-0.5" /> Home
                  </button>
                  {crumbs.map((c, i) => (
                    <div key={c} className="flex items-center gap-2">
                      <span>/</span>
                      <button
                        className={i === crumbs.length - 1 ? "text-white" : ""}
                        onClick={() => setCurrentPath(c)}
                      >
                        {c.split("/").slice(-1)[0]}
                      </button>
                    </div>
                  ))}
                </div>
                {/* Tabs */}
                <div className="flex flex-wrap gap-6 text-sm mt-3">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`flex items-center gap-2 ${
                      activeTab === "all"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : ""
                    }`}
                  >
                    <LiaFileSolid /> All Files
                  </button>
                  <button
                    onClick={() => setActiveTab("starred")}
                    className={`flex items-center gap-2 ${
                      activeTab === "starred"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : ""
                    }`}
                  >
                    <CiStar /> Starred
                    <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                      {starred.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("trash")}
                    className={`flex items-center gap-2 ${
                      activeTab === "trash"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : ""
                    }`}
                  >
                    <LuTrash /> Trash
                    <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded">
                      {trash.length}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => listFolder(currentPath)}
                className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"
              >
                <MdRefresh /> Refresh
              </button>
            </div>

            {/* Listing */}
            {loadingList ? (
              <div className="text-gray-400">Loading…</div>
            ) : activeTab === "all" ? (
              <>
                {/* Folders */}
                {folders.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {folders.map((name) => (
                      <li
                        key={name}
                        onClick={() => setCurrentPath(`${currentPath}/${name}`)}
                        className="bg-[#111827] p-4 rounded-md cursor-pointer"
                      >
                        📁 {name}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Files */}
                {files.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((f) => (
                      <li
                        key={f.fullPath}
                        className="bg-[#111827] p-4 rounded-md border border-[#2a2a2a]"
                      >
                        <div className="flex justify-between items-center">
                          <span className="truncate">
                            {(f.contentType || "").startsWith("image/")
                              ? "🖼"
                              : "📄"}{" "}
                            {f.name}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleStar(f)}>
                              {starred.includes(f.fullPath) ? "⭐" : "☆"}
                            </button>
                            <button onClick={() => moveToTrash(f)}>🗑</button>
                          </div>
