"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalEvent,
  LocalVenueLayoutElement,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalVenueLayouts,
  saveLocalVenueLayout,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Save,
  Printer,
  Grid,
  Plus,
  Layers,
  Circle,
  Square,
  Maximize2,
  Minimize2,
  Music,
  Flame,
  Utensils,
  Wine,
  Sparkles,
} from "lucide-react";

type ElementType = LocalVenueLayoutElement["type"];

interface ElementTemplate {
  type: ElementType;
  label: string;
  width: number;
  height: number;
  color: string;
  icon: React.ElementType;
}

const ELEMENT_TEMPLATES: ElementTemplate[] = [
  { type: "STAGE", label: "Main Stage", width: 140, height: 70, color: "#8b5cf6", icon: Sparkles },
  { type: "DANCE_FLOOR", label: "Dance Floor", width: 120, height: 120, color: "#ec4899", icon: Music },
  { type: "TABLE_ROUND", label: "Round Table (10)", width: 64, height: 64, color: "#3b82f6", icon: Circle },
  { type: "TABLE_RECT", label: "Head Banquet Table", width: 110, height: 50, color: "#06b6d4", icon: Square },
  { type: "FOOD_COUNTER", label: "Buffet Station", width: 130, height: 45, color: "#f59e0b", icon: Utensils },
  { type: "BAR", label: "Cocktail Bar", width: 90, height: 45, color: "#10b981", icon: Wine },
  { type: "AUDIO_BOOTH", label: "DJ & Sound Booth", width: 60, height: 50, color: "#6366f1", icon: Music },
  { type: "EMERGENCY_EXIT", label: "Fire Exit", width: 50, height: 30, color: "#ef4444", icon: Flame },
];

function VenueLayoutContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);

  // Layout states
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("Grand Hall Master Plan");
  const [elements, setElements] = useState<LocalVenueLayoutElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Canvas Viewport Controls
  const [zoom, setZoom] = useState(1);
  const [gridSnap, setGridSnap] = useState(true);
  const [draggedElement, setDraggedElement] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Load layouts for selected event
  const loadLayouts = async (eventId: string) => {
    if (!eventId) return;
    try {
      const list = await getLocalVenueLayouts(eventId);
      if (list.length > 0) {
        const active = list[0];
        setActiveLayoutId(active.id);
        setLayoutName(active.name);
        setElements(active.elements || []);
      } else {
        // Provide starter layout
        setActiveLayoutId(null);
        setLayoutName("Grand Hall Master Plan");
        setElements([
          {
            id: "el-stage",
            type: "STAGE",
            label: "Main Stage",
            x: 230,
            y: 40,
            width: 160,
            height: 70,
            rotation: 0,
            color: "#8b5cf6",
          },
          {
            id: "el-dance",
            type: "DANCE_FLOOR",
            label: "Dance Floor",
            x: 250,
            y: 140,
            width: 120,
            height: 120,
            rotation: 0,
            color: "#ec4899",
          },
          {
            id: "el-tbl-1",
            type: "TABLE_ROUND",
            label: "Table 1 (VIP)",
            x: 100,
            y: 160,
            width: 64,
            height: 64,
            rotation: 0,
            color: "#3b82f6",
          },
          {
            id: "el-tbl-2",
            type: "TABLE_ROUND",
            label: "Table 2",
            x: 450,
            y: 160,
            width: 64,
            height: 64,
            rotation: 0,
            color: "#3b82f6",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadLayouts(selectedEventId);
    }
  }, [selectedEventId]);

  // Add Element from Toolbox
  const handleAddElement = (tpl: ElementTemplate) => {
    const newEl: LocalVenueLayoutElement = {
      id: `el-${Date.now()}`,
      type: tpl.type,
      label: tpl.label,
      x: 200 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      width: tpl.width,
      height: tpl.height,
      rotation: 0,
      color: tpl.color,
    };
    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
  };

  // Drag handlers
  const handleMouseDownElement = (e: React.MouseEvent, el: LocalVenueLayoutElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;

    setDraggedElement({
      id: el.id,
      offsetX: (e.clientX - canvasBounds.left) / zoom - el.x,
      offsetY: (e.clientY - canvasBounds.top) / zoom - el.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedElement) return;
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;

    let newX = (e.clientX - canvasBounds.left) / zoom - draggedElement.offsetX;
    let newY = (e.clientY - canvasBounds.top) / zoom - draggedElement.offsetY;

    if (gridSnap) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    setElements((prev) =>
      prev.map((el) => (el.id === draggedElement.id ? { ...el, x: Math.max(0, newX), y: Math.max(0, newY) } : el))
    );
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
  };

  // Element transformations
  const handleRotateSelected = () => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedElementId ? { ...el, rotation: (el.rotation + 45) % 360 } : el
      )
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleResize = (delta: number) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedElementId
          ? {
              ...el,
              width: Math.max(30, el.width + delta),
              height: Math.max(30, el.height + delta),
            }
          : el
      )
    );
  };

  // Save to IndexedDB
  const handleSave = async () => {
    if (!selectedEventId) return;
    try {
      await saveLocalVenueLayout({
        eventId: selectedEventId,
        id: activeLayoutId || undefined,
        name: layoutName,
        version: 1,
        dimensions: { width: 40, height: 30, unit: "METERS" },
        elements,
        isDefault: true,
      });
      setNotification({
        type: "success",
        title: "Floorplan Saved",
        message: "Venue layout diagram persisted to local database.",
      });
      await loadLayouts(selectedEventId);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "Failed to persist layout.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

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
              Venue Layout Designer
            </h1>
            <Badge variant="primary" size="sm">2D Spatial Engine</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Interactive drag-and-drop floorplan mapper with collision guides, stage positioning, and export.
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
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Layout</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Floorplan</span>
          </Button>
        </div>
      </div>

      {/* Workspace: Toolbox + Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Toolbox (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card variant="elevated" className="p-4 specular-top space-y-3">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary-500" />
              <span>Spatial Elements</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {ELEMENT_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => handleAddElement(tpl)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/60 dark:border-white/10 glass-surface-subtle hover:border-primary-500/50 hover:bg-primary-500/10 text-xs transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
                        style={{ backgroundColor: tpl.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-surface-800 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {tpl.label}
                      </span>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-surface-400 group-hover:text-primary-600" />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected Element Controls */}
          {selectedElement && (
            <Card variant="default" className="p-4 space-y-3 border-primary-500/30 ring-1 ring-primary-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-surface-900 truncate">
                  {selectedElement.label}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="p-1 text-surface-400 hover:text-rose-500 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotateSelected}
                  className="flex items-center justify-center gap-1 px-2"
                  title="Rotate 45°"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>45°</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResize(15)}
                  className="flex items-center justify-center gap-1 px-2"
                  title="Enlarge"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>+Size</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResize(-15)}
                  className="flex items-center justify-center gap-1 px-2"
                  title="Shrink"
                >
                  <Minimize2 className="h-3 w-3" />
                  <span>-Size</span>
                </Button>
              </div>

              <div className="text-[11px] text-surface-500 space-y-0.5 pt-1 border-t border-surface-200/50 dark:border-surface-800/50">
                <div>Position: ({Math.round(selectedElement.x)}, {Math.round(selectedElement.y)})</div>
                <div>Dimensions: {Math.round(selectedElement.width)} × {Math.round(selectedElement.height)}px</div>
              </div>
            </Card>
          )}
        </div>

        {/* Canvas Workspace (9 cols) */}
        <div className="lg:col-span-9 space-y-3">
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between p-2 rounded-2xl glass-surface-subtle border border-white/60 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                className="font-bold bg-transparent border-b border-dashed border-surface-400 focus:outline-none px-1 text-surface-900"
              />
              <Badge variant="outline" size="sm">
                {elements.length} elements placed
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGridSnap(!gridSnap)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                  gridSnap
                    ? "bg-primary-500/15 border-primary-500/40 text-primary-600 font-bold"
                    : "border-surface-200 dark:border-surface-700 text-surface-400"
                }`}
                title="Toggle Snap to Grid (20px)"
              >
                <Grid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid Snap</span>
              </button>

              <button
                type="button"
                onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 hover:text-surface-900"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold text-surface-600 text-[11px] w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(1.6, zoom + 0.1))}
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 hover:text-surface-900"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive 2D Stage Canvas */}
          <Card
            variant="elevated"
            className="p-0 overflow-hidden specular-top border-white/60 dark:border-white/10"
          >
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={() => setSelectedElementId(null)}
              className="relative w-full h-[540px] bg-surface-50 dark:bg-surface-950/80 cursor-crosshair overflow-hidden select-none"
              style={{
                backgroundImage: gridSnap
                  ? "radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)"
                  : "none",
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              }}
            >
              {/* Outer boundary perimeter notice */}
              <div className="absolute top-2 left-3 text-[10px] uppercase font-bold text-surface-400 tracking-wider">
                Stage & Perimeter Boundary (40m × 30m scale)
              </div>

              {/* Elements rendering */}
              {elements.map((el) => {
                const isSelected = selectedElementId === el.id;
                const isRound = el.type === "TABLE_ROUND";

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDownElement(e, el)}
                    style={{
                      left: el.x * zoom,
                      top: el.y * zoom,
                      width: el.width * zoom,
                      height: el.height * zoom,
                      transform: `rotate(${el.rotation}deg)`,
                      backgroundColor: `${el.color}25`,
                      borderColor: el.color,
                      color: el.color,
                    }}
                    className={`absolute flex flex-col items-center justify-center p-1 text-center cursor-move border-2 transition-shadow ${
                      isRound ? "rounded-full" : "rounded-2xl"
                    } ${
                      isSelected
                        ? "ring-2 ring-primary-500 shadow-glass-glow z-20 font-bold"
                        : "shadow-xs hover:border-primary-400 z-10"
                    }`}
                  >
                    <span className="text-[10px] font-bold truncate max-w-full px-1">
                      {el.label}
                    </span>
                    <span className="text-[8px] opacity-75">
                      {Math.round(el.width / 5)}m
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function VenueLayoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <VenueLayoutContent />
    </Suspense>
  );
}
