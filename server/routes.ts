import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { isAuthenticated } from "./simpleAuth";
import { insertPropertySchema, insertTourSchema, insertShowingRequestSchema, insertOfferSchema, insertClientGroupSchema, insertLocationHistorySchema, insertRentalProfileSchema, insertRentalApplicationSchema, insertRequirementsExceptionSchema, insertAgentBrandingSettingSchema, insertSettingsVersionSchema, clientRequirements, users, agentBrandingSettings, settingsVersions, brokerages, brokerageAgents, propertyRatings } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { Client } from "@googlemaps/google-maps-services-js";
import { sendEmail, generateTourReminderEmail, generateShowingConfirmationEmail, generateScheduleChangeEmail, generateClientWelcomeEmail, type TourReminderEmailData, type ShowingConfirmationEmailData, type ScheduleChangeEmailData, type ClientWelcomeEmailData } from "./emailService";
import { seedDatabase, seedBrokerageDemo } from "./seedData";
import { createHash } from "crypto";
import { cloudinaryService } from "./cloudinary";

// PII Sanitization Utility - removes sensitive personal information from objects before logging
function sanitizePII(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'socialInsuranceNumber', 'sin', 'ssn',
    'driversLicenseNumber', 'driverslicense', 'license',
    'accountNumber', 'account',
    'dateOfBirth', 'dob',
    'password', 'token', 'secret',
    'creditCard', 'cvv', 'pin'
  ];

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizePII(sanitized[key]);
    }
  }

  return sanitized;
}

