import { evaluateDisclosure } from './consent.js';

export function createMessageSuggestion({ intent, recipientDisplayName, visiblePreferences, currentScopes }) {
  const name = recipientDisplayName || 'there';
  const suggestions = {
    'low-pressure-opening': {
      text: `Hi ${name}, I noticed we share some interests. I'd enjoy a relaxed conversation if you're open to it.`,
      protectedFields: []
    },
    'warm-rephrase': {
      text: `Hey ${name}, it's nice to connect. I hope your week is going well.`,
      protectedFields: []
    },
    'clear-rephrase': {
      text: `Hello ${name}, I'd like to get to know you better. What kinds of things do you enjoy doing locally?`,
      protectedFields: []
    },
    'boundary-statement': {
      text: `Hi ${name}, I want to be upfront that I prefer to take things at a comfortable pace. I hope that works for you.`,
      protectedFields: []
    },
    'pause-statement': {
      text: `Hi ${name}, I need to step back from conversations for a little while. I appreciate our chat and will reach out when I'm ready.`,
      protectedFields: []
    },
    'alcohol-free-wording': {
      text: `Hi ${name}, would you be interested in meeting at a coffee shop or park for a first outing? I tend to prefer alcohol-free settings.`,
      protectedFields: ['alcoholFreePreference']
    }
  };

  const suggestion = suggestions[intent];
  if (!suggestion) {
    return { text: '', error: 'Unknown suggestion type.' };
  }

  // Check if protected fields are available
  if (suggestion.protectedFields.length > 0 && currentScopes) {
    for (const field of suggestion.protectedFields) {
      // We need a recipientRef to check scopes - use the visiblePreferences context
      const recipientRef = visiblePreferences && visiblePreferences.recipientRef;
      if (recipientRef) {
        const disclosure = evaluateDisclosure({
          recipientRef,
          field,
          scopes: currentScopes,
          now: new Date().toISOString()
        });
        if (!disclosure.allowed) {
          return {
            text: '',
            error: 'This suggestion requires a sharing preference that is not currently active for this connection.',
            protectedFields: suggestion.protectedFields
          };
        }
      } else {
        // If no recipientRef provided, check visiblePreferences directly
        if (visiblePreferences && !visiblePreferences[field]) {
          return {
            text: '',
            error: 'This suggestion requires a sharing preference that is not currently active for this connection.',
            protectedFields: suggestion.protectedFields
          };
        }
      }
    }
  }

  return {
    text: suggestion.text,
    protectedFields: suggestion.protectedFields,
    intent
  };
}
