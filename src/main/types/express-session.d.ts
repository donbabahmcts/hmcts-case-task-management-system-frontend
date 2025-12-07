import 'express-session';

declare module 'express-session' {
  interface SessionData {
    token?: string;
    email?: string;
    tempEmail?: string;
    errors?: Array<{ text: string; href: string }>;
  }
}
