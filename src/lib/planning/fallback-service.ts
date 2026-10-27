import { GeneratedEventPlan } from "./schema";
import { SanitizedPlanningContext } from "./context-builder";
import { validateAndNormalizePlan } from "./deterministic-validator";

/**
 * Creates an expert-curated wedding plan template tailored to the user's requirements.
 */
function createWeddingFallback(context: SanitizedPlanningContext): GeneratedEventPlan {
  const theme = context.themePreferences || "Romantic Elegance & Natural Florals";
  const colors = ["#F4E8D7", "#9E7B66", "#D4AF37", "#4A5D4E"];

  const rawPlan: GeneratedEventPlan = {
    summary: {
      conceptTitle: `${context.title} — Curated Wedding Roadmap`,
      conceptNarrative:
        "A thoughtfully designed wedding plan prioritizing meaningful ceremony traditions, seamless guest experience, and balanced resource distribution across key sensory milestones.",
      planningAssumptions: [
        `Guest count benchmarked at ${context.guestCount} attendees.`,
        context.isDateConfirmed
          ? `Coordinated towards event date: ${context.eventDate}.`
          : "Planning on a relative 6-to-9 month preparation horizon.",
        `Budget benchmark capped at ${context.currency} ${context.totalBudget.toLocaleString()} (${context.currency} ${context.budgetPerGuest}/guest).`,
      ],
      keyRecommendations: [
        "Secure the venue setting 6–8 months in advance as popular dates fill quickly.",
        "Book catering and photography early; they represent the largest experiential impressions.",
        "Review dietary requirements with the catering team during menu tastings.",
      ],
    },
    theme: {
      themeName: theme,
      colorPalette: colors,
      styleDirection:
        "Soft warm lighting, layered organic textures, personalized tablescapes, and curated greenery arrangements.",
      decorationIdeas: [
        "Floral arch or botanical backdrop for the ceremony vows.",
        "Fairy lights and warm-toned pillar candles for ambient table lighting.",
        "Personalized seating chart with botanical foliage accents.",
      ],
      personalizedActivities: [
        "First look photography session before ceremony.",
        "Interactive guestbook signing table with instant photo keepsakes.",
        "Signature welcome cocktail reflecting couple preferences.",
      ],
      culturalConsiderations: context.culturalPreferences
        ? [context.culturalPreferences]
        : ["Honoring family traditions and personal ceremony blessings."],
    },
    budget: {
      totalBudget: context.totalBudget,
      currency: context.currency,
      contingencyPercentage: 5,
      isBalanced: true,
      categories: [
        {
          categoryName: "Venue & Reception Space",
          allocatedPercentage: 35,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Rental fees, tables, chairs, and basic sound setup.",
        },
        {
          categoryName: "Catering & Bar Service",
          allocatedPercentage: 30,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: `Cocktail reception, dinner banquet, and beverages for ${context.guestCount} guests.`,
        },
        {
          categoryName: "Photography & Videography",
          allocatedPercentage: 12,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Full-day coverage, edited high-resolution gallery, and keepsake video.",
        },
        {
          categoryName: "Decor, Florals & Lighting",
          allocatedPercentage: 10,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Ceremony arch, table centerpieces, bridal bouquet, and warm accent lights.",
        },
        {
          categoryName: "Music & Entertainment",
          allocatedPercentage: 8,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Ceremony sound technician, cocktail acoustics, and reception DJ/musician.",
        },
        {
          categoryName: "Contingency & Incidentals",
          allocatedPercentage: 5,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Buffer for unexpected last-minute logistical needs or overtime.",
        },
      ],
    },
    milestones: [
      {
        title: "Venue & Key Dates Confirmation",
        phase: "BOOKING",
        offsetDays: -180,
        description: "Tour candidate ceremony and reception spaces; lock deposit.",
        priority: "CRITICAL",
      },
      {
        title: "Catering & Menu Selection",
        phase: "BOOKING",
        offsetDays: -120,
        description: `Finalize caterer and dietary adaptations for ${context.dietaryRestrictions || "standard dietary options"}.`,
        priority: "HIGH",
      },
      {
        title: "Photography & Entertainment Booking",
        phase: "BOOKING",
        offsetDays: -90,
        description: "Review photographer portfolios and sound requirements.",
        priority: "HIGH",
      },
      {
        title: "Invitations & RSVP Finalization",
        phase: "PREPARATION",
        offsetDays: -45,
        description: "Collect confirmed headcount and dietary numbers.",
        priority: "HIGH",
      },
      {
        title: "Final Run-Sheet & Vendor Walkthrough",
        phase: "PREPARATION",
        offsetDays: -14,
        description: "Distribute hourly timeline and emergency contacts to all vendor leads.",
        priority: "CRITICAL",
      },
      {
        title: "Wedding Day Execution",
        phase: "EVENT_DAY",
        offsetDays: 0,
        description: "Ceremony, cocktail hour, dinner reception, and send-off celebration.",
        priority: "CRITICAL",
      },
    ],
    tasks: [
      {
        title: "Confirm Ceremony & Reception Venue",
        phase: "BOOKING",
        priority: "CRITICAL",
        category: "Venue",
        offsetDays: -180,
      },
      {
        title: "Select Catering Menu & Tasting",
        phase: "BOOKING",
        priority: "HIGH",
        category: "Catering",
        offsetDays: -120,
      },
      {
        title: "Book Photographer & Videographer",
        phase: "BOOKING",
        priority: "HIGH",
        category: "Photography",
        offsetDays: -90,
      },
      {
        title: "Order Floral Centerpieces & Arch",
        phase: "PREPARATION",
        priority: "MEDIUM",
        category: "Decor",
        offsetDays: -60,
      },
      {
        title: "Verify Venue Accessibility & Guest Access",
        phase: "PREPARATION",
        priority: "HIGH",
        category: "Logistics",
        offsetDays: -30,
        description: context.accessibilityRequirements || "Verify step-free entrances and seating.",
      },
      {
        title: "Create Day-Of Coordinator Run Sheet",
        phase: "PREPARATION",
        priority: "CRITICAL",
        category: "Logistics",
        offsetDays: -10,
      },
    ],
    dayOfSchedule: [
      {
        time: "10:00 AM",
        activity: "Hair, Makeup & Wedding Party Preparations",
        lead: "Bridal Party Lead",
        notes: "Catering delivers light refreshments to dressing suites.",
      },
      {
        time: "01:30 PM",
        activity: "Photographer Arrives & First Look Session",
        lead: "Lead Photographer",
        notes: "Portraits with couple and immediate wedding party.",
      },
      {
        time: "03:30 PM",
        activity: "Guest Arrival & Welcome Music",
        lead: "Usher Lead",
        notes: "Acoustic playlist starts; welcome signage active.",
      },
      {
        time: "04:00 PM",
        activity: "Wedding Ceremony Processional & Vows",
        lead: "Officiant",
        notes: "Sound tech manages wireless microphones.",
      },
      {
        time: "04:45 PM",
        activity: "Cocktail Hour & Passed Hors d'oeuvres",
        lead: "Catering Manager",
        notes: "Couple signs marriage license; family portraits.",
      },
      {
        time: "06:00 PM",
        activity: "Grand Entrance & Dinner Banquet Service",
        lead: "MC / Coordinator",
        notes: "Welcome remarks followed by plated or buffet dinner.",
      },
      {
        time: "07:30 PM",
        activity: "Toasts, Cake Cutting & First Dances",
        lead: "DJ / Host",
        notes: "Champagne poured for toast speeches.",
      },
      {
        time: "08:15 PM",
        activity: "Open Dance Floor & Evening Celebration",
        lead: "DJ / Band",
        notes: "High energy music programming.",
      },
      {
        time: "10:30 PM",
        activity: "Sparkler / Glowstick Send-off & Venue Wrap-up",
        lead: "Coordinator",
        notes: "Guests line walkway; transport departures.",
      },
    ],
    vendors: [
      {
        categoryName: "Venue Space",
        justification: "Provides physical footprint, seating infrastructure, and weather protection.",
        selectionCriteria: ["Capacity fit", "Curfew hours", "Weather backup plan", "Catering policy"],
        questionsToAsk: ["Are we required to use preferred vendors?", "What is the noise ordinance policy?"],
        recommendedMilestone: "6 months before event",
      },
      {
        categoryName: "Caterer",
        justification: "Primary driver of guest satisfaction and dietary comfort.",
        selectionCriteria: ["Experience with dietary requirements", "Full staff inclusion", "Tasting availability"],
        questionsToAsk: ["Do you supply tableware and linens?", "How do you handle dietary allergies?"],
        recommendedMilestone: "4 months before event",
      },
      {
        categoryName: "Photographer",
        justification: "Captures irreplaceable ceremonial and celebration memories.",
        selectionCriteria: ["Portfolio style match", "Turnaround timeline", "Second shooter inclusion"],
        questionsToAsk: ["How many edited images are delivered?", "What is backup gear protocol?"],
        recommendedMilestone: "3 months before event",
      },
    ],
    risksAndAlternatives: {
      potentialRisks: [
        "Inclement weather for outdoor ceremony settings.",
        "Overtime fees from exceeding venue curfew.",
        "Catering delays if kitchen staging space is limited.",
      ],
      mitigations: [
        "Confirm indoor rain contingency layout with venue in advance.",
        "Build a 30-minute buffer into the run-sheet before late-night reception send-off.",
        "Conduct a pre-event kitchen and power supply check with caterer.",
      ],
      budgetSavingTips: [
        "Repurpose ceremony florals to the reception head table and bar.",
        "Choose in-season flowers to lower floral arrangement costs.",
        "Host reception with a signature cocktail and beer/wine rather than full open bar.",
      ],
      optionalUpgrades: [
        "Late-night gourmet snack station (e.g. mini sliders, churro cart).",
        "Live jazz trio for cocktail hour.",
      ],
    },
    metadata: {
      source: "curated-fallback",
      provider: "System Curated Engine",
      model: "domain-wedding-v1",
      version: 1,
      generatedAt: new Date().toISOString(),
    },
  };

  return validateAndNormalizePlan(rawPlan, context).adjustedPlan;
}

