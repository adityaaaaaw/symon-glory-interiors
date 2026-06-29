/**
 * Glory Simon Interiors - Site Visit Booking System
 * AI Service — Rule-Based Pure JavaScript
 *
 * Provides intelligent text generation and decision-support functions using
 * deterministic rule-based logic. No external API calls — fully offline.
 *
 * All functions are synchronous unless otherwise noted.
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND_NAME = 'Glory Simon Interiors';

const DESIGN_STYLE_KEYWORDS = {
  modern     : ['clean lines', 'minimalist', 'contemporary fixtures', 'neutral palettes', 'open-plan layouts'],
  traditional: ['classic mouldings', 'warm wood tones', 'ornate detailing', 'rich fabrics', 'timeless patterns'],
  luxury     : ['premium materials', 'bespoke furniture', 'statement lighting', 'marble surfaces', 'custom millwork'],
  minimal    : ['decluttered spaces', 'functional furniture', 'monochromatic tones', 'hidden storage solutions'],
  eclectic   : ['mixed textures', 'curated art pieces', 'bold accent walls', 'layered patterns'],
};

const MATERIAL_CATEGORIES = {
  flooring  : ['Italian marble', 'engineered hardwood', 'vitrified tiles', 'natural stone', 'laminate flooring'],
  walls     : ['textured paint', 'wallpaper', 'wooden panelling', 'stone cladding', 'decorative plaster'],
  ceiling   : ['gypsum false ceiling', 'POP false ceiling', 'wooden beam ceiling', 'stretch ceiling'],
  furniture : ['teak wood', 'plywood with veneer', 'MDF with lacquer', 'solid wood', 'upholstered pieces'],
  lighting  : ['recessed LED downlights', 'pendant lights', 'cove lighting', 'track lighting', 'chandeliers'],
};

const PROJECT_TYPE_NOTES = {
  'Residential'        : 'residential space',
  'Commercial'         : 'commercial establishment',
  'Office'             : 'office environment',
  'Retail'             : 'retail space',
  'Hospitality'        : 'hospitality venue',
  'Healthcare'         : 'healthcare facility',
  'Educational'        : 'educational institution',
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupee string.
 * @param {number|string} amount
 */
