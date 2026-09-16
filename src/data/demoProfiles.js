export const demoProfiles = [
  {
    candidateRef: 'candidate-avery',
    displayName: 'Avery',
    age: 41,
    broadArea: 'Central Phoenix',
    intents: ['Dating and romance', 'Friendship'],
    interests: ['Birdwatching', 'Jazz', 'Farmers markets'],
    pace: 'SLOWER',
    alcoholFreePreference: 'Prefers alcohol-free first dates',
    photoGradient: 'sunset',
    about: 'I enjoy slow weekends, small local events, and conversations that do not need to be rushed.',
    candidateInterested: true
  },
  {
    candidateRef: 'candidate-jordan',
    displayName: 'Jordan',
    age: 35,
    broadArea: 'Scottsdale',
    intents: ['Friendship', 'Local activities'],
    interests: ['Hiking', 'Board games', 'Cooking'],
    pace: 'SLOWER',
    alcoholFreePreference: 'No preference',
    photoGradient: 'forest',
    about: 'I like weekend adventures and quiet evenings. Looking for genuine connections at a comfortable pace.',
    candidateInterested: false
  },
  {
    candidateRef: 'candidate-morgan',
    displayName: 'Morgan',
    age: 44,
    broadArea: 'Central Phoenix',
    intents: ['Community connection', 'Conversation only'],
    interests: ['Reading', 'Volunteering', 'Yoga'],
    pace: 'SLOWER',
    alcoholFreePreference: 'Prefers alcohol-free first dates',
    photoGradient: 'dawn',
    about: 'Book clubs, neighborhood events, and good coffee. I value depth over speed in getting to know people.',
    candidateInterested: true
  },
  {
    candidateRef: 'candidate-sam',
    displayName: 'Sam',
    age: 38,
    broadArea: 'Tempe',
    intents: ['Dating and romance', 'Local activities'],
    interests: ['Live music', 'Photography', 'Cycling'],
    pace: 'STANDARD',
    alcoholFreePreference: 'No preference',
    photoGradient: 'ocean',
    about: 'Concerts, bike rides, and trying new restaurants. Happy to take things at whatever pace feels right.',
    candidateInterested: false
  },
  {
    candidateRef: 'candidate-casey',
    displayName: 'Casey',
    age: 47,
    broadArea: 'Central Phoenix',
    intents: ['Friendship', 'Community connection'],
    interests: ['Gardening', 'Pottery', 'Walking groups'],
    pace: 'SLOWER',
    alcoholFreePreference: 'Prefers alcohol-free first dates',
    photoGradient: 'meadow',
    about: 'I find joy in making things with my hands and meeting neighbors. Looking for unhurried friendship.',
    candidateInterested: true
  },
  {
    candidateRef: 'candidate-riley',
    displayName: 'Riley',
    age: 33,
    broadArea: 'Scottsdale',
    intents: ['Conversation only', 'Not sure yet'],
    interests: ['Writing', 'Film', 'Meditation'],
    pace: 'SLOWER',
    alcoholFreePreference: 'No preference',
    photoGradient: 'twilight',
    about: 'I enjoy thoughtful conversations about anything and nothing. No rush, no pressure.',
    candidateInterested: false
  }
];

export const INTENT_OPTIONS = [
  'Dating and romance',
  'Friendship',
  'Local activities',
  'Community connection',
  'Conversation only',
  'Not sure yet'
];

export const INTEREST_OPTIONS = [
  'Gardening', 'Live music', 'Cooking', 'Birdwatching', 'Jazz',
  'Farmers markets', 'Hiking', 'Board games', 'Reading', 'Volunteering',
  'Yoga', 'Photography', 'Cycling', 'Pottery', 'Walking groups',
  'Writing', 'Film', 'Meditation'
];

export const PACE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard pace', description: 'A regular rhythm of connection.' },
  { value: 'SLOWER', label: 'Slower pace', description: 'More time between interactions, less pressure.' },
  { value: 'MANUAL', label: 'Manual only', description: 'You choose when to see new people.' }
];

export const BROAD_AREAS = [
  'Central Phoenix',
  'Scottsdale',
  'Tempe',
  'Mesa',
  'Glendale',
  'Chandler'
];
