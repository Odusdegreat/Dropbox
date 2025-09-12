"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

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
  starred?: boolean; // ⭐
  trashed?: boolean; // 🗑
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

  // Hidden inputs
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "trash">(
    "all"
  );

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((_, idx) => parts.slice(0, idx + 1).join("/"));
  }, [currentPath]);

  // Storage usage
  const storageUsage = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  // Helpers
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

  // Listing
  const listFolder = async (path: string) => {
    setLoadingList(true);
    try {
      const listRef = ref(storage, path.endsWith("/") ? path : `${path}/`);
      const res = await listAll(listRef);

      const folderNames = res.prefixes.map((p) => p.name);
      setFolders(folderNames);

      const fileItems: FileItem[] = await Promise.all(
        res.items.map(async (itemRef) => {
          const meta = await getMetadata(itemRef);
          const isPlaceholder = itemRef.name === ".keep";
          let url: string | undefined = undefined;

          if (!isPlaceholder) {
            try {
              url = await getDownloadURL(itemRef);
            } catch {
              // ignore if not public
            }
          }

          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            size: meta.size,
            contentType: meta.contentType,
            updated: meta.updated,
            starred: false,
            trashed: false,
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

  // Uploads
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

  // New Folder
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

  // Add Image
  const addImageToCurrentFolder = () => {
    addImageInputRef.current?.click();
  };

  // Set storage usage bar width after render
  useLayoutEffect(() => {
    const bar = document.querySelector<HTMLDivElement>(".storage-usage-bar");
    if (bar) {
      const percent = Math.min(
        100,
        (storageUsage / (1024 * 1024) / 50) * 100
      );
      bar.style.width = `${percent}%`;
    }
  }, [storageUsage]);

// (Remove this duplicate block entirely, as it is a duplicate and causes the unclosed <main> error)
("use client");

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

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
  deleteObject,
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
  starred?: boolean; // ⭐
  trashed?: boolean; // 🗑
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

  // Hidden inputs
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const addImageInputRef = useRef<HTMLInputElement | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "trash">(
    "all"
  );

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((_, idx) => parts.slice(0, idx + 1).join("/"));
  }, [currentPath]);

  // Helpers
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

  // Storage usage
  const storageUsage = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  // Listing
  const listFolder = async (path: string) => {
    setLoadingList(true);
    try {
      const listRef = ref(storage, path.endsWith("/") ? path : `${path}/`);
      const res = await listAll(listRef);

      const folderNames = res.prefixes.map((p) => p.name);
      setFolders(folderNames);

      const fileItems: FileItem[] = await Promise.all(
        res.items.map(async (itemRef) => {
          const meta = await getMetadata(itemRef);
          const isPlaceholder = itemRef.name === ".keep";
          let url: string | undefined = undefined;

          if (!isPlaceholder) {
            try {
              url = await getDownloadURL(itemRef);
            } catch {
              // ignore if not public
            }
          }

          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url,
            size: meta.size,
            contentType: meta.contentType,
            updated: meta.updated,
            starred: false,
            trashed: false,
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

  // Uploads (multi-file supported)
  const handleFiles = (fileList: FileList | null, targetPath?: string) => {
    if (!fileList || fileList.length === 0) return;
    const folderPath = targetPath ?? currentPath;

    setUploading(true);
    setProgress(0);

    const filesArray = Array.from(fileList);
    let completed = 0;

    filesArray.forEach((file) => {
      const fileRef = ref(storage, `${folderPath}/${file.name}`);
      const task = uploadBytesResumable(fileRef, file);

      task.on(
        "state_changed",
        (snap) => {
          const percent = (snap.bytesTransferred / snap.totalBytes) * 100;
          // approximate combined progress
          const localProgress = Math.round(percent);
          setProgress((p) => Math.round((p + localProgress) / 2));
        },
        (error) => {
          console.error(error);
          setUploading(false);
        },
        async () => {
          completed += 1;
          if (completed === filesArray.length) {
            setUploading(false);
            setProgress(0);
            await listFolder(currentPath);
          }
        }
      );
    });
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.currentTarget.value = "";
  };

  // New Folder
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

  // Add Image
  const addImageToCurrentFolder = () => {
    addImageInputRef.current?.click();
  };

  // Permanently delete file
  const permanentlyDeleteFile = async (file: FileItem) => {
    if (!confirm(`Permanently delete ${file.name}? This cannot be undone.`))
      return;
    try {
      const delRef = ref(storage, file.fullPath);
      await deleteObject(delRef);
      setFiles((prev) => prev.filter((f) => f.fullPath !== file.fullPath));
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete file.");
    }
  };

  // Rename file
  const renameFile = async (file: FileItem) => {
    const newName = prompt("Enter new file name:", file.name);
    if (!newName || newName === file.name) return;

    try {
      // get download URL
      const fileRef = ref(storage, file.fullPath);
      const url = await getDownloadURL(fileRef);
      const resp = await fetch(url);
      const blob = await resp.blob();

      const newFullPath = `${file.fullPath
        .split("/")
        .slice(0, -1)
        .join("/")}/${newName}`;
      const newRef = ref(storage, newFullPath);

      // upload blob to new path
      await uploadBytesResumable(newRef, blob);
      // delete old
      await deleteObject(fileRef);

      await listFolder(currentPath);
    } catch (e) {
      console.error("Rename failed", e);
      alert("Rename failed");
    }
  };

  // Copy link
  const copyLink = async (file: FileItem) => {
    try {
      if (!file.url) {
        const fileRef = ref(storage, file.fullPath);
        const url = await getDownloadURL(fileRef);
        await navigator.clipboard.writeText(url);
      } else {
        await navigator.clipboard.writeText(file.url);
      }
      alert("Link copied to clipboard");
    } catch (e) {
      console.error(e);
      alert("Failed to copy link");
    }
  };

  // Visible files based on tab + search
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

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#0f0f0f] border-b border-[#2a2a2a]">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <IoCloudUploadOutline className="text-blue-400" /> Dropbox
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
            {user?.emailAddresses?.[0]?.emailAddress || ""}
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <MdUploadFile /> Upload
            </h2>
            <div className="space-y-3">
              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={createFolder}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md cursor-pointer"
                >
                  <FaFolderPlus /> New Folder
                </button>
                <button
                  onClick={addImageToCurrentFolder}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] transition px-4 py-2 rounded-md cursor-pointer"
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
                  title="Add image file"
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
                  title="Browse files to upload"
                  multiple
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
                  <div
                    className="h-3 bg-blue-400 storage-usage-bar"
                    data-width={Math.min(
                      100,
                      (storageUsage / (1024 * 1024) / 50) * 100
                    )}
                  />

              {/* Storage usage */}
              <div className="mt-3">
                <div className="text-sm text-gray-400 mb-1">Storage used</div>
                <div className="w-full bg-[#0b1220] rounded-full h-3 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        (storageUsage / (1024 * 1024) / 50) * 100
                      )}%`,
                    }}
                    className="h-3 bg-blue-400"
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {prettySize(storageUsage)} used
                </div>
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
                  <button
                    className="hover:text-white cursor-pointer"
                    onClick={() => setCurrentPath(ROOT)}
                  >
                    <IoMdHome className="inline mr-1 -mt-0.5" /> Home
                  </button>
                  {crumbs.map((c, i) => (
                    <div key={c} className="flex items-center gap-2">
                      <span>/</span>
                      <button
                        className={`hover:text-white cursor-pointer ${
                          i === crumbs.length - 1 ? "text-white" : ""
                        }`}
                        onClick={() => setCurrentPath(c)}
                      >
                        {c.split("/").slice(-1)[0]}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tabs + Search */}
                <div className="flex flex-wrap gap-6 text-sm mt-3 items-center">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`flex items-center gap-2 cursor-pointer ${
                        activeTab === "all"
                          ? "text-blue-400 border-b-2 border-blue-400 pb-0.5"
                          : "text-white hover:text-gray-300"
                      }`}
                    >
                      <LiaFileSolid /> All Files
                    </button>

                    <button
                      onClick={() => setActiveTab("starred")}
                      className={`flex items-center gap-2 cursor-pointer ${
                        activeTab === "starred"
                          ? "text-blue-400 border-b-2 border-blue-400 pb-0.5"
                          : "text-white hover:text-gray-300"
                      }`}
                    >
                      <CiStar className="text-lg" /> Starred{" "}
                      <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                        {files.filter((f) => f.starred).length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("trash")}
                      className={`flex items-center gap-2 cursor-pointer ${
                        activeTab === "trash"
                          ? "text-blue-400 border-b-2 border-blue-400 pb-0.5"
                          : "text-white hover:text-gray-300"
                      }`}
                    >
                      <LuTrash /> Trash{" "}
                      <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded">
                        {files.filter((f) => f.trashed).length}
                      </span>
                    </button>
                  </div>

                  <div className="ml-4">
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search files..."
                      className="bg-[#0f1724] text-white px-3 py-1 rounded-md text-sm border border-[#222]
                      focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => listFolder(currentPath)}
                className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition cursor-pointer"
              >
                <MdRefresh /> Refresh
              </button>
            </div>

            {/* Listing */}
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <MdRefresh className="animate-spin text-3xl" />
              </div>
            ) : folders.length === 0 && visibleFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-600 py-20 rounded-lg text-gray-400">
                <MdCloudUpload className="text-5xl mb-2 text-blue-400" />
                <p>No files or folders here yet</p>
              </div>
            ) : (
              <>
                {/* Folders */}
                {folders.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">
                      Folders
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {folders.map((name) => (
                        <li
                          key={name}
                          className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a] cursor-pointer"
                          onClick={() =>
                            setCurrentPath(`${currentPath}/${name}`)
                          }
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
                {visibleFiles.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">
                      Files
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleFiles.map((f) => {
                        const isImage = (f.contentType || "").startsWith(
                          "image/"
                        );
                        return (
                          <li
                            key={f.fullPath}
                            className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a]"
                          >
                            <div className="font-medium truncate">
                              {isImage ? "🖼" : "📄"} {f.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {prettySize(f.size)}{" "}
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
                                title={`Preview image: ${f.name}`}
                              >
                                <Image
                                  src={f.url}
                                  alt={f.name}
                                  width={400}
                                  height={128}
                                  className="w-full h-32 object-cover rounded"
                                  style={{
                                    width: "100%",
                                    height: "128px",
                                    objectFit: "cover",
                                    borderRadius: "0.5rem",
                                  }}
                                  unoptimized
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

                            {/* Actions */}
                            <div className="flex gap-3 mt-3">
                              <button
                                onClick={() =>
                                  setFiles((prev) =>
                                    prev.map((file) =>
                                      file.fullPath === f.fullPath
                                        ? { ...file, starred: !file.starred }
                                        : file
                                    )
                                  )
                                }
                                className="text-sm text-yellow-400 hover:underline"
                              >
                                {f.starred ? "Unstar" : "Star"}
                              </button>

                              <button
                                onClick={() =>
                                  setFiles((prev) =>
                                    prev.map((file) =>
                                      file.fullPath === f.fullPath
                                        ? { ...file, trashed: !file.trashed }
                                        : file
                                    )
                                  )
                                }
                                className="text-sm text-red-400 hover:underline"
                              >
                                {f.trashed ? "Restore" : "Trash"}
                              </button>

                              <button
                                onClick={() => renameFile(f)}
                                className="text-sm text-gray-300 hover:underline"
                              >
                                Rename
                              </button>

                              <button
                                onClick={() => copyLink(f)}
                                className="text-sm text-blue-400 hover:underline"
                              >
                                Copy Link
                              </button>

                              {activeTab === "trash" && (
                                <button
                                  onClick={() => permanentlyDeleteFile(f)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Delete Permanently
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
