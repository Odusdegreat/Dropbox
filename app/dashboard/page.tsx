"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { IoCloudUploadOutline } from "react-icons/io5";
import { MdCloudUpload, MdUploadFile, MdRefresh } from "react-icons/md";
import { FaFolderPlus, FaFileImage, FaRegUser } from "react-icons/fa";
import { IoMdHome } from "react-icons/io";
import { CiStar } from "react-icons/ci";
import { LuTrash } from "react-icons/lu";
import { LiaFileSolid } from "react-icons/lia";

import {
  ref,
  listAll,
  getMetadata,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

// Types
type FileItem = {
  name: string;
  fullPath: string;
  url?: string;
  size?: number;
  contentType?: string;
  updated?: string;
};

type TabKey = "all" | "starred" | "trash";

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

  // Tabs + Local state (persisted in localStorage)
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [starred, setStarred] = useState<string[]>([]);
  const [trashed, setTrashed] = useState<string[]>([]); // store file fullPath IDs

  // New Folder dialog
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  // Breadcrumbs
  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((_, idx) => parts.slice(0, idx + 1).join("/"));
  }, [currentPath]);

  const storageKey = (suffix: string) => {
    const uid = user?.id || "anon";
    return `dbx:${uid}:${suffix}`;
  };

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

  // Visible lists based on tab
  const visibleFiles = useMemo(() => {
    const notTrashed = files.filter((f) => !trashed.includes(f.fullPath));
    if (activeTab === "all") return notTrashed;
    if (activeTab === "starred") {
      return notTrashed.filter((f) => starred.includes(f.fullPath));
    }
    // trash
    return files.filter((f) => trashed.includes(f.fullPath));
  }, [files, starred, trashed, activeTab]);

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

  // Load persisted star/trash on user change
  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey("starred"));
      const t = localStorage.getItem(storageKey("trashed"));
      if (s) setStarred(JSON.parse(s));
      else setStarred([]);
      if (t) setTrashed(JSON.parse(t));
      else setTrashed([]);
    } catch {
      setStarred([]);
      setTrashed([]);
    }
  }, [user?.id]);

  // Persist star/trash
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("starred"), JSON.stringify(starred));
    } catch {}
  }, [starred, user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey("trashed"), JSON.stringify(trashed));
    } catch {}
  }, [trashed, user?.id]);

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
    const safe = sanitizeFolderName(folderName);
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
        setFolderOpen(false);
        setFolderName("");
        await listFolder(currentPath);
      }
    );
  };

  // -------- Actions: star / trash / restore / delete --------
  const toggleStar = (file: FileItem) => {
    setStarred((prev) =>
      prev.includes(file.fullPath)
        ? prev.filter((id) => id !== file.fullPath)
        : [...prev, file.fullPath]
    );
  };

  const moveToTrash = (file: FileItem) => {
    if (trashed.includes(file.fullPath)) return;
    setTrashed((prev) => [...prev, file.fullPath]);
  };

  const restoreFromTrash = (file: FileItem) => {
    setTrashed((prev) => prev.filter((id) => id !== file.fullPath));
  };

  const deletePermanently = async (file: FileItem) => {
    try {
      await deleteObject(ref(storage, file.fullPath));
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      // Clean up local state regardless
      setTrashed((prev) => prev.filter((id) => id !== file.fullPath));
      await listFolder(currentPath);
    }
  };

  // -------- UI --------
  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <IoCloudUploadOutline className="text-blue-400" />
          Dropbox
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/profile")}
          >
            <FaRegUser className="mr-2" /> Profile
          </Button>
          <span className="text-sm text-gray-400 hidden sm:inline">
            {user?.emailAddresses?.[0]?.emailAddress || ""}
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload / Actions */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MdUploadFile /> Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {/* New Folder dialog */}
                <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <FaFolderPlus className="mr-2" /> New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111827] text-white border-[#2a2a2a]">
                    <DialogHeader>
                      <DialogTitle>Create folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label
                        htmlFor="folderName"
                        className="text-sm text-gray-300"
                      >
                        Folder name
                      </label>
                      <Input
                        id="folderName"
                        placeholder="e.g. designs"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setFolderOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createFolder}
                        disabled={!sanitizeFolderName(folderName)}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Add Image */}
                <Button
                  variant="secondary"
                  onClick={() => addImageInputRef.current?.click()}
                >
                  <FaFileImage className="mr-2" /> Add Image
                </Button>
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
                />

                {/* Refresh */}
                <Button
                  variant="outline"
                  onClick={() => listFolder(currentPath)}
                >
                  <MdRefresh className="mr-2" /> Refresh
                </Button>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="border border-dashed border-gray-600 rounded-md p-8 h-[220px] flex flex-col justify-center items-center text-center"
              >
                <input
                  ref={browseInputRef}
                  id="browseInput"
                  type="file"
                  className="hidden"
                  onChange={onBrowseChange}
                />
                <Button
                  variant="ghost"
                  className="flex flex-col items-center"
                  onClick={() => browseInputRef.current?.click()}
                >
                  <MdCloudUpload className="text-4xl text-blue-400 mb-2" />
                  <span className="text-sm">
                    Drag & drop your file here, or{" "}
                    <span className="underline">browse</span>
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    Images up to 5MB
                  </span>
                </Button>

                {uploading && (
                  <div className="w-full mt-4">
                    <Progress value={progress} />
                    <p className="text-xs text-gray-400 mt-1">
                      Uploading… {progress}%
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Current folder:{" "}
                <span className="font-semibold">{currentPath}</span>
              </p>
            </CardContent>
          </Card>

          {/* Files */}
          <Card className="col-span-2 bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle>Your Files</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => listFolder(currentPath)}
                >
                  <MdRefresh className="mr-2" /> Refresh
                </Button>
              </div>

              {/* Breadcrumbs */}
              <Breadcrumb>
                <BreadcrumbList className="text-sm">
                  <BreadcrumbItem>
                    <Button
                      variant="link"
                      className="px-0 text-gray-300"
                      onClick={() => setCurrentPath(ROOT)}
                    >
                      <IoMdHome className="inline mr-1 -mt-0.5" /> Home
                    </Button>
                  </BreadcrumbItem>
                  {crumbs.slice(1).map((c, i) => (
                    <div className="flex items-center" key={c}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <Button
                          variant="link"
                          className={`px-2 ${
                            i === crumbs.length - 2
                              ? "text-white"
                              : "text-gray-300"
                          }`}
                          onClick={() => setCurrentPath(c)}
                        >
                          {c.split("/").slice(-1)[0]}
                        </Button>
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabKey)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <LiaFileSolid /> All Files
                  </TabsTrigger>
                  <TabsTrigger
                    value="starred"
                    className="flex items-center gap-2"
                  >
                    <CiStar /> Starred
                    <Badge variant="secondary">
                      {starred.filter((id) => !trashed.includes(id)).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="trash"
                    className="flex items-center gap-2"
                  >
                    <LuTrash /> Trash
                    <Badge variant="destructive">{trashed.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Content shared UI below */}
                <TabsContent value="all" className="pt-4">
                  {loadingList ? (
                    <GridSkeleton />
                  ) : folders.length === 0 && visibleFiles.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <>
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
                      <FileGrid
                        items={visibleFiles}
                        starred={starred}
                        trashed={trashed}
                        onStar={toggleStar}
                        onTrash={moveToTrash}
                        onRestore={restoreFromTrash}
                        onDelete={deletePermanently}
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="starred" className="pt-4">
                  {loadingList ? (
                    <GridSkeleton />
                  ) : (
                    <FileGrid
                      items={visibleFiles}
                      starred={starred}
                      trashed={trashed}
                      onStar={toggleStar}
                      onTrash={moveToTrash}
                      onRestore={restoreFromTrash}
                      onDelete={deletePermanently}
                      emptyText="No starred files"
                    />
                  )}
                </TabsContent>

                <TabsContent value="trash" className="pt-4">
                  {loadingList ? (
                    <GridSkeleton />
                  ) : (
                    <FileGrid
                      items={visibleFiles}
                      starred={starred}
                      trashed={trashed}
                      onStar={toggleStar}
                      onTrash={moveToTrash}
                      onRestore={restoreFromTrash}
                      onDelete={deletePermanently}
                      emptyText="Trash is empty"
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  );
}

/* ---------- Small UI helpers ---------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-600 py-20 rounded-lg text-gray-400">
      <MdCloudUpload className="text-5xl mb-2 text-blue-400" />
      <p>No files or folders here yet</p>
      <p className="text-sm mt-1">
        Create a folder or upload a file to get started.
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full bg-[#111827]" />
      ))}
    </div>
  );
}

function FileGrid({
  items,
  starred,
  trashed,
  onStar,
  onTrash,
  onRestore,
  onDelete,
  emptyText = "No files",
}: {
  items: FileItem[];
  starred: string[];
  trashed: string[];
  onStar: (f: FileItem) => void;
  onTrash: (f: FileItem) => void;
  onRestore: (f: FileItem) => void;
  onDelete: (f: FileItem) => Promise<void>;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-gray-400">{emptyText}</p>;
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((f) => {
        const isImage = (f.contentType || "").startsWith("image/");
        const isStar = starred.includes(f.fullPath);
        const isTrash = trashed.includes(f.fullPath);
        return (
          <li
            key={f.fullPath}
            className="bg-[#111827] p-4 rounded-md hover:shadow-md transition border border-[#2a2a2a]"
            title={f.name}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {isImage ? "🖼" : "📄"} {f.name}
                </div>
                <div className="text-xs text-gray-400">
                  {f.size !== undefined && <span>{prettySize(f.size)}</span>}{" "}
                  {f.updated && (
                    <span className="ml-2">
                      • {new Date(f.updated).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111827] text-white border-[#2a2a2a]"
                >
                  {!isTrash && (
                    <DropdownMenuItem onClick={() => onStar(f)}>
                      {isStar ? "Unstar" : "Star"}
                    </DropdownMenuItem>
                  )}
                  {!isTrash && (
                    <DropdownMenuItem onClick={() => onTrash(f)}>
                      Move to Trash
                    </DropdownMenuItem>
                  )}
                  {isTrash && (
                    <DropdownMenuItem onClick={() => onRestore(f)}>
                      Restore
                    </DropdownMenuItem>
                  )}
                  {isTrash && (
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-400"
                      onClick={() => onDelete(f)}
                    >
                      Delete permanently
                    </DropdownMenuItem>
                  )}
                  {f.url && (
                    <DropdownMenuItem asChild>
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        View / Download
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isImage && f.url && !isTrash && (
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
          </li>
        );
      })}
    </ul>
  );
}

function prettySize(bytes?: number) {
  if (bytes === undefined || bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