function formatINR(amount) {
  const n = parseFloat(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

/**
 * Format a Date or ISO string as "DD Month YYYY".
 * @param {string|Date} dateInput
 */
function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Pick a random element from an array deterministically based on a seed string.
 * @param {Array}  arr
 * @param {string} seed
 */
function pickSeeded(arr, seed = '') {
  if (!arr || arr.length === 0) return '';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return arr[Math.abs(hash) % arr.length];
}

/**
 * Capitalise the first letter of a string.
 */
function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Determine budget tier from a numeric estimate.
 * @param {number} budget
 * @returns {'entry'|'mid'|'premium'|'luxury'}
 */
function getBudgetTier(budget) {
  const b = parseFloat(budget) || 0;
  if (b < 500000)  return 'entry';
  if (b < 1500000) return 'mid';
  if (b < 5000000) return 'premium';
  return 'luxury';
}

/**
 * Calculate total area from a list of measurement objects.
 * @param {Array<{area_sqft?: number, length_ft?: number, width_ft?: number}>} measurements
 * @returns {number}
 */
function totalAreaSqft(measurements = []) {
  return measurements.reduce((sum, m) => {
    const area = parseFloat(m.area_sqft) || (parseFloat(m.length_ft || 0) * parseFloat(m.width_ft || 0));
    return sum + area;
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. generateVisitSummary
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Generate a professional multi-paragraph summary of a site visit.
 *
 * @param {{
 *   observations?: string,
 *   design_suggestions?: string,
 *   material_suggestions?: string,
 *   budget_estimate?: number|string,
 *   project_type?: string,
 *   property_type?: string,
 *   city?: string,
 *   designer_name?: string,
 * }} reportData
 * @param {Array<{
 *   room_name: string,
 *   length_ft?: number,
 *   width_ft?: number,
 *   height_ft?: number,
 *   area_sqft?: number,
 * }>} measurements
 * @returns {string} Formatted multi-paragraph professional summary
 */
function generateVisitSummary(reportData = {}, measurements = []) {
  const {
    observations        = '',
    design_suggestions  = '',
    material_suggestions= '',
    budget_estimate     = 0,
    project_type        = 'Residential',
    property_type       = 'Property',
    city                = '',
    designer_name       = 'our design specialist',
  } = reportData;

  const totalArea   = totalAreaSqft(measurements);
  const roomCount   = measurements.length;
  const budgetTier  = getBudgetTier(budget_estimate);
  const budgetFmt   = formatINR(budget_estimate);
  const projectNote = PROJECT_TYPE_NOTES[project_type] || 'property';
  const cityNote    = city ? ` located in ${city}` : '';

  // ── Paragraph 1: Overview ─────────────────────────────────────────────────
  let para1 = `${BRAND_NAME} conducted a comprehensive site visit assessment for this ${projectNote}${cityNote}. `;

  if (roomCount > 0) {
    para1 += `The visit covered ${roomCount} ${roomCount === 1 ? 'space' : 'spaces'} with a combined measured area of approximately ${totalArea.toFixed(1)} sq.ft. `;
  }

  para1 += `Our design specialist${designer_name !== 'our design specialist' ? ` ${designer_name}` : ''} carried out a thorough evaluation of the structural layout, natural light distribution, ventilation patterns, and existing fixtures to formulate a tailored design strategy.`;

  // ── Paragraph 2: Site Observations ───────────────────────────────────────
  let para2 = '';
  if (observations && observations.trim().length > 0) {
    para2 = `Site Observations: ${capitalise(observations.trim())}`;
    if (!para2.endsWith('.') && !para2.endsWith('!')) para2 += '.';
    para2 += ` These findings have been carefully considered in the preparation of our design recommendations.`;
  } else {
    para2 = `The site assessment revealed good structural integrity with adequate scope for interior transformation. Key observations were recorded across all visited spaces and will inform the subsequent design phase.`;
  }

  // ── Paragraph 3: Design Direction ────────────────────────────────────────
  let para3 = '';
  if (design_suggestions && design_suggestions.trim().length > 0) {
    para3 = `Design Recommendations: ${capitalise(design_suggestions.trim())}`;
    if (!para3.endsWith('.') && !para3.endsWith('!')) para3 += '.';
  } else {
    const styleKws = pickSeeded(Object.values(DESIGN_STYLE_KEYWORDS), project_type + budgetTier);
    const kw1 = styleKws[0] || 'thoughtful space planning';
    const kw2 = styleKws[1] || 'optimal functionality';
    para3 = `Our design approach for this ${projectNote} focuses on ${kw1} and ${kw2}, ensuring a harmonious balance between aesthetics and practicality. The proposed layout maximises natural light and optimises traffic flow throughout the space.`;
  }

  // ── Paragraph 4: Materials ────────────────────────────────────────────────
  let para4 = '';
  if (material_suggestions && material_suggestions.trim().length > 0) {
    para4 = `Material Selections: ${capitalise(material_suggestions.trim())}`;
    if (!para4.endsWith('.')) para4 += '.';
  } else {
    const tierMaterials = {
      entry  : 'quality laminate finishes, vitrified tiles, and standard gypsum false ceilings',
      mid    : 'engineered hardwood flooring, textured wall finishes, and designer lighting fixtures',
      premium: 'Italian marble surfaces, solid wood furniture, and bespoke lighting solutions',
      luxury : 'imported stone, custom millwork, premium fabric upholstery, and statement art lighting',
    };
    para4 = `The recommended material palette includes ${tierMaterials[budgetTier] || tierMaterials.mid}, selected to deliver lasting quality within the project scope.`;
  }

  // ── Paragraph 5: Budget & Timeline ───────────────────────────────────────
  const budgetTierDescriptions = {
    entry  : 'The project scope is optimised for value, delivering excellent results through smart material choices and efficient execution.',
    mid    : 'The estimated budget allows for quality materials and skilled craftsmanship, ensuring a refined end result.',
    premium: 'The premium budget enables the use of high-specification materials and bespoke design elements throughout.',
    luxury : 'The project is positioned in the luxury segment, allowing for internationally sourced materials, custom furniture, and premium finishing.',
  };

  let para5 = `Budget Estimate: The preliminary budget estimate for this project is ${budgetFmt === '—' ? 'subject to detailed quotation' : budgetFmt + ' (subject to final scope confirmation)'}. ${budgetTierDescriptions[budgetTier]}`;

  // ── Paragraph 6: Closing ─────────────────────────────────────────────────
  const para6 = `${BRAND_NAME} is committed to delivering a space that reflects your vision while exceeding functional expectations. Our team will follow up with a detailed design proposal and itemised quotation based on the findings of this site visit. We look forward to transforming your ${projectNote} into an exceptional space.`;

  // ── Measurements summary ──────────────────────────────────────────────────
  let measureSummary = '';
  if (roomCount > 0) {
    const roomLines = measurements.map((m) => {
      const area = parseFloat(m.area_sqft) || (parseFloat(m.length_ft || 0) * parseFloat(m.width_ft || 0));
      const dims  = (m.length_ft && m.width_ft)
        ? ` (${m.length_ft}ft × ${m.width_ft}ft${m.height_ft ? ` × ${m.height_ft}ft H` : ''})`
        : '';
      return `  • ${capitalise(m.room_name || 'Space')}${dims}: ${area.toFixed(1)} sq.ft`;
    }).join('\n');
    measureSummary = `\n\nRoom Measurements:\n${roomLines}\n  Total Area: ${totalArea.toFixed(1)} sq.ft`;
  }

  const fullSummary = [para1, para2, para3, para4, para5, para6]
    .filter(Boolean)
    .join('\n\n') + measureSummary;

  return fullSummary;
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. generateConfirmationMessage
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Generate a booking confirmation message string for SMS, WhatsApp or in-app use.
 *
 * @param {string} clientName
 * @param {string} bookingRef
 * @param {string|Date} visitDate
 * @param {string} slotTime
 * @param {string} projectType
 * @returns {string}
 */
function generateConfirmationMessage(clientName, bookingRef, visitDate, slotTime, projectType) {
  const name    = clientName || 'Valued Client';
  const ref     = bookingRef || '—';
  const date    = formatDate(visitDate);
  const time    = slotTime   || '—';
  const project = projectType || 'your project';

  return (
    `Dear ${name},\n\n` +
    `Thank you for choosing ${BRAND_NAME}! Your site visit booking has been successfully received.\n\n` +
    `Booking Reference: ${ref}\n` +
    `Project Type: ${project}\n` +
    `Preferred Visit Date: ${date}\n` +
    `Time Slot: ${time}\n` +
    `Status: Pending Review\n\n` +
    `Our team will review your request and confirm the appointment within 24 hours. ` +
    `You will receive a separate notification once a designer is assigned to your project.\n\n` +
    `Please keep your booking reference (${ref}) handy for all future correspondence.\n\n` +
    `For immediate assistance, contact us on our helpline.\n\n` +
    `Warm regards,\n${BRAND_NAME}`
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. generateReminderMessage
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Generate a visit reminder message for the client.
 *
 * @param {string}      clientName
 * @param {string}      bookingRef
 * @param {string|Date} visitDate
 * @param {string}      slotTime
 * @param {string}      designerName
 * @param {string|null} engineerName
 * @returns {string}
 */
function generateReminderMessage(clientName, bookingRef, visitDate, slotTime, designerName, engineerName = null) {
  const name     = clientName   || 'Valued Client';
  const ref      = bookingRef   || '—';
  const date     = formatDate(visitDate);
  const time     = slotTime     || '—';
  const designer = designerName || 'our designer';
  const engineer = engineerName ? `\nSite Engineer: ${engineerName}` : '';

  const checklistItems = [
    'Ensure all rooms to be assessed are accessible',
    'Prepare a list of your style preferences and must-haves',
    'Have your approximate budget range in mind',
    'Gather any reference images or mood boards (optional)',
    'Ensure pets are secured and children supervised during the visit',
  ];

  const checklist = checklistItems.map((item) => `  ✔ ${item}`).join('\n');

  return (
    `Dear ${name},\n\n` +
    `This is a friendly reminder from ${BRAND_NAME}.\n\n` +
    `Your site visit is scheduled for TOMORROW:\n\n` +
    `Booking Reference: ${ref}\n` +
    `Date: ${date}\n` +
    `Time Slot: ${time}\n` +
    `Designer: ${designer}${engineer}\n\n` +
    `To make the most of your visit, please prepare the following:\n\n` +
    `${checklist}\n\n` +
    `Our team typically spends 1–2 hours on-site for a comprehensive assessment. ` +
    `Please ensure someone with authority to make decisions is present throughout the visit.\n\n` +
    `Need to reschedule? Please contact us at least 24 hours in advance.\n\n` +
    `We look forward to visiting your property!\n\n` +
    `Warm regards,\n${BRAND_NAME}`
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. generateFollowUpRecommendation
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Return an array of follow-up action items based on report data.
 *
 * @param {{
 *   budget_estimate?: number|string,
 *   project_type?: string,
 *   observations?: string,
 *   design_suggestions?: string,
 *   follow_up_notes?: string,
 *   num_rooms?: number,
 * }} reportData
 * @returns {Array<{ priority: 'High'|'Medium'|'Low', action: string, timeframe: string, category: string }>}
 */
function generateFollowUpRecommendation(reportData = {}) {
  const {
    budget_estimate   = 0,
    project_type      = 'Residential',
    observations      = '',
    design_suggestions= '',
    follow_up_notes   = '',
    num_rooms         = 0,
  } = reportData;

  const budgetTier = getBudgetTier(budget_estimate);
  const budget     = parseFloat(budget_estimate) || 0;
  const actions    = [];

  // ── Always recommend ──────────────────────────────────────────────────────
  actions.push({
    priority : 'High',
    action   : 'Send detailed design concept proposal with mood boards to the client',
    timeframe: 'Within 3 business days',
    category : 'Design',
  });

  actions.push({
    priority : 'High',
    action   : 'Prepare and share itemised project quotation based on site visit findings',
    timeframe: 'Within 5 business days',
    category : 'Commercial',
  });

  // ── Budget-based recommendations ──────────────────────────────────────────
  if (budgetTier === 'luxury' || budgetTier === 'premium') {
    actions.push({
      priority : 'High',
      action   : 'Schedule a premium material selection session at our design studio',
      timeframe: 'Within 1 week',
      category : 'Material Selection',
    });
    actions.push({
      priority : 'Medium',
      action   : 'Arrange site visit by structural consultant for load-bearing wall assessment',
      timeframe: 'Within 2 weeks',
      category : 'Technical',
    });
  }

  if (budget >= 500000) {
    actions.push({
      priority : 'Medium',
      action   : 'Share 3D visualisation renders for client approval before execution',
      timeframe: 'Within 2 weeks',
      category : 'Design',
    });
  }

  // ── Project type specific ─────────────────────────────────────────────────
  if (project_type === 'Commercial' || project_type === 'Office') {
    actions.push({
      priority : 'High',
      action   : 'Review commercial building regulations and obtain necessary NOCs',
      timeframe: 'Before project commencement',
      category : 'Compliance',
    });
    actions.push({
      priority : 'Medium',
      action   : 'Consult MEP (Mechanical, Electrical, Plumbing) engineer for commercial layout',
      timeframe: 'Within 2 weeks',
      category : 'Technical',
    });
  }

  if (project_type === 'Residential') {
    actions.push({
      priority : 'Medium',
      action   : 'Schedule kitchen and bathroom detailed measurement session',
      timeframe: 'Within 1 week',
      category : 'Design',
    });
  }

  if (project_type === 'Hospitality') {
    actions.push({
      priority : 'High',
      action   : 'Review hospitality design standards and accessibility requirements',
      timeframe: 'Immediate',
      category : 'Compliance',
    });
  }

  // ── Observation-based ─────────────────────────────────────────────────────
  const obsLower = (observations || '').toLowerCase();

  if (obsLower.includes('damp') || obsLower.includes('moisture') || obsLower.includes('leak')) {
    actions.push({
      priority : 'High',
      action   : 'Arrange waterproofing specialist inspection before interior work commences',
      timeframe: 'Immediate — before design execution',
      category : 'Structural',
    });
  }

  if (obsLower.includes('wiring') || obsLower.includes('electrical') || obsLower.includes('socket')) {
    actions.push({
      priority : 'High',
      action   : 'Engage licensed electrician for electrical audit and upgrade planning',
      timeframe: 'Within 1 week',
      category : 'Technical',
    });
  }

  if (obsLower.includes('plumbing') || obsLower.includes('pipe') || obsLower.includes('drainage')) {
    actions.push({
      priority : 'Medium',
      action   : 'Commission plumbing inspection and plan for any required rerouting',
      timeframe: 'Before interior work begins',
      category : 'Technical',
    });
  }

  if (obsLower.includes('false ceiling') || obsLower.includes('ceiling height')) {
    actions.push({
      priority : 'Low',
      action   : 'Confirm ceiling height suitability for proposed false ceiling design',
      timeframe: 'During design finalisation',
      category : 'Design',
    });
  }

  // ── Room count based ──────────────────────────────────────────────────────
  const rooms = parseInt(num_rooms, 10) || 0;
  if (rooms >= 4) {
    actions.push({
      priority : 'Medium',
      action   : 'Create phased execution plan to minimise disruption during large project',
      timeframe: 'Before project kick-off',
      category : 'Project Management',
    });
  }

  // ── Follow-up notes ───────────────────────────────────────────────────────
  if (follow_up_notes && follow_up_notes.trim().length > 0) {
    actions.push({
      priority : 'Medium',
      action   : `Address specific follow-up noted during visit: "${follow_up_notes.trim().substring(0, 100)}${follow_up_notes.length > 100 ? '...' : ''}"`,
      timeframe: 'Within 3 business days',
      category : 'Custom',
    });
  }

  // ── Universal closing action ───────────────────────────────────────────────
  actions.push({
    priority : 'Low',
    action   : 'Schedule client check-in call to discuss design proposal and address queries',
    timeframe: 'After proposal delivery',
    category : 'Client Relations',
  });

  // Sort: High → Medium → Low
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. suggestNextSteps
// ════════════════════════════════════════════════════════════════════════════════
/**
 * Return structured next steps based on the current booking status and context.
 *
 * @param {{
 *   status?: string,
 *   priority?: string,
 *   project_type_id?: number,
 *   estimated_budget?: number,
 *   num_rooms?: number,
 *   confirmed_at?: string,
 *   created_at?: string,
 *   slot_date?: string,
 * }} booking
 * @returns {{
 *   currentStatus: string,
 *   nextAction: string,
 *   recommendedSteps: Array<{ step: number, action: string, owner: string, urgency: string }>,
 *   estimatedTimeline: string,
 *   notes: string,
 * }}
 */
function suggestNextSteps(booking = {}) {
  const {
    status           = 'Pending',
    priority         = 'Medium',
    estimated_budget = 0,
    num_rooms        = 0,
    slot_date        = null,
  } = booking;

  const budgetTier = getBudgetTier(estimated_budget);
  const isUrgent   = priority === 'Urgent' || priority === 'High';

  // Status-specific step configurations
  const stepConfig = {
    Pending: {
      nextAction        : 'Admin review and booking approval',
      estimatedTimeline : isUrgent ? 'Within 2–4 hours' : 'Within 24 hours',
      notes             : priority === 'Urgent' ? '⚡ URGENT: This booking has been flagged as urgent. Immediate review required.' : 'Standard review cycle applies.',
      recommendedSteps  : [
        { step: 1, action: 'Review booking details and verify client information',     owner: 'Admin',    urgency: 'Immediate' },
        { step: 2, action: 'Check slot availability and confirm preferred visit date', owner: 'Admin',    urgency: isUrgent ? 'Immediate' : 'Today' },
        { step: 3, action: 'Assign suitable designer based on project type',           owner: 'Admin',    urgency: isUrgent ? 'Immediate' : 'Today' },
        { step: 4, action: 'Send booking confirmation email and WhatsApp to client',   owner: 'System',   urgency: 'On Approval' },
        { step: 5, action: 'Notify assigned designer via email and push notification', owner: 'System',   urgency: 'On Assignment' },
      ],
    },

    Confirmed: {
      nextAction        : 'Team assignment and pre-visit preparation',
      estimatedTimeline : 'Assign team within 12 hours of confirmation',
      notes             : 'Booking confirmed. Designer must be briefed with full client requirements before the visit.',
      recommendedSteps  : [
        { step: 1, action: 'Confirm designer and site engineer availability for visit date',         owner: 'Admin',    urgency: 'Immediate' },
        { step: 2, action: 'Brief assigned team with client requirements and project scope',         owner: 'Admin',    urgency: 'Today' },
        { step: 3, action: 'Prepare site visit checklist and measurement tools',                    owner: 'Designer', urgency: 'Before Visit' },
        { step: 4, action: 'Send 24h reminder notification to client',                             owner: 'System',   urgency: '1 Day Before Visit' },
        { step: 5, action: 'Confirm travel route and on-site parking availability',                owner: 'Designer', urgency: 'Day Before Visit' },
      ],
    },

    Assigned: {
      nextAction        : 'Pre-visit briefing and site preparation',
      estimatedTimeline : `Visit on ${slot_date ? formatDate(slot_date) : 'scheduled date'}`,
      notes             : 'Team assigned. Ensure all team members have reviewed the brief and prepared the measurement kit.',
      recommendedSteps  : [
        { step: 1, action: 'Team lead to review client brief and project requirements',             owner: 'Designer',      urgency: 'Before Visit' },
        { step: 2, action: 'Prepare measurement equipment, camera, and assessment forms',          owner: 'Site Engineer', urgency: 'Day Before' },
        { step: 3, action: 'Call client to confirm visit time and access arrangements',            owner: 'Designer',      urgency: 'Day Before' },
        { step: 4, action: 'Conduct thorough site visit and document all measurements',            owner: 'Team',          urgency: 'On Visit Day' },
        { step: 5, action: 'Capture site photos covering all rooms and key details',               owner: 'Team',          urgency: 'On Visit Day' },
      ],
    },

    Scheduled: {
      nextAction        : 'Execute site visit and document findings',
      estimatedTimeline : `Visit scheduled for ${slot_date ? formatDate(slot_date) : 'the confirmed date'}`,
      notes             : 'Visit is scheduled. Team must arrive 10 minutes early and follow the assessment protocol.',
      recommendedSteps  : [
        { step: 1, action: 'Arrive at property 10 minutes before scheduled time',                  owner: 'Team',          urgency: 'On Visit Day' },
        { step: 2, action: 'Conduct room-by-room measurement using standard methodology',          owner: 'Site Engineer', urgency: 'During Visit' },
        { step: 3, action: 'Record observations, existing fixture conditions, and structural notes', owner: 'Designer',    urgency: 'During Visit' },
        { step: 4, action: `Photograph all ${num_rooms || ''} rooms and any areas of concern`,    owner: 'Team',          urgency: 'During Visit' },
        { step: 5, action: 'Brief client on initial observations and timeline expectations',        owner: 'Designer',      urgency: 'End of Visit' },
        { step: 6, action: 'Submit complete visit report within 24 hours of visit completion',     owner: 'Designer',      urgency: 'Post Visit' },
      ],
    },

    'In Progress': {
      nextAction        : 'Complete site visit and submit report',
      estimatedTimeline : 'Report due within 24 hours of visit',
      notes             : 'Visit is in progress. Report and photos must be uploaded to the portal promptly.',
      recommendedSteps  : [
        { step: 1, action: 'Complete all room measurements and photographic documentation',        owner: 'Team',     urgency: 'Immediate' },
        { step: 2, action: 'Compile visit report with observations and design suggestions',        owner: 'Designer', urgency: 'Within 4 Hours' },
        { step: 3, action: 'Upload all site photos to the portal',                                owner: 'Designer', urgency: 'Within 4 Hours' },
        { step: 4, action: 'Submit completed visit report for admin review',                      owner: 'Designer', urgency: 'Within 24 Hours' },
        { step: 5, action: 'Send completion notification email to client',                        owner: 'System',   urgency: 'On Report Submit' },
      ],
    },

    Completed: {
      nextAction        : 'Design proposal and quotation delivery',
      estimatedTimeline : budgetTier === 'luxury' ? '5–7 business days' : '3–5 business days',
      notes             : `Visit completed successfully. ${budgetTier === 'luxury' || budgetTier === 'premium' ? 'Premium client — prioritise design proposal.' : 'Proceed with standard design proposal workflow.'}`,
      recommendedSteps  : [
        { step: 1, action: 'Review visit report and finalise design concept direction',            owner: 'Designer', urgency: 'Within 2 Days' },
        { step: 2, action: 'Prepare detailed design proposal with concept renders',                owner: 'Designer', urgency: 'Within 5 Days' },
        { step: 3, action: 'Generate itemised project quotation based on visit findings',          owner: 'Admin',    urgency: 'Within 5 Days' },
        { step: 4, action: 'Schedule client presentation meeting to discuss proposal',             owner: 'Designer', urgency: 'After Proposal' },
        { step: 5, action: 'Collect client approval and advance payment to proceed',              owner: 'Admin',    urgency: 'On Approval' },
        { step: 6, action: 'Initiate project execution phase upon confirmed approval',             owner: 'Admin',    urgency: 'Post Approval' },
      ],
    },

    Cancelled: {
      nextAction        : 'Follow up for rebooking opportunity',
      estimatedTimeline : 'Follow up within 3 business days',
      notes             : 'Booking cancelled. A follow-up call may convert this to a future booking.',
      recommendedSteps  : [
        { step: 1, action: 'Review cancellation reason and document in CRM notes',               owner: 'Admin',   urgency: 'Today' },
        { step: 2, action: 'Send empathetic follow-up message to client',                        owner: 'Admin',   urgency: 'Within 24 Hours' },
        { step: 3, action: 'Offer alternative dates or modified service scope if applicable',    owner: 'Admin',   urgency: 'Within 3 Days' },
        { step: 4, action: 'Release the reserved slot back to availability',                     owner: 'System',  urgency: 'Immediate' },
        { step: 5, action: 'Mark slot as available and notify admin of freed capacity',          owner: 'System',  urgency: 'Immediate' },
      ],
    },
  };

  const config = stepConfig[status] || stepConfig['Pending'];

  return {
    currentStatus    : status,
    nextAction       : config.nextAction,
    recommendedSteps : config.recommendedSteps,
    estimatedTimeline: config.estimatedTimeline,
    notes            : config.notes,
  };
}

// ─── Module exports ───────────────────────────────────────────────────────────
module.exports = {
  generateVisitSummary,
  generateConfirmationMessage,
  generateReminderMessage,
  generateFollowUpRecommendation,
  suggestNextSteps,
  // Expose utilities for testing
  _formatDate    : formatDate,
  _formatINR     : formatINR,
  _getBudgetTier : getBudgetTier,
  _totalAreaSqft : totalAreaSqft,
};
