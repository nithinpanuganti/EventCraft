"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalDocument,
  DocumentCategory,
  LocalEvent,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalDocuments,
  createLocalDocument,
  deleteLocalDocument,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  FileCheck,
  Shield,
  FileSpreadsheet,
  Receipt,
  FileCode,
  HardDrive,
  X,
  Search,
} from "lucide-react";

const CATEGORY_ICONS: Record<DocumentCategory, React.ElementType> = {
  CONTRACT: FileCheck,
  PERMIT: Shield,
  FLOOR_PLAN: FileCode,
  INVOICE: FileSpreadsheet,
  RECEIPT: Receipt,
  RUNSHEET: FileText,
  OTHER: FileText,
};

const CATEGORIES: DocumentCategory[] = [
  "CONTRACT",
  "PERMIT",
  "FLOOR_PLAN",
  "INVOICE",
  "RECEIPT",
  "RUNSHEET",
  "OTHER",
];

function DocumentsContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<DocumentCategory>("CONTRACT");
  const [docNotes, setDocNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const evts = await listLocalEvents();
        setAvailableEvents(evts);
        const defaultEvt = evts.find((e) => e.id === activeEvent?.id) || evts[0];
        if (defaultEvt) {
          setSelectedEventId(defaultEvt.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, [activeEvent]);

  const loadDocs = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const list = await getLocalDocuments(eventId);
      setDocuments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadDocs(selectedEventId);
    }
  }, [selectedEventId]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.notes && d.notes.toLowerCase().includes(q));

      const matchesCat = categoryFilter === "ALL" || d.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, categoryFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !selectedFile || !selectedEventId) return;

    try {
      await createLocalDocument({
        eventId: selectedEventId,
        title: docTitle.trim(),
        category: docCategory,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileData: selectedFile.base64,
        uploadedBy: "Organizer",
        notes: docNotes.trim() || undefined,
      });

      setNotification({
        type: "success",
        title: "Document Vaulted",
        message: `${selectedFile.name} saved directly to browser IndexedDB.`,
      });

      setIsUploadOpen(false);
      setDocTitle("");
      setDocNotes("");
      setSelectedFile(null);
      await loadDocs(selectedEventId);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Vault Error",
        message: "Failed to store document in local database.",
      });
    }
  };

  const handleDownload = (doc: LocalDocument) => {
    if (!doc.fileData) return;
    try {
      const a = document.createElement("a");
      a.href = doc.fileData;
      a.download = `${doc.title}.${doc.fileType.split("/")[1] || "dat"}`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Permanently remove "${title}" from local vault?`)) return;
    try {
      await deleteLocalDocument(docId);
      await loadDocs(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
      {notification && (
        <ToastNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Documents & Contracts Vault
            </h1>
            <Badge variant="primary" size="sm">Encrypted Local Storage</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Secure browser-local repository for event permits, signed vendor agreements, and receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableEvents.length > 1 && (
            <select
              aria-label="Select Active Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 shadow-sm"
            >
              {availableEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Store Document</span>
          </Button>
        </div>
      </div>

      {/* Storage disclosure notice */}
      <div className="glass-surface-subtle rounded-2xl p-4 border border-white/60 dark:border-white/10 text-xs text-surface-600 flex items-start gap-3 shadow-glass-subtle">
        <HardDrive className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-surface-900">Zero Cloud Uploads:</span> All vaulted documents are serialized directly into your browser&apos;s IndexedDB database. Files never leave your local computer.
        </div>
      </div>

      {/* Filter and Search */}
      <Card variant="default" className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search documents by name, filename, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <select
          aria-label="Filter by Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Card>

      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => {
            const Icon = CATEGORY_ICONS[doc.category] || FileText;
            return (
              <Card
                key={doc.id}
                variant="elevated"
                className="p-5 specular-top flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <h3 className="font-bold text-sm text-surface-900 truncate">
                          {doc.title}
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400">
                          {doc.category}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm">
                      {formatFileSize(doc.fileSize)}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-500/5 border border-white/10 text-xs text-surface-600 space-y-1">
                    <div className="truncate text-surface-800 font-semibold">
                      Type: {doc.fileType}
                    </div>
                    <div className="text-[11px] text-surface-400">
                      Vaulted: {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                    {doc.notes && (
                      <p className="text-[11px] text-surface-500 pt-1 line-clamp-2">
                        {doc.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1.5 text-surface-400 hover:text-rose-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    title="Delete File"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-3 py-12 text-center text-xs text-surface-400">
            <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
            No documents stored in this vault. Click &ldquo;Store Document&rdquo; to add your files.
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-doc-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsUploadOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 id="upload-doc-modal-title" className="font-bold text-surface-900">Store Document in Vault</h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-surface-400 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary-500/40 hover:border-primary-500 p-6 rounded-2xl text-center cursor-pointer bg-primary-500/5 transition-all"
              >
                <Upload className="h-8 w-8 text-primary-500 mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <div className="font-bold text-xs text-surface-900">{selectedFile.name}</div>
                    <div className="text-[11px] text-surface-500">{formatFileSize(selectedFile.size)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-xs text-surface-900">Choose file to vault</div>
                    <div className="text-[10px] text-surface-400">PDF, JPG, PNG, DOCX, XLSX (Stored in browser)</div>
                  </div>
                )}
              </div>

              <Input
                label="Document Title"
                required
                placeholder="e.g. Venue Rental Agreement"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Notes / Description (Optional)"
                placeholder="e.g. Countersigned on 12/01"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile}
                  className="shadow-glass-glow"
                >
                  Save to Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}