// Audit logging for PII access - logs access to sensitive data without exposing the data itself
function auditPIIAccess(userId: string, action: string, resourceType: string, resourceId: string) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | User: ${userId} | Action: ${action} | Resource: ${resourceType}:${resourceId}`);
}

// Generate a random password
function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Hash a password using SHA-256
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Google Maps route optimization function
async function optimizeTourRoute(startingAddress: string, tours: any[]) {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    // Validate tours have required propertyAddress field
    const toursWithAddress = tours.filter(tour => tour.propertyAddress);
    if (toursWithAddress.length === 0) {
      console.warn("No tours with propertyAddress provided for optimization");
      return {
        optimizedOrder: tours,
        totalDistance: "0 miles",
        totalDuration: "0 minutes",
        startLocation: startingAddress,
      };
    }

    // If no API key, return a mock optimized route for testing
    if (!apiKey) {
      console.log("No Google Maps API key found, using mock route optimization");
      return {
        optimizedOrder: toursWithAddress.sort((a, b) => (a.propertyAddress || "").localeCompare(b.propertyAddress || "")),
        totalDistance: "12.4 miles",
        totalDuration: "35 minutes",
        startLocation: startingAddress,
      };
    }

    const mapsClient = new Client({});

    // Create waypoints from tour addresses
    const destinations = toursWithAddress.map(tour => tour.propertyAddress);

    // Calculate distance matrix
    const distanceResponse = await mapsClient.distancematrix({
      params: {
        origins: [startingAddress],
        destinations: destinations,
        key: apiKey,
        units: "imperial" as any,
        mode: "driving" as any,
      },
    });

    // Simple optimization: sort by distance from starting point
    const distances = distanceResponse.data.rows[0].elements;
    const tourDistances = toursWithAddress.map((tour, index) => ({
      tour,
      distance: distances[index].distance?.value || Infinity,
      duration: distances[index].duration?.value || 0,
    }));

    // Sort by distance for basic optimization
    const optimizedTours = tourDistances
      .filter(item => item.distance !== Infinity)
      .sort((a, b) => a.distance - b.distance);

    // Now calculate actual route distance between consecutive stops
    const optimizedAddresses = optimizedTours.map(item => item.tour.propertyAddress);
    let totalDistance = 0;
    let totalDuration = 0;

    // Add distance from start to first stop
    if (optimizedTours.length > 0) {
      totalDistance += optimizedTours[0].distance;
      totalDuration += optimizedTours[0].duration;
    }

    // Calculate distances between consecutive stops if there are multiple
    if (optimizedAddresses.length > 1) {
      try {
        const routeDistanceResponse = await mapsClient.distancematrix({
          params: {
            origins: optimizedAddresses.slice(0, -1),
            destinations: optimizedAddresses.slice(1),
            key: apiKey,
            units: "imperial" as any,
            mode: "driving" as any,
          },
        });

        // Sum distances between consecutive points
        for (let i = 0; i < routeDistanceResponse.data.rows.length; i++) {
          const element = routeDistanceResponse.data.rows[i].elements[0];
          if (element?.distance?.value) {
            totalDistance += element.distance.value;
          }
          if (element?.duration?.value) {
            totalDuration += element.duration.value;
          }
        }
      } catch (err) {
        console.warn("Error calculating inter-stop distances, using from-origin distances only");
        // Fallback: use distances from origin
        totalDistance = optimizedTours.reduce((sum, item) => sum + item.distance, 0);
        totalDuration = optimizedTours.reduce((sum, item) => sum + item.duration, 0);
      }
    }

    return {
      optimizedOrder: optimizedTours.map(item => item.tour),
      totalDistance: `${(totalDistance * 0.000621371).toFixed(1)} miles`,
      totalDuration: `${Math.ceil(totalDuration / 60)} minutes`,
      startLocation: startingAddress,
    };
  } catch (error) {
    console.error("Error optimizing route:", error);
    // Return a fallback mock route if Google Maps fails
    const toursWithAddress = tours.filter(tour => tour.propertyAddress);
    return {
      optimizedOrder: toursWithAddress.sort((a, b) => (a.propertyAddress || "").localeCompare(b.propertyAddress || "")),
      totalDistance: "12.4 miles",
      totalDuration: "35 minutes",
      startLocation: startingAddress,
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check — used by ALB and ECS container health checks
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        console.log("User not found in database, userId:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Disable caching to prevent 304 responses that break React Query
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User role update (for initial setup)
  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { role, agentId } = req.body;

      if (!['agent', 'client'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updates: any = { role };
      if (role === 'client' && agentId) {
        updates.agentId = agentId;
      }

      const user = await storage.upsertUser({ id: userId, ...updates });
      
      // Disable caching for role updates
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Get agent information for a client
  app.get('/api/auth/user/agent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'client' || !user.agentId) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).json(null); // Return null instead of 404 for "no agent assigned"
      }

      const agent = await storage.getUser(user.agentId);
      if (!agent || agent.role !== 'agent') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).json(null); // Return null instead of 404 for "agent not found"
      }

      // Disable caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      // Return agent info (excluding sensitive data)
      res.json({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        profileImageUrl: agent.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent information" });
    }
  });

  // Client type update route
  app.put('/api/auth/client-type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { clientType } = req.body;

      if (!['buyer', 'renter'].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can set client type" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        clientType: clientType as 'buyer' | 'renter'
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating client type:", error);
      res.status(500).json({ message: "Failed to update client type" });
    }
  });

  // Rental profile routes
  app.get('/api/rental-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'client' || user.clientType !== 'renter') {
        return res.status(403).json({ message: "Only renter clients can access rental profiles" });
      }

      const profile = await storage.getRentalProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching rental profile:", error);
      res.status(500).json({ message: "Failed to fetch rental profile" });
    }
  });

  app.post('/api/rental-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'client' || user.clientType !== 'renter') {
        return res.status(403).json({ message: "Only renter clients can create rental profiles" });
      }

      const profileData = insertRentalProfileSchema.parse({
        ...req.body,
        userId: userId,
      });

      const profile = await storage.createRentalProfile(profileData);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rental profile data", errors: error.errors });
      }
      console.error("Error creating rental profile:", error);
      res.status(500).json({ message: "Failed to create rental profile" });
    }
  });

  app.put('/api/rental-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'client' || user.clientType !== 'renter') {
        return res.status(403).json({ message: "Only renter clients can update rental profiles" });
      }

      // Validate the updates using a partial schema
      const updateData = insertRentalProfileSchema.omit({ userId: true }).partial().parse(req.body);

      const updatedProfile = await storage.updateRentalProfile(userId, updateData);
      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rental profile data", errors: error.errors });
      }
      console.error("Error updating rental profile:", error);
      res.status(500).json({ message: "Failed to update rental profile" });
    }
  });

  // OREA Form 410 Rental Application routes
  app.get('/api/rental-applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Agents can see applications for their properties, clients can see their own applications
      const applications = user.role === 'agent'
        ? await storage.getAgentRentalApplications(userId)
        : await storage.getUserRentalApplications(userId);

      // Sanitize sensitive data from response for security/privacy
      const sanitizedApplications = applications.map(app => {
        const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = app;
        // Also sanitize nested financial information
        if (safeData.financialInfo) {
          const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
          safeData.financialInfo = safeFinancialInfo;
        }
        return safeData;
      });

      res.json(sanitizedApplications);
    } catch (error) {
      console.error("Error fetching rental applications:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to fetch rental applications" });
    }
  });

  app.post('/api/rental-applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'client' || user.clientType !== 'renter') {
        return res.status(403).json({ message: "Only renter clients can submit rental applications" });
      }

      // Create a more flexible schema that accepts nested objects for complete OREA Form 410 data
      const oreaApplicationSchema = insertRentalApplicationSchema.extend({
        // Fix date fields to accept strings and convert to Date
        intendedStartDate: z.string().transform((str) => new Date(str)),
        dateOfBirth: z.string().transform((str) => new Date(str)),
        // Allow nested objects for related data with date conversion
        currentEmployment: z.object({
          employerName: z.string().optional(),
          position: z.string().optional(),
          businessAddress: z.string().optional(),
          businessPhone: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          supervisorName: z.string().optional(),
          monthlySalary: z.string().optional(),
          salaryType: z.enum(["hourly", "salary", "commission", "contract"]).optional(),
        }).optional(),
        previousEmployment: z.object({
          employerName: z.string().optional(),
          position: z.string().optional(),
          businessAddress: z.string().optional(),
          businessPhone: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          supervisorName: z.string().optional(),
          monthlySalary: z.string().optional(),
          salaryType: z.enum(["hourly", "salary", "commission", "contract"]).optional(),
        }).optional(),
        financialInfo: z.object({
          bankName: z.string().optional(),
          branchAddress: z.string().optional(),
          accountType: z.enum(["checking", "savings", "credit"]).optional(),
          accountNumber: z.string().optional(),
          monthlyIncome: z.string().optional(),
          otherIncome: z.string().optional(),
          otherIncomeSource: z.string().optional(),
          monthlyDebts: z.string().optional(),
          debtDetails: z.string().optional(),
          bankruptcyHistory: z.boolean().optional(),
          bankruptcyDetails: z.string().optional(),
        }).optional(),
        currentRental: z.object({
          address: z.string().optional(),
          landlordName: z.string().optional(),
          landlordPhone: z.string().optional(),
          landlordEmail: z.string().optional(),
          monthlyRent: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          reasonForLeaving: z.string().optional(),
          wasEvicted: z.boolean().optional(),
          latePayments: z.boolean().optional(),
        }).optional(),
        previousRental: z.object({
          address: z.string().optional(),
          landlordName: z.string().optional(),
          landlordPhone: z.string().optional(),
          landlordEmail: z.string().optional(),
          monthlyRent: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
          reasonForLeaving: z.string().optional(),
          wasEvicted: z.boolean().optional(),
          latePayments: z.boolean().optional(),
        }).optional(),
        reference1: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phoneNumber: z.string().optional(),
          email: z.string().optional(),
          yearsKnown: z.string().optional(),
        }).optional(),
        reference2: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phoneNumber: z.string().optional(),
          email: z.string().optional(),
          yearsKnown: z.string().optional(),
        }).optional(),
      });

      // Removed sensitive data logging for security

      const parsedData = oreaApplicationSchema.parse({
        ...req.body,
        userId: userId,
        applicantName: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || (user.firstName + ' ' + user.lastName),
        email: req.body.email || user.email,
        status: 'submitted', // Fix: Use valid enum value instead of 'pending'
        agentId: req.body.agentId,
      });

      // Extract only the fields that belong to the main rental_applications table
      const {
        currentEmployment,
        previousEmployment,
        financialInfo,
        currentRental,
        previousRental,
        reference1,
        reference2,
        ...mainApplicationData
      } = parsedData;

      // Pass both the main data and the nested sections to storage
      const applicationData = {
        ...mainApplicationData,
        // Nested sections for related tables
        currentEmployment,
        previousEmployment,
        financialInfo,
        currentRental,
        previousRental,
        reference1,
        reference2,
      };

      const application = await storage.createRentalApplication(applicationData);

      // Audit log: Track PII submission
      auditPIIAccess(userId, 'CREATE', 'rental_application', application.id);

      // Sanitize sensitive data from response for security/privacy
      const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = application;
      // Also sanitize nested financial information
      if (safeData.financialInfo) {
        const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
        safeData.financialInfo = safeFinancialInfo;
      }
      res.json(safeData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid application data", errors: error.errors });
      }
      // Sanitize error before logging to prevent PII leakage
      console.error("Error creating rental application:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to create rental application" });
    }
  });

  app.get('/api/rental-applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const applicationId = req.params.id;

      const application = await storage.getRentalApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check authorization - users can only see their own applications or applications for their properties
      const user = await storage.getUser(userId);
      if (user?.role === 'client' && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user?.role === 'agent' && application.agentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Audit log: Track PII access
      auditPIIAccess(userId, 'VIEW', 'rental_application', applicationId);

      // Sanitize sensitive data from response for security/privacy
      const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = application;
      // Also sanitize nested financial information
      if (safeData.financialInfo) {
        const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
        safeData.financialInfo = safeFinancialInfo;
      }
      res.json(safeData);
    } catch (error) {
      console.error("Error fetching rental application:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to fetch rental application" });
    }
  });

  app.put('/api/rental-applications/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const applicationId = req.params.id;
      const { status, reviewNotes } = req.body;

      const user = await storage.getUser(userId);
      if (user?.role !== 'agent') {
        return res.status(403).json({ message: "Only agents can update application status" });
      }

      const application = await storage.getRentalApplication(applicationId);
      if (!application || application.agentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedApplication = await storage.updateRentalApplicationStatus(
        applicationId,
        status,
        reviewNotes,
        userId
      );
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application status:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Properties
  app.get('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const agentId = user.role === 'agent' ? user.id : user.agentId || undefined;
      const properties = await storage.getProperties(agentId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get('/api/properties/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      res.json(property);
    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({ message: 'Failed to fetch property' });
    }
  });

  app.get('/api/properties/:propertyId/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const reviews = await storage.getPropertyReviews(req.params.propertyId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching property reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create properties" });
      }

      const propertyData = insertPropertySchema.parse({ ...req.body, agentId: user.id });
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Tours
  app.get('/api/tours', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const filters: any = {};
      if (user.role === 'agent') {
        filters.agentId = user.id;
      } else {
        filters.clientId = user.id;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      const tours = await storage.getTours(filters);
      res.json(tours);
    } catch (error) {
      console.error("Error fetching tours:", error);
      res.status(500).json({ message: "Failed to fetch tours" });
    }
  });

  // Create a new tour with properties
  app.post('/api/tours', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create tours" });
      }

      // Extract properties array from request body
      const { properties, ...tourData } = req.body;

      // Convert ISO string dates back to Date objects for validation
      const dataToValidate = {
        ...tourData,
        agentId: user.id,
        status: 'scheduled', // Agent-created tours are immediately scheduled, no approval step
        scheduledDate: tourData.scheduledDate ? new Date(tourData.scheduledDate) : undefined,
        startTime: tourData.startTime ? new Date(tourData.startTime) : undefined,
        endTime: tourData.endTime ? new Date(tourData.endTime) : undefined,
      };

      // Validate tour data (without properties)
      const validatedTourData = insertTourSchema.parse(dataToValidate);

      // Check for duplicate tour
      if (validatedTourData.scheduledDate && properties && Array.isArray(properties) && properties.length > 0) {
        const propertyIds = properties.map(p => p.propertyId);
        const duplicate = await storage.checkDuplicateTour(
          user.id,
          validatedTourData.clientId,
          validatedTourData.scheduledDate,
          propertyIds
        );

        if (duplicate) {
          return res.status(409).json({
            message: "A tour with the same client, date, and properties already exists.",
            duplicateTourId: duplicate.id
          });
        }
      }

      // Create the tour
      let tour = await storage.createTour(validatedTourData);

      // Create tour-property relationships if properties were provided
      if (properties && Array.isArray(properties) && properties.length > 0) {
        for (const property of properties) {
          await storage.createTourProperty({
            tourId: tour.id,
            propertyId: property.propertyId,
            order: property.order,
            scheduledTime: property.scheduledTime ? new Date(property.scheduledTime) : null,
          });
        }

        // Calculate total walking distance between properties
        const sortedProperties = [...properties].sort((a, b) => a.order - b.order);
        let totalDistance = 0;

        for (let i = 0; i < sortedProperties.length - 1; i++) {
          const prop1 = await storage.getProperty(sortedProperties[i].propertyId);
          const prop2 = await storage.getProperty(sortedProperties[i + 1].propertyId);

          if (prop1 && prop2 && 'latitude' in prop1 && 'longitude' in prop1 && 'latitude' in prop2 && 'longitude' in prop2) {
            const distance = calculateDistance(
              (prop1 as any).latitude,
              (prop1 as any).longitude,
              (prop2 as any).latitude,
              (prop2 as any).longitude
            );
            totalDistance += distance;
          }
        }

        // Update tour with total distance and return updated tour
        if (totalDistance > 0) {
          tour = await storage.updateTour(tour.id, {
            totalDistance: totalDistance.toFixed(2)
          });
        }
      }

      res.json(tour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid tour data", errors: error.errors });
      }
      console.error("Error creating tour:", error);
      res.status(500).json({ message: "Failed to create tour" });
    }
  });

  app.get('/api/tours/:tourId/properties', isAuthenticated, async (req, res) => {
    try {
      const tourProperties = await storage.getTourProperties(req.params.tourId);
      const propertiesWithDetails = [];
      
      for (const tp of tourProperties) {
        const property = await storage.getProperty(tp.propertyId);
        if (property) {
          propertiesWithDetails.push({
            ...tp,
            property: {
              id: property.id,
              address: property.address,
              city: property.city,
              province: property.province,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              area: property.area,
              propertyType: property.propertyType,
              mlsNumber: property.mlsNumber,
              imageUrl: property.imageUrl,
            }
          });
        }
      }
      
      res.json(propertiesWithDetails);
    } catch (error) {
      console.error("Error fetching tour properties:", error);
      res.status(500).json({ message: "Failed to fetch tour properties" });
    }
  });

  app.post('/api/tours/:tourId/properties', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ message: 'propertyId is required' });
      }

      // Get current property count to set order
      const existingProperties = await storage.getTourProperties(req.params.tourId);

      // Prevent duplicates
      if (existingProperties.some((tp: any) => tp.propertyId === propertyId)) {
        return res.status(409).json({ message: 'Property already in tour' });
      }

      const tourProperty = await storage.createTourProperty({
        tourId: req.params.tourId,
        propertyId,
        order: existingProperties.length + 1,
        scheduledTime: null,
      });

      res.json(tourProperty);
    } catch (error) {
      console.error('Error adding property to tour:', error);
      res.status(500).json({ message: 'Failed to add property to tour' });
    }
  });

  app.patch('/api/tours/:tourId/properties/:propertyId/status', isAuthenticated, async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;
      const tourProperty = await storage.updateTourPropertyStatus(
        req.params.tourId,
        req.params.propertyId,
        status,
        rejectionReason
      );
      res.json(tourProperty);
    } catch (error) {
      console.error("Error updating tour property status:", error);
      res.status(500).json({ message: "Failed to update tour property status" });
    }
  });

  app.patch('/api/tours/:tourId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can edit tours" });
      }

      const updates = { ...req.body };

      if (updates.startNow) {
        updates.startTime = new Date(); // ✅ Date object
        delete updates.startNow;
      }

      const updatedTour = await storage.updateTour(req.params.tourId, updates);

      res.json(updatedTour);
    } catch (error) {
      console.error("Error updating tour:", error);
      res.status(500).json({ message: "Failed to update tour" });
    }
  });

  app.patch('/api/tours/:tourId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can complete tours" });
      }

      // Fetch the existing tour first
      const existingTour = await storage.getTour(req.params.tourId);

      if (!existingTour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      const endTime = new Date();
      let actualDuration: number;

      if (existingTour.startTime) {
        // Precise: calculate from recorded start time
        actualDuration = Math.floor(
          (endTime.getTime() - new Date(existingTour.startTime).getTime()) / (1000 * 60)
        );
      } else {
        // Fallback: use estimatedDuration if start time was never recorded
        actualDuration = existingTour.estimatedDuration || 0;
      }

      const updateData: any = {
        status: 'completed',
        endTime,
        actualDuration,
      };

      // If totalDistance is provided in the body, use it
      if (req.body.totalDistance) {
        updateData.totalDistance = req.body.totalDistance;
      }

      // If totalDistance was never calculated (navigation wasn't opened), compute it now
      // using property addresses so weekly distance stat is always populated on tour end
      if (!updateData.totalDistance && !existingTour.totalDistance) {
        try {
          const tourProperties = await storage.getTourProperties(req.params.tourId);
          const sortedTps = (tourProperties || []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          const propertyAddresses: string[] = [];
          for (const tp of sortedTps) {
            const prop = await storage.getProperty(tp.propertyId);
            if (prop?.address) propertyAddresses.push(prop.address);
          }

          if (propertyAddresses.length > 1) {
            const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
            if (apiKey) {
              const mapsClient = new Client({});
              const origins = propertyAddresses.slice(0, -1);
              const destinations = propertyAddresses.slice(1);
              const matrixResponse = await mapsClient.distancematrix({
                params: {
                  origins,
                  destinations,
                  key: apiKey,
                  mode: 'driving' as any,
                  units: 'metric' as any,
                },
              });
              let totalKm = 0;
              for (let i = 0; i < matrixResponse.data.rows.length; i++) {
                const el = matrixResponse.data.rows[i]?.elements[i];
                if (el?.distance?.value) totalKm += el.distance.value / 1000;
              }
              if (totalKm > 0) {
                updateData.totalDistance = totalKm.toFixed(2);
              }
            }
          }
        } catch (distErr) {
          console.warn('Could not calculate route distance on tour complete:', distErr);
        }
      }

      const updatedTour = await storage.updateTour(req.params.tourId, updateData);

      res.json(updatedTour);
    } catch (error) {
      console.error("Error completing tour:", error);
      res.status(500).json({ message: "Failed to complete tour" });
    }
  });

  // Calculate and store total driving distance for the tour route
  // Called from the mobile app when navigation is opened, so the stat matches what Google Maps shows
  app.post('/api/tours/:tourId/calculate-route-distance', isAuthenticated, async (req: any, res) => {
    try {
      const { tourId } = req.params;
      // originLat/originLng are the user's current GPS coordinates (optional)
      const { originLat, originLng } = req.body;

      const tourProperties = await storage.getTourProperties(tourId);
      if (!tourProperties || tourProperties.length === 0) {
        return res.json({ totalDistanceKm: 0 });
      }

      // Collect all addresses in order — getTourProperties returns bare rows, fetch property for address
      const sortedTps = [...tourProperties].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      const propertyAddresses: string[] = [];
      for (const tp of sortedTps) {
        const prop = await storage.getProperty(tp.propertyId);
        if (prop?.address) propertyAddresses.push(prop.address);
      }

      if (propertyAddresses.length === 0) {
        return res.json({ totalDistanceKm: 0 });
      }

      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      let totalDistanceKm = 0;

      if (apiKey) {
        try {
          const mapsClient = new Client({});
          // Build list of waypoints: [origin, addr1, addr2, ..., addrN-1] → destinations: [addr1, addr2, ..., addrN]
          const origins: string[] = [];
          const destinations: string[] = [];

          // First leg: from current location (if available) to first property, else between properties
          if (originLat != null && originLng != null) {
            origins.push(`${originLat},${originLng}`);
            destinations.push(propertyAddresses[0]);
            // Remaining legs: between consecutive properties
            for (let i = 0; i < propertyAddresses.length - 1; i++) {
              origins.push(propertyAddresses[i]);
              destinations.push(propertyAddresses[i + 1]);
            }
          } else {
            // No current location — only property-to-property legs
            for (let i = 0; i < propertyAddresses.length - 1; i++) {
              origins.push(propertyAddresses[i]);
              destinations.push(propertyAddresses[i + 1]);
            }
          }

          if (origins.length > 0) {
            const matrixResponse = await mapsClient.distancematrix({
              params: {
                origins,
                destinations,
                key: apiKey,
                mode: 'driving' as any,
                units: 'metric' as any,
              },
            });

            // Sum the diagonal elements (each row i → destination i)
            for (let i = 0; i < matrixResponse.data.rows.length; i++) {
              const element = matrixResponse.data.rows[i]?.elements[i];
              if (element?.distance?.value) {
                totalDistanceKm += element.distance.value / 1000; // metres → km
              }
            }
          }
        } catch (mapsError) {
          console.warn('Google Maps distance matrix failed, using Haversine fallback:', mapsError);
          totalDistanceKm = 0; // will fall through to Haversine
        }
      }

      // Haversine fallback: if API key unavailable or Maps call failed AND we have current location coords
      if (totalDistanceKm === 0 && originLat != null && originLng != null) {
        // Use current location → property1 → ... → propertyN
        // We don't have property coordinates, so skip inter-property Haversine without coords
        // (Properties only have addresses in this schema)
        // Estimated distance: multiply straight-line by 1.4 road factor if we had coords
        // Since we don't, leave as 0 and let existing tour creation distance stand
      }

      if (totalDistanceKm > 0) {
        await storage.updateTour(tourId, { totalDistance: totalDistanceKm.toFixed(2) });
      }

      res.json({ totalDistanceKm: Math.round(totalDistanceKm * 10) / 10 });
    } catch (error) {
      console.error('Error calculating route distance:', error);
      // Non-fatal — return 0 so the mobile app can still open Maps
      res.json({ totalDistanceKm: 0 });
    }
  });


  // Showing requests
  app.get('/api/showing-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const filters: any = {};
      if (user.role === 'agent') {
        filters.agentId = user.id;
      } else {
        filters.clientId = user.id;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      const requests = await storage.getShowingRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching showing requests:", error);
      res.status(500).json({ message: "Failed to fetch showing requests" });
    }
  });

  app.get('/api/showing-requests/:requestId', isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getShowingRequest(req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Get properties for this request
      const propertyIds = await storage.getRequestedProperties(req.params.requestId);
      const properties = [];
      for (const propertyId of propertyIds) {
        const property = await storage.getProperty(propertyId);
        if (property) properties.push(property);
      }

      res.json({
        ...request,
        properties
      });
    } catch (error) {
      console.error("Error fetching showing request:", error);
      res.status(500).json({ message: "Failed to fetch showing request" });
    }
  });

  app.post('/api/showing-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can create showing requests" });
      }

      // Get agentId from session which has already been populated with the agent during login/signup
      const agentId = (req.session as any).user.agentId || user.agentId;

      if (!agentId) {
        return res.status(400).json({ message: "You must be assigned an agent before requesting a tour" });
      }

      const { propertyIds, preferredDate, ...requestData } = req.body;

      // Convert preferredDate string to Date object if it exists
      const parsedPreferredDate = preferredDate ? new Date(preferredDate) : null;

      const request = await storage.createShowingRequest({
        ...requestData,
        preferredDate: parsedPreferredDate,
        clientId: user.id,
        agentId: agentId
      });

      // Add properties to the request
      const properties = [];
      if (propertyIds && Array.isArray(propertyIds)) {
        for (const propertyId of propertyIds) {
          await storage.addPropertyToRequest(request.id, propertyId);
          // Get property details for email
          try {
            const property = await storage.getProperty(propertyId);
            if (property) properties.push(property);
          } catch (e) {
            console.error('Failed to fetch property for email:', e);
          }
        }
      }

      // TODO: remove comment if needed, Send confirmation email to client
      // try {
      //   if (user.email) {
      //     const clientFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Client';

      //     // Get agent information
      //     let agentName = 'Your Agent';
      //     let agentContact = 'Contact your agent directly';

      //     if (user.agentId) {
      //       try {
      //         const agent = await storage.getUser(user.agentId);
      //         if (agent) {
      //           agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Your Agent';
      //           agentContact = agent.email || 'Contact your agent directly';
      //         }
      //       } catch (e) {
      //         console.error('Failed to fetch agent for email:', e);
      //       }
      //     }

      //     // Primary property for email (first one or default)
      //     const primaryProperty = properties.length > 0 ? properties[0] : null;
      //     const propertyAddress = primaryProperty ? primaryProperty.address : 'Selected Properties';

      //     const emailData: ShowingConfirmationEmailData = {
      //       clientName: clientFullName,
      //       agentName: agentName,
      //       propertyAddress: propertyAddress,
      //       showingDate: parsedPreferredDate ? parsedPreferredDate.toLocaleDateString() : 'TBD',
      //       showingTime: requestData.preferredTime || 'TBD',
      //       agentContact: agentContact
      //     };

      //     const emailTemplate = generateShowingConfirmationEmail(emailData);
      //     await sendEmail({
      //       to: user.email,
      //       from: 'notifications@estatevista.com',
      //       subject: emailTemplate.subject,
      //       text: emailTemplate.text,
      //       html: emailTemplate.html
      //     });

      //     console.log(`Showing confirmation email sent to ${user.email}`);
      //   }
      // } catch (emailError) {
      //   console.error("Failed to send showing confirmation email:", emailError); 
      //   // Don't fail the entire request if email fails
      // }

      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating showing request:", error);
      res.status(500).json({ message: "Failed to create showing request" });
    }
  });

  //TODO: edit this request to make a tour for agent and client
  app.patch('/api/showing-requests/:requestId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can update request status" });
      }

      const { status } = req.body;
      const requestId = req.params.requestId;

      // Get the showing request details before updating
      const showingRequest = await storage.getShowingRequest(requestId);
      if (!showingRequest) {
        return res.status(404).json({ message: "Showing request not found" });
      }

      // Update the status
      const updatedRequest = await storage.updateShowingRequestStatus(requestId, status);

      // If approved, automatically create a tour
      if (status === 'approved') {
        try {
          // Get the properties from the showing request
          const propertyIds = await storage.getRequestedProperties(requestId);

          // Create the tour with the client and agent from the showing request
          const tourDate = showingRequest.preferredDate || new Date();
          const tour = await storage.createTour({
            agentId: showingRequest.agentId,
            clientId: showingRequest.clientId,
            scheduledDate: tourDate,
            status: 'scheduled',
            notes: showingRequest.notes || `Auto-created from approved showing request`,
          });

          // Add all requested properties to the tour
          for (let i = 0; i < propertyIds.length; i++) {
            await storage.createTourProperty({
              tourId: tour.id,
              propertyId: propertyIds[i],
              order: i + 1,
              scheduledTime: null,
            });
          }

          console.log(`Auto-created tour ${tour.id} from approved showing request ${requestId}`);

          // Return the updated request along with the created tour info
          return res.json({
            ...updatedRequest,
            autoCreatedTour: {
              id: tour.id,
              date: tour.scheduledDate,
              propertiesCount: propertyIds.length,
            }
          });
        } catch (tourError) {
          console.error("Error auto-creating tour:", tourError);
          // Still return success for the status update, but log the tour creation failure
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating showing request status:", error);
      res.status(500).json({ message: "Failed to update showing request status" });
    }


    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create tours" });
      }

      // Extract properties array from request body
      const { properties, ...tourData } = req.body;

      // Convert ISO string dates back to Date objects for validation
      const dataToValidate = {
        ...tourData,
        agentId: user.id,
        scheduledDate: tourData.scheduledDate ? new Date(tourData.scheduledDate) : undefined,
        startTime: tourData.startTime ? new Date(tourData.startTime) : undefined,
        endTime: tourData.endTime ? new Date(tourData.endTime) : undefined,
      };

      // Validate tour data (without properties)
      const validatedTourData = insertTourSchema.parse(dataToValidate);

      // Check for duplicate tour
      if (validatedTourData.scheduledDate && properties && Array.isArray(properties) && properties.length > 0) {
        const propertyIds = properties.map(p => p.propertyId);
        const duplicate = await storage.checkDuplicateTour(
          user.id,
          validatedTourData.clientId,
          validatedTourData.scheduledDate,
          propertyIds
        );

        if (duplicate) {
          return res.status(409).json({
            message: "A tour with the same client, date, and properties already exists.",
            duplicateTourId: duplicate.id
          });
        }
      }

      // Create the tour
      let tour = await storage.createTour(validatedTourData);

      // Create tour-property relationships if properties were provided
      if (properties && Array.isArray(properties) && properties.length > 0) {
        for (const property of properties) {
          await storage.createTourProperty({
            tourId: tour.id,
            propertyId: property.propertyId,
            order: property.order,
            scheduledTime: property.scheduledTime ? new Date(property.scheduledTime) : null,
          });
        }

        // Calculate total walking distance between properties
        const sortedProperties = [...properties].sort((a, b) => a.order - b.order);
        let totalDistance = 0;

        for (let i = 0; i < sortedProperties.length - 1; i++) {
          const prop1 = await storage.getProperty(sortedProperties[i].propertyId);
          const prop2 = await storage.getProperty(sortedProperties[i + 1].propertyId);

          if (prop1 && prop2 && 'latitude' in prop1 && 'longitude' in prop1 && 'latitude' in prop2 && 'longitude' in prop2) {
            const distance = calculateDistance(
              (prop1 as any).latitude,
              (prop1 as any).longitude,
              (prop2 as any).latitude,
              (prop2 as any).longitude
            );
            totalDistance += distance;
          }
        }

        // Update tour with total distance and return updated tour
        if (totalDistance > 0) {
          tour = await storage.updateTour(tour.id, {
            totalDistance: totalDistance.toFixed(2)
          });
        }
      }

      res.json(tour);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid tour data", errors: error.errors });
      }
      console.error("Error creating tour:", error);
      res.status(500).json({ message: "Failed to create tour" });
    }
  });



  // Offers
  app.get('/api/offers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const filters: any = {};
      if (user.role === 'agent') {
        filters.agentId = user.id;
      } else {
        filters.clientId = user.id;
      }

      if (req.query.propertyId) {
        filters.propertyId = req.query.propertyId;
      }

      const offers = await storage.getOffers(filters);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.post('/api/offers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can make offers" });
      }

      const offerData = insertOfferSchema.parse({
        ...req.body,
        clientId: user.id,
        agentId: user.agentId!
      });

      const offer = await storage.createOffer(offerData);
      res.json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid offer data", errors: error.errors });
      }
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  // Clients (for agents)
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client list" });
      }

      const clients = await storage.getClientsWithStats(user.id);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create clients" });
      }

      const { firstName, lastName, email, clientType } = req.body;

      if (!firstName || !lastName || !email || !clientType) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!['buyer', 'renter'].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }

      // Generate a unique password for the client
      const generatedPassword = generatePassword();
      const passwordHash = hashPassword(generatedPassword);

      // Create client using storage interface
      const clientData = {
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        email,
        role: 'client' as const,
        clientType: clientType as 'buyer' | 'renter',
        agentId: user.id,
        passwordHash: passwordHash
      };

      const newClient = await storage.upsertUser(clientData);

      // Send welcome email with credentials
      const emailData: ClientWelcomeEmailData = {
        clientName: `${firstName} ${lastName}`,
        email: email,
        password: generatedPassword,
        agentName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        agentEmail: user.email || 'agent@estate-vista.com',
      };

      const emailTemplate = generateClientWelcomeEmail(emailData);
      const emailSent = await sendEmail({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@estate-vista.com',
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      if (emailSent) {
        console.log(`Welcome email sent to ${email}`);
      } else {
        console.warn(`Failed to send welcome email to ${email}`);
      }

      res.json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can update clients" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const { firstName, lastName, email, clientType, phone, profileImageUrl } = req.body;

      if (clientType && !['buyer', 'renter'].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }

      // Update only provided fields
      const updatedData: any = { ...client };
      if (firstName !== undefined) updatedData.firstName = firstName;
      if (lastName !== undefined) updatedData.lastName = lastName;
      if (email !== undefined) updatedData.email = email;
      if (clientType !== undefined) updatedData.clientType = clientType;
      if (phone !== undefined) updatedData.phone = phone;
      if (profileImageUrl !== undefined) updatedData.profileImageUrl = profileImageUrl;

      const updatedClient = await storage.upsertUser(updatedData);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can delete clients" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      await storage.deleteUser(clientId);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client Profile Endpoints
  app.get('/api/clients/:clientId/requirements', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const requirements = await storage.getClientRequirements(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching client requirements:", error);
      res.status(500).json({ message: "Failed to fetch client requirements" });
    }
  });

  app.get('/api/clients/:clientId/history', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const history = await storage.getClientHistory(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(history);
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ message: "Failed to fetch client history" });
    }
  });

  app.get('/api/clients/:clientId/shortlists', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const shortlists = await storage.getShortlistedProperties(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(shortlists);
    } catch (error) {
      console.error("Error fetching client shortlists:", error);
      res.status(500).json({ message: "Failed to fetch client shortlists" });
    }
  });

  app.get('/api/clients/:clientId/offers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const offers = await storage.getOffers({ clientId });
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(offers);
    } catch (error) {
      console.error("Error fetching client offers:", error);
      res.status(500).json({ message: "Failed to fetch client offers" });
    }
  });

  app.get('/api/clients/:clientId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const documents = await storage.getDocuments(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(documents);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ message: "Failed to fetch client documents" });
    }
  });

  app.get('/api/clients/:clientId/media', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const media = await storage.getClientMedia(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(media);
    } catch (error) {
      console.error("Error fetching client media:", error);
      res.status(500).json({ message: "Failed to fetch client media" });
    }
  });

  app.get('/api/clients/:clientId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const notes = await storage.getClientNotes(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(notes);
    } catch (error) {
      console.error("Error fetching client notes:", error);
      res.status(500).json({ message: "Failed to fetch client notes" });
    }
  });

  app.post('/api/clients/:clientId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create client notes" });
      }

      const { clientId } = req.params;
      const { content } = req.body;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Note content is required" });
      }

      const note = await storage.createClientNote(clientId, user.id, content.trim());
      res.json(note);
    } catch (error) {
      console.error("Error creating client note:", error);
      res.status(500).json({ message: "Failed to create client note" });
    }
  });

  app.get('/api/clients/:clientId/groups', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client data" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const groups = await storage.getClientGroups(clientId);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(groups);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });

  // Get client's own groups (for client-facing API)
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const clientGroups = await storage.getClientGroups(userId);
      res.json(clientGroups);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });

  // Get group messages
  app.get('/api/groups/:groupId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { groupId } = req.params;

      // Verify user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const messages = await storage.getGroupMessages(groupId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching group messages:", error);
      res.status(500).json({ message: "Failed to fetch group messages" });
    }
  });

  // Send a group message
  app.post('/api/groups/:groupId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { groupId } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const newMessage = await storage.createGroupMessage({
        groupId,
        userId,
        message: message.trim(),
      });

      res.json(newMessage);
    } catch (error) {
      console.error("Error sending group message:", error);
      res.status(500).json({ message: "Failed to send group message" });
    }
  });

  // Get group members
  app.get('/api/groups/:groupId/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { groupId } = req.params;

      // Verify user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // ==================== REQUIREMENTS SYSTEM API ====================

  // Get enhanced client requirements with validation and matches
  app.get('/api/clients/:clientId/requirements-enhanced', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client requirements" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const requirement = await storage.getClientRequirement(clientId);

      if (requirement) {
        // Get additional data
        const [versions, exceptions, propertyMatches] = await Promise.all([
          storage.getRequirementVersions(requirement.id),
          storage.getRequirementExceptions(requirement.id),
          storage.getPropertyMatchesForClient(clientId)
        ]);

        res.json({
          requirement,
          versions,
          exceptions,
          propertyMatches: propertyMatches.slice(0, 10) // Top 10 matches
        });
      } else {
        res.json({
          requirement: null,
          versions: [],
          exceptions: [],
          propertyMatches: []
        });
      }
    } catch (error) {
      console.error("Error fetching client requirements:", error);
      res.status(500).json({ message: "Failed to fetch client requirements" });
    }
  });

  // Create/Update client requirements
  app.post('/api/clients/:clientId/requirements-enhanced', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can manage client requirements" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Handle date string conversion
      const requirementData = {
        ...req.body,
        userId: clientId,
        agentId: user.id,
        clientType: client.clientType || 'buyer',
        // Convert date strings to Date objects for database timestamp columns
        mortgagePreApprovalExpiry: req.body.mortgagePreApprovalExpiry ? new Date(req.body.mortgagePreApprovalExpiry) : null,
        desiredClosingDate: req.body.desiredClosingDate ? new Date(req.body.desiredClosingDate) : null,
        preferredMoveInDate: req.body.preferredMoveInDate ? new Date(req.body.preferredMoveInDate) : null,
      };

      const requirement = await storage.createClientRequirement(requirementData);

      // Auto-validate after creation
      const validation = await storage.validateRequirements(requirement.id, user.id);

      res.json({
        requirement,
        validation
      });
    } catch (error) {
      console.error("Error creating client requirements:", error);
      res.status(500).json({ message: "Failed to create client requirements" });
    }
  });

  // Validate requirements
  app.post('/api/requirements/:requirementId/validate', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can validate requirements" });
      }

      const { requirementId } = req.params;
      const validation = await storage.validateRequirements(requirementId, user.id);

      res.json(validation);
    } catch (error) {
      console.error("Error validating requirements:", error);
      res.status(500).json({ message: "Failed to validate requirements" });
    }
  });

  // Calculate property matches  
  app.post('/api/requirements/:requirementId/calculate-matches', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can calculate property matches" });
      }

      const { requirementId } = req.params;
      const matches = await storage.calculatePropertyMatches(requirementId);

      res.json({
        matches: matches.slice(0, 20), // Top 20 matches
        totalMatches: matches.length
      });
    } catch (error) {
      console.error("Error calculating property matches:", error);
      res.status(500).json({ message: "Failed to calculate property matches" });
    }
  });

  // Create requirement exception
  app.post('/api/requirements/:requirementId/exceptions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create exceptions" });
      }

      const { requirementId } = req.params;

      // Verify requirement exists and belongs to this agent
      const [requirement] = await db
        .select()
        .from(clientRequirements)
        .where(eq(clientRequirements.id, requirementId));

      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      if (requirement.agentId !== user.id) {
        return res.status(403).json({ message: "You can only create exceptions for your own clients' requirements" });
      }

      // Validate request body with Zod schema
      const exceptionSchema = insertRequirementsExceptionSchema.extend({
        requirementId: z.string().uuid()
      });

      const validationResult = exceptionSchema.safeParse({
        requirementId,
        exceptionType: req.body.exceptionType,
        description: req.body.description,
        justification: req.body.justification,
        approvedBy: user.id,
        approvedAt: new Date(),
        status: 'approved',
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid exception data",
          errors: validationResult.error.errors
        });
      }

      const exception = await storage.createRequirementException(validationResult.data);
      res.json(exception);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid exception data", errors: error.errors });
      }
      console.error("Error creating requirement exception:", error);
      res.status(500).json({ message: "Failed to create exception" });
    }
  });

  // Client-facing endpoint to get their own requirements
  app.get('/api/client-requirements', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }

      const requirements = await storage.getClientRequirement(user.id);

      if (requirements) {
        res.json(requirements);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching client requirements:", error);
      res.status(500).json({ message: "Failed to fetch requirements" });
    }
  });

  // Client-facing endpoint to create/update their own requirements
  app.post('/api/client-requirements', isAuthenticated, async (req: any, res) => {
    try {
      console.log("[DEBUG] Client requirements endpoint hit with data:", JSON.stringify(req.body, null, 2));

      const user = await storage.getUser((req.session as any).user.id);
      console.log("[DEBUG] User fetched:", user ? { id: user.id, role: user.role, clientType: user.clientType, agentId: user.agentId } : null);

      if (!user) {
        console.log("[DEBUG] Authorization failed - user not found");
        return res.status(403).json({ message: "User not found" });
      }

      // Support both clients creating their own requirements and agents creating for clients
      let targetClientId = user.id;
      let targetClientType = user.clientType;

      if (user.role === 'client') {
        // Client creating their own requirements
        targetClientId = user.id;
        targetClientType = user.clientType;
      } else if (user.role === 'agent') {
        // Agent creating requirements for a client - get clientId from request body
        if (!req.body.targetClientId) {
          console.log("[DEBUG] Agent missing targetClientId");
          return res.status(400).json({ message: "Agent must specify targetClientId when creating requirements" });
        }

        // Verify the client belongs to this agent
        const targetClient = await storage.getUser(req.body.targetClientId);
        if (!targetClient || targetClient.role !== 'client' || targetClient.agentId !== user.id) {
          console.log("[DEBUG] Invalid client for agent");
          return res.status(403).json({ message: "Client not found or not assigned to this agent" });
        }

        targetClientId = targetClient.id;
        targetClientType = targetClient.clientType;
      } else {
        console.log("[DEBUG] Authorization failed - invalid role");
        return res.status(403).json({ message: "Only clients and agents can create requirements" });
      }

      // Ensure client has a client type set
      if (!targetClientType) {
        console.log("[DEBUG] No client type set");
        return res.status(400).json({ message: "Client type must be set before creating requirements" });
      }

      // Handle date string conversion and set required fields
      const requirementData = {
        ...req.body,
        userId: targetClientId,
        agentId: user.role === 'agent' ? user.id : (user.agentId || null),
        clientType: targetClientType,
        // Convert date strings to Date objects for database timestamp columns
        mortgagePreApprovalExpiry: req.body.mortgagePreApprovalExpiry ? new Date(req.body.mortgagePreApprovalExpiry) : null,
        desiredClosingDate: req.body.desiredClosingDate ? new Date(req.body.desiredClosingDate) : null,
        preferredMoveInDate: req.body.preferredMoveInDate ? new Date(req.body.preferredMoveInDate) : null,
      };

      console.log("[DEBUG] Formatted requirement data:", JSON.stringify(requirementData, null, 2));

      const requirement = await storage.createClientRequirement(requirementData);
      console.log("[DEBUG] Requirement created successfully:", requirement.id);

      // Auto-validate after creation
      const validatorAgentId = user.role === 'agent' ? user.id : user.agentId;
      if (validatorAgentId) {
        console.log("[DEBUG] Validating requirements with agent:", validatorAgentId);
        const validation = await storage.validateRequirements(requirement.id, validatorAgentId);
        console.log("[DEBUG] Validation result:", validation);
        res.json({
          requirement,
          validation
        });
      } else {
        console.log("[DEBUG] No agent assigned, providing default validation");
        // Provide default validation result when no agent is assigned
        const defaultValidation = {
          score: 0.5, // Default completeness score
          issues: ["No agent assigned for validation - requirements saved successfully"]
        };
        res.json({
          requirement,
          validation: defaultValidation
        });
      }
    } catch (error) {
      console.error("[ERROR] Creating client requirements:", error);
      console.error("[ERROR] Stack trace:", error instanceof Error ? error.stack : String(error));
      res.status(500).json({ message: "Failed to create requirements", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Statistics
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      let stats;
      if (user.role === 'agent') {
        stats = await storage.getAgentStats(user.id);
      } else {
        stats = await storage.getClientStats(user.id);
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Reports Summary with period filtering
  app.get('/api/reports/summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access reports" });
      }

      const { period = 'all', clientId } = req.query; // week, month, year, all

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date | undefined;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = undefined;
      }

      // Get agent stats (only for "all clients" view)
      const agentStats = !clientId ? await storage.getAgentStats(user.id) : {
        todayTours: 0,
        activeClients: 0,
        pendingRequests: 0,
        weeklyDistance: 0
      };

      // Get all tours for the agent (with optional client filtering)
      const allTours = await storage.getTours({ agentId: user.id });
      let filteredTours = startDate
        ? allTours.filter(t => t.createdAt && new Date(t.createdAt) >= startDate!)
        : allTours;

      // Apply client filter if specified
      if (clientId) {
        filteredTours = filteredTours.filter(t => t.clientId === clientId);
      }

      // Get all offers with rejection reasons (with optional client filtering)
      const offers = await storage.getOffers({ agentId: user.id });
      let filteredOffers = startDate
        ? offers.filter(o => o.submittedAt && new Date(o.submittedAt) >= startDate!)
        : offers;

      // Apply client filter if specified
      if (clientId) {
        filteredOffers = filteredOffers.filter(o => o.clientId === clientId);
      }

      // Calculate offer statistics
      const offerStats = {
        total: filteredOffers.length,
        pending: filteredOffers.filter(o => o.status === 'pending').length,
        accepted: filteredOffers.filter(o => o.status === 'accepted').length,
        rejected: filteredOffers.filter(o => o.status === 'rejected').length,
        withdrawn: filteredOffers.filter(o => o.status === 'withdrawn').length,
      };

      // Group rejection reasons
      const rejectionReasons = filteredOffers
        .filter(o => o.status === 'rejected' && o.rejectionReason)
        .reduce((acc, offer) => {
          const reason = offer.rejectionReason || 'Unknown';
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Calculate total distance and hours for filtered period
      const totalDistance = filteredTours.reduce((sum, tour) => {
        const dist = tour.totalDistance ? parseFloat(tour.totalDistance.toString()) : 0;
        return sum + dist;
      }, 0);

      const totalHours = filteredTours.reduce((sum, tour) => {
        return sum + (tour.actualDuration || tour.estimatedDuration || 0);
      }, 0) / 60;

      // Calculate active clients for the filtered data
      let activeClients = agentStats.activeClients;
      if (clientId) {
        // If filtering by client, show 1 if they have any tours in the period, otherwise 0
        activeClients = filteredTours.length > 0 ? 1 : 0;
      }

      const summary = {
        period,
        clientId: clientId || null,
        dateRange: startDate ? { from: startDate, to: now } : null,
        totalTours: filteredTours.length,
        completedTours: filteredTours.filter(t => t.status === 'completed').length,
        activeClients,
        distanceTraveled: Math.round(totalDistance * 10) / 10,
        hoursInvested: Math.round(totalHours * 10) / 10,
        offers: offerStats,
        rejectionReasons,
        todayTours: clientId ? 0 : agentStats.todayTours,
        pendingRequests: clientId ? 0 : agentStats.pendingRequests,
        weeklyDistance: clientId ? 0 : agentStats.weeklyDistance,
      };

      res.json(summary);
    } catch (error) {
      console.error("Error fetching reports summary:", error);
      res.status(500).json({ message: "Failed to fetch reports summary" });
    }
  });

  // Tour Reminders - Get all reminders for a tour
  app.get('/api/tours/:tourId/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { tourId } = req.params;
      const reminders = await storage.getTourReminders(user.id, tourId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching tour reminders:", error);
      res.status(500).json({ message: "Failed to fetch tour reminders" });
    }
  });

  // Tour Reminders - Create reminder for a tour
  app.post('/api/tours/:tourId/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { tourId } = req.params;
      const reminderData = {
        ...req.body,
        userId: user.id,
        tourId,
      };

      const reminder = await storage.createTourReminder(reminderData);
      res.json(reminder);
    } catch (error) {
      console.error("Error creating tour reminder:", error);
      res.status(500).json({ message: "Failed to create tour reminder" });
    }
  });

  // Tour Reminders - Delete a reminder
  app.delete('/api/tours/:tourId/reminders/:reminderId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { reminderId } = req.params;
      await storage.deleteTourReminder(reminderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tour reminder:", error);
      res.status(500).json({ message: "Failed to delete tour reminder" });
    }
  });

  // Client groups
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can access groups" });
      }

      const groups = await storage.getClientGroups(user.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });

  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can create groups" });
      }

      const groupData = insertClientGroupSchema.parse({
        ...req.body,
        createdById: user.id
      });

      const group = await storage.createClientGroup(groupData);
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      console.error("Error creating client group:", error);
      res.status(500).json({ message: "Failed to create client group" });
    }
  });

  // Agent access to client groups for tour creation
  app.get('/api/client-groups', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client groups" });
      }

      // Get all client groups where the agent's clients are members
      const agentClients = await storage.getClients(user.id);
      const clientIds = agentClients.map(client => client.id);

      if (clientIds.length === 0) {
        return res.json([]);
      }

      const groups = await storage.getAgentClientGroups(user.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching agent client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });

  // Google Drive folder URL management (simplified integration)
  app.patch('/api/clients/:clientId/drive-folder', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can update Drive folder URLs" });
      }

      const { clientId } = req.params;
      const { driveFolderUrl } = req.body;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(403).json({ message: "You can only update Drive folders for your own clients" });
      }

      // Simple URL validation
      if (driveFolderUrl && !driveFolderUrl.startsWith('https://drive.google.com/')) {
        return res.status(400).json({ message: "Invalid Drive folder URL. Must start with https://drive.google.com/" });
      }

      const [updated] = await db
        .update(users)
        .set({ driveFolderUrl, updatedAt: new Date() })
        .where(eq(users.id, clientId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating Drive folder URL:", error);
      res.status(500).json({ message: "Failed to update Drive folder URL" });
    }
  });

  app.get('/api/clients/:clientId/drive-folder', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access Drive folder URLs" });
      }

      const { clientId } = req.params;

      // Verify client belongs to this agent
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(403).json({ message: "You can only access Drive folders for your own clients" });
      }

      res.json({ driveFolderUrl: client.driveFolderUrl || null });
    } catch (error) {
      console.error("Error fetching Drive folder URL:", error);
      res.status(500).json({ message: "Failed to fetch Drive folder URL" });
    }
  });

  // Property photos
  app.get('/api/photos', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.query;
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can view all photos" });
      }

      // Handle special case: "null" means filter for photos with no client
      const filterClientId = clientId === "null" ? null : clientId;

      // Get photos with client information
      const photos = await storage.getPhotosByAgent(user.id, filterClientId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching all photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.get('/api/properties/:propertyId/photos', isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getPropertyPhotos(req.params.propertyId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching property photos:", error);
      res.status(500).json({ message: "Failed to fetch property photos" });
    }
  });

  // Upload property photo (simplified - expects base64 data for now)
  app.post('/api/properties/:propertyId/photos', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Only agents can upload photos
      if (user.role !== "agent") {
        return res.status(403).json({ message: "Only agents can upload photos" });
      }

      // Verify property exists and belongs to agent
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.agentId !== user.id) {
        return res.status(403).json({ message: "You can only upload photos for your own properties" });
      }

      const { filename, mimeType, size, caption, base64Data, clientId } = req.body;

      if (!filename || !mimeType || !base64Data) {
        return res.status(400).json({ message: "Missing required fields: filename, mimeType, base64Data" });
      }

      // Add size limit for uploads (10MB limit for Cloudinary)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (size && size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB" });
      }

      // Validate image mime types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed" });
      }

      // Upload to Cloudinary
      let photoUrl: string;
      if (cloudinaryService.isEnabled()) {
        try {
          const uploadResult = await cloudinaryService.uploadFromBase64(base64Data, {
            folder: `estate-vista/photos/${req.params.propertyId}`,
            resourceType: 'image',
            tags: [req.params.propertyId, user.id, 'property-photo'],
          });
          photoUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload image to cloud storage" });
        }
      } else {
        // Fallback to base64 data URL if Cloudinary is not configured
        photoUrl = `data:${mimeType};base64,${base64Data}`;
      }

      const photoData = {
        propertyId: req.params.propertyId,
        clientId: clientId || null,
        uploadedBy: user.id,
        filename,
        originalName: filename,
        url: photoUrl,
        mimeType,
        size: size || 0,
        caption: caption || null,
      };

      const photo = await storage.uploadPropertyPhoto(photoData);
      res.json(photo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid photo data", errors: error.errors });
      }
      console.error("Error uploading property photo:", error);
      res.status(500).json({ message: "Failed to upload property photo" });
    }
  });

  // Property Media API
  // Get media for a specific property in a tour
  app.get('/api/properties/:propertyId/tours/:tourId/media', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { propertyId, tourId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify tour exists and user has access
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      // RBAC: Only the tour's client or agent can view media
      if (user.role === 'client' && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view media for your own tours" });
      }

      if (user.role === 'agent' && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view media for your tours" });
      }

      const media = await storage.getPropertyMedia(propertyId, tourId);
      res.json(media);
    } catch (error) {
      console.error("Error fetching property media:", error);
      res.status(500).json({ message: "Failed to fetch property media" });
    }
  });

  // Upload property media (photos, videos, documents)
  app.post('/api/properties/:propertyId/tours/:tourId/media', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { propertyId, tourId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify tour exists and user has access
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      // RBAC: Both client and agent can upload media
      if (user.role === 'client' && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only upload media for your own tours" });
      }

      if (user.role === 'agent' && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only upload media for your tours" });
      }

      // Check file limit (15 files per property viewing)
      const existingMedia = await storage.getPropertyMedia(propertyId, tourId);
      if (existingMedia.length >= 15) {
        return res.status(400).json({ message: "Maximum 15 files allowed per property viewing" });
      }

      const { file, mediaType, documentType, caption, description } = req.body;

      if (!file || !mediaType) {
        return res.status(400).json({ message: "Missing required fields: file, mediaType" });
      }

      // Parse file data (base64)
      const { filename, mimeType, size, base64Data } = file;

      if (!filename || !mimeType || !base64Data) {
        return res.status(400).json({ message: "Invalid file data" });
      }

      // Add size limit (100MB for videos, 10MB for others - Cloudinary supports larger files)
      const maxSize = mediaType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (size && size > maxSize) {
        return res.status(400).json({
          message: `File too large. Maximum size is ${mediaType === 'video' ? '100MB' : '10MB'}`
        });
      }

      // Upload to Cloudinary
      let mediaUrl: string;
      const resourceType = mediaType === 'video' ? 'video' : mediaType === 'document' ? 'raw' : 'image';

      if (cloudinaryService.isEnabled()) {
        try {
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          const uploadResult = await cloudinaryService.uploadFromBase64(dataUri, {
            folder: `estate-vista/media/${propertyId}`,
            resourceType: resourceType as any,
            tags: [propertyId, tourId, user.id, mediaType],
          });
          mediaUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed, falling back to base64:", cloudinaryError);
          // Fall back to base64 data URL so upload still succeeds
          mediaUrl = `data:${mimeType};base64,${base64Data}`;
        }
      } else {
        // Fallback to base64 data URL if Cloudinary is not configured
        mediaUrl = `data:${mimeType};base64,${base64Data}`;
      }

      const mediaData = {
        propertyId,
        tourId,
        uploadedBy: user.id,
        mediaType: mediaType as any,
        documentType: documentType || null,
        filename,
        originalName: filename,
        url: mediaUrl,
        mimeType,
        size: size || 0,
        caption: caption || null,
        description: description || null,
      };

      const newMedia = await storage.uploadPropertyMedia(mediaData);
      res.json(newMedia);
    } catch (error) {
      console.error("Error uploading property media:", error);
      res.status(500).json({ message: "Failed to upload property media" });
    }
  });

  // Delete property media
  app.delete('/api/media/:mediaId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { mediaId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For now, allow deletion by uploader (could add more checks)
      await storage.deletePropertyMedia(mediaId);
      res.json({ message: "Media deleted successfully" });
    } catch (error) {
      console.error("Error deleting property media:", error);
      res.status(500).json({ message: "Failed to delete property media" });
    }
  });

  // Property Ratings API
  // Get rating for a specific property in a tour
  app.get('/api/tours/:tourId/properties/:propertyId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { tourId, propertyId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify tour exists and user has access
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      // RBAC: Only the tour's client or agent can view ratings
      if (user.role === 'client' && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your own tours" });
      }

      if (user.role === 'agent' && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your tours" });
      }

      // Verify property is part of this tour
      const tourProperties = await storage.getTourProperties(tourId);
      const propertyInTour = tourProperties.find((tp: any) => tp.propertyId === propertyId);
      if (!propertyInTour) {
        return res.status(404).json({ message: "Property not found in this tour" });
      }

      const rating = await storage.getPropertyRating(propertyId, tour.clientId, tourId);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching property rating:", error);
      res.status(500).json({ message: "Failed to fetch property rating" });
    }
  });

  // Create or update property rating
  app.post('/api/tours/:tourId/properties/:propertyId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { tourId, propertyId } = req.params;
      const { rating, feedbackCategory, reason, notes, remindLater } = req.body;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // RBAC: Only clients can rate properties
      if (user.role !== 'client') {
        return res.status(403).json({ message: "Only clients can rate properties" });
      }

      // Verify tour exists and belongs to this client
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      if (tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only rate properties in your own tours" });
      }

      // Verify property is part of this tour
      const tourProperties = await storage.getTourProperties(tourId);
      const propertyInTour = tourProperties.find((tp: any) => tp.propertyId === propertyId);
      if (!propertyInTour) {
        return res.status(404).json({ message: "Property not found in this tour" });
      }

      // Validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      if (!remindLater) {
        if (!feedbackCategory || !['offer_now', 'hold_later', 'reject'].includes(feedbackCategory)) {
          return res.status(400).json({ message: "Invalid feedback category" });
        }

        if (!reason || !reason.trim()) {
          return res.status(400).json({ message: "Reason is required" });
        }
      }

      // Determine the status to update in tourProperties
      let newStatus = "viewed"; // Default when tour is done
      if (!remindLater) {
        if (feedbackCategory === "reject") {
          newStatus = "rejected";
        } else if (feedbackCategory === "hold_later") {
          newStatus = "liked";
        } else if (feedbackCategory === "offer_now") {
          newStatus = "offer_made";
        }
      }

      // Check if rating already exists
      const existingRating = await storage.getPropertyRating(propertyId, userId, tourId);

      if (existingRating) {
        // Update existing rating
        const updatedRating = await storage.updatePropertyRating(existingRating.id, {
          rating,
          feedbackCategory: feedbackCategory as any,
          reason: reason?.trim() || "Remind me later",
          notes: notes?.trim() || null,
          remindLater: remindLater || false,
        });
        
        // Update tourProperty status
        await storage.updateTourPropertyStatus(tourId, propertyId, newStatus);
        
        res.json(updatedRating);
      } else {
        // Create new rating
        const newRating = await storage.createPropertyRating({
          propertyId,
          tourId,
          clientId: userId,
          rating,
          feedbackCategory: feedbackCategory as any,
          reason: reason?.trim() || "Remind me later",
          notes: notes?.trim() || null,
          remindLater: remindLater || false,
        });
        
        // Update tourProperty status
        await storage.updateTourPropertyStatus(tourId, propertyId, newStatus);
        
        res.json(newRating);
      }
    } catch (error) {
      console.error("Error saving property rating:", error);
      res.status(500).json({ message: "Failed to save property rating" });
    }
  });

  // Get all ratings for a tour (agent or client view)
  app.get('/api/tours/:tourId/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { tourId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify tour exists
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      // RBAC: Only the tour's client or agent can view ratings
      if (user.role === 'client' && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your own tours" });
      }

      if (user.role === 'agent' && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your tours" });
      }

      const ratings = await storage.getPropertyRatingsByTour(tourId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching tour ratings:", error);
      res.status(500).json({ message: "Failed to fetch tour ratings" });
    }
  });

  // Get all ratings by client
  app.get('/api/clients/:clientId/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      const { clientId } = req.params;

      // Only agents can view other clients' ratings, clients can only view their own
      if (user?.role === 'client' && user.id !== clientId) {
        return res.status(403).json({ message: "You can only view your own ratings" });
      }

      if (user?.role === 'agent') {
        // Verify client belongs to this agent
        const client = await storage.getUser(clientId);
        if (!client || client.agentId !== user.id) {
          return res.status(404).json({ message: "Client not found" });
        }
      }

      const ratings = await storage.getPropertyRatingsByClient(clientId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching client ratings:", error);
      res.status(500).json({ message: "Failed to fetch client ratings" });
    }
  });

  // Agent property review endpoints
  app.get('/api/tours/:tourId/properties/:propertyId/agent-review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.user?.id || req.user?.id;
      const { tourId, propertyId } = req.params;
      const tour = await storage.getTour(tourId);
      if (!tour) return res.status(404).json({ message: 'Tour not found' });
      if (tour.agentId !== userId) return res.status(403).json({ message: 'Access denied' });
      const tp = await storage.getTourProperty(tourId, propertyId);
      if (!tp) return res.status(404).json({ message: 'Tour property not found' });
      res.json({ agentRating: (tp as any).agentRating ?? null, agentNotes: (tp as any).agentNotes ?? null });
    } catch (error) {
      console.error('Error fetching agent review:', error);
      res.status(500).json({ message: 'Failed to fetch agent review' });
    }
  });

  app.patch('/api/tours/:tourId/properties/:propertyId/agent-review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.user?.id || req.user?.id;
      const { tourId, propertyId } = req.params;
      const { agentRating, agentNotes } = req.body;

      if (!agentRating || agentRating < 1 || agentRating > 5) {
        return res.status(400).json({ message: 'agentRating must be between 1 and 5' });
      }
      if (!agentNotes || typeof agentNotes !== 'string' || agentNotes.trim().length === 0) {
        return res.status(400).json({ message: 'agentNotes is required' });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) return res.status(404).json({ message: 'Tour not found' });
      if (tour.agentId !== userId) return res.status(403).json({ message: 'Only the tour agent can add agent reviews' });

      const updated = await storage.updateAgentPropertyReview(tourId, propertyId, agentRating, agentNotes.trim());
      res.json(updated);
    } catch (error) {
      console.error('Error saving agent review:', error);
      res.status(500).json({ message: 'Failed to save agent review' });
    }
  });

  // Route optimization endpoints
  app.get("/api/tours/date/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const date = req.params.date;
      const tours = await storage.getToursByDate(userId, date);
      res.json(tours);
    } catch (error) {
      console.error("Error fetching tours by date:", error);
      res.status(500).json({ message: "Failed to fetch tours" });
    }
  });

  app.post("/api/tours/optimize-route", isAuthenticated, async (req: any, res) => {
    try {
      console.log("Optimize route request received:", { startingAddress: req.body.startingAddress, toursCount: req.body.tours?.length });
      const { startingAddress, tours } = req.body;

      if (!startingAddress || !tours || tours.length === 0) {
        console.log("Invalid request data:", { startingAddress, toursLength: tours?.length });
        return res.status(400).json({ message: "Starting address and tours are required" });
      }

      // Use Google Maps Distance Matrix API for route optimization
      const optimizedRoute = await optimizeTourRoute(startingAddress, tours);
      console.log("Sending optimized route response:", optimizedRoute);
      res.json(optimizedRoute);
    } catch (error) {
      console.error("Error optimizing route:", error);
      res.status(500).json({ message: "Failed to optimize route" });
    }
  });

  // Save tour recap
  app.post("/api/tours/recap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const recapData = req.body;
      const recap = await storage.saveTourRecap({
        ...recapData,
        agentId: userId,
      });
      res.json(recap);
    } catch (error) {
      console.error("Error saving tour recap:", error);
      res.status(500).json({ message: "Failed to save tour recap" });
    }
  });

  // Get tour recap by date
  app.get("/api/tours/recap/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { date } = req.params;
      const recap = await storage.getTourRecap(userId, date);
      res.json(recap);
    } catch (error) {
      console.error("Error fetching tour recap:", error);
      res.status(500).json({ message: "Failed to fetch tour recap" });
    }
  });

  // Update tour recap
  app.patch("/api/tours/recap/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const recap = await storage.updateTourRecap(id, updates);
      res.json(recap);
    } catch (error) {
      console.error("Error updating tour recap:", error);
      res.status(500).json({ message: "Failed to update tour recap" });
    }
  });

  // Get tour summary by date
  app.get("/api/tours/summary/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const { date } = req.params;
      const summary = await storage.getTourSummary(userId, date);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching tour summary:", error);
      res.status(500).json({ message: "Failed to fetch tour summary" });
    }
  });

  // Get tour report data with filters
  app.get("/api/tours/report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== 'agent') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { startDate, endDate, clientFilter, statusFilter } = req.query;

      const tours = await storage.getToursForReport({
        agentId: currentUser.id,
        startDate: startDate as string,
        endDate: endDate as string,
        clientFilter: clientFilter as string,
        statusFilter: statusFilter as string,
      });

      res.json(tours);
    } catch (error) {
      console.error("Error fetching tour report:", error);
      res.status(500).json({ message: "Failed to fetch tour report" });
    }
  });

  // Get client history report
  app.get("/api/clients/:clientId/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const currentUser = await storage.getUser(userId);
      const { clientId } = req.params;

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Agents can view any client in their book, clients can only view their own history
      const agentId = currentUser.role === 'agent' ? currentUser.id : undefined;

      // Clients can only view their own history
      if (currentUser.role === 'client' && clientId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const history = await storage.getClientHistory(clientId, agentId);

      if (!history) {
        return res.status(404).json({ message: "Client history not found or access denied" });
      }

      res.json(history);
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ message: "Failed to fetch client history" });
    }
  });

  // Reminder routes
  app.get("/api/reminders/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access these reminders
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const reminders = await storage.getTourReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const reminderData = req.body;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Ensure user can only create reminders for themselves or if they're an agent
      if (!currentUser || (currentUser.id !== reminderData.userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const reminder = await storage.createTourReminder(reminderData);

      // Send email notification if reminder has email-worthy data
      try {
        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Agent';

        if (reminderData.sendEmail !== false && currentUser.email) {
          // Determine email type based on reminder context
          if (reminderData.tourId || reminderData.propertyAddress) {
            // Tour reminder email
            const emailData: TourReminderEmailData = {
              agentName: fullName,
              clientName: reminderData.clientName || 'Client',
              propertyAddress: reminderData.propertyAddress || 'Property',
              tourDate: new Date(reminderData.reminderDate).toLocaleDateString(),
              tourTime: reminderData.reminderTime || '9:00 AM',
              agentPhone: reminderData.agentPhone, // Use phone from reminder data
              notes: reminderData.notes
            };

            const emailTemplate = generateTourReminderEmail(emailData);
            await sendEmail({
              to: currentUser.email,
              from: 'notifications@estatevista.com',
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html
            });

            console.log(`Tour reminder email sent to ${currentUser.email}`);
          } else {
            // Generic reminder email
            await sendEmail({
              to: currentUser.email,
              from: 'notifications@estatevista.com',
              subject: `Reminder: ${reminderData.title || 'Estate Vista Notification'}`,
              text: `Hi ${fullName || 'there'},\n\nThis is a reminder about: ${reminderData.notes || reminderData.title}\n\nScheduled for: ${new Date(reminderData.reminderDate).toLocaleString()}\n\nBest regards,\nEstate Vista Team`,
              html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #3b82f6;">📋 Reminder Notification</h2>
                  <p>Hi <strong>${fullName || 'there'}</strong>,</p>
                  <p>This is a reminder about:</p>
                  <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <strong>${reminderData.title || 'Estate Vista Notification'}</strong>
                    ${reminderData.notes ? `<p style="margin: 8px 0 0 0; color: #6b7280;">${reminderData.notes}</p>` : ''}
                  </div>
                  <p><strong>Scheduled for:</strong> ${new Date(reminderData.reminderDate).toLocaleString()}</p>
                  <p style="color: #6b7280;">Best regards,<br>Estate Vista Team</p>
                </div>
              `
            });

            console.log(`Generic reminder email sent to ${currentUser.email}`);
          }
        }
      } catch (emailError) {
        console.error("Failed to send reminder email:", emailError);
        // Don't fail the entire request if email fails
      }

      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.put("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the reminder by fetching all reminders and finding the one with this ID
      // For clients: verify they own it
      // For agents: verify the reminder belongs to one of their clients
      let canAccess = false;

      if (currentUser.role === "client") {
        const userReminders = await storage.getTourReminders(currentUser.id);
        canAccess = userReminders.some((r: any) => r.id === id);
      } else if (currentUser.role === "agent") {
        // Get all clients assigned to this agent
        const agentClients = await storage.getClients(currentUser.id);

        // Check if reminder belongs to any of their clients
        for (const client of agentClients) {
          const clientReminders = await storage.getTourReminders(client.id);
          if (clientReminders.some((r: any) => r.id === id)) {
            canAccess = true;
            break;
          }
        }
      }

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied - not authorized to update this reminder" });
      }

      const reminder = await storage.updateTourReminder(id, updates);
      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ message: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the reminder by fetching all reminders and finding the one with this ID
      // For clients: verify they own it
      // For agents: verify the reminder belongs to one of their clients
      let canAccess = false;

      if (currentUser.role === "client") {
        const userReminders = await storage.getTourReminders(currentUser.id);
        canAccess = userReminders.some((r: any) => r.id === id);
      } else if (currentUser.role === "agent") {
        // Get all clients assigned to this agent
        const agentClients = await storage.getClients(currentUser.id);

        // Check if reminder belongs to any of their clients
        for (const client of agentClients) {
          const clientReminders = await storage.getTourReminders(client.id);
          if (clientReminders.some((r: any) => r.id === id)) {
            canAccess = true;
            break;
          }
        }
      }

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied - not authorized to delete this reminder" });
      }

      await storage.deleteTourReminder(id);
      res.json({ message: "Reminder deleted successfully" });
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  // Property suggestion routes
  app.get("/api/property-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId, agentId, status } = req.query;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Clients can only see their own suggestions, agents can see all their clients' suggestions
      const filters: any = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
        if (clientId) filters.clientId = clientId as string;
      }

      if (status) filters.status = status as string;

      const suggestions = await storage.getPropertySuggestions(filters);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching property suggestions:", error);
      res.status(500).json({ message: "Failed to fetch property suggestions" });
    }
  });

  app.post("/api/property-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only clients can create suggestions
      if (currentUser.role !== "client") {
        return res.status(403).json({ message: "Only clients can suggest properties" });
      }

      const suggestionData = {
        ...req.body,
        clientId: currentUser.id,
        agentId: currentUser.agentId || req.body.agentId,
      };

      const suggestion = await storage.createPropertySuggestion(suggestionData);
      res.json(suggestion);
    } catch (error) {
      console.error("Error creating property suggestion:", error);
      res.status(500).json({ message: "Failed to create property suggestion" });
    }
  });

  app.put("/api/property-suggestions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get existing suggestion to verify ownership
      const filters: any = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
      }

      const suggestions = await storage.getPropertySuggestions(filters);
      const existingSuggestion = suggestions.find((s: any) => s.id === id);

      if (!existingSuggestion) {
        return res.status(403).json({ message: "Access denied - not authorized to update this suggestion" });
      }

      // Agents can update status and notes, clients can update their own suggestion details
      const updates = req.body;

      const suggestion = await storage.updatePropertySuggestion(id, updates);
      res.json(suggestion);
    } catch (error) {
      console.error("Error updating property suggestion:", error);
      res.status(500).json({ message: "Failed to update property suggestion" });
    }
  });

  app.delete("/api/property-suggestions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get existing suggestion to verify ownership
      const filters: any = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
      }

      const suggestions = await storage.getPropertySuggestions(filters);
      const existingSuggestion = suggestions.find((s: any) => s.id === id);

      if (!existingSuggestion) {
        return res.status(403).json({ message: "Access denied - not authorized to delete this suggestion" });
      }

      await storage.deletePropertySuggestion(id);
      res.json({ message: "Property suggestion deleted successfully" });
    } catch (error) {
      console.error("Error deleting property suggestion:", error);
      res.status(500).json({ message: "Failed to delete property suggestion" });
    }
  });

  // Serve private objects from Object Storage (protected file uploading)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser((req.session as any).user.id);
      if (!currentUser) {
        return res.sendStatus(401);
      }

      const userId = currentUser.id;
      const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
      const { ObjectPermission } = await import('./objectAcl');
      const objectStorageService = new ObjectStorageService();

      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
          requestedPermission: ObjectPermission.READ,
        });
        if (!canAccess) {
          return res.sendStatus(403);
        }
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.sendStatus(404);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error serving object:", error);
      if (!res.headersSent) {
        return res.sendStatus(500);
      }
    }
  });

  // Document routes
  // Get documents for agent (optionally filtered by client)
  app.get("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId, type } = req.query;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!currentUser || currentUser.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access this endpoint" });
      }

      // Handle special case: "null" means filter for documents with no client
      const filterClientId = clientId === "null" ? null : clientId;
      const documents = await storage.getDocumentsByAgent(currentUser.id, filterClientId, type);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { type } = req.query;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access these documents
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await storage.getDocuments(userId, type);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get signed upload params for Cloudinary (or fallback presigned URL for Object Storage)
  app.post("/api/documents/upload", isAuthenticated, async (req: any, res) => {
    try {
      if (cloudinaryService.isEnabled()) {
        // Return Cloudinary signed upload parameters
        const signedParams = cloudinaryService.generateSignedUploadParams();
        res.json({
          type: 'cloudinary',
          ...signedParams
        });
      } else {
        // Fallback to Object Storage if Cloudinary not configured
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ type: 'object-storage', uploadURL });
      }
    } catch (error) {
      console.error("Error getting upload params:", error);

      // Check if storage is not configured
      if (error instanceof Error && (error.message.includes('PRIVATE_OBJECT_DIR not set') || error.message.includes('not configured'))) {
        return res.status(503).json({
          message: "Document storage is not configured. Please contact your administrator.",
          error: "STORAGE_NOT_CONFIGURED"
        });
      }

      res.status(500).json({ message: "Failed to get upload parameters" });
    }
  });

  // Upload document directly with file data (Cloudinary preferred)
  app.post("/api/documents/upload-direct", isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, documentType, tags, expirationDate, base64Data, mimeType, size, originalName, clientId } = req.body;

      if (!base64Data) {
        return res.status(400).json({ message: "base64Data is required" });
      }

      // Get current user from authentication
      const currentUser = await storage.getUser((req.session as any).user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const userId = currentUser.id;

      // Size limit: 25MB for documents
      const maxSize = 25 * 1024 * 1024;
      if (size && size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 25MB" });
      }

      // Upload to Cloudinary
      let documentUrl: string;
      if (cloudinaryService.isEnabled()) {
        try {
          const uploadResult = await cloudinaryService.uploadFromBase64(base64Data, {
            folder: `estate-vista/documents/${userId}`,
            resourceType: 'raw',
            tags: [userId, documentType || 'document', clientId || 'general'].filter(Boolean),
          });
          documentUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload document to cloud storage" });
        }
      } else {
        // Fallback: store as data URL (not recommended for production)
        documentUrl = `data:${mimeType};base64,${base64Data}`;
      }

      // Process tags if provided
      const processedTags = tags ? (typeof tags === 'string' ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : tags) : [];

      const document = await storage.createDocument({
        userId,
        clientId: clientId || null,
        documentType,
        title,
        description,
        tags: processedTags.length > 0 ? processedTags : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        filename: originalName || title || 'document',
        originalName: originalName || title,
        url: documentUrl,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0,
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Create document metadata after upload (Object Storage fallback - kept for backward compatibility)
  app.put("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, documentType, tags, expirationDate, uploadURL, mimeType, size, originalName, clientId } = req.body;

      if (!uploadURL) {
        return res.status(400).json({ message: "uploadURL is required" });
      }

      // Get current user from authentication
      const currentUser = await storage.getUser((req.session as any).user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const userId = currentUser.id;

      // Process tags if provided
      const processedTags = tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];

      // If this is a Cloudinary URL, use it directly
      let finalPath = uploadURL;

      if (!uploadURL.startsWith('https://res.cloudinary.com')) {
        // Fallback to Object Storage for non-Cloudinary URLs
        try {
          const { ObjectStorageService } = await import('./objectStorage');
          const objectStorageService = new ObjectStorageService();
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
          const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
            uploadURL,
            {
              owner: userId,
              visibility: "private",
            }
          );
          finalPath = objectPath.startsWith('/objects/') ? objectPath : normalizedPath;
        } catch (error) {
          console.warn("Object Storage not available, using raw URL");
        }
      }

      const document = await storage.createDocument({
        userId,
        clientId: clientId || null,
        documentType,
        title,
        description,
        tags: processedTags.length > 0 ? processedTags : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        filename: finalPath.split('/').pop() || 'unknown',
        originalName: originalName || title,
        url: finalPath,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0,
      });

      res.json(document);
    } catch (error) {
      console.error("Error creating document metadata:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get document metadata from database
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access rights (owner or agent can access)
      if (document.userId !== currentUser.id && currentUser.role !== 'agent') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if this is a Cloudinary URL - redirect directly
      if (document.url.startsWith('https://res.cloudinary.com')) {
        return res.redirect(document.url);
      }

      // Check if this is a data URL - return as download
      if (document.url.startsWith('data:')) {
        const matches = document.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
          res.setHeader("Content-Length", buffer.length);
          return res.send(buffer);
        }
      }

      // Fallback: Download from object storage
      const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
      const { ObjectPermission } = await import('./objectAcl');
      const objectStorageService = new ObjectStorageService();

      try {
        const objectFile = await objectStorageService.getObjectEntityFile(document.url);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: currentUser.id,
          requestedPermission: ObjectPermission.READ,
        });
        if (!canAccess) {
          return res.sendStatus(403);
        }

        // Set filename for download
        res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ message: "File not found" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download document" });
      }
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Bulk document operations
  app.post("/api/documents/bulk-upload", isAuthenticated, async (req: any, res) => {
    try {
      // In a real implementation, this would use multer or similar for file uploads
      // For now, we'll extract the data from the FormData structure
      const { userId, titles, descriptions, documentTypes } = req.body;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Ensure user can only upload documents for themselves or if they're an agent
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Convert form data to arrays if they're strings
      const titleArray = Array.isArray(titles) ? titles : [titles];
      const descriptionArray = Array.isArray(descriptions) ? descriptions : [descriptions];
      const typeArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes];

      const uploadedDocuments = [];
      const failedUploads = [];

      // Process each file in the bulk upload
      for (let i = 0; i < titleArray.length; i++) {
        try {
          const title = titleArray[i] || `Document ${i + 1}`;
          const description = descriptionArray[i] || `Bulk uploaded document ${i + 1}`;
          const documentType = typeArray[i] || 'offer_placed';

          // In a real implementation, you would:
          // 1. Process the actual file from req.files
          // 2. Save it to storage (filesystem, S3, etc.)
          // 3. Generate a real URL

          const document = await storage.createDocument({
            userId,
            documentType,
            title,
            description,
            filename: `bulk-${Date.now()}-${i}-${title}`,
            originalName: title,
            url: `/uploads/bulk-${Date.now()}-${i}-${title}`, // Mock URL
            mimeType: "application/pdf", // Mock - would come from actual file
            size: Math.floor(Math.random() * 1024 * 1000) + 1024 * 100, // Mock - would come from actual file
          });

          uploadedDocuments.push(document);
        } catch (error) {
          console.error(`Failed to upload document ${i + 1}:`, error);
          failedUploads.push({
            title: titleArray[i] || `Document ${i + 1}`,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        message: `Bulk upload completed. ${uploadedDocuments.length} successful, ${failedUploads.length} failed.`,
        uploaded: uploadedDocuments,
        failed: failedUploads,
        totalProcessed: titleArray.length
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  app.delete("/api/documents/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const { documentIds } = req.body;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "Document IDs array is required" });
      }

      const deletedDocuments = [];
      const failedDeletes = [];

      // Process each document deletion
      for (const docId of documentIds) {
        try {
          // In a full implementation, you'd verify ownership of each document
          await storage.deleteDocument(docId);
          deletedDocuments.push(docId);
        } catch (error) {
          console.error(`Failed to delete document ${docId}:`, error);
          failedDeletes.push({
            id: docId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        message: `Bulk delete completed. ${deletedDocuments.length} deleted, ${failedDeletes.length} failed.`,
        deleted: deletedDocuments,
        failed: failedDeletes,
        totalProcessed: documentIds.length
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ message: "Failed to process bulk delete" });
    }
  });

  app.post("/api/documents/bulk-download", isAuthenticated, async (req: any, res) => {
    try {
      const { documentIds, zipFilename } = req.body;
      const currentUser = await storage.getUser((req.session as any).user.id);

      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "Document IDs array is required" });
      }

      // In a real implementation, this would:
      // 1. Fetch each document from storage
      // 2. Create a zip file with all the documents
      // 3. Stream the zip file to the client

      // For now, we'll create a mock zip response
      const filename = zipFilename || `documents-${Date.now()}.zip`;

      // Mock zip content with info about the documents that would be included
      const mockZipContent = {
        filename,
        documentsIncluded: documentIds.length,
        estimatedSize: documentIds.length * 1024 * 200, // Mock 200KB per document
        created: new Date().toISOString(),
        note: "This is a mock implementation. In production, this would contain the actual document files."
      };

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.json(mockZipContent);

      console.log(`Mock bulk download: ${documentIds.length} documents for user ${currentUser?.id || 'unknown'}`);
    } catch (error) {
      console.error("Error in bulk download:", error);
      res.status(500).json({ message: "Failed to process bulk download" });
    }
  });

  // Location sharing routes
  app.get("/api/location-shares/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access these location shares
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const locationShares = await storage.getLocationShares(userId);
      res.json(locationShares);
    } catch (error) {
      console.error("Error fetching location shares:", error);
      res.status(500).json({ message: "Failed to fetch location shares" });
    }
  });

  app.post("/api/location-shares", isAuthenticated, async (req: any, res) => {
    try {
      const locationShare = await storage.createLocationShare(req.body);
      res.json(locationShare);
    } catch (error) {
      console.error("Error creating location share:", error);
      res.status(500).json({ message: "Failed to create location share" });
    }
  });

  app.delete("/api/location-shares/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteLocationShare(id);
      res.json({ message: "Location share stopped successfully" });
    } catch (error) {
      console.error("Error stopping location share:", error);
      res.status(500).json({ message: "Failed to stop location share" });
    }
  });

  // Location history and analytics endpoints
  app.get("/api/location-history/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { tourId, propertyId, startDate, endDate, activityType } = req.query;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access this location history
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filters: any = { userId };
      if (tourId) filters.tourId = tourId;
      if (propertyId) filters.propertyId = propertyId;
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0); // Set to start of day
        filters.startDate = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // Set to end of day
        filters.endDate = end;
      }
      if (activityType) filters.activityType = activityType;

      const locationHistory = await storage.getLocationHistory(filters);
      res.json(locationHistory);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });

  app.post("/api/location-history", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser((req.session as any).user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Validate request body using Zod schema
      const validationResult = insertLocationHistorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid location history data",
          errors: validationResult.error.errors
        });
      }

      // Ensure user can only create location history for themselves or if they're an agent
      const { userId } = validationResult.data;
      if (currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }

      const locationHistory = await storage.createLocationHistory(validationResult.data);
      res.json(locationHistory);
    } catch (error) {
      console.error("Error creating location history:", error);
      res.status(500).json({ message: "Failed to create location history" });
    }
  });

  app.get("/api/location-analytics/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access these analytics
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0); // Set to start of day
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // Set to end of day
        dateRange = { start, end };
      }

      const analytics = await storage.getLocationAnalytics(userId, dateRange);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching location analytics:", error);
      res.status(500).json({ message: "Failed to fetch location analytics" });
    }
  });

  // Calendar integration routes
  app.get("/api/calendar-integrations/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Check if user can access these calendar integrations
      if ((req.session as any).user.id !== userId && req.user.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }

      const calendarBlocks = await storage.getCalendarIntegrations(userId);
      res.json(calendarBlocks);
    } catch (error) {
      console.error("Error fetching calendar integrations:", error);
      res.status(500).json({ message: "Failed to fetch calendar integrations" });
    }
  });

  app.post("/api/calendar-integrations", isAuthenticated, async (req: any, res) => {
    try {
      const calendarBlock = await storage.createCalendarIntegration(req.body);
      res.json(calendarBlock);
    } catch (error) {
      console.error("Error creating calendar integration:", error);
      res.status(500).json({ message: "Failed to create calendar integration" });
    }
  });

  app.patch("/api/calendar-integrations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const calendarBlock = await storage.updateCalendarIntegration(id, req.body);
      res.json(calendarBlock);
    } catch (error) {
      console.error("Error updating calendar integration:", error);
      res.status(500).json({ message: "Failed to update calendar integration" });
    }
  });

  app.delete("/api/calendar-integrations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteCalendarIntegration(id);
      res.json({ message: "Calendar integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar integration:", error);
      res.status(500).json({ message: "Failed to delete calendar integration" });
    }
  });

  // Calendar events routes
  app.get("/api/calendar-events/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser((req.session as any).user.id);

      // Check if user can access these calendar events
      if (!currentUser || (currentUser.id !== userId && currentUser.role !== "agent")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const calendarEvents = await storage.getCalendarEvents(userId);
      res.json(calendarEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar-events", isAuthenticated, async (req: any, res) => {
    try {
      const calendarEvent = await storage.createCalendarEvent(req.body);
      res.json(calendarEvent);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.patch("/api/calendar-events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const calendarEvent = await storage.updateCalendarEvent(id, req.body);
      res.json(calendarEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete("/api/calendar-events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteCalendarEvent(id);
      res.json({ message: "Calendar event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Schedule management endpoints
  app.get("/api/schedules/date/:date", isAuthenticated, async (req: any, res) => {
    try {
      const { date } = req.params;
      const schedules = await storage.getSchedulesByDate(date);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.patch("/api/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const schedule = await storage.updateSchedule(id, updates);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSchedule(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Branding Settings routes
  app.get("/api/settings/branding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access branding settings" });
      }

      const settings = await db.select()
        .from(agentBrandingSettings)
        .where(eq(agentBrandingSettings.agentId, userId))
        .limit(1);

      if (settings.length === 0) {
        return res.json(null);
      }

      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ message: "Failed to fetch branding settings" });
    }
  });

  app.put("/api/settings/branding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access branding settings" });
      }

      const validatedData = insertAgentBrandingSettingSchema.parse({
        ...req.body,
        agentId: userId,
        updatedBy: userId,
      });

      // Check if settings exist
      const existing = await db.select()
        .from(agentBrandingSettings)
        .where(eq(agentBrandingSettings.agentId, userId))
        .limit(1);

      let result;
      let diff = null;

      if (existing.length > 0) {
        // Calculate diff for version history
        diff = {
          before: existing[0],
          after: validatedData,
        };

        // Update existing settings
        const updated = await db.update(agentBrandingSettings)
          .set({
            ...validatedData,
            updatedAt: new Date(),
          })
          .where(eq(agentBrandingSettings.agentId, userId))
          .returning();

        result = updated[0];
      } else {
        // Create new settings
        diff = {
          before: null,
          after: validatedData,
        };

        const created = await db.insert(agentBrandingSettings)
          .values(validatedData)
          .returning();

        result = created[0];
      }

      // Create settings version for audit trail
      await db.insert(settingsVersions).values({
        agentId: userId,
        tab: 'branding',
        diff: diff,
        updatedBy: userId,
      });

      res.json(result);
    } catch (error) {
      console.error("Error updating branding settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid branding data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update branding settings" });
    }
  });

  app.post("/api/uploads/agent-logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can upload logos" });
      }

      const { base64Data, mimeType } = req.body;

      // If base64Data is provided, upload directly to Cloudinary
      if (base64Data) {
        if (!cloudinaryService.isEnabled()) {
          return res.status(503).json({
            message: "Logo storage is not configured. Please add Cloudinary credentials.",
            error: "CLOUDINARY_NOT_CONFIGURED"
          });
        }

        try {
          const uploadResult = await cloudinaryService.uploadFromBase64(base64Data, {
            folder: `estate-vista/logos/${userId}`,
            resourceType: 'image',
            tags: [userId, 'agent-logo'],
          });
          return res.json({ url: uploadResult.secureUrl, type: 'cloudinary' });
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload logo" });
        }
      }

      // If no base64Data, return signed params for client-side upload
      if (cloudinaryService.isEnabled()) {
        const signedParams = cloudinaryService.generateSignedUploadParams();
        return res.json({ type: 'cloudinary-signed', ...signedParams });
      }

      // Fallback to Object Storage
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      res.json({ url: uploadURL, type: 'object-storage' });
    } catch (error) {
      console.error("Error handling logo upload:", error);

      if (error instanceof Error && (error.message.includes('PRIVATE_OBJECT_DIR not set') || error.message.includes('not configured'))) {
        return res.status(503).json({
          message: "Logo storage is not configured. Please contact your administrator.",
          error: "STORAGE_NOT_CONFIGURED"
        });
      }

      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Get agent branding for client's agent (for client portal header)
  app.get("/api/settings/branding/my-agent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role?.toLowerCase() !== 'client') {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }

      // Get the client's agent ID
      const agentId = user.agentId;
      if (!agentId) {
        return res.json(null); // No agent assigned
      }

      // Get the agent's branding settings
      const settings = await db.select()
        .from(agentBrandingSettings)
        .where(eq(agentBrandingSettings.agentId, agentId))
        .limit(1);

      if (settings.length === 0) {
        return res.json(null);
      }

      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching agent branding:", error);
      res.status(500).json({ message: "Failed to fetch agent branding" });
    }
  });

  // Directory - Contact endpoints
  app.get('/api/directory/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access directory" });
      }

      const { search, relationshipType, hasApp } = req.query;
      const filters: any = {};

      if (search) filters.search = search;
      if (relationshipType) filters.relationshipType = relationshipType;
      if (hasApp !== undefined) filters.hasApp = hasApp === 'true';

      const contacts = await storage.getContacts(user.id, filters);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching directory contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get('/api/directory/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access directory" });
      }

      const { contactId } = req.params;
      const contact = await storage.getContact(contactId);

      if (!contact || contact.agentId !== user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post('/api/directory/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can create contacts" });
      }

      const contactData = { ...req.body, agentId: user.id };
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put('/api/directory/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can update contacts" });
      }

      const { contactId } = req.params;
      const existingContact = await storage.getContact(contactId);

      if (!existingContact || existingContact.agentId !== user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const updated = await storage.updateContact(contactId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/directory/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can delete contacts" });
      }

      const { contactId } = req.params;
      const existingContact = await storage.getContact(contactId);

      if (!existingContact || existingContact.agentId !== user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await storage.deleteContact(contactId);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Client-Contact Link endpoints
  app.post('/api/clients/:clientId/contacts/link', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can link contacts" });
      }

      const { clientId } = req.params;
      const { contactId, relationshipType } = req.body;

      const link = await storage.linkContactToClient({
        clientId,
        contactId,
        relationshipType,
        isPrimary: false,
      });

      res.json(link);
    } catch (error) {
      console.error("Error linking contact:", error);
      res.status(500).json({ message: "Failed to link contact" });
    }
  });

  app.delete('/api/clients/:clientId/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can unlink contacts" });
      }

      const { clientId, contactId } = req.params;
      await storage.unlinkContactFromClient(clientId, contactId);
      res.json({ message: "Contact unlinked successfully" });
    } catch (error) {
      console.error("Error unlinking contact:", error);
      res.status(500).json({ message: "Failed to unlink contact" });
    }
  });

  app.get('/api/clients/:clientId/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access client contacts" });
      }

      const { clientId } = req.params;
      const contacts = await storage.getClientContacts(clientId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });

  app.get('/api/directory/contacts/:contactId/timeline', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'agent') {
        return res.status(403).json({ message: "Only agents can access contact timeline" });
      }

      const { contactId } = req.params;
      const contact = await storage.getContact(contactId);

      if (!contact || contact.agentId !== user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const timeline = await storage.getContactTimeline(contactId);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching contact timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  // Brokerage Portal API Routes
  // Get brokerage KPIs
  app.get('/api/broker/kpis', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const agentIds = linkedAgents.map(la => la.agentId);

      // Get totals from all linked agents
      const totalAgents = agentIds.length;

      // Get clients from all agents
      const allClients: any[] = [];
      for (const agentId of agentIds) {
        const clients = await storage.getClients(agentId);
        allClients.push(...clients);
      }

      // Get all tours
      const allTours: any[] = [];
      for (const agentId of agentIds) {
        const agentTours = await storage.getTours({ agentId });
        allTours.push(...agentTours);
      }

      // Get all offers
      const allOffers: any[] = [];
      for (const client of allClients) {
        const clientOffers = await storage.getOffers({ clientId: client.id });
        allOffers.push(...clientOffers);
      }

      const completedTours = allTours.filter(t => t.status === 'completed').length;
      const upcomingTours = allTours.filter(t => t.status === 'scheduled').length;
      const totalDistance = allTours.reduce((sum, t) => sum + (Number(t.totalDistance) || 0), 0);
      const totalHours = allTours.reduce((sum, t) => sum + ((Number(t.actualDuration) || 0) / 60), 0);

      const draftOffers = allOffers.filter(o => o.status === 'draft').length;
      const submittedOffers = allOffers.filter(o => o.status === 'submitted').length;
      const acceptedOffers = allOffers.filter(o => o.status === 'accepted').length;
      const rejectedOffers = allOffers.filter(o => o.status === 'rejected').length;

      res.json({
        totalAgents,
        activeClients: allClients.length,
        completedTours,
        upcomingTours,
        totalDistance: Number(totalDistance).toFixed(2),
        totalHours: Number(totalHours).toFixed(1),
        offers: {
          draft: draftOffers,
          submitted: submittedOffers,
          accepted: acceptedOffers,
          rejected: rejectedOffers
        }
      });
    } catch (error) {
      console.error("Error fetching broker KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Get brokerage agents
  app.get('/api/broker/agents', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const agentsWithDetails = [];

      for (const link of linkedAgents) {
        const agent = await storage.getUser(link.agentId);
        if (agent) {
          const clients = await storage.getClients(agent.id);
          const tours = await storage.getTours({ agentId: agent.id });

          agentsWithDetails.push({
            ...agent,
            brokerageRole: link.role,
            activeClients: clients.length,
            totalTours: tours.length,
            completedTours: tours.filter((t: any) => t.status === 'completed').length
          });
        }
      }

      res.json(agentsWithDetails);
    } catch (error) {
      console.error("Error fetching broker agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Get brokerage clients
  app.get('/api/broker/clients', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const allClients = [];

      for (const link of linkedAgents) {
        const agent = await storage.getUser(link.agentId);
        const clients = await storage.getClients(link.agentId);

        for (const client of clients) {
          const tours = await storage.getTours({ clientId: client.id });
          allClients.push({
            ...client,
            agentName: `${agent?.firstName} ${agent?.lastName}`,
            totalTours: tours.length,
            completedTours: tours.filter((t: any) => t.status === 'completed').length
          });
        }
      }

      res.json(allClients);
    } catch (error) {
      console.error("Error fetching broker clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Link agent to brokerage
  app.post('/api/broker/agents/link', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can link agents" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      const { agentId, agentEmail } = req.body;
      let resolvedAgentId = agentId;
      if (!resolvedAgentId && agentEmail) {
        const agentUser = await storage.getUserByEmail(agentEmail);
        if (!agentUser || agentUser.role !== 'agent') {
          return res.status(404).json({ message: "Agent not found with that email" });
        }
        resolvedAgentId = agentUser.id;
      }
      if (!resolvedAgentId) {
        return res.status(400).json({ message: "agentId or agentEmail is required" });
      }
      const link = await storage.linkAgentToBrokerage(brokerage.id, resolvedAgentId);
      res.json(link);
    } catch (error) {
      console.error("Error linking agent:", error);
      res.status(500).json({ message: "Failed to link agent" });
    }
  });

  // Get brokerage settings
  app.get('/api/broker/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can access settings" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      res.json(brokerage);
    } catch (error) {
      console.error("Error fetching brokerage settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update brokerage settings
  app.put('/api/broker/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'brokerage') {
        return res.status(403).json({ message: "Only brokerage users can update settings" });
      }

      const brokerage = await storage.getBrokerageByOwnerEmail(user.email!);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }

      const { id, name, contactEmail, contactPhone, website, logoUrl } = req.body;

      if (id && id !== brokerage.id) {
        return res.status(403).json({ message: "Cannot update another brokerage's settings" });
      }

      const updatedBrokerage = await storage.updateBrokerage(brokerage.id, {
        name,
        contactEmail,
        contactPhone,
        website,
        logoUrl,
      });

      res.json(updatedBrokerage);
    } catch (error) {
      console.error("Error updating brokerage settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // SUPER ADMIN ROUTES
  const isSuperAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user || user.role?.toLowerCase() !== 'superadmin') {
        return res.status(403).json({ message: "Only super admins can access this endpoint" });
      }
      req.adminUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization error" });
    }
  };

  // Admin Dashboard KPIs
  app.get('/api/admin/kpis', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allBrokerages = await db.select().from(brokerages);
      const agents = allUsers.filter((u: any) => u.role === 'agent');
      const clients = allUsers.filter((u: any) => u.role === 'client');

      let allTours: any[] = [];
      for (const agent of agents) {
        const agentTours = await storage.getTours({ agentId: agent.id });
        allTours.push(...agentTours);
      }

      let allOffers: any[] = [];
      for (const client of clients) {
        const clientOffers = await storage.getOffers({ clientId: client.id });
        allOffers.push(...clientOffers);
      }

      const brokerageAgentLinks = await db.select().from(brokerageAgents);
      const brokerageAgentsCount = brokerageAgentLinks.length;
      const independentAgents = agents.length - brokerageAgentsCount;

      const completedTours = allTours.filter(t => t.status === 'completed').length;
      const upcomingTours = allTours.filter(t => t.status === 'scheduled').length;
      const totalDistance = allTours.reduce((sum, t) => sum + (Number(t.totalDistance) || 0), 0);
      const totalHours = allTours.reduce((sum, t) => sum + ((Number(t.actualDuration) || 0) / 60), 0);

      res.json({
        totalBrokerages: allBrokerages.length,
        totalAgents: agents.length,
        brokerageAgents: brokerageAgentsCount,
        independentAgents,
        totalClients: clients.length,
        completedTours,
        upcomingTours,
        totalDistance: Number(totalDistance).toFixed(2),
        totalHours: Number(totalHours).toFixed(1),
        offers: {
          draft: allOffers.filter(o => o.status === 'draft').length,
          submitted: allOffers.filter(o => o.status === 'submitted').length,
          accepted: allOffers.filter(o => o.status === 'accepted').length,
          rejected: allOffers.filter(o => o.status === 'rejected').length
        }
      });
    } catch (error) {
      console.error("Error fetching admin KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Get all brokerages
  app.get('/api/admin/brokerages', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const allBrokerages = await db.select().from(brokerages);
      const enrichedBrokerages = await Promise.all(allBrokerages.map(async (brokerage: any) => {
        const agentLinks = await storage.getBrokerageAgents(brokerage.id);
        let clientCount = 0;
        let tourCount = 0;

        for (const link of agentLinks) {
          const clients = await storage.getClients(link.agentId);
          clientCount += clients.length;
          const tours = await storage.getTours({ agentId: link.agentId });
          tourCount += tours.length;
        }

        return {
          ...brokerage,
          agentCount: agentLinks.length,
          clientCount,
          tourCount
        };
      }));
      res.json(enrichedBrokerages);
    } catch (error) {
      console.error("Error fetching brokerages:", error);
      res.status(500).json({ message: "Failed to fetch brokerages" });
    }
  });

  // Create brokerage (also creates a brokerage user account for login)
  app.post('/api/admin/brokerages', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { adminEmail, adminFirstName, adminLastName, ...brokerageData } = req.body;
      const brokerage = await storage.createBrokerage(brokerageData);

      let brokerageUser = null;
      let tempPassword = null;
      if (adminEmail) {
        tempPassword = generatePassword();
        const [newUser] = await db.insert(users).values({
          email: adminEmail,
          firstName: adminFirstName || brokerageData.name || 'Brokerage',
          lastName: adminLastName || 'Admin',
          role: 'brokerage',
          passwordHash: hashPassword(tempPassword),
        }).returning();
        brokerageUser = newUser;
      }

      res.json({ ...brokerage, brokerageUser, tempPassword });
    } catch (error) {
      console.error("Error creating brokerage:", error);
      res.status(500).json({ message: "Failed to create brokerage" });
    }
  });

  // Update brokerage
  app.put('/api/admin/brokerages/:id', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const brokerage = await storage.updateBrokerage(req.params.id, req.body);
      res.json(brokerage);
    } catch (error) {
      console.error("Error updating brokerage:", error);
      res.status(500).json({ message: "Failed to update brokerage" });
    }
  });

  // Delete brokerage
  app.delete('/api/admin/brokerages/:id', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      await storage.deleteBrokerage(req.params.id);
      res.json({ message: "Brokerage deleted successfully" });
    } catch (error) {
      console.error("Error deleting brokerage:", error);
      res.status(500).json({ message: "Failed to delete brokerage" });
    }
  });

  // Get all agents with brokerage info
  app.get('/api/admin/agents', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users);
      const agents = allUsers.filter((u: any) => u.role === 'agent');

      const enrichedAgents = await Promise.all(agents.map(async (agent: any) => {
        const brokerageLink = await storage.getBrokerageForAgent(agent.id);
        let brokerageName = 'Independent';
        if (brokerageLink) {
          const brokerage = await storage.getBrokerage(brokerageLink.brokerageId);
          brokerageName = brokerage?.name || 'Unknown';
        }

        const clients = await storage.getClients(agent.id);
        const tours = await storage.getTours({ agentId: agent.id });
        const offers: any[] = [];
        for (const client of clients) {
          const clientOffers = await storage.getOffers({ clientId: client.id });
          offers.push(...clientOffers);
        }

        return {
          ...agent,
          brokerageName,
          clientCount: clients.length,
          tourCount: tours.filter(t => t.status === 'completed').length,
          upcomingTours: tours.filter(t => t.status === 'scheduled').length,
          offerCount: offers.length
        };
      }));

      res.json(enrichedAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Create agent and optionally link to brokerage
  app.post('/api/admin/agents', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, brokerageId } = req.body;
      const tempPassword = generatePassword();
      const [agent] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        role: 'agent',
        passwordHash: hashPassword(tempPassword),
      }).returning();

      if (brokerageId) {
        await storage.linkAgentToBrokerage(brokerageId, agent.id);
      }

      res.json({ ...agent, tempPassword });
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  // Update agent and manage brokerage link
  app.put('/api/admin/agents/:id', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { brokerageId, ...userData } = req.body;
      const [agent] = await db.update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, req.params.id))
        .returning();

      const existingLink = await storage.getBrokerageForAgent(req.params.id);
      if (brokerageId && brokerageId !== 'independent') {
        if (existingLink && existingLink.brokerageId !== brokerageId) {
          await storage.unlinkAgentFromBrokerage(existingLink.brokerageId, req.params.id);
        }
        if (!existingLink || existingLink.brokerageId !== brokerageId) {
          await storage.linkAgentToBrokerage(brokerageId, req.params.id);
        }
      } else if (brokerageId === 'independent' && existingLink) {
        await storage.unlinkAgentFromBrokerage(existingLink.brokerageId, req.params.id);
      }

      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  // Delete agent
  app.delete('/api/admin/agents/:id', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "Agent deleted successfully" });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Get all clients with agent and brokerage info
  app.get('/api/admin/clients', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users);
      const clients = allUsers.filter((u: any) => u.role === 'client');

      const enrichedClients = await Promise.all(clients.map(async (client: any) => {
        let agentName = 'Unassigned';
        let brokerageName = 'N/A';

        if (client.agentId) {
          const agent = await storage.getUser(client.agentId);
          if (agent) {
            agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
            const brokerageLink = await storage.getBrokerageForAgent(agent.id);
            if (brokerageLink) {
              const brokerage = await storage.getBrokerage(brokerageLink.brokerageId);
              brokerageName = brokerage?.name || 'Unknown';
            } else {
              brokerageName = 'Independent';
            }
          }
        }

        const tours = await storage.getTours({ clientId: client.id });
        const offers = await storage.getOffers({ clientId: client.id });

        return {
          ...client,
          agentName,
          brokerageName,
          tourCount: tours.length,
          offerCount: offers.length
        };
      }));

      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get detailed reports
  app.get('/api/admin/reports', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users);
      const agents = allUsers.filter((u: any) => u.role === 'agent');
      const clients = allUsers.filter((u: any) => u.role === 'client');

      let allTours: any[] = [];
      let allOffers: any[] = [];
      let allRatings: any[] = [];

      for (const agent of agents) {
        const tours = await storage.getTours({ agentId: agent.id });
        allTours.push(...tours);
      }

      for (const client of clients) {
        const offers = await storage.getOffers({ clientId: client.id });
        allOffers.push(...offers);
        const ratings = await db.select().from(propertyRatings).where(eq(propertyRatings.clientId, client.id));
        allRatings.push(...ratings);
      }

      const offerAnalytics = {
        total: allOffers.length,
        draft: allOffers.filter(o => o.status === 'draft').length,
        submitted: allOffers.filter(o => o.status === 'submitted').length,
        accepted: allOffers.filter(o => o.status === 'accepted').length,
        rejected: allOffers.filter(o => o.status === 'rejected').length
      };

      const ratingCategories = allRatings.reduce((acc: any, rating: any) => {
        const action = rating.actionCategory || 'other';
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});

      res.json({
        tourMetrics: {
          total: allTours.length,
          completed: allTours.filter(t => t.status === 'completed').length,
          scheduled: allTours.filter(t => t.status === 'scheduled').length
        },
        offerAnalytics,
        ratingCategories
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Shortlist operations
  app.post('/api/properties/:propertyId/shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const shortlist = await storage.addToShortlist(req.params.propertyId, user.id);
      res.json(shortlist);
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ message: "Failed to add to shortlist" });
    }
  });

  app.delete('/api/properties/:propertyId/shortlist', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.removeFromShortlist(req.params.propertyId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ message: "Failed to remove from shortlist" });
    }
  });

  app.get('/api/shortlists', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const shortlists = await storage.getShortlistedProperties(user.id);
      res.json(shortlists);
    } catch (error) {
      console.error("Error fetching shortlists:", error);
      res.status(500).json({ message: "Failed to fetch shortlists" });
    }
  });


  // Seed database with test data
  app.post('/api/seed', async (req: any, res) => {
    try {
      const result = await seedDatabase();
      res.json(result);
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ message: "Failed to seed database", error: String(error) });
    }
  });

  // Seed brokerage demo data
  app.post('/api/seed/brokerage-demo', async (req: any, res) => {
    try {
      const result = await seedBrokerageDemo();
      res.json(result);
    } catch (error) {
      console.error("Error seeding brokerage demo:", error);
      res.status(500).json({ message: "Failed to seed brokerage demo", error: error instanceof Error ? error.message : JSON.stringify(error) });
    }
  });

  // ─── Chat / Direct Messaging ───────────────────────────────────────────────

  // List all conversations for the current user
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const convs = await storage.getConversations(user.id, user.role || 'client');
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Create or get a conversation between agent and client
  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { otherUserId } = req.body;
      if (!otherUserId) return res.status(400).json({ message: "otherUserId required" });

      let agentId: string, clientId: string;
      if (user.role === 'agent') {
        agentId = user.id;
        clientId = otherUserId;
      } else {
        clientId = user.id;
        agentId = otherUserId;
      }
      const conversation = await storage.getOrCreateConversation(agentId, clientId);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages in a conversation
  app.get('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { conversationId } = req.params;
      const messages = await storage.getMessages(conversationId);
      // Mark messages from the other person as read
      await storage.markMessagesRead(conversationId, user.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { conversationId } = req.params;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message content required" });
      const message = await storage.sendMessage(conversationId, user.id, content.trim());
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get unread message count for the current user
  app.get('/api/conversations/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.session as any).user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const count = await storage.getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
