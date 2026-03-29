// Mock authentication for localhost development
import type { Express, RequestHandler } from "express";
import session from "express-session";
import memorystore from "memorystore";
import passport from "passport";
import { storage } from "./storage";

const MemoryStore = memorystore(session);

// Test users for localhost development
const TEST_USERS = {
  agent: {
    id: "agent-test-123",
    email: "agent@example.com",
    firstName: "John",
    lastName: "Agent",
    role: "agent",
    profileImageUrl: null,
  },
  client: {
    id: "client-test-456",
    email: "client@example.com",
    firstName: "Jane",
    lastName: "Client",
    role: "client",
    profileImageUrl: null,
  },
};

export function getMockSession() {
  return session({
    secret: process.env.SESSION_SECRET || "mock-dev-secret",
    store: new MemoryStore({}),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // HTTP for localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

export async function setupMockAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getMockSession());

  // Initialize test users in the database
  for (const user of Object.values(TEST_USERS)) {
    try {
      // Match the UpsertUser type structure
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as "agent" | "client" | "brokerage" | "superadmin",
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.warn(`Failed to initialize test user ${user.email}:`, error);
    }
  }

  // Mock login endpoint - accepts ?role=agent or ?role=client
  app.get("/api/login", (req, res) => {
    const role = (req.query.role as string) || "client";
    const user = TEST_USERS[role as keyof typeof TEST_USERS] || TEST_USERS.client;

    // Create a mock authenticated session
    (req.session as any).user = {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    };

    (req.session as any).passport = {
      user: {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role,
          profile_image_url: user.profileImageUrl,
        },
        access_token: "mock-token",
        refresh_token: "mock-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      },
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      res.redirect("/");
    });
  });

  // Mock callback endpoint
  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  // Mock logout endpoint
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect("/");
    });
  });

  // Passport setup for session handling
  passport.serializeUser((user: any, cb: any) => cb(null, user));
  passport.deserializeUser((user: any, cb: any) => cb(null, user));

  app.use(passport.initialize());
  app.use(passport.session());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!user || !user.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};
