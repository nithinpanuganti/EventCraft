"use client";

import React, { useState, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthContext";
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  resetAllLocalData,
} from "@/lib/storage/indexed-db";
import {
  Shield,
  Cpu,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle Export Backup to JSON file
  const handleExportBackup = async () => {
    try {
      setExporting(true);
      setStatusMessage(null);
      const backup = await exportDatabaseBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `eventcraft-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "Backup exported successfully. Keep this file safe for data recovery.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export local backup.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setExporting(false);
    }
  };

  // Handle Import Backup from JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setStatusMessage(null);

      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Malformed JSON file. Please provide a valid EventCraft backup JSON file.");
      }

      const result = await importDatabaseBackup(parsed);
      const totalRecords = Object.values(result.recordCounts).reduce((a, b) => a + b, 0);

      setStatusMessage({
        type: "success",
        text: `Backup restored successfully! ${totalRecords} records restored across events, tasks, vendors, and budget.`,
      });

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh page after short delay so context re-reads local data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import backup.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setImporting(false);
    }
  };

  // Handle Complete Data Reset
  const handleResetData = async () => {
    const confirmed = window.confirm(
      "WARNING: This will permanently delete all local events, budgets, tasks, vendors, and plans stored in this browser.\n\nAre you sure you wish to reset all local storage?"
    );
    if (!confirmed) return;

    try {
      await resetAllLocalData();
      setStatusMessage({
        type: "success",
        text: "All local data has been reset to an empty state. Reloading...",
      });
      setTimeout(() => {
        window.location.href = "/register";
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset local database.";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12 animate-page-enter">
      <PageHeader
        title="Settings & Local Storage"
        description="Manage your local browser profile, persistent IndexedDB storage, and backup export/restore."
      />

      {statusMessage && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-xs shadow-sm border ${
            statusMessage.type === "success"
              ? "border-emerald-500/20 bg-emerald-50/80 text-emerald-900"
              : "border-rose-500/20 bg-rose-50/80 text-rose-900"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid gap-6">
        {/* Active Local Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-surface-900">
                <User className="h-4 w-4 text-primary-600" />
                <CardTitle>Active Browser Profile</CardTitle>
              </div>
              <Badge variant="primary">Local Only</Badge>
            </div>
            <CardDescription>
              Local profiles are saved within this browser&apos;s IndexedDB and do not transmit data to any external server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-surface-700">
            {user ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500">Profile Name</span>
                  <span className="font-semibold text-surface-900">{user.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500">Local Identifier</span>
                  <span className="font-mono text-xs text-surface-700">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500">Created On</span>
                  <span className="text-xs text-surface-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-300 p-4 text-xs text-surface-500 text-center">
                No active profile loaded.
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Switch Profile
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary" size="sm">
                  Create New Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Local Storage & Backup Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-surface-900">
                <Database className="h-4 w-4 text-primary-600" />
                <CardTitle>IndexedDB Backup & Restore</CardTitle>
              </div>
              <Badge variant="success">Versioned JSON Schema</Badge>
            </div>
            <CardDescription>
              Export your events, budget ledgers, and task schedules to a local JSON file or restore from a previous backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Export */}
              <div className="rounded-xl border border-surface-200/80 bg-white/50 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 flex items-center gap-1.5 mb-1">
                    <Download className="h-3.5 w-3.5 text-primary-600" />
                    Export Local Data
                  </h4>
                  <p className="text-[11px] text-surface-500 mb-3">
                    Downloads a complete backup JSON file containing all profiles, events, plans, tasks, vendors, and expenses.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExportBackup}
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? "Generating Backup..." : "Export Backup (.json)"}
                </Button>
              </div>

              {/* Import */}
              <div className="rounded-xl border border-surface-200/80 bg-white/50 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 flex items-center gap-1.5 mb-1">
                    <Upload className="h-3.5 w-3.5 text-primary-600" />
                    Restore From Backup
                  </h4>
                  <p className="text-[11px] text-surface-500 mb-3">
                    Restores event plans and ledgers from a valid EventCraft backup JSON file into this browser.
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    className="hidden"
                    id="import-backup-file"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="w-full"
                  >
                    {importing ? "Restoring Data..." : "Choose Backup File"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Clear Database Danger Zone */}
            <div className="pt-2 border-t border-surface-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-surface-800">Clear Local Database</span>
                <p className="text-[11px] text-surface-400">
                  Wipes all IndexedDB object stores on this browser.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetData}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Architecture & Zero-API Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-surface-900">
              <Cpu className="h-4 w-4 text-primary-600" />
              <CardTitle>Architecture & Zero-API Status</CardTitle>
            </div>
            <CardDescription>
              Runtime verification that application logic operates exclusively in the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-surface-700">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Architecture Mode</span>
              <Badge variant="success">Zero-API Local-Only (Active)</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Persistence Engine</span>
              <Badge variant="primary">Browser IndexedDB (eventcraft_local_db v1)</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Planning & Rules Engine</span>
              <Badge variant="success">Deterministic Rule Engine (No Cloud AI APIs)</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Conversational Assistant</span>
              <Badge variant="primary">Deterministic Command Interpreter</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Runtime Network APIs</span>
              <Badge variant="success">0 HTTP / Backend Requests</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy Directives */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-surface-900">
              <Shield className="h-4 w-4 text-success-600" />
              <CardTitle>Security & Privacy Limitations</CardTitle>
            </div>
            <CardDescription>Explicit transparency regarding browser-local execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-surface-600 leading-relaxed">
            <p className="flex items-start gap-2">
              <span className="font-semibold text-surface-800">&bull; Local Data Boundary:</span> All event details, budgets, tasks, and vendors exist solely within this browser&apos;s IndexedDB storage.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-semibold text-surface-800">&bull; No Multi-User Security Isolation:</span> Browser profiles are convenience workspaces for organizing plans. Any user with administrative access to this computer or browser developer tools can inspect the IndexedDB data.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-semibold text-surface-800">&bull; Zero External Network Exposure:</span> No passwords, financial records, guest counts, or event schedules are transmitted to external servers, cloud databases, or third-party AI endpoints.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
