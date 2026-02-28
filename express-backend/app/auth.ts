import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY;
const HEADER_NAME = 'x-api-key';

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = API_KEY?.trim();
  if (!key) {
    res.status(500).json({ error: 'Server missing API_KEY configuration' });
    return;
  }

  const provided = req.headers[HEADER_NAME];
  const providedKey =
    typeof provided === 'string' ? provided : Array.isArray(provided) ? provided[0] : undefined;

  if (!providedKey || providedKey.trim() !== key) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
}
