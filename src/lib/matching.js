const PROHIBITED_FIELDS = [
  'recoveryStatus',
  'recoveryDuration',
  'treatmentHistory',
  'diagnosis',
  'traumaHistory',
  'healthStatus',
  'popularity',
  'responseRate',
  'matchHistory',
  'accountAge',
  'socialGraph',
  'trustScore',
  'reputationScore',
  'compatibilityScore',
  'desirability',
  'lanternState',
  'activityRate',
  'lastActive',
  'verificationBadge'
];

export function evaluateCandidatePresentation({ viewer, candidate, visibleFields }) {
  // Check for prohibited fields in visibleFields
  if (visibleFields) {
    for (const field of Object.keys(visibleFields)) {
      if (PROHIBITED_FIELDS.includes(field)) {
        return {
          presented: false,
          reason: 'This field type is not supported for candidate presentation.',
          prohibitedField: field,
          explanations: []
        };
      }
    }
  }

  const explanations = [];

  // Check adult confirmation
  if (!viewer.adultConfirmed) {
    return {
      presented: false,
      reason: 'Adult confirmation is required.',
      explanations: []
    };
  }

  // Check reciprocal age preference
  const viewerInRange = candidate.age >= viewer.ageRange[0] && candidate.age <= viewer.ageRange[1];
  const candidateInRange = viewer.age >= (candidate.ageRange ? candidate.ageRange[0] : 25) && viewer.age <= (candidate.ageRange ? candidate.ageRange[1] : 65);

  if (!viewerInRange) {
    return {
      presented: false,
      reason: 'Age preferences do not overlap.',
      explanations: []
    };
  }

  // Check intent overlap
  const sharedIntents = viewer.intents.filter(intent => candidate.intents.includes(intent));
  if (sharedIntents.length > 0) {
    explanations.push('You selected compatible connection intentions.');
  }

  // Check pace compatibility
  if (viewer.pace === candidate.pace) {
    explanations.push('You both prefer a slower conversation pace.');
  } else if (viewer.pace === 'SLOWER' || candidate.pace === 'SLOWER') {
    explanations.push('One of you prefers a slower pace, which is respected.');
  }

  // Check interest overlap
  const sharedInterests = viewer.interests.filter(interest => candidate.interests.includes(interest));
  if (sharedInterests.length > 0) {
    explanations.push('You share interests you both chose to list.');
  }

  // Check broad area overlap
  if (viewer.broadArea === candidate.broadArea) {
    explanations.push('Your broad areas overlap.');
  }

  // Must have at least some reason to show
  if (explanations.length === 0) {
    explanations.push('This person is available for connection based on your preferences.');
  }

  return {
    presented: true,
    candidateRef: candidate.candidateRef,
    displayName: candidate.displayName,
    age: candidate.age,
    broadArea: candidate.broadArea,
    intents: candidate.intents,
    interests: candidate.interests,
    pace: candidate.pace,
    about: candidate.about,
    photoGradient: candidate.photoGradient,
    explanations,
    sharedIntents,
    sharedInterests
  };
}
