import "express";

declare global {
  namespace Express {
    interface Request {
      /** Populated by requireAuth from a verified session access token. */
      auth?: { userId: string; email: string };
    }
  }
}

export {};
