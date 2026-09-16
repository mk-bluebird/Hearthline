# Hearthline Accessibility Statement

## Commitment

Hearthline is designed to be accessible and comfortable for adults seeking connection at a calmer pace. This includes commitment to accessibility for users with varying abilities and preferences.

## Keyboard Navigation

The application commits to:
- All interactive controls are reachable via keyboard
- Tab order follows logical reading sequence
- Focus indicators are clearly visible
- No keyboard traps exist
- Modal dialogs trap focus appropriately and release it on close

## Visible Focus

All interactive elements implement:
- Clear focus ring styles using CSS
- High contrast between focused element and background
- No reliance on color alone to indicate focus state

## Plain-Language Wording

User-facing text prioritizes:
- Simple, direct language
- Avoidance of jargon or technical terms
- Clear explanation of privacy choices
- Honest description of demo limitations
- No manipulative or coercive wording

## Low-Energy Mode

The low-energy mode feature:
- Reduces visual complexity when activated
- Minimizes animation and motion
- Simplifies interface presentation
- Respects user choice to reduce cognitive load

## No Urgency Prompts

The application explicitly avoids:
- Countdown timers pressuring response
- Streak counters or gamification
- "Active now" status indicators
- Response rate metrics
- Read receipts creating obligation
- Any language implying urgency or pressure

## Reduced-Motion Support

CSS respects user preferences:
- `prefers-reduced-motion` media query support
- Animations disabled or minimized when requested
- Transitions use minimal movement
- No auto-advancing content

## Known Limitations

Current demo limitations requiring future work:
- Manual assistive-technology testing has not been completed
- ARIA labels need verification with screen readers
- Color contrast ratios need formal WCAG measurement
- Form validation messages need screen reader testing
- Error states need comprehensive accessibility review

## Current Demo vs. Future Production

### Current Demo Status
- Basic keyboard navigation implemented
- Focus styles present
- Plain-language copy used
- Reduced-motion CSS included
- No automated accessibility testing yet

### Future Production Requirements
- Automated accessibility testing (axe, Lighthouse)
- Manual screen reader testing (NVDA, VoiceOver, JAWS)
- Formal WCAG 2.1 AA compliance audit
- User testing with people who have disabilities
- Ongoing accessibility monitoring and remediation
- Accessibility statement with contact mechanism

## Continuous Improvement

Accessibility is an ongoing commitment. Future milestones will address:
- Comprehensive automated testing integration
- Manual testing protocols
- User feedback mechanisms for accessibility issues
- Documentation of known issues and remediation timeline
- Third-party accessibility audit for production deployment

## Contact for Accessibility Issues

For a production service, an accessibility contact mechanism would be provided. In this demo phase, accessibility feedback should be directed through the repository's issue tracking system.
