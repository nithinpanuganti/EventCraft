"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventFormData, EventType } from "@/types";
import { Step1Schema, Step2Schema, Step3Schema, Step4Schema } from "@/lib/validations";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalEvent,
  createLocalEvent,
  updateLocalEvent,
  generateAndSaveLocalPlan,
} from "@/lib/storage/local-repository";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { Modal } from "@/components/ui/Modal";
import {
  Sparkles,
  Calendar,
  DollarSign,
  Palette,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  HeartHandshake,
  Cake,
  Users,
  MapPin,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface StepErrors {
  [key: string]: string | undefined;
}

const STEPS = [
  { id: 1, name: "Event Basics", icon: Sparkles },
  { id: 2, name: "Date & Place", icon: Calendar },
  { id: 3, name: "Guests & Budget", icon: DollarSign },
  { id: 4, name: "Style & Needs", icon: Palette },
  { id: 5, name: "Review & Confirm", icon: CheckCircle2 },
];

export function EventWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resumeId");
  const { activeProfile, refreshEvents } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(resumeId);
  const [formData, setFormData] = useState<EventFormData>({
    type: "WEDDING",
    title: "",
    description: "",
    eventDate: "",
    location: "",
    guestCount: 75,
    totalBudget: 150000,
    currency: "INR",
    themePreferences: "",
    culturalPreferences: "",
    dietaryRestrictions: "",
    accessibilityRequirements: "",
    specialInstructions: "",
  });

  const [errors, setErrors] = useState<StepErrors>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!resumeId);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPhase5Modal, setShowPhase5Modal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Monotonic request counter to prevent out-of-order race conditions from overwriting newer edits
  const saveSeqRef = useRef<number>(0);
  const pendingTargetUrl = useRef<string | null>(null);

  // Resume draft loader
  useEffect(() => {
    if (!resumeId) return;

    setLoadingDraft(true);
    getLocalEvent(resumeId)
      .then((ev) => {
        if (!ev) throw new Error("Draft not found");
        setDraftId(ev.id);
        setFormData({
          type: ev.type,
          title: ev.title,
          description: "",
          eventDate: ev.eventDate ? ev.eventDate.split("T")[0] : "",
          location: ev.location || "",
          guestCount: ev.guestCount || 50,
          totalBudget: Number(ev.totalBudget) || 10000,
          currency: ev.currency || "USD",
          themePreferences: ev.preferences?.themePreferences || "",
          culturalPreferences: ev.preferences?.culturalPreferences || "",
          dietaryRestrictions: ev.preferences?.dietaryRestrictions || "",
          accessibilityRequirements: ev.preferences?.accessibilityRequirements || "",
          specialInstructions: ev.preferences?.specialInstructions || "",
        });
        setNotification({
          type: "info",
          title: "Draft Resumed",
          message: `Loaded draft "${ev.title}". You can continue editing your requirements.`,
        });
      })
      .catch(() => {
        setNotification({
          type: "warning",
          title: "Draft Load Issue",
          message: "Could not load the requested draft. Starting a new event configuration.",
        });
      })
      .finally(() => setLoadingDraft(false));
  }, [resumeId]);

  // Warn user before leaving if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle field change with dirty tracking
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "guestCount" || name === "totalBudget"
          ? value === ""
            ? 0
            : Number(value)
          : value,
    }));
    setHasUnsavedChanges(true);
    setServerError(null);

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    setErrors({});
    let result;

    if (currentStep === 1) {
      result = Step1Schema.safeParse({
        type: formData.type,
        title: formData.title,
        description: formData.description,
      });
    } else if (currentStep === 2) {
      result = Step2Schema.safeParse({
        eventDate: formData.eventDate || undefined,
        location: formData.location || undefined,
      });
    } else if (currentStep === 3) {
      result = Step3Schema.safeParse({
        guestCount: formData.guestCount,
        totalBudget: formData.totalBudget,
        currency: formData.currency,
      });
    } else if (currentStep === 4) {
      result = Step4Schema.safeParse({
        themePreferences: formData.themePreferences || undefined,
        culturalPreferences: formData.culturalPreferences || undefined,
        dietaryRestrictions: formData.dietaryRestrictions || undefined,
        accessibilityRequirements: formData.accessibilityRequirements || undefined,
        specialInstructions: formData.specialInstructions || undefined,
      });
    } else {
      return true; // Step 5 review
    }

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const formatted: StepErrors = {};
      Object.entries(fieldErrors).forEach(([key, msgs]) => {
        if (msgs && msgs.length > 0) formatted[key] = msgs[0];
      });
      setErrors(formatted);
      return false;
    }

    return true;
  };

  // Server draft persistence with request sequence ordering
  const saveDraft = useCallback(
    async (silent: boolean = false): Promise<boolean> => {
      if (!formData.title.trim()) {
        if (!silent) {
          setErrors({ title: "Please provide an event title before saving draft." });
        }
        return false;
      }

      setSaveStatus("saving");
      setServerError(null);
      const thisSeq = ++saveSeqRef.current;

      try {
        if (draftId) {
          // Update existing draft in IndexedDB
          await updateLocalEvent(draftId, {
            title: formData.title || "Untitled Draft",
            type: formData.type,
            eventDate: formData.eventDate || null,
            location: formData.location || null,
            guestCount: formData.guestCount || 1,
            totalBudget: formData.totalBudget || 0,
            currency: formData.currency || "USD",
            preferences: {
              themePreferences: formData.themePreferences,
              culturalPreferences: formData.culturalPreferences,
              dietaryRestrictions: formData.dietaryRestrictions,
              accessibilityRequirements: formData.accessibilityRequirements,
              specialInstructions: formData.specialInstructions,
            },
          });
        } else {
          // Create initial draft in IndexedDB
          const profileId = activeProfile?.id || "prof_default";
          const created = await createLocalEvent(
            {
              title: formData.title || "Untitled Draft",
              type: formData.type,
              eventDate: formData.eventDate || null,
              location: formData.location || null,
              guestCount: formData.guestCount || 1,
              totalBudget: formData.totalBudget || 0,
              currency: formData.currency || "USD",
              themePreferences: formData.themePreferences,
              culturalPreferences: formData.culturalPreferences,
              dietaryRestrictions: formData.dietaryRestrictions,
              accessibilityRequirements: formData.accessibilityRequirements,
              specialInstructions: formData.specialInstructions,
            },
            profileId
          );

          if (thisSeq < saveSeqRef.current) return false;
          setDraftId(created.id);
        }

        if (thisSeq < saveSeqRef.current) return false;

        await refreshEvents();
        setSaveStatus("saved");
        setHasUnsavedChanges(false);
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        return true;
      } catch (err: unknown) {
        if (thisSeq < saveSeqRef.current) return false;
        const msg = err instanceof Error ? err.message : "Failed to persist draft locally.";
        setSaveStatus("error");
        setServerError(msg);
        if (!silent) {
          setNotification({
            type: "error",
            title: "Save Failed",
            message: `${msg} Your inputs remain safe in this tab. Click Retry to try again.`,
          });
        }
        return false;
      }
    },
    [formData, draftId, activeProfile, refreshEvents]
  );

  // Debounced autosave effect when form data changes (every 2.5s)
  useEffect(() => {
    if (!hasUnsavedChanges || !formData.title.trim()) return;

    const timer = setTimeout(() => {
      saveDraft(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [formData, hasUnsavedChanges, saveDraft]);

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    // Automatically persist draft at transition
    if (formData.title.trim()) {
      await saveDraft(true);
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepJump = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    } else if (targetStep > currentStep) {
      if (validateCurrentStep()) {
        if (formData.title.trim()) saveDraft(true);
        setCurrentStep(targetStep);
      }
    }
  };

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const handleFinalSubmit = async () => {
    const success = await saveDraft(false);
    if (success) {
      setNotification({
        type: "success",
        title: "Event Requirements Confirmed!",
        message: "Your event draft is stored and ready for GenAI plan generation.",
      });
      router.push("/events");
      router.refresh();
    }
  };

  const handleGeneratePlan = async () => {
    const success = await saveDraft(false);
    if (!success) return;

    const targetId = draftId;
    if (!targetId) {
      setNotification({
        type: "error",
        title: "Save Required",
        message: "Please ensure your event draft is saved before generating a plan.",
      });
      return;
    }

    setIsGeneratingPlan(true);
    try {
      await generateAndSaveLocalPlan(targetId);
      await refreshEvents();

      setNotification({
        type: "success",
        title: "Plan Generated Successfully!",
        message: "Redirecting to your interactive Planner Workspace...",
      });
      router.push(`/planner?eventId=${targetId}`);
      router.refresh();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        title: "Generation Issue",
        message: err instanceof Error ? err.message : "Plan generation failed.",
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (loadingDraft) {
    return (
      <Card className="p-8 text-center space-y-3">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-surface-700">Loading your saved draft...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Confirmation Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Unsaved Changes Warning"
        description="You have edits that haven't been saved to the server yet."
        maxWidth="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExitModal(false)}>
              Stay on Page
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowExitModal(false);
                if (pendingTargetUrl.current) router.push(pendingTargetUrl.current);
              }}
            >
              Leave Without Saving
            </Button>
          </div>
        }
      >
        <p className="text-xs text-surface-600">
          If you leave now, any changes made since your last save at{" "}
          <span className="font-semibold text-surface-900">{lastSavedTime || "start"}</span> will be lost.
          You can click &quot;Save Draft&quot; first to persist your work.
        </p>
      </Modal>

      {/* Phase 5 AI Planning Notice Modal */}
      <Modal
        isOpen={showPhase5Modal}
        onClose={() => setShowPhase5Modal(false)}
        title="Phase 5 AI Generation Coming Soon"
        description="Automated AI planning engine is scheduled for Phase 5."
        maxWidth="md"
        footer={
          <Button size="sm" onClick={() => setShowPhase5Modal(false)}>
            Understood
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-surface-600">
          <p>
            The GenAI Planning Engine will be unlocked in <strong>Phase 5</strong>. It will orchestrate Gemini/OpenAI
            models to transform your structured event requirements into a complete runsheet, category budgets, and vendor checklists.
          </p>
          <div className="rounded-lg bg-surface-50 p-3 border border-surface-200">
            <span className="font-semibold text-surface-900">Current Phase 4 status:</span>
            <p className="mt-1">
              All event parameters, themes, dietary constraints, and budgets are fully validated and persisted in PostgreSQL.
            </p>
          </div>
        </div>
      </Modal>

      {/* Notifications */}
      {notification && (
        <ToastNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Progress & Step Bar */}
      <div className="rounded-2xl glass-card p-4 sm:p-6 shadow-glass specular-top">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-surface-200/50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
                Step {currentStep} of 5
              </span>
              <span className="text-xs text-surface-300">•</span>
              <span className="text-xs font-semibold text-surface-900">
                {STEPS[currentStep - 1].name}
              </span>
            </div>
            <h2 className="text-lg font-bold text-surface-900 mt-0.5 tracking-tight">
              {currentStep === 1 && "Choose Event Type & Title"}
              {currentStep === 2 && "Target Date & Location"}
              {currentStep === 3 && "Guest Headcount & Budget Limit"}
              {currentStep === 4 && "Themes, Dietary & Accessibility"}
              {currentStep === 5 && "Review & Confirm Requirements"}
            </h2>
          </div>

          {/* Draft Persistence Status */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-xs">
                {saveStatus === "saving" && (
                  <span className="text-primary-600 flex items-center gap-1 font-medium">
                    <span className="h-2 w-2 rounded-full bg-primary-600 animate-pulse" />
                    Saving draft...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-success-600 flex items-center gap-1 font-medium">
                    <Check className="h-3.5 w-3.5" />
                    Draft saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-danger-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Save failed
                  </span>
                )}
                {saveStatus === "idle" && hasUnsavedChanges && (
                  <span className="text-amber-600 flex items-center gap-1 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Unsaved edits
                  </span>
                )}
                {saveStatus === "idle" && !hasUnsavedChanges && lastSavedTime && (
                  <span className="text-surface-500 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-success-600" />
                    Up to date
                  </span>
                )}
              </div>
              {lastSavedTime && (
                <span className="text-[10px] text-surface-400">Last saved {lastSavedTime}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {saveStatus === "error" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveDraft(false)}
                  className="gap-1 border-danger-300 text-danger-700 hover:bg-danger-50 shadow-subtle"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Save</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveDraft(false)}
                disabled={saveStatus === "saving"}
                className="gap-1.5 shadow-subtle"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Draft</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Server Error Alert Banner */}
        {serverError && (
          <div className="mt-3 rounded-xl border border-danger-200 bg-danger-50/90 p-3 text-xs text-danger-700 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="font-semibold underline hover:text-danger-900 ml-3"
            >
              Retry
            </button>
          </div>
        )}

        {/* Step Indicator Tracker with accessible button elements */}
        <div className="grid grid-cols-5 gap-2 pt-4" role="tablist" aria-label="Wizard Steps">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;

            return (
              <button
                type="button"
                role="tab"
                key={step.id}
                aria-selected={isCurrent}
                aria-label={`Step ${step.id}: ${step.name}`}
                onClick={() => handleStepJump(step.id)}
                className={`flex flex-col items-center gap-1.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl p-1.5 ${
                  step.id <= currentStep ? "cursor-pointer hover:opacity-85" : "cursor-not-allowed opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white ring-4 ring-primary-100 shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
                      : isCompleted
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-surface-100/80 text-surface-400 border border-surface-200/60"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`hidden text-[11px] font-medium sm:inline ${
                    isCurrent
                      ? "text-primary-700 font-bold"
                      : isCompleted
                      ? "text-surface-700 font-medium"
                      : "text-surface-400"
                  }`}
                >
                  {step.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: EVENT BASICS */}
      {currentStep === 1 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Select Event Type & Name</CardTitle>
            <CardDescription>
              EventCraft AI configures milestone timelines, budget allocations, and checklist
              categories based on the event profile.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Event Type Options">
              {[
                {
                  type: "WEDDING",
                  title: "Wedding",
                  desc: "Ceremonies, banquets, photographer coordination, and runsheets.",
                  icon: HeartHandshake,
                },
                {
                  type: "BIRTHDAY",
                  title: "Birthday / Anniversary",
                  desc: "Milestones, activities, entertainment, catering, and guest lists.",
                  icon: Cake,
                },
                {
                  type: "COMMUNITY",
                  title: "Community Event",
                  desc: "Festivals, fundraisers, volunteer delegation, and permits.",
                  icon: Users,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = formData.type === opt.type;
                return (
                  <button
                    type="button"
                    key={opt.type}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setFormData((p) => ({ ...p, type: opt.type as EventType }));
                      setHasUnsavedChanges(true);
                    }}
                    className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      isSelected
                        ? "border-primary-500 bg-primary-50/75 shadow-glass-subtle ring-2 ring-primary-400/25 backdrop-blur-md"
                        : "border-surface-200/80 bg-white/65 hover:bg-white/90 hover:border-surface-300/90 backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-primary-600 text-white"
                            : "bg-surface-100 text-surface-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {isSelected && (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-3 font-bold text-surface-900 text-sm">{opt.title}</div>
                    <p className="mt-1 text-xs text-surface-500 leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 pt-2">
              <Input
                label="Event Name"
                required
                name="title"
                placeholder="e.g. Maya & Liam's Sunset Garden Wedding"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                helperText="A clear, identifiable title for your event plan (minimum 3 characters)."
              />

              <Textarea
                label="Short Description (Optional)"
                rows={2}
                name="description"
                placeholder="Brief summary of what this celebration is about..."
                value={formData.description || ""}
                onChange={handleChange}
                error={errors.description}
                helperText="Optional context to help frame your recommendations."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: DATE & LOCATION */}
      {currentStep === 2 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Schedule & Venue</CardTitle>
            <CardDescription>
              Set target timeline parameters. You can leave the date unconfirmed if you are in early
              concept planning.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Event Date"
                type="date"
                name="eventDate"
                value={formData.eventDate || ""}
                onChange={handleChange}
                error={errors.eventDate}
                helperText="Dates must be today or in the future. Leave blank if date is unconfirmed."
              />

              <Input
                label="Location / Venue Setting"
                name="location"
                placeholder="e.g. Austin Botanical Gardens, TX (or 'TBD Outdoor')"
                value={formData.location || ""}
                onChange={handleChange}
                error={errors.location}
                helperText="City, park, banquet hall, or general setting. Confirmed venue is not required."
              />
            </div>

            <div className="rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass-subtle p-4 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
              <div className="text-xs text-surface-600">
                <span className="font-semibold text-surface-900">Planning Tip:</span> Providing an
                approximate city or venue style allows the future AI engine to recommend seasonal
                color palettes and weather contingencies.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: HEADCOUNT & BUDGET */}
      {currentStep === 3 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Guest Count & Total Budget</CardTitle>
            <CardDescription>
              Establishes the boundary for deterministic calculations and catering cost benchmarks.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Input
                label="Estimated Guests"
                required
                type="number"
                min="1"
                max="50000"
                name="guestCount"
                value={formData.guestCount || ""}
                onChange={handleChange}
                error={errors.guestCount}
                helperText="Expected attendee headcount (1 to 50,000)."
              />

              <Input
                label="Total Target Budget"
                required
                type="number"
                min="0"
                step="50"
                name="totalBudget"
                value={formData.totalBudget !== undefined ? formData.totalBudget : ""}
                onChange={handleChange}
                error={errors.totalBudget}
                helperText="Non-negative monetary cap."
              />

              <Select
                label="Currency"
                required
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                options={[
                  { value: "INR", label: "INR (₹) - Indian Rupee" },
                  { value: "USD", label: "USD ($) - US Dollar" },
                  { value: "EUR", label: "EUR (€) - Euro" },
                  { value: "GBP", label: "GBP (£) - British Pound" },
                  { value: "CAD", label: "CAD ($) - Canadian Dollar" },
                  { value: "AUD", label: "AUD ($) - Australian Dollar" },
                ]}
              />
            </div>

            {formData.guestCount > 0 && formData.totalBudget > 0 && (
              <div className="rounded-xl border border-primary-200/60 bg-primary-50/50 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-primary-900">
                  <span>Estimated Budget Per Guest:</span>
                  <span className="text-sm font-bold font-mono">
                    {formData.currency}{" "}
                    {(formData.totalBudget / formData.guestCount).toFixed(2)} / guest
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: PREFERENCES & REQUIREMENTS */}
      {currentStep === 4 && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Theme, Preferences & Requirements</CardTitle>
            <CardDescription>
              Tailor creative recommendations, dietary catering considerations, and accessibility accommodations.
              These preferences personalize future AI planning suggestions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Theme & Style Keywords"
                name="themePreferences"
                placeholder="e.g. Bohemian Minimalist, Warm Lighting, Earthy tones"
                value={formData.themePreferences || ""}
                onChange={handleChange}
                error={errors.themePreferences}
                helperText="Colors, aesthetic vibes, or ambiance preferences."
              />

              <Input
                label="Cultural or Event-Specific Preferences"
                name="culturalPreferences"
                placeholder="e.g. Traditional tea ceremony, Sangeet night, Eco-friendly zero waste"
                value={formData.culturalPreferences || ""}
                onChange={handleChange}
                error={errors.culturalPreferences}
                helperText="Cultural traditions or custom ceremonies to honor."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Dietary Requirements"
                name="dietaryRestrictions"
                placeholder="e.g. 5 Vegan, 2 Nut Allergies, Halal"
                value={formData.dietaryRestrictions || ""}
                onChange={handleChange}
                error={errors.dietaryRestrictions}
                helperText="High-level catering restrictions for headcount."
              />

              <Input
                label="Accessibility Requirements"
                name="accessibilityRequirements"
                placeholder="e.g. Step-free wheelchair access, ASL interpreter"
                value={formData.accessibilityRequirements || ""}
                onChange={handleChange}
                error={errors.accessibilityRequirements}
                helperText="Accommodations required for venue selection."
              />
            </div>

            <Textarea
              label="Additional Instructions or Notes"
              rows={3}
              name="specialInstructions"
              placeholder="Any must-have traditions, special musical requests, or sponsor requirements..."
              value={formData.specialInstructions || ""}
              onChange={handleChange}
              error={errors.specialInstructions}
              helperText="Do not enter sensitive personal info like payment cards or government IDs."
            />
          </CardContent>
        </Card>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {currentStep === 5 && (
        <Card className="space-y-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Event Requirements</CardTitle>
                <CardDescription>
                  Review collected information. You can edit any section before saving.
                </CardDescription>
              </div>
              <Badge variant="primary">Ready to Confirm</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            {/* Section 1 Review */}
            <div className="rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass-subtle p-4">
              <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                <span className="font-bold text-surface-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-600" /> Event Identity
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-surface-500">Event Title:</span>{" "}
                  <span className="font-semibold text-surface-900">{formData.title}</span>
                </div>
                <div>
                  <span className="text-surface-500">Event Type:</span>{" "}
                  <span className="font-semibold text-surface-900">{formData.type}</span>
                </div>
                {formData.description && (
                  <div className="sm:col-span-2">
                    <span className="text-surface-500">Description:</span>{" "}
                    <span className="text-surface-800">{formData.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2 Review */}
            <div className="rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass-subtle p-4">
              <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                <span className="font-bold text-surface-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary-600" /> Schedule & Venue
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-surface-500">Target Date:</span>{" "}
                  <span className="font-semibold text-surface-900">
                    {formData.eventDate || "Unconfirmed / Early Draft"}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500">Location:</span>{" "}
                  <span className="font-semibold text-surface-900">
                    {formData.location || "TBD"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3 Review */}
            <div className="rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass-subtle p-4">
              <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                <span className="font-bold text-surface-900 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary-600" /> Scope & Budget
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-surface-500">Guest Count:</span>{" "}
                  <span className="font-semibold text-surface-900">
                    {formData.guestCount} attendees
                  </span>
                </div>
                <div>
                  <span className="text-surface-500">Total Budget:</span>{" "}
                  <span className="font-semibold text-surface-900">
                    {formData.currency} {Number(formData.totalBudget).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4 Review */}
            <div className="rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass-subtle p-4">
              <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                <span className="font-bold text-surface-900 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary-600" /> Preferences & Accommodations
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-surface-500">Theme Keywords:</span>{" "}
                  <span className="text-surface-900">
                    {formData.themePreferences || "None specified (AI will suggest best matches)"}
                  </span>
                </div>
                {formData.culturalPreferences && (
                  <div>
                    <span className="text-surface-500">Cultural Preferences:</span>{" "}
                    <span className="text-surface-900">{formData.culturalPreferences}</span>
                  </div>
                )}
                {formData.dietaryRestrictions && (
                  <div>
                    <span className="text-surface-500">Dietary Needs:</span>{" "}
                    <span className="text-surface-900">{formData.dietaryRestrictions}</span>
                  </div>
                )}
                {formData.accessibilityRequirements && (
                  <div>
                    <span className="text-surface-500">Accessibility:</span>{" "}
                    <span className="text-surface-900">
                      {formData.accessibilityRequirements}
                    </span>
                  </div>
                )}
                {formData.specialInstructions && (
                  <div>
                    <span className="text-surface-500">Additional Instructions:</span>{" "}
                    <span className="text-surface-900">{formData.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Generator Notice with action button */}
            <div className="rounded-2xl glass-card-accent p-5 flex items-start justify-between gap-4 shadow-glass-subtle">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
                <div className="text-xs text-primary-900 space-y-1">
                  <p className="font-bold">GenAI Planning Engine Active:</p>
                  <p>
                    Clicking &quot;Generate AI Event Plan&quot; validates your parameters, synthesizes tailored theme
                    directions, balances category budgets with integer cents math, and builds your operational runsheet.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-surface-200/80 pt-4">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Previous Step</span>
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {currentStep < 5 ? (
            <Button onClick={handleNext} className="gap-2">
              <span>Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan || saveStatus === "saving"}
                className="gap-2 shadow-glass font-semibold"
              >
                <Sparkles className={`h-4 w-4 ${isGeneratingPlan ? "animate-spin" : ""}`} />
                <span>{isGeneratingPlan ? "Generating Plan..." : "Generate AI Event Plan"}</span>
              </Button>
              <Button
                onClick={handleFinalSubmit}
                variant="outline"
                disabled={isGeneratingPlan}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Draft & Exit</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