/**
 * Creates an expert-curated birthday / anniversary plan template.
 */
function createBirthdayFallback(context: SanitizedPlanningContext): GeneratedEventPlan {
  const theme = context.themePreferences || "Modern Milestone Celebration";
  const colors = ["#2B3A67", "#FFC857", "#E9724C", "#FFFFFF"];

  const rawPlan: GeneratedEventPlan = {
    summary: {
      conceptTitle: `${context.title} — Celebration Blueprint`,
      conceptNarrative:
        "An engaging and upbeat celebration structured around dynamic social zones, celebratory food and drinks, interactive games, and a signature cake-cutting focal point.",
      planningAssumptions: [
        `Designed for ${context.guestCount} guests.`,
        context.isDateConfirmed
          ? `Target celebration date: ${context.eventDate}.`
          : "Flexible planning horizon (4 to 8 weeks).",
        `Budget target: ${context.currency} ${context.totalBudget.toLocaleString()}.`,
      ],
      keyRecommendations: [
        "Focus decoration spending on a single photo-worthy focal point (e.g., balloon arch or neon sign).",
        "Opt for cocktail-style seating or food stations to encourage socializing.",
        "Queue favorite music playlist or hire a dynamic DJ for lively ambiance.",
      ],
    },
    theme: {
      themeName: theme,
      colorPalette: colors,
      styleDirection: "Vibrant accents, festive statement balloon installations, warm mood lighting.",
      decorationIdeas: [
        "Custom balloon garland and milestone numbers backdrop for photos.",
        "Coordinated cocktail napkins and custom drink stirrers.",
        "Themed dessert table with tiered centerpiece cake.",
      ],
      personalizedActivities: [
        "Milestone trivia game or photo retrospective montage.",
        "Signature toast and group memory sharing.",
      ],
      culturalConsiderations: context.culturalPreferences ? [context.culturalPreferences] : [],
    },
    budget: {
      totalBudget: context.totalBudget,
      currency: context.currency,
      contingencyPercentage: 5,
      isBalanced: true,
      categories: [
        {
          categoryName: "Food & Beverage",
          allocatedPercentage: 45,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Heavy hors d'oeuvres, custom cake, and celebration drinks.",
        },
        {
          categoryName: "Venue Space / Private Room",
          allocatedPercentage: 25,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Private dining room or party loft rental.",
        },
        {
          categoryName: "Entertainment & Music",
          allocatedPercentage: 15,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "DJ sound setup or acoustic performance.",
        },
        {
          categoryName: "Decorations & Photo Backdrop",
          allocatedPercentage: 10,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Balloon arch, celebration banners, and photo accessories.",
        },
        {
          categoryName: "Contingency & Supplies",
          allocatedPercentage: 5,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Buffer for extra guest RSVPs and tabletop supplies.",
        },
      ],
    },
    milestones: [
      {
        title: "Lock Venue & Date",
        phase: "BOOKING",
        offsetDays: -45,
        description: "Select private room, garden, or event space.",
        priority: "CRITICAL",
      },
      {
        title: "Order Custom Cake & Catering",
        phase: "BOOKING",
        offsetDays: -21,
        description: "Finalize dietary preferences and celebratory cake design.",
        priority: "HIGH",
      },
      {
        title: "Send Invitations",
        phase: "PREPARATION",
        offsetDays: -20,
        description: "Send digital invitations and track RSVPs.",
        priority: "HIGH",
      },
      {
        title: "Party Execution",
        phase: "EVENT_DAY",
        offsetDays: 0,
        description: "Setup, guest arrival, celebration program, and wrap-up.",
        priority: "CRITICAL",
      },
    ],
    tasks: [
      {
        title: "Book Venue or Setup Space",
        phase: "BOOKING",
        priority: "CRITICAL",
        category: "Venue",
        offsetDays: -45,
      },
      {
        title: "Confirm Cake Order & Flavor Profile",
        phase: "BOOKING",
        priority: "HIGH",
        category: "Food",
        offsetDays: -21,
      },
      {
        title: "Order Photo Backdrop & Balloons",
        phase: "PREPARATION",
        priority: "MEDIUM",
        category: "Decor",
        offsetDays: -14,
      },
      {
        title: "Build Music Playlist / Confirm DJ",
        phase: "PREPARATION",
        priority: "MEDIUM",
        category: "Entertainment",
        offsetDays: -7,
      },
    ],
    dayOfSchedule: [
      {
        time: "03:00 PM",
        activity: "Venue Setup & Decor Installation",
        lead: "Host Lead",
        notes: "Inflate balloons, position photo backdrop, setup food stations.",
      },
      {
        time: "05:30 PM",
        activity: "Cake Delivery & Bar Stocking",
        lead: "Party Assistant",
        notes: "Verify refrigeration and beverage ice supply.",
      },
      {
        time: "06:30 PM",
        activity: "Guest Arrival & Welcome Cocktails",
        lead: "Host",
        notes: "Background music playlist active; light appetizers served.",
      },
      {
        time: "07:30 PM",
        activity: "Main Food Service & Mingling",
        lead: "Catering Lead",
        notes: "Dinner or heavy stations open.",
      },
      {
        time: "08:45 PM",
        activity: "Celebration Toast & Cake Cutting",
        lead: "Host / MC",
        notes: "Birthday song, toast speeches, and cake distribution.",
      },
      {
        time: "09:30 PM",
        activity: "Dance Floor & Open Socializing",
        lead: "DJ / Music Lead",
        notes: "Upbeat celebration programming.",
      },
      {
        time: "11:00 PM",
        activity: "Event Concludes & Pack-down",
        lead: "Host Team",
        notes: "Keepsake decor packed; venue cleared.",
      },
    ],
    vendors: [
      {
        categoryName: "Bakery / Cake Designer",
        justification: "Focal center of milestone celebrations and photos.",
        selectionCriteria: ["Custom design portfolio", "Flavor quality", "Delivery guarantee"],
        questionsToAsk: ["Do you deliver directly to the venue?", "Can you accommodate dietary needs?"],
        recommendedMilestone: "3 weeks before event",
      },
      {
        categoryName: "Party Caterer / Food Station",
        justification: "Keeps guests fueled without cumbersome seated dining.",
        selectionCriteria: ["Finger food variety", "Warm chafing dish equipment included"],
        questionsToAsk: ["What is the replenishment frequency?"],
        recommendedMilestone: "1 month before event",
      },
    ],
    risksAndAlternatives: {
      potentialRisks: ["Last-minute RSVP drops or additions.", "Cake melting in warm temperatures."],
      mitigations: [
        "Include a +5 head buffer on finger foods.",
        "Keep cake stored in cool air-conditioned space until 30 minutes before cutting.",
      ],
      budgetSavingTips: [
        "Host at a private residence or park pavilion to eliminate venue rental.",
        "DIY the photo wall using fairy lights and printed photo prints.",
      ],
      optionalUpgrades: ["Photo booth with instant 35mm print strips."],
    },
    metadata: {
      source: "curated-fallback",
      provider: "System Curated Engine",
      model: "domain-birthday-v1",
      version: 1,
      generatedAt: new Date().toISOString(),
    },
  };

  return validateAndNormalizePlan(rawPlan, context).adjustedPlan;
}

