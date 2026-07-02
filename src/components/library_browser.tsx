"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  ChevronRight,
  FileInput,
  FilePenLine,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  FolderPen,
  FolderPlus,
  LoaderCircle,
  MoreVertical,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import UploadPage from "./pdf_upload";
import AISettingsButton from "./ai_settings_button";
import ThemeControls from "./theme_controls";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    children: number;
    documents: number;
  };
};

type DocumentItem = {
  id: string;
  originalName: string;
  totalPages: number | null;
  uploadedAt: string;
  folderId: string | null;
};

type FolderPathItem = Pick<Folder, "id" | "name">;

type ActionTarget =
  | { kind: "folder"; item: Folder }
  | { kind: "document"; item: DocumentItem };

type LibraryContentsProps = {
  folderId: string | null;
  onOpenFolder: (folder: FolderPathItem) => void;
  onRename: (target: ActionTarget) => void;
  onMoveDocument: (document: DocumentItem) => void;
  onDelete: (target: ActionTarget) => void;
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatPageCount(totalPages: number | null) {
  if (totalPages === null) return "Unknown pages";
  return `${totalPages} ${totalPages === 1 ? "page" : "pages"}`;
}

type ItemMenuProps = {
  menuKey: string;
  openMenuKey: string | null;
  onToggle: (menuKey: string) => void;
  children: ReactNode;
};

function ItemMenu({ menuKey, openMenuKey, onToggle, children }: ItemMenuProps) {
  const open = menuKey === openMenuKey;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => onToggle(menuKey)}
        className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="More actions"
        title="More actions"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-36 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

type MenuButtonProps = {
  children: ReactNode;
  destructive?: boolean;
  onClick: () => void;
};

function MenuButton({
  children,
  destructive = false,
  onClick,
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function LibraryContents({
  folderId,
  onOpenFolder,
  onRename,
  onMoveDocument,
  onDelete,
}: LibraryContentsProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchContents() {
      try {
        const folderQuery = folderId
          ? `?parentId=${encodeURIComponent(folderId)}`
          : "";
        const documentQuery = folderId
          ? `?folderId=${encodeURIComponent(folderId)}`
          : "";

        const [foldersResponse, documentsResponse] = await Promise.all([
          fetch(`/api/folders${folderQuery}`),
          fetch(`/api/documents${documentQuery}`),
        ]);
        const [foldersData, documentsData] = await Promise.all([
          foldersResponse.json(),
          documentsResponse.json(),
        ]);

        if (ignore) return;

        if (!foldersResponse.ok) {
          throw new Error(foldersData.error || "Failed to fetch folders");
        }
        if (!documentsResponse.ok) {
          throw new Error(documentsData.error || "Failed to fetch documents");
        }

        setFolders(foldersData.folders);
        setDocuments(documentsData.documents);
      } catch (fetchError) {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load library",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchContents();

    return () => {
      ignore = true;
    };
  }, [folderId]);

  function closeMenuAnd(action: () => void) {
    setOpenMenuKey(null);
    action();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-gray-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading library...
      </div>
    );
  }

  if (error) return <p className="py-12 text-sm text-red-600">{error}</p>;

  if (folders.length === 0 && documents.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <FolderOpen className="h-10 w-10 text-gray-300" aria-hidden="true" />
        <p className="mt-3 font-medium text-gray-700">This folder is empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {folders.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500">
            Folders
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => {
              const itemCount =
                folder._count.children + folder._count.documents;
              const target: ActionTarget = { kind: "folder", item: folder };

              return (
                <article
                  key={folder.id}
                  className="relative flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300"
                >
                  <button
                    type="button"
                    onClick={() => onOpenFolder(folder)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    title={`Open ${folder.name}`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 16%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      <FolderIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">
                        {folder.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </span>
                  </button>

                  <ItemMenu
                    menuKey={`folder-${folder.id}`}
                    openMenuKey={openMenuKey}
                    onToggle={(key) =>
                      setOpenMenuKey((current) =>
                        current === key ? null : key,
                      )
                    }
                  >
                    <MenuButton
                      onClick={() => closeMenuAnd(() => onRename(target))}
                    >
                      <FolderPen className="h-4 w-4" aria-hidden="true" />
                      Rename
                    </MenuButton>
                    <MenuButton
                      destructive
                      onClick={() => closeMenuAnd(() => onDelete(target))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </MenuButton>
                  </ItemMenu>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500">
            PDFs
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((document) => {
              const target: ActionTarget = { kind: "document", item: document };

              return (
                <article
                  key={document.id}
                  className="relative flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300"
                >
                  <Link
                    href={`/documents/${document.id}`}
                    className="group flex min-w-0 flex-1 items-center gap-3"
                    title={`Open ${document.originalName}`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                      style={{
                        background:
                          "color-mix(in srgb, var(--danger) 16%, transparent)",
                        color: "var(--danger)",
                      }}
                    >
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900 group-hover:text-blue-700">
                        {document.originalName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {formatPageCount(document.totalPages)} ·{" "}
                        {dateFormatter.format(new Date(document.uploadedAt))}
                      </span>
                    </span>
                  </Link>

                  <ItemMenu
                    menuKey={`document-${document.id}`}
                    openMenuKey={openMenuKey}
                    onToggle={(key) =>
                      setOpenMenuKey((current) =>
                        current === key ? null : key,
                      )
                    }
                  >
                    <MenuButton
                      onClick={() => closeMenuAnd(() => onRename(target))}
                    >
                      <FilePenLine className="h-4 w-4" aria-hidden="true" />
                      Rename
                    </MenuButton>
                    <MenuButton
                      onClick={() =>
                        closeMenuAnd(() => onMoveDocument(document))
                      }
                    >
                      <FileInput className="h-4 w-4" aria-hidden="true" />
                      Move
                    </MenuButton>
                    <MenuButton
                      destructive
                      onClick={() => closeMenuAnd(() => onDelete(target))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </MenuButton>
                  </ItemMenu>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-xl rounded-lg bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            title="Close"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function flattenFolders(
  folders: Folder[],
  parentId: string | null = null,
  depth = 0,
): Array<{ folder: Folder; depth: number }> {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .flatMap((folder) => [
      { folder, depth },
      ...flattenFolders(folders, folder.id, depth + 1),
    ]);
}

export default function LibraryBrowser() {
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameTarget, setRenameTarget] = useState<ActionTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState<DocumentItem | null>(null);
  const [moveFolderId, setMoveFolderId] = useState("");
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ActionTarget | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const currentFolder = folderPath[folderPath.length - 1] ?? null;
  const currentFolderId = currentFolder?.id ?? null;
  const flattenedFolders = flattenFolders(allFolders);

  function refreshContents() {
    setRefreshKey((current) => current + 1);
  }

  function openFolder(folder: FolderPathItem) {
    setFolderPath((currentPath) => [...currentPath, folder]);
  }

  function navigateToPathIndex(index: number) {
    setFolderPath(index < 0 ? [] : folderPath.slice(0, index + 1));
  }

  function openRename(target: ActionTarget) {
    setActionError("");
    setRenameTarget(target);
    setRenameValue(
      target.kind === "folder" ? target.item.name : target.item.originalName,
    );
  }

  async function openMove(document: DocumentItem) {
    setActionError("");
    setMoveTarget(document);
    setMoveFolderId(document.folderId ?? "");
    setFoldersLoading(true);

    try {
      const response = await fetch("/api/folders?all=true");
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Failed to load folders");
        return;
      }

      setAllFolders(data.folders);
    } catch {
      setActionError("Network error. Failed to load folders.");
    } finally {
      setFoldersLoading(false);
    }
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = folderName.trim();
    if (!trimmedName) return;

    setCreatingFolder(true);
    setCreateError("");

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, parentId: currentFolderId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error || "Failed to create folder");
        return;
      }

      setFolderName("");
      setCreateFolderOpen(false);
      refreshContents();
    } catch {
      setCreateError("Network error. Failed to create folder.");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    setActionLoading(true);
    setActionError("");

    const endpoint =
      renameTarget.kind === "folder"
        ? `/api/folders/${renameTarget.item.id}`
        : `/api/documents/${renameTarget.item.id}`;
    const body =
      renameTarget.kind === "folder"
        ? { name: renameValue.trim() }
        : { originalName: renameValue.trim() };

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Failed to rename item");
        return;
      }

      setRenameTarget(null);
      refreshContents();
    } catch {
      setActionError("Network error. Failed to rename item.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMoveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moveTarget) return;

    setActionLoading(true);
    setActionError("");

    try {
      const response = await fetch(`/api/documents/${moveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: moveFolderId || null }),
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Failed to move document");
        return;
      }

      setMoveTarget(null);
      refreshContents();
    } catch {
      setActionError("Network error. Failed to move document.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setActionLoading(true);
    setActionError("");

    const endpoint =
      deleteTarget.kind === "folder"
        ? `/api/folders/${deleteTarget.item.id}`
        : `/api/documents/${deleteTarget.item.id}`;

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Failed to delete item");
        return;
      }

      setDeleteTarget(null);
      refreshContents();
    } catch {
      setActionError("Network error. Failed to delete item.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <h1 className="truncate text-lg font-semibold">LectureNoteAI</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateError("");
                setCreateFolderOpen(true);
              }}
              aria-label="New folder"
              title="New folder"
              className="btn btn-ghost"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">New folder</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              aria-label="Upload PDF"
              title="Upload PDF"
              className="btn btn-primary"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>
            <AISettingsButton scope="library" />
            <ThemeControls />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h2 className="mb-6 text-xl font-semibold">
          {currentFolder?.name ?? "My Library"}
        </h2>
        <LibraryContents
          key={`${currentFolderId ?? "root"}-${refreshKey}`}
          folderId={currentFolderId}
          onOpenFolder={openFolder}
          onRename={openRename}
          onMoveDocument={(document) => void openMove(document)}
          onDelete={(target) => {
            setActionError("");
            setDeleteTarget(target);
          }}
        />
      </div>

      {createFolderOpen && (
        <Modal
          title="New folder"
          onClose={() => {
            if (!creatingFolder) setCreateFolderOpen(false);
          }}
        >
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <label
              htmlFor="folder-name"
              className="block text-sm font-medium text-gray-800"
            >
              Name
              <input
                id="folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                autoFocus
                className="mt-2 h-10 w-full rounded border border-gray-300 px-3 outline-none focus:border-blue-500"
              />
            </label>
            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateFolderOpen(false)}
                disabled={creatingFolder}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingFolder || !folderName.trim()}
                className="btn btn-primary"
              >
                {creatingFolder && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {uploadOpen && (
        <Modal title="Upload PDF" onClose={() => setUploadOpen(false)}>
          <UploadPage
            folderId={currentFolderId}
            navigateAfterUpload={false}
            onUploadComplete={() => {
              setUploadOpen(false);
              refreshContents();
            }}
          />
        </Modal>
      )}

      {renameTarget && (
        <Modal
          title={`Rename ${renameTarget.kind}`}
          onClose={() => {
            if (!actionLoading) setRenameTarget(null);
          }}
        >
          <form onSubmit={handleRename} className="space-y-4">
            <label
              htmlFor="rename-value"
              className="block text-sm font-medium text-gray-800"
            >
              Name
              <input
                id="rename-value"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
                className="mt-2 h-10 w-full rounded border border-gray-300 px-3 outline-none focus:border-blue-500"
              />
            </label>
            {actionError && (
              <p className="text-sm text-red-600">{actionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                disabled={actionLoading}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !renameValue.trim()}
                className="btn btn-primary"
              >
                {actionLoading && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Rename
              </button>
            </div>
          </form>
        </Modal>
      )}

      {moveTarget && (
        <Modal
          title="Move PDF"
          onClose={() => {
            if (!actionLoading) setMoveTarget(null);
          }}
        >
          <form onSubmit={handleMoveDocument} className="space-y-4">
            <p className="truncate text-sm font-medium text-gray-800">
              {moveTarget.originalName}
            </p>
            <label
              htmlFor="move-folder"
              className="block text-sm font-medium text-gray-800"
            >
              Destination
              <select
                id="move-folder"
                value={moveFolderId}
                onChange={(event) => setMoveFolderId(event.target.value)}
                disabled={foldersLoading}
                className="mt-2 h-10 w-full rounded border border-gray-300 bg-white px-3 outline-none focus:border-blue-500"
              >
                <option value="">My Library</option>
                {flattenedFolders.map(({ folder, depth }) => (
                  <option key={folder.id} value={folder.id}>
                    {`${"— ".repeat(depth)}${folder.name}`}
                  </option>
                ))}
              </select>
            </label>
            {foldersLoading && (
              <p className="text-sm text-gray-500">Loading folders...</p>
            )}
            {actionError && (
              <p className="text-sm text-red-600">{actionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                disabled={actionLoading}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || foldersLoading}
                className="btn btn-primary"
              >
                {actionLoading && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Move
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title={`Delete ${deleteTarget.kind}`}
          onClose={() => {
            if (!actionLoading) setDeleteTarget(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {deleteTarget.kind === "document"
                ? `Permanently delete “${deleteTarget.item.originalName}”? Its notes, summaries, and Q&A history will also be deleted.`
                : `Delete “${deleteTarget.item.name}”? Nested folders will be removed, while their PDFs will be moved to My Library.`}
            </p>
            {actionError && (
              <p className="text-sm text-red-600">{actionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={actionLoading}
                className="btn btn-danger"
              >
                {actionLoading && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
