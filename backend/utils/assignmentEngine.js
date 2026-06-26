const { query: defaultQuery } = require('../db');

/**
 * Intelligent Assignment Engine for Glory Simon Interiors
 * 
 * Criteria order:
 * 1. Availability check (must be 'Available', ignore 'Busy' or 'On Leave', no schedule conflict on slot)
 * 2. Location match (region matching address description)
 * 3. Workload minimization (prioritize lowest number of active projects)
 * 4. Quality rating (prioritize higher user ratings)
 * 5. Historical experience
 */
async function autoAssignProfessional(bookingDetails, tx = defaultQuery) {
  const { property_type, address, preferred_date, preferred_slot } = bookingDetails;
  
  // 1. Determine whether we need a Designer or an Engineer
  // Technical construction, structural, renovations, retail -> Site Engineer.
  // Aesthetic spaces, modular kitchen, residential, apartment, villa -> Interior Designer.
  let requiredRole = 'designer';
  if (
    property_type.toLowerCase().includes('renovation') || 
    property_type.toLowerCase().includes('retail') ||
    address.toLowerCase().includes('site engineer')
  ) {
    requiredRole = 'engineer';
  }

  const table = requiredRole === 'designer' ? 'designers' : 'site_engineers';

  // 2. Fetch all candidates of the required role who are 'Available'
  const professionals = await tx.all(`SELECT * FROM ${table} WHERE availability = 'Available'`);
  
  const scoredCandidates = [];

  for (const prof of professionals) {
    // Check Schedule Conflict: Does this professional have a scheduled site visit at the same date and slot?
    const conflict = await tx.get(
      'SELECT id FROM bookings WHERE assigned_to_id = ? AND assigned_to_role = ? AND preferred_date = ? AND preferred_slot = ? AND status NOT IN ("Cancelled")',
      [prof.id, requiredRole, preferred_date, preferred_slot]
    );

    if (conflict) {
      // Direct schedule conflict - skip this candidate
      continue;
    }

    // Calculate score factors
    let score = 0;

    // A. Location match
    const regionName = prof.region ? prof.region.toLowerCase() : '';
    const addressLower = address.toLowerCase();
    if (regionName && addressLower.includes(regionName)) {
      score += 150; // Proximity priority
    }

    // B. Workload minimization (lower workload = higher score boost)
    const activeProjectsCount = prof.workload || 0;
    score += Math.max(0, 100 - (activeProjectsCount * 15));

    // C. Client rating (up to 100 points)
    const ratingValue = prof.rating || 5.0;
    score += (ratingValue * 20);

    // D. Experience (years * 3)
    const expValue = prof.experience || 0;
    score += (expValue * 3);

    scoredCandidates.push({
      professional: prof,
      score: score,
      workload: activeProjectsCount,
      rating: ratingValue
    });
  }

  // Sort candidates: highest score first, then lowest workload in case of ties
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.workload - b.workload;
  });

  if (scoredCandidates.length > 0) {
    const bestMatch = scoredCandidates[0].professional;
    
    // Assignment explanation
    let reason = `Suggested ${bestMatch.name} (${requiredRole === 'designer' ? 'Interior Designer' : 'Site Engineer'}) `;
    reason += `with rating of ${bestMatch.rating}★ and ${bestMatch.experience} years experience. `;
    if (bestMatch.region && address.toLowerCase().includes(bestMatch.region.toLowerCase())) {
      reason += `Specialist in your location (${bestMatch.region}). `;
    } else {
      reason += `Recommended based on low workload (${bestMatch.workload} active visits) to ensure quality attention. `;
    }

    return {
      success: true,
      assigned_to: bestMatch.id,
      assigned_role: requiredRole,
      assignment_reason: reason,
      professional: {
        id: bestMatch.id,
        name: bestMatch.name,
        role: requiredRole,
        phone: bestMatch.phone,
        email: bestMatch.email,
        avatar: bestMatch.avatar,
        rating: bestMatch.rating,
        region: bestMatch.region,
        experience: bestMatch.experience
      }
    };
  } else {
    // Generate alternate slots
    const alternateSlots = await generateAlternateSlots(preferred_date, preferred_slot, requiredRole, tx);
    return {
      success: false,
      waiting_queue: true,
      assignment_reason: `All specialized ${requiredRole === 'designer' ? 'designers' : 'site engineers'} are fully booked or unavailable for this slot. Placed in priority waiting queue.`,
      alternate_slots: alternateSlots
    };
  }
}

async function generateAlternateSlots(dateStr, slotStr, role, tx = defaultQuery) {
  const baseDate = new Date(dateStr);
  const slotsList = ['09:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM'];
  const alternates = [];

  const table = role === 'designer' ? 'designers' : 'site_engineers';
  // Fetch top rated available professionals
  const topProfs = await tx.all(`SELECT * FROM ${table} WHERE availability = 'Available' ORDER BY rating DESC LIMIT 3`);
  
  if (topProfs.length === 0) return [];

  // Look through next 4 days for a free slot
  for (let i = 1; i <= 4; i++) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + i);
    const dateFormatted = nextDate.toISOString().split('T')[0];

    for (const slot of slotsList) {
      if (dateFormatted === dateStr && slot === slotStr) continue;

      for (const prof of topProfs) {
        const conflict = await tx.get(
          'SELECT id FROM bookings WHERE assigned_to_id = ? AND assigned_to_role = ? AND preferred_date = ? AND preferred_slot = ? AND status NOT IN ("Cancelled")',
          [prof.id, role, dateFormatted, slot]
        );

        if (!conflict) {
          alternates.push({
            date: dateFormatted,
            slot: slot,
            designer: prof.name,
            rating: prof.rating,
            avatar: prof.avatar
          });
          
          if (alternates.length >= 3) {
            return alternates;
          }
        }
      }
    }
  }

  return alternates;
}

module.exports = {
  autoAssignProfessional
};
