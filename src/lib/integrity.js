const ELEVATED_THRESHOLD = 3; // attempts within window
const RATE_LIMIT_THRESHOLD = 6; // attempts within window
const WINDOW_MS = 30000; // 30 second window

export function evaluateMessagePreviewIntegrity({ attempts, now }) {
  const currentTime = now ? new Date(now).getTime() : Date.now();
  const windowStart = currentTime - WINDOW_MS;

  // Filter attempts within the window
  const recentAttempts = (attempts || []).filter(ts => {
    const attemptTime = new Date(ts).getTime();
    return attemptTime >= windowStart;
  });

  const count = recentAttempts.length;

  if (count >= RATE_LIMIT_THRESHOLD) {
    return {
      state: 'RATE_LIMITED',
      explanation: 'This action is briefly paused because several attempts happened close together. Your account remains available, and your saved draft is still here.',
      retryAfterMs: WINDOW_MS - (currentTime - new Date(recentAttempts[0]).getTime()),
      attemptsInWindow: count
    };
  }

  if (count >= ELEVATED_THRESHOLD) {
    return {
      state: 'ELEVATED_SCRUTINY',
      explanation: 'Several attempts happened close together. Everything is fine — this is just a brief pause to keep things comfortable.',
      attemptsInWindow: count
    };
  }

  return {
    state: 'NORMAL',
    explanation: '',
    attemptsInWindow: count
  };
}
