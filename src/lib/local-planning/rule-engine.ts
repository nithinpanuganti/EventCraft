import { EventType, TaskPhase, TaskPriority } from "../storage/types";

export interface LocalPlanningInput {
  eventId?: string;
  title: string;
  type: EventType;
  eventDate?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  themePreferences?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string;
  accessibilityRequirements?: string;
  specialInstructions?: string;
}

export interface GeneratedCategory {
  categoryName: string;
  allocatedPercentage: number;
  allocatedAmount: number;
  rationale: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  phase: TaskPhase;
  priority: TaskPriority;
  dueDate?: string;
}

export interface GeneratedScheduleItem {
  timeSlot: string;
  activity: string;
  leadCoordinator: string;
  logisticalNotes?: string;
}

export interface GeneratedLocalPlan {
  summary: {
    conceptTitle: string;
    conceptNarrative: string;
    planningAssumptions: string[];
    keyRecommendations: string[];
  };
  theme: {
    themeName: string;
    colorPalette: string[];
    styleDirection: string;
    decorationIdeas: string[];
    personalizedActivities: string[];
    culturalConsiderations: string[];
  };
  budget: {
    totalBudget: number;
    currency: string;
    categories: GeneratedCategory[];
  };
  tasks: GeneratedTask[];
  dayOfSchedule: GeneratedScheduleItem[];
}

/**
 * Calculates a relative calendar date (days before event date) formatted as YYYY-MM-DD.
 */
