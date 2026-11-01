"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalEmergencyContact,
  EmergencyContactCategory,
  LocalEvent,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalEmergencyContacts,
  createLocalEmergencyContact,
  updateLocalEmergencyContact,
  deleteLocalEmergencyContact,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  PhoneCall,
  Phone,
  Shield,
  Flame,
  Activity,
  Building,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
} from "lucide-react";

const CATEGORY_CONFIG: Record<
  EmergencyContactCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  POLICE: { label: "Police / Law Enforcement", icon: Shield, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  FIRE: { label: "Fire & Rescue Department", icon: Flame, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" },
  MEDICAL: { label: "Medical / Paramedic Team", icon: Activity, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  SECURITY: { label: "Venue Security & Bouncers", icon: Shield, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30" },
  VENUE: { label: "Facility / Venue Operations", icon: Building, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  KEY_ORGANIZER: { label: "Lead Event Directors", icon: UserCheck, color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
};

const CATEGORIES: EmergencyContactCategory[] = [
  "POLICE",
  "FIRE",
  "MEDICAL",
  "SECURITY",
  "VENUE",
  "KEY_ORGANIZER",
];

function EmergencyContactsContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [contacts, setContacts] = useState<LocalEmergencyContact[]>([]);
  const [, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetContact, setTargetContact] = useState<LocalEmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "Emergency Coordinator",
    organization: "",
    phone: "",
    alternatePhone: "",
    category: "SECURITY" as EmergencyContactCategory,
    notes: "",
  });

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

  const loadContacts = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const list = await getLocalEmergencyContacts(eventId);
      setContacts(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadContacts(selectedEventId);
    }
  }, [selectedEventId]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.organization.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);

      const matchesCat = categoryFilter === "ALL" || c.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [contacts, searchQuery, categoryFilter]);

  const handleOpenAdd = () => {
    setTargetContact(null);
    setFormData({
      name: "",
      role: "Emergency Coordinator",
      organization: "",
      phone: "",
      alternatePhone: "",
      category: "SECURITY",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: LocalEmergencyContact) => {
    setTargetContact(c);
    setFormData({
      name: c.name,
      role: c.role,
      organization: c.organization,
      phone: c.phone,
      alternatePhone: c.alternatePhone || "",
      category: c.category,
      notes: c.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !selectedEventId) return;

    try {
      if (targetContact) {
        await updateLocalEmergencyContact(targetContact.id, {
          name: formData.name.trim(),
          role: formData.role.trim(),
          organization: formData.organization.trim(),
          phone: formData.phone.trim(),
          alternatePhone: formData.alternatePhone.trim() || undefined,
          category: formData.category,
          notes: formData.notes.trim() || undefined,
        });
        setNotification({
          type: "success",
          title: "Contact Updated",
          message: `${formData.name} was updated.`,
        });
      } else {
        await createLocalEmergencyContact({
          eventId: selectedEventId,
          name: formData.name.trim(),
          role: formData.role.trim(),
          organization: formData.organization.trim(),
          phone: formData.phone.trim(),
          alternatePhone: formData.alternatePhone.trim() || undefined,
          category: formData.category,
          notes: formData.notes.trim() || undefined,
        });
        setNotification({
          type: "success",
          title: "Contact Added",
          message: `${formData.name} added to emergency rapid directory.`,
        });
      }
      setIsModalOpen(false);
      await loadContacts(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (contactId: string, name: string) => {
    if (!confirm(`Delete emergency contact for ${name}?`)) return;
    try {
      await deleteLocalEmergencyContact(contactId);
      await loadContacts(selectedEventId);
    } catch (err) {
      console.error(err);
    }
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
              Emergency & Operations Directory
            </h1>
            <Badge variant="primary" size="sm">Rapid SOS Directory</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Immediate one-touch contact roster for medical, security, fire, and venue facilities.
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
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Emergency Contact</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card variant="default" className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by contact name, organization, or number..."
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
          <option value="ALL">All Emergency Roles</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_CONFIG[c]?.label || c}
            </option>
          ))}
        </select>
      </Card>

      {/* Emergency Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const config = CATEGORY_CONFIG[contact.category] || CATEGORY_CONFIG.SECURITY;
            const Icon = config.icon;
            return (
              <Card
                key={contact.id}
                variant="elevated"
                className="p-5 specular-top flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-surface-900">{contact.name}</h3>
                        <div className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
                          {contact.role}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-500/5 border border-white/10 space-y-1 text-xs">
                    <div className="text-surface-700 font-semibold truncate">
                      Organization: {contact.organization}
                    </div>
                    {contact.notes && (
                      <p className="text-[11px] text-surface-500 line-clamp-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-glass-subtle hover:opacity-95 transition-opacity"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call: {contact.phone}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(contact)}
                    className="p-2 text-surface-400 hover:text-surface-700 rounded-lg"
                    title="Edit Contact"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id, contact.name)}
                    className="p-2 text-surface-400 hover:text-rose-500 rounded-lg"
                    title="Delete Contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-3 py-12 text-center text-xs text-surface-400">
            <PhoneCall className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No emergency contacts listed. Click &ldquo;Add Emergency Contact&rdquo; to populate your safety directory.
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">
                {targetContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <Input
                label="Full Name / Dispatch Name"
                required
                placeholder="e.g. Sgt. Raymond Holt"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Role / Title"
                  required
                  placeholder="e.g. Head of Venue Security"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <Input
                  label="Agency / Company"
                  required
                  placeholder="e.g. City Police Dept"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Primary Phone"
                  type="tel"
                  required
                  placeholder="+1 (555) 911-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Alt Phone (Optional)"
                  type="tel"
                  placeholder="+1 (555) 911-0001"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Emergency Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as EmergencyContactCategory })
                  }
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c]?.label || c}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Location / Dispatch Notes"
                placeholder="e.g. Stationed at East Gate Guardhouse"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="shadow-glass-glow">
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmergencyContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <EmergencyContactsContent />
    </Suspense>
  );
}