/**
 * Creates an expert-curated community event / festival template.
 */
function createCommunityFallback(context: SanitizedPlanningContext): GeneratedEventPlan {
  const theme = context.themePreferences || "Community Gathering & Cultural Fair";
  const colors = ["#2E7D32", "#1976D2", "#F57C00", "#5D4037"];

  const rawPlan: GeneratedEventPlan = {
    summary: {
      conceptTitle: `${context.title} — Community Operations Plan`,
      conceptNarrative:
        "A community-focused, accessible event operations blueprint emphasizing attendee safety, clear zoning, transparent scheduling, volunteer coordination, and inclusive hospitality.",
      planningAssumptions: [
        `Targeting ${context.guestCount} community participants.`,
        `Operating within total budget of ${context.currency} ${context.totalBudget.toLocaleString()}.`,
        context.isDateConfirmed ? `Target date: ${context.eventDate}.` : "Flexible community schedule.",
      ],
      keyRecommendations: [
        "Confirm city/park municipal permits and sound amplification rules early.",
        "Establish an ADA-accessible pathway and clear directional signage.",
        "Appoint designated safety and first-aid leads with high-visibility vests.",
      ],
    },
    theme: {
      themeName: theme,
      colorPalette: colors,
      styleDirection: "Bright, welcoming civic festival ambiance with clean navigation banners.",
      decorationIdeas: [
        "Bilingual or multi-cultural welcome banners at all entry gates.",
        "Color-coded activity tents (Registration, Information, Main Stage, Food).",
      ],
      personalizedActivities: [
        "Community open-mic or civic showcase stage.",
        "Kids activity booth and interactive craft workshop.",
      ],
      culturalConsiderations: context.culturalPreferences
        ? [context.culturalPreferences]
        : ["Inclusive welcoming multi-faith and multi-lingual participation."],
    },
    budget: {
      totalBudget: context.totalBudget,
      currency: context.currency,
      contingencyPercentage: 8,
      isBalanced: true,
      categories: [
        {
          categoryName: "Permits, Venue & Safety",
          allocatedPercentage: 30,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Park permit fees, insurance, portable restrooms, and first aid.",
        },
        {
          categoryName: "Sound & Stage Equipment",
          allocatedPercentage: 25,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "PA system, microphones, generator power, and canopies.",
        },
        {
          categoryName: "Food & Community Refreshments",
          allocatedPercentage: 20,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Water stations, volunteer snacks, and subsidized meal vouchers.",
        },
        {
          categoryName: "Signage, Marketing & Badges",
          allocatedPercentage: 15,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Banners, maps, volunteer t-shirts, and flyers.",
        },
        {
          categoryName: "Contingency & Emergency Reserve",
          allocatedPercentage: 10,
          allocatedAmount: 0,
          estimatedAmount: 0,
          rationale: "Emergency equipment repair or extra waste management bins.",
        },
      ],
    },
    milestones: [
      {
        title: "Permits & Park Authorizations",
        phase: "BOOKING",
        offsetDays: -90,
        description: "Submit municipal permits, sound waiver, and certificate of insurance.",
        priority: "CRITICAL",
      },
      {
        title: "Equipment & Logistics Rentals",
        phase: "BOOKING",
        offsetDays: -45,
        description: "Rent tents, folding tables, chairs, and sound gear.",
        priority: "HIGH",
      },
      {
        title: "Volunteer Orientation & Briefing",
        phase: "PREPARATION",
        offsetDays: -7,
        description: "Assign station leads, first-aid roles, and check-in procedures.",
        priority: "HIGH",
      },
      {
        title: "Community Festival Day",
        phase: "EVENT_DAY",
        offsetDays: 0,
        description: "Execution of festival program, booth operations, and cleanup.",
        priority: "CRITICAL",
      },
    ],
    tasks: [
      {
        title: "Secure Municipal Permits & Sound Waivers",
        phase: "BOOKING",
        priority: "CRITICAL",
        category: "Permits",
        offsetDays: -90,
      },
      {
        title: "Confirm Portable Restrooms & Sanitation Bins",
        phase: "BOOKING",
        priority: "HIGH",
        category: "Logistics",
        offsetDays: -45,
      },
      {
        title: "Verify Step-Free Accessible Walkways",
        phase: "PREPARATION",
        priority: "CRITICAL",
        category: "Accessibility",
        offsetDays: -14,
        description: context.accessibilityRequirements || "Ensure ramp entry and ADA compliant facilities.",
      },
      {
        title: "Host Volunteer Safety Orientation",
        phase: "PREPARATION",
        priority: "HIGH",
        category: "Volunteers",
        offsetDays: -7,
      },
    ],
    dayOfSchedule: [
      {
        time: "07:00 AM",
        activity: "Site Load-in & Canopy Setup",
        lead: "Logistics Captain",
        notes: "Table placement, sound testing, and generator power check.",
      },
      {
        time: "09:00 AM",
        activity: "Volunteer Arrival & Task Check-in",
        lead: "Volunteer Coordinator",
        notes: "Distribute safety vests, radios, and schedule sheets.",
      },
      {
        time: "10:00 AM",
        activity: "Gates Open & Information Booth Active",
        lead: "Host Lead",
        notes: "Background acoustic music begins; welcome banners up.",
      },
      {
        time: "11:30 AM",
        activity: "Opening Ceremony & Community Remarks",
        lead: "Community Director",
        notes: "Main stage address and civic appreciation.",
      },
      {
        time: "01:00 PM",
        activity: "Cultural Performances & Interactive Workshops",
        lead: "Stage Manager",
        notes: "Scheduled performance blocks.",
      },
      {
        time: "04:30 PM",
        activity: "Closing Remarks & Participant Acknowledgment",
        lead: "Community Director",
        notes: "Stage thank-you to volunteers and community sponsors.",
      },
      {
        time: "05:00 PM",
        activity: "Site Cleanup & Environmental Pack-down",
        lead: "Logistics Captain",
        notes: "Waste separation, breakdown of tents, return site to original park state.",
      },
    ],
    vendors: [
      {
        categoryName: "AV & Sound Rental",
        justification: "Ensures announcements and performances are audible across the public space.",
        selectionCriteria: ["Outdoor generator capability", "Sound engineer provided"],
        questionsToAsk: ["Do you provide rain covers for sound consoles?"],
        recommendedMilestone: "2 months before event",
      },
      {
        categoryName: "Portable Restrooms & Sanitation",
        justification: "Civic health requirement for outdoor community events.",
        selectionCriteria: ["ADA compliant units", "Handwashing stations"],
        questionsToAsk: ["What is the delivery and servicing window?"],
        recommendedMilestone: "6 weeks before event",
      },
    ],
    risksAndAlternatives: {
      potentialRisks: ["Sudden weather rainout.", "Volunteer shortage on event day."],
      mitigations: [
        "Have rain tarps and indoor gymnasium backup option arranged with city.",
        "Over-recruit volunteers by 20% to account for drops.",
      ],
      budgetSavingTips: [
        "Partner with local municipal department for subsidized permit fees.",
        "Solicit local food vendor trucks who pay permit fees to participate.",
      ],
      optionalUpgrades: ["Solar-powered phone charging station tent."],
    },
    metadata: {
      source: "curated-fallback",
      provider: "System Curated Engine",
      model: "domain-community-v1",
      version: 1,
      generatedAt: new Date().toISOString(),
    },
  };

  return validateAndNormalizePlan(rawPlan, context).adjustedPlan;
}

/**
 * FallbackPlanService: Returns personalized, domain-curated plans when AI calls timeout,
 * rate-limit, fail schema validation, or are unconfigured.
 */
export class FallbackPlanService {
  public static generateFallbackPlan(context: SanitizedPlanningContext): GeneratedEventPlan {
    switch (context.type) {
      case "WEDDING":
        return createWeddingFallback(context);
      case "BIRTHDAY":
        return createBirthdayFallback(context);
      case "COMMUNITY":
        return createCommunityFallback(context);
      default:
        return createWeddingFallback(context);
    }
  }
}
