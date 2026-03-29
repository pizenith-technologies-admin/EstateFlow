// Standard JWT-based authentication for localhost and any hosting service
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

const PgStore = connectPgSimple(session);

// Default credentials for development
const TEST_USERS: Record<string, {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "agent" | "client" | "brokerage" | "superadmin";
  password: string;
  agentId?: string | null;
}> = {
  agent: {
    id: "agent-test-001",
    email: "agent@example.com",
    firstName: "John",
    lastName: "Agent",
    role: "agent",
    password: "password123",
    agentId: null,
  },
  client: {
    id: "client-test-001",
    email: "client@example.com",
    firstName: "Jane",
    lastName: "Client",
    role: "client",
    password: "password123",
    agentId: null,
  },
  brokerage: {
    id: "brokerage-test-001",
    email: "brokerage@example.com",
    firstName: "Bob",
    lastName: "Broker",
    role: "brokerage",
    password: "password123",
    agentId: null,
  },
  superadmin: {
    id: "superadmin-test-001",
    email: "admin@example.com",
    firstName: "Super",
    lastName: "Admin",
    role: "superadmin",
    password: "password123",
    agentId: null,
  },
};

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "agent" | "client" | "brokerage" | "superadmin";
  accessToken?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "your-secret-key-change-in-production";
  if (secret === "your-secret-key-change-in-production" && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production");
  }
  return secret;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    secret: getJwtSecret(),
    // PostgreSQL-backed session store — survives cold starts and scales across
    // multiple serverless function instances (required on Vercel).
    // createTableIfMissing auto-creates the "session" table on first run.
    store: new PgStore({
      pool: pool as any,
      createTableIfMissing: true,
      ttl: sessionTtl / 1000, // PgStore expects seconds
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

async function getRandomAgent(): Promise<any> {
  try {
    const agents = await db.select().from(users).where(eq(users.role, "agent"));
    if (agents.length === 0) {
      console.warn("No agents found for assignment");
      return null;
    }
    return agents[Math.floor(Math.random() * agents.length)];
  } catch (error) {
    console.error("Failed to get random agent:", error);
    return null;
  }
}

async function createOrUpdateUser(user: any): Promise<any> {
  try {
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as "agent" | "client" | "brokerage" | "superadmin",
      profileImageUrl: user.profileImageUrl || null,
      agentId: user.agentId || null,
    };

    const createdUser = await storage.upsertUser(userData);
    return createdUser;
  } catch (error) {
    console.error("Failed to upsert user:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Initialize test users - create agent first, then client, then brokerage and superadmin
  // IMPORTANT: Only create test users if they don't exist - this prevents overwriting manual changes on startup
  const initOrder = [TEST_USERS.agent, TEST_USERS.client, TEST_USERS.brokerage, TEST_USERS.superadmin];
  for (const user of initOrder) {
    try {
      // Check if user already exists
      const existingUser = await storage.getUser(user.id);
      if (existingUser) {
        console.log(`Test user already exists: ${user.email} (${user.role}) - skipping initialization`);
        continue; // Skip if user already exists - don't overwrite!
      }
      
      const { password, ...userData } = user;
      
      // Assign random agent to test clients if not already assigned
      if (userData.role === "client") {
        const randomAgent = await getRandomAgent();
        (userData as any).agentId = randomAgent?.id || TEST_USERS.agent.id || null;
      }
      
      const createdUser = await createOrUpdateUser(userData);
      console.log(`Created new test user: ${user.email} (${userData.role}) - agentId: ${(userData as any).agentId}`);
    } catch (error) {
      console.error(`Failed to initialize test user ${user.email}:`, error);
    }
  }

  // Hash password function (ready to be used when needed)
  function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  // Login endpoint - accepts email and password
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const emailNorm = String(email ?? "").trim().toLowerCase();
      const passwordNorm = String(password ?? "").trim();

      if (!emailNorm || !passwordNorm) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Match DB row case-insensitively and ignore accidental whitespace in stored email
      const dbUsers = await db
        .select()
        .from(users)
        .where(sql`lower(trim(${users.email})) = ${emailNorm}`);

      if (dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        const passwordHash = hashPassword(passwordNorm);
        const storedHash = dbUser.passwordHash
          ? String(dbUser.passwordHash).trim().toLowerCase()
          : "";
        if (storedHash && storedHash === passwordHash.toLowerCase()) {
          // Password matches - login successful
          const actualRole = dbUser.role || (role || "client");
          const token = jwt.sign(
            {
              id: dbUser.id,
              email: dbUser.email,
              role: actualRole,
            },
            getJwtSecret(),
            { expiresIn: "7d" }
          );

          (req.session as any).user = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: actualRole,
            agentId: dbUser.agentId,
            accessToken: token,
          };

          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ message: "Login failed" });
            }

            res.json({
              message: "Login successful",
              user: {
                id: dbUser.id,
                email: dbUser.email,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                role: actualRole,
              },
              accessToken: token,
            });
          });
          return;
        }
      }

      // Fall back to test users for development (e.g. password_hash still null in DB)
      let user = null;
      for (const testUser of Object.values(TEST_USERS)) {
        if (
          testUser.email.toLowerCase() === emailNorm &&
          testUser.password === passwordNorm
        ) {
          // If a specific role is requested, only match that role
          if (role && testUser.role !== role) {
            continue; // Skip if role was specified but doesn't match
          }
          user = testUser;
          break;
        }
      }

      if (!user) {
        // More helpful error message
        const roleMsg = role ? ` for role '${role}'` : "";
        return res.status(401).json({ message: `Invalid credentials${roleMsg}` });
      }

      // Create or update user in database
      const { password: _, ...userData } = user;
      
      // Assign random agent to test clients if not already assigned
      if (userData.role === "client") {
        const existingUser = await storage.getUser(user.id);
        if (!existingUser?.agentId) {
          const randomAgent = await getRandomAgent();
          (userData as any).agentId = randomAgent?.id || null;
        }
      }
      
      const dbUser = await createOrUpdateUser(userData);

      // Use the actual database user ID (may differ from test user ID due to existing records)
      const actualUserId = dbUser.id;
      const actualRole = dbUser.role || user.role;
      
      // Generate JWT token with the actual database user ID
      const token = jwt.sign(
        {
          id: actualUserId,
          email: dbUser.email,
          role: actualRole,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      // Store in session with actual database user info
      (req.session as any).user = {
        id: actualUserId,
        email: dbUser.email,
        firstName: dbUser.firstName || user.firstName,
        lastName: dbUser.lastName || user.lastName,
        role: actualRole,
        agentId: dbUser.agentId || userData.agentId,
        accessToken: token,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        res.json({
          message: "Login successful",
          user: {
            id: actualUserId,
            email: dbUser.email,
            firstName: dbUser.firstName || user.firstName,
            lastName: dbUser.lastName || user.lastName,
            role: actualRole,
          },
          accessToken: token,
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Quick login endpoint for development (GET with query params)
  app.get("/api/login", async (req, res) => {
    try {
      const role = (req.query.role as string) || "client";
      const user = TEST_USERS[role as keyof typeof TEST_USERS];

      if (!user) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Create or update user in database and get actual ID
      const { password: _, ...userData } = user;
      const dbUser = await createOrUpdateUser(userData);
      
      const actualUserId = dbUser.id;
      const actualRole = dbUser.role || user.role;

      const token = jwt.sign(
        {
          id: actualUserId,
          email: dbUser.email,
          role: actualRole,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      (req.session as any).user = {
        id: actualUserId,
        email: dbUser.email,
        firstName: dbUser.firstName || user.firstName,
        lastName: dbUser.lastName || user.lastName,
        role: actualRole,
        agentId: dbUser.agentId || null,
        accessToken: token,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("Quick login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Signup endpoint
  app.post("/api/signup", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role } = req.body;

      if (!email || !firstName || !lastName || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["agent", "client", "brokerage", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create new user with random ID
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Assign random agent to new clients
      let agentId = null;
      if (role === "client") {
        const randomAgent = await getRandomAgent();
        agentId = randomAgent?.id || null;
        console.log(`Assigning agent ${agentId} to new client ${email}`);
      }

      const newUser = {
        id: userId,
        email,
        firstName,
        lastName,
        role: role as "agent" | "client" | "brokerage" | "superadmin",
        agentId,
      };

      const createdUser = await createOrUpdateUser(newUser);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email,
          role,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      // Store in session
      (req.session as any).user = {
        id: userId,
        email,
        firstName,
        lastName,
        role,
        agentId: createdUser.agentId,
        accessToken: token,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Signup failed" });
        }

        res.json({
          message: "Account created successfully",
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            role,
          },
          accessToken: token,
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Register endpoint (alias to /api/signup for mobile compatibility)
  app.post("/api/register", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role } = req.body;

      if (!email || !firstName || !lastName || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["agent", "client", "brokerage", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create new user with random ID
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Assign random agent to new clients
      let agentId = null;
      if (role === "client") {
        const randomAgent = await getRandomAgent();
        agentId = randomAgent?.id || null;
        console.log(`Assigning agent ${agentId} to new client ${email}`);
      }

      const newUser = {
        id: userId,
        email,
        firstName,
        lastName,
        role: role as "agent" | "client" | "brokerage" | "superadmin",
        agentId,
      };

      const createdUser = await createOrUpdateUser(newUser);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email,
          role,
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      // For mobile apps, just return the token without session
      res.json({
        message: "Account created successfully",
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role,
        },
        accessToken: token,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // First check session (for web)
  let user = (req.session as any)?.user;
  
  // If no session user, check JWT token (for mobile)
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        
        // Fetch user from database using decoded token data
        const dbUser = await storage.getUser(decoded.id);
        if (dbUser) {
          // Set user on session for consistency
          (req.session as any).user = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: dbUser.role,
            agentId: dbUser.agentId,
          };
          user = (req.session as any).user;
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }
  }

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};
