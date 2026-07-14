export const BUDGET_MAP = {
  '0-1000000': { min: 0, max: 1000000, label: 'Under ₹10 Lakhs' },
  '1000000-2500000': { min: 1000000, max: 2500000, label: '₹10 – ₹25 Lakhs' },
  '2500000-4000000': { min: 2500000, max: 4000000, label: '₹25 – ₹40 Lakhs' },
  '4000000-6000000': { min: 4000000, max: 6000000, label: '₹40 – ₹60 Lakhs' },
  '6000000+': { min: 6000000, max: Infinity, label: 'Above ₹60 Lakhs' },
};

export const PROPERTY_TYPE_MAP = {
  'Plotted Development': ['plotted_development'],
  'Villas': ['villas'],
  'Apartments': ['apartments'],
  'Commercial': ['commercial'],
};

export const generateMatchReasons = (plot, project, budgetMid, preferences) => {
  const reasons = [];
  const { location, propertyType, purpose } = preferences;

  if (budgetMid > 0) {
    const ratio = plot.price / budgetMid;
    if (ratio >= 0.85 && ratio <= 1.15) {
      reasons.push('Excellent price fit within your budget');
    } else if (ratio >= 0.7 && ratio <= 1.3) {
      reasons.push('Good price match for your budget range');
    }
  }

  if (plot.corner) {
    reasons.push('Premium corner plot with better ventilation and light');
  }

  if (plot.facing) {
    const goodFacings = ['North-East', 'East', 'North'];
    if (goodFacings.includes(plot.facing)) {
      reasons.push(`${plot.facing}-facing — considered auspicious`);
    } else {
      reasons.push(`${plot.facing}-facing direction`);
    }
  }

  if (plot.roadWidth && plot.roadWidth >= 30) {
    reasons.push(`Wide ${plot.roadWidth}ft road access`);
  }

  if (project && project.location) {
    if (location && project.location.city &&
        project.location.city.toLowerCase().includes(location.toLowerCase())) {
      reasons.push(`Located in your preferred area — ${project.location.city}`);
    }
    if (project.amenities && project.amenities.length > 0) {
      reasons.push(`Project offers ${project.amenities.length} amenities`);
    }
    if (project.status === 'ongoing') {
      reasons.push('Currently ongoing project — early investment advantage');
    }
    if (project.status === 'completed') {
      reasons.push('Completed project — ready for immediate use');
    }
    if (project.reraNumber) {
      reasons.push('RERA registered project');
    }
  }

  if (purpose === 'Investment') {
    if (plot.pricePerSqft && plot.pricePerSqft < 3000) {
      reasons.push('Competitive price per sq.ft — high appreciation potential');
    }
  }

  if (purpose === 'Self Use') {
    if (plot.size >= 1200) {
      reasons.push(`Spacious ${plot.size} sq.ft layout — ideal for building a home`);
    }
    if (plot.size >= 800 && plot.size < 1200) {
      reasons.push(`Compact ${plot.size} sq.ft — perfect for a cozy home`);
    }
  }

  if (reasons.length === 0) {
    reasons.push('Matches your basic preferences');
  }

  return reasons.slice(0, 4);
};

export const scorePlotsRuleBased = (plots, budgetMid, location, propertyType, purpose) => {
  return plots.map((plot) => {
    let score = 0;
    const breakdown = [];

    if (budgetMid > 0) {
      const priceRatio = plot.price / budgetMid;
      if (priceRatio >= 0.85 && priceRatio <= 1.15) {
        score += 25;
        breakdown.push({ label: 'Perfect budget fit', points: 25 });
      } else if (priceRatio >= 0.7 && priceRatio <= 1.3) {
        score += 15;
        breakdown.push({ label: 'Within budget range', points: 15 });
      } else if (priceRatio >= 0.5 && priceRatio <= 1.5) {
        score += 5;
        breakdown.push({ label: 'Slightly outside budget', points: 5 });
      }
    }

    const project = plot.project;
    if (project && project.location && project.location.city && location) {
      if (project.location.city.toLowerCase().includes(location.toLowerCase())) {
        score += 20;
        breakdown.push({ label: 'Preferred location match', points: 20 });
      }
    }

    if (plot.facing) {
      const premiumFacing = ['North-East', 'East', 'North'];
      if (premiumFacing.includes(plot.facing)) {
        score += 10;
        breakdown.push({ label: `${plot.facing} facing (premium)`, points: 10 });
      } else {
        score += 5;
        breakdown.push({ label: `${plot.facing} facing`, points: 5 });
      }
    }

    if (plot.corner) {
      score += 10;
      breakdown.push({ label: 'Corner plot advantage', points: 10 });
    }

    if (plot.roadWidth) {
      if (plot.roadWidth >= 40) {
        score += 8;
        breakdown.push({ label: `${plot.roadWidth}ft wide road`, points: 8 });
      } else if (plot.roadWidth >= 30) {
        score += 5;
        breakdown.push({ label: `${plot.roadWidth}ft road access`, points: 5 });
      }
    }

    if (project) {
      if (project.status === 'ongoing') {
        score += 7;
        breakdown.push({ label: 'Ongoing project — early advantage', points: 7 });
      } else if (project.status === 'completed') {
        score += 5;
        breakdown.push({ label: 'Completed project', points: 5 });
      }

      if (project.reraNumber) {
        score += 5;
        breakdown.push({ label: 'RERA registered', points: 5 });
      }

      if (project.amenities && project.amenities.length >= 5) {
        score += 5;
        breakdown.push({ label: `${project.amenities.length} project amenities`, points: 5 });
      }
    }

    if (purpose === 'Investment') {
      if (plot.pricePerSqft && plot.pricePerSqft < 3000) {
        score += 5;
        breakdown.push({ label: 'High appreciation potential', points: 5 });
      }
    }

    if (purpose === 'Self Use') {
      if (plot.size >= 1200) {
        score += 5;
        breakdown.push({ label: 'Spacious plot for home', points: 5 });
      }
    }

    const finalScore = Math.min(score, 100);
    const matchReasons = generateMatchReasons(plot, project, budgetMid, {
      location, propertyType, purpose,
    });

    return {
      plot: plot._id,
      project: project?._id,
      score: finalScore,
      matchReasons,
      scoreBreakdown: breakdown,
    };
  });
};
