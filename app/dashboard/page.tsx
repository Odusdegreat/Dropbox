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

      // Folders (prefixes)
      const folderNames = res.prefixes.map((p) => p.name);
      setFolders(folderNames);

      // Files (items)
      const fileItems: FileItem[] = await Promise.all(
        res.items.map(async (itemRef) => {
          const meta = await getMetadata(itemRef);
          const isPlaceholder = itemRef.name === ".keep";
          let url: string | undefined = undefined;

          if (!isPlaceholder) {
            try {
              url = await getDownloadURL(itemRef);
            } catch {
              // ignore if not publicly retrievable
            }
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

      // Hide placeholder files like ".keep"
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
        // Refresh listing to show newly uploaded file
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
    // reset input value so selecting the same file again triggers onChange
    e.currentTarget.value = "";
  };

  // -------- New Folder --------
  const createFolder = async () => {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const safe = sanitizeFolderName(name);
    if (!safe) return;

    // Firebase Storage is flat; create placeholder file to mimic folder.
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

  // -------- Add Image (into current folder) --------
  const addImageToCurrentFolder = () => {
    addImageInputRef.current?.click();
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

                {/* Hidden input for "Add Image" */}
                <label htmlFor="addImageInput" className="sr-only">
                  Add image
                </label>
                <input
                  ref={addImageInputRef}
                  id="addImageInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onBrowseChange}
                  aria-label="Add image"
                  title="Add image"
                />
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="mt-6 border border-dashed border-gray-600 rounded-md p-8 h-[250px] flex flex-col justify-center items-center text-center cursor-pointer"
              >
                {/* Hidden browse input */}
                <label htmlFor="browseInput" className="sr-only">
                  Browse files
                </label>
                <input
                  ref={browseInputRef}
                  id="browseInput"
                  type="file"
                  className="hidden"
                  onChange={onBrowseChange}
                  aria-label="Browse files"
                  title="Browse files"
                />

                <button
                  type="button"
                  onClick={() => browseInputRef.current?.click()}
                  className="flex flex-col items-center"
                  title="Open file picker"
                  aria-label="Open file picker"
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

              {/* Tips */}
              <div className="text-xs mt-4 text-gray-500">
                <p>Tips:</p>
                <ul className="list-disc ml-4 mt-1">
                  <li>Files are private and only visible to you</li>
                  <li>Supported image formats: JPG, PNG, GIF, WebP</li>
                  <li>Maximum file size: 5MB (example limit)</li>
                </ul>
              </div>

              <p className="text-xs text-gray-400">
                Current folder:{" "}
                <span className="font-semibold">{currentPath}</span>
              </p>
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
                    title="Go to root"
                    aria-label="Go to root"
                  >
                    <IoMdHome className="inline mr-1 -mt-0.5" />
                    Home
                  </button>
                  {crumbs.map((c, i) => (
                    <div key={c} className="flex items-center gap-2">
                      <span>/</span>
                      <button
                        className={`hover:text-white cursor-pointer ${
                          i === crumbs.length - 1 ? "text-white" : ""
                        }`}
                        onClick={() => setCurrentPath(c)}
                        title={`Open ${c}`}
                        aria-label={`Open ${c}`}
                      >
                        {c.split("/").slice(-1)[0]}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Tabs (static for now) */}
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

              <button
                onClick={() => listFolder(currentPath)}
                className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition cursor-pointer"
                title="Refresh"
                aria-label="Refresh"
              >
                <MdRefresh /> Refresh
              </button>
            </div>

            {/* Listing */}
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                Loading…
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-600 py-20 rounded-lg text-gray-400">
                <MdCloudUpload className="text-5xl mb-2 text-blue-400" />
                <p>No files or folders here yet</p>
                <p className="text-sm mt-1">
                  Create a folder or upload a file to get started.
                </p>
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
                          title={`Open ${name}`}
                          aria-label={`Open ${name}`}
                        >
                          <div className="font-medium flex items-center gap-2">
                            📁 {name}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Click to open
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">
                      Files
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {files.map((f) => {
                        const isImage = (f.contentType || "").startsWith(
                          "image/"
                        );
                        return (
                          <li
                            key={f.fullPath}
                            className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a]"
                            title={f.name}
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
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