function calculateRelativeDate(targetDateStr?: string, daysBefore = 0): string | undefined {
  if (!targetDateStr) return undefined;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return undefined;

  const date = new Date(target.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

/**
 * Deterministic integer-cents budget distributor.
 * Guarantees that allocated amounts strictly sum to totalBudget without rounding errors.
 */
function distributeBudget(
  total: number,
  ratios: Array<{ name: string; pct: number; rationale: string }>
): GeneratedCategory[] {
  const totalCents = Math.round(total * 100);
  let allocatedSoFar = 0;

  return ratios.map((item, index) => {
    let cents: number;
    if (index === ratios.length - 1) {
      // Last category receives exact remainder to avoid floating-point drift
      cents = Math.max(0, totalCents - allocatedSoFar);
    } else {
      cents = Math.round((totalCents * item.pct) / 100);
      allocatedSoFar += cents;
    }

    return {
      categoryName: item.name,
      allocatedPercentage: item.pct,
      allocatedAmount: Number((cents / 100).toFixed(2)),
      rationale: item.rationale,
    };
  });
}

/**
 * Deterministic Local Rule Engine:
 * Generates tailored event roadmaps, budgets, tasks, and run-of-show schedules.
 * Executes entirely in-browser in < 10ms with zero network requests.
 */
export function generateLocalPlan(input: LocalPlanningInput): GeneratedLocalPlan {
  const { type, guestCount, totalBudget, currency, eventDate } = input;
  const budgetPerGuest = guestCount > 0 ? Math.round(totalBudget / guestCount) : totalBudget;

  if (type === "WEDDING") {
    const theme = input.themePreferences || "Romantic Elegance & Natural Florals";
    const colors = ["#F4E8D7", "#9E7B66", "#D4AF37", "#4A5D4E"];

    const categories = distributeBudget(totalBudget, [
      { name: "Venue & Reception Space", pct: 35, rationale: "Ceremony & reception hall rental fees, tables, chairs." },
      { name: "Catering & Bar Service", pct: 30, rationale: `Banquet dinner and beverage service for ${guestCount} guests.` },
      { name: "Photography & Videography", pct: 12, rationale: "Full-day documentary coverage and edited keepsake video." },
      { name: "Decor, Florals & Lighting", pct: 10, rationale: "Ceremony arch, fresh floral centerpieces, warm ambient lighting." },
      { name: "Music & Entertainment", pct: 8, rationale: "Ceremony audio technician, cocktail quartet, reception DJ." },
      { name: "Contingency & Incidentals", pct: 5, rationale: "Reserve buffer for last-minute logistical adjustments." },
    ]);

    const tasks: GeneratedTask[] = [
      {
        title: "Finalize Ceremony & Reception Venue",
        description: "Review contract terms, capacity limits, and curfew guidelines.",
        phase: "PLANNING",
        priority: "CRITICAL",
        dueDate: calculateRelativeDate(eventDate, 180),
      },
      {
        title: "Engage Lead Photographer & Videographer",
        description: "Review portfolios, shot lists, and confirm timeline availability.",
        phase: "BOOKING",
        priority: "HIGH",
        dueDate: calculateRelativeDate(eventDate, 150),
      },
      {
        title: "Conduct Menu Tasting & Confirm Dietary Restrictions",
        description: `Review menu with catering lead (${input.dietaryRestrictions || "standard accommodations"}).`,
        phase: "PREPARATION",
        priority: "HIGH",
        dueDate: calculateRelativeDate(eventDate, 60),
      },
      {
        title: "Distribute Formal Invitations & Track RSVPs",
        description: `Collect final attendance confirmations benchmarked at ${guestCount} guests.`,
        phase: "PREPARATION",
        priority: "MEDIUM",
        dueDate: calculateRelativeDate(eventDate, 45),
      },
      {
        title: "Finalize Seating Chart & Place Cards",
        description: "Export table layout to venue manager and catering team.",
        phase: "PREPARATION",
        priority: "MEDIUM",
        dueDate: calculateRelativeDate(eventDate, 14),
      },
      {
        title: "Conduct Wedding Rehearsal & Audio Check",
        description: "Walkthrough with bridal party, officiant, and sound coordinator.",
        phase: "PREPARATION",
        priority: "HIGH",
        dueDate: calculateRelativeDate(eventDate, 1),
      },
      {
        title: "Execute Day-Of Coordination & Vendor Reception",
        description: "Oversee floral delivery, cake setup, and photographer staging.",
        phase: "EVENT_DAY",
        priority: "CRITICAL",
        dueDate: calculateRelativeDate(eventDate, 0),
      },
      {
        title: "Vendor Settlements & Rental Returns",
        description: "Process final balances and return rented decor items.",
        phase: "POST_EVENT",
        priority: "MEDIUM",
        dueDate: calculateRelativeDate(eventDate, -3),
      },
    ];

    const dayOfSchedule: GeneratedScheduleItem[] = [
      { timeSlot: "10:00 - 12:30", activity: "Bridal Party Preparation & Hair/Makeup", leadCoordinator: "Bridal Suite Lead", logisticalNotes: "Ensure refreshment table is stocked." },
      { timeSlot: "12:30 - 13:45", activity: "First Look & Couple Portraits", leadCoordinator: "Lead Photographer", logisticalNotes: "Pre-designated shaded garden location." },
      { timeSlot: "14:00 - 14:30", activity: "Guest Arrival & Pre-Ceremony Welcome Drinks", leadCoordinator: "Usher Team", logisticalNotes: "Soft acoustic background music active." },
      { timeSlot: "14:30 - 15:15", activity: "Ceremony Processional & Vows", leadCoordinator: "Officiant & Stage Lead", logisticalNotes: "Sound technician checks wireless lapel mic." },
      { timeSlot: "15:15 - 16:30", activity: "Cocktail Reception & Family Group Photos", leadCoordinator: "Catering Captain", logisticalNotes: "Passed hors d'oeuvres and bar open." },
      { timeSlot: "16:30 - 18:30", activity: "Grand Entrance & Plated Dinner Service", leadCoordinator: "Head Coordinator", logisticalNotes: "Coordinate with DJ for fanfare entrance." },
      { timeSlot: "18:30 - 19:15", activity: "Toasts, Speeches & Cake Cutting", leadCoordinator: "Emcee", logisticalNotes: "Champagne poured 5 minutes before toasts." },
      { timeSlot: "19:15 - 22:30", activity: "First Dance & Open Dance Floor Celebration", leadCoordinator: "DJ / Band Lead", logisticalNotes: "Late-night snack station at 21:00." },
      { timeSlot: "22:30 - 23:00", activity: "Grand Exit & Guest Departure", leadCoordinator: "Logistics Lead", logisticalNotes: "Sparkler send-off or vehicle staging." },
    ];

    return {
      summary: {
        conceptTitle: `${input.title} — Tailored Wedding Roadmap`,
        conceptNarrative:
          "A structured, rule-based wedding plan prioritizing meaningful ceremony traditions, refined guest hospitality, and balanced resource allocation.",
        planningAssumptions: [
          `Target headcount benchmarked at ${guestCount} guests.`,
          eventDate ? `Target event date: ${eventDate}.` : "Flexible 6-to-9 month operational timeline.",
          `Total budget allocation: ${currency} ${totalBudget.toLocaleString()} (~${currency} ${budgetPerGuest}/guest).`,
        ],
        keyRecommendations: [
          "Secure venue and catering agreements first; they represent 65% of total budget commitments.",
          "Lock in photography early to ensure documentary style matches personal preference.",
          "Reconcile dietary restrictions at least 3 weeks prior to menu lock-in.",
        ],
      },
      theme: {
        themeName: theme,
        colorPalette: colors,
        styleDirection: "Warm ambient candlelight, organic botanical foliage, and cohesive textures.",
        decorationIdeas: [
          "Ceremony floral backdrop or geometric wooden arch.",
          "Warm-toned fairy lights and pillar candles across dining tables.",
          "Calligraphy welcome signage with fresh foliage border.",
        ],
        personalizedActivities: [
          "Couple first look photography session.",
          "Interactive guest book keepsake table with polaroids.",
          "Signature his & hers welcome cocktails.",
        ],
        culturalConsiderations: input.culturalPreferences
          ? [input.culturalPreferences]
          : ["Custom ceremony blessings and traditional family honors."],
      },
      budget: {
        totalBudget,
        currency,
        categories,
      },
      tasks,
      dayOfSchedule,
    };
  }

  if (type === "BIRTHDAY") {
    const theme = input.themePreferences || "Celebratory Glow & Modern Vibrant";
    const colors = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

    const categories = distributeBudget(totalBudget, [
      { name: "Venue & Entertainment Space", pct: 30, rationale: "Private party lounge, patio, or event loft rental." },
      { name: "Food, Bites & Craft Bar", pct: 35, rationale: `Interactive food stations, signature mocktails/cocktails for ${guestCount} guests.` },
      { name: "Music, DJ & Audio Equipment", pct: 15, rationale: "Live DJ, sound system, and party lighting setup." },
      { name: "Decor, Balloon Styling & Backdrop", pct: 10, rationale: "Custom balloon arch, LED photo wall, and tableware." },
      { name: "Custom Cake & Dessert Bar", pct: 6, rationale: "Showstopper tiered cake and artisanal sweet treats." },
      { name: "Incidentals & Party Favors", pct: 4, rationale: "Custom guest takeaways and last-minute supplies." },
    ]);

    const tasks: GeneratedTask[] = [
      {
        title: "Book Party Venue or Private Space",
        description: "Confirm party hours, sound restrictions, and catering permissions.",
        phase: "PLANNING",
        priority: "CRITICAL",
        dueDate: calculateRelativeDate(eventDate, 60),
      },
      {
        title: "Order Custom Cake & Dessert Display",
        description: "Finalize flavor profiles, tiers, and personalized cake topper.",
        phase: "BOOKING",
        priority: "HIGH",
        dueDate: calculateRelativeDate(eventDate, 30),
      },
      {
        title: "Confirm DJ & Custom Playlist Curation",
        description: "Submit favorite tracks, 'must-play' artists, and do-not-play list.",
        phase: "BOOKING",
        priority: "MEDIUM",
        dueDate: calculateRelativeDate(eventDate, 20),
      },
      {
        title: "Send Digital Invitations & RSVP Tracker",
        description: `Track headcount approaching ${guestCount} attendees.`,
        phase: "PREPARATION",
        priority: "HIGH",
        dueDate: calculateRelativeDate(eventDate, 25),
      },
      {
        title: "Procure Photo Booth & Balloon Styling Props",
        description: "Assemble themed photo backdrop and customized props.",
        phase: "PREPARATION",
        priority: "LOW",
        dueDate: calculateRelativeDate(eventDate, 7),
      },
      {
        title: "Venue Setup & Sound Check",
        description: "Position balloon garland, test audio levels, and stock bar.",
        phase: "EVENT_DAY",
        priority: "CRITICAL",
        dueDate: calculateRelativeDate(eventDate, 0),
      },
      {
        title: "Post-Party Teardown & Venue Walkthrough",
        description: "Clean up decorations, collect gifts, and complete venue inspection.",
        phase: "POST_EVENT",
        priority: "MEDIUM",
        dueDate: calculateRelativeDate(eventDate, -1),
      },
    ];

    const dayOfSchedule: GeneratedScheduleItem[] = [
      { timeSlot: "15:00 - 17:00", activity: "Venue Access, Balloon Arch Setup & Lighting Test", leadCoordinator: "Styling Lead", logisticalNotes: "Verify power outlets for DJ and LED signs." },
      { timeSlot: "17:00 - 17:45", activity: "Catering Delivery & Dessert Bar Arrangement", leadCoordinator: "Food Coordinator", logisticalNotes: "Refrigerate cake until 15 minutes before cutting." },
      { timeSlot: "18:00 - 19:00", activity: "Guest Arrival, Welcome Drinks & Chill Beats", leadCoordinator: "Host / DJ", logisticalNotes: "Photographer captures red-carpet style arrivals." },
      { timeSlot: "19:00 - 20:30", activity: "Food Stations Open & Interactive Party Games", leadCoordinator: "Emcee Lead", logisticalNotes: "Encourage guests to visit photo booth station." },
      { timeSlot: "20:30 - 21:00", activity: "Birthday Toast, Cake Cutting & Candle Ceremony", leadCoordinator: "Lead Host", logisticalNotes: "Queue favorite celebration track during cake cutting." },
      { timeSlot: "21:00 - 23:30", activity: "High-Energy Dance Party & Mingling", leadCoordinator: "DJ", logisticalNotes: "Serve late-night sliders and sparkling mocktails." },
      { timeSlot: "23:30 - 24:00", activity: "Farewell Favors & Guest Send-off", leadCoordinator: "Host", logisticalNotes: "Hand out personalized thank-you gift boxes." },
    ];

    return {
      summary: {
        conceptTitle: `${input.title} — Birthday Celebration Blueprint`,
        conceptNarrative:
          "An energetic, community-centric birthday experience engineered around high-impact entertainment, memorable photos, and effortless hospitality.",
        planningAssumptions: [
          `Guest list sized for ${guestCount} party attendees.`,
          eventDate ? `Celebration date: ${eventDate}.` : "Coordinated on a 4-to-8 week planning horizon.",
          `Total financial cap: ${currency} ${totalBudget.toLocaleString()} (~${currency} ${budgetPerGuest}/guest).`,
        ],
        keyRecommendations: [
          "Prioritize venue vibe and sound quality to establish party momentum immediately.",
          "Feature interactive food stations rather than formal seated dining for better mingling.",
          "Set up a dedicated photo backdrop to generate instant social memories.",
        ],
      },
      theme: {
        themeName: theme,
        colorPalette: colors,
        styleDirection: "Vibrant neon accents, polished party finishes, and interactive lighting.",
        decorationIdeas: [
          "Multi-colored balloon garland framing main photo area.",
          "Custom LED neon sign featuring celebrant's name or milestone year.",
          "Glow sticks and LED wristbands for evening dance floor.",
        ],
        personalizedActivities: [
          "Signature milestone trivia game with prizes.",
          "Selfie ring light photo booth with instant digital sharing.",
          "Custom cocktail/mocktail concoction honoring the celebrant.",
        ],
        culturalConsiderations: input.culturalPreferences ? [input.culturalPreferences] : [],
      },
      budget: {
        totalBudget,
        currency,
        categories,
      },
      tasks,
      dayOfSchedule,
    };
  }

  // COMMUNITY EVENT
  const theme = input.themePreferences || "Civic Unity & Cultural Gathering";
  const colors = ["#0284C7", "#16A34A", "#EA580C", "#FACC15"];

  const categories = distributeBudget(totalBudget, [
    { name: "Public Space, Permits & Security", pct: 30, rationale: "Municipal park/plaza permits, portable restrooms, security guards." },
    { name: "Community Catering & Refreshments", pct: 30, rationale: `Communal meal, hydration stations, and healthy snacks for ${guestCount} participants.` },
    { name: "AV Equipment, Stage & PA System", pct: 20, rationale: "Stage setup, microphones, amplifiers, and technician oversight." },
    { name: "Signage, Banners & Accessibility", pct: 10, rationale: "Directional signs, welcome banners, wheelchair ramps, braille maps." },
    { name: "Volunteer Coordination & Kits", pct: 5, rationale: "Volunteer t-shirts, walkie-talkies, hydration, and first-aid kits." },
    { name: "Civic Contingency Fund", pct: 5, rationale: "Reserve allocation for emergency weather cover or extra supplies." },
  ]);

  const tasks: GeneratedTask[] = [
    {
      title: "File Municipal Event Permits & Secure Space",
      description: "Obtain city park/square usage approvals, noise permits, and insurance.",
      phase: "PLANNING",
      priority: "CRITICAL",
      dueDate: calculateRelativeDate(eventDate, 90),
    },
    {
      title: "Confirm Stage, Audio & Microphones Setup",
      description: "Ensure acoustic reach across the entire expected gathering area.",
      phase: "BOOKING",
      priority: "HIGH",
      dueDate: calculateRelativeDate(eventDate, 45),
    },
    {
      title: "Recruit & Organize Community Volunteers",
      description: "Assign volunteer leads for registration, safety, logistics, and cleanup.",
      phase: "PREPARATION",
      priority: "HIGH",
      dueDate: calculateRelativeDate(eventDate, 30),
    },
    {
      title: "Produce Accessible Signage & Directional Maps",
      description: `Include multi-lingual notices and accessibility accommodations (${input.accessibilityRequirements || "standard ADA compliance"}).`,
      phase: "PREPARATION",
      priority: "MEDIUM",
      dueDate: calculateRelativeDate(eventDate, 14),
    },
    {
      title: "Inspect First-Aid Staging & Emergency Exits",
      description: "Review safety protocol with on-site security and medical personnel.",
      phase: "EVENT_DAY",
      priority: "CRITICAL",
      dueDate: calculateRelativeDate(eventDate, 0),
    },
    {
      title: "Execute Event Day Community Program",
      description: "Coordinate opening ceremonies, keynote speakers, and community performances.",
      phase: "EVENT_DAY",
      priority: "CRITICAL",
      dueDate: calculateRelativeDate(eventDate, 0),
    },
    {
      title: "Community Site Cleanup & Trash Receptacle Sorting",
      description: "Leave municipal park cleaner than found; sort recycling and compost.",
      phase: "POST_EVENT",
      priority: "HIGH",
      dueDate: calculateRelativeDate(eventDate, -1),
    },
  ];

  const dayOfSchedule: GeneratedScheduleItem[] = [
    { timeSlot: "07:00 - 08:30", activity: "Site Load-in, Stage Setup & Banner Mounting", leadCoordinator: "Logistics Lead", logisticalNotes: "Direct vendor delivery trucks to designated loading zone." },
    { timeSlot: "08:30 - 09:15", activity: "Volunteer Briefing & Walkie-Talkie Distribution", leadCoordinator: "Volunteer Director", logisticalNotes: "Provide safety vests and check-in rosters." },
    { timeSlot: "09:30 - 10:00", activity: "Community Welcome & Opening Ceremonies", leadCoordinator: "Stage Emcee", logisticalNotes: "Audio technician ensures hearing loop is active." },
    { timeSlot: "10:00 - 13:00", activity: "Cultural Showcases, Booths & Family Activities", leadCoordinator: "Program Lead", logisticalNotes: "Restock water stations continuously." },
    { timeSlot: "13:00 - 14:30", activity: "Communal Lunch & Acoustic Music Session", leadCoordinator: "Food Lead", logisticalNotes: "Distribute pre-packaged or buffet meals efficiently." },
    { timeSlot: "14:30 - 16:00", activity: "Keynote Addresses & Civic Recognition Awards", leadCoordinator: "Committee Chair", logisticalNotes: "Coordinate with award presenters and honorees." },
    { timeSlot: "16:00 - 17:00", activity: "Closing Remarks & Volunteer Group Photo", leadCoordinator: "Emcee", logisticalNotes: "Announce next year's date and thank sponsors." },
    { timeSlot: "17:00 - 19:00", activity: "Site Teardown & Ecological Clean-up Sweep", leadCoordinator: "Green Team Lead", logisticalNotes: "Return rental equipment and lock park gates." },
  ];

  return {
    summary: {
      conceptTitle: `${input.title} — Community Gathering Masterplan`,
      conceptNarrative:
        "An inclusive, accessible civic event designed for broad community participation, seamless public safety, and transparent volunteer coordination.",
      planningAssumptions: [
        `Expected community attendance: ~${guestCount} participants.`,
        eventDate ? `Scheduled date: ${eventDate}.` : "Seasonal municipal programming schedule.",
        `Total budget benchmark: ${currency} ${totalBudget.toLocaleString()} (~${currency} ${budgetPerGuest}/attendee).`,
      ],
      keyRecommendations: [
        "Prioritize safety permits and accessibility accommodations early with local authorities.",
        "Ensure clear multi-lingual signage and multiple shaded hydration stations.",
        "Mobilize volunteer captains for organized load-in, program flow, and site restoration.",
      ],
    },
    theme: {
      themeName: theme,
      colorPalette: colors,
      styleDirection: "Welcoming open-air pavilions, high-visibility civic banners, and eco-conscious finishes.",
      decorationIdeas: [
        "Eco-friendly fabric flags and branded community banners.",
        "Interactive chalk art wall for children and community messages.",
        "Upcycled wooden directional signs directing attendees to key stages.",
      ],
      personalizedActivities: [
        "Community collective mural painting station.",
        "Local artisan and non-profit organization showcase tables.",
        "Open microphone cultural storytelling circle.",
      ],
      culturalConsiderations: input.culturalPreferences ? [input.culturalPreferences] : [],
    },
    budget: {
      totalBudget,
      currency,
      categories,
    },
    tasks,
    dayOfSchedule,
  };
}
