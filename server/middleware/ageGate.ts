// server/middleware/ageGate.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAgeToken } from './ageTokenService';

export async function requireAgeAssurance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies['hl_age_assertion'];

  if (!token) {
    res.status(403).json({ error: 'AGE_ASSURANCE_REQUIRED' });
    return;
  }

  const result = await verifyAgeToken(token, {
    requiredAge: 18,
    audience: 'hearthline-connection-zone',
  });

  if (!result.ok) {
    // Do not disclose which check failed — generic response only
    res.clearCookie('hl_age_assertion');
    res.status(403).json({ error: 'AGE_ASSURANCE_INVALID' });
    return;
  }

  // Attach minimal cohort claim — never DOB, never identity
  res.locals.ageCohort = result.claims.cohort; // e.g. "18+"
  next();
}
