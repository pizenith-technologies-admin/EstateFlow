var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/objectAcl.ts
var objectAcl_exports = {};
__export(objectAcl_exports, {
  ObjectAccessGroupType: () => ObjectAccessGroupType,
  ObjectPermission: () => ObjectPermission,
  canAccessObject: () => canAccessObject,
  getObjectAclPolicy: () => getObjectAclPolicy,
  setObjectAclPolicy: () => setObjectAclPolicy
});
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}
var ACL_POLICY_METADATA_KEY, ObjectAccessGroupType, ObjectPermission;
var init_objectAcl = __esm({
  "server/objectAcl.ts"() {
    "use strict";
    ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
    ObjectAccessGroupType = /* @__PURE__ */ ((ObjectAccessGroupType2) => {
      return ObjectAccessGroupType2;
    })(ObjectAccessGroupType || {});
    ObjectPermission = /* @__PURE__ */ ((ObjectPermission2) => {
      ObjectPermission2["READ"] = "read";
      ObjectPermission2["WRITE"] = "write";
      return ObjectPermission2;
    })(ObjectPermission || {});
  }
});

// server/objectStorage.ts
var objectStorage_exports = {};
__export(objectStorage_exports, {
  ObjectNotFoundError: () => ObjectNotFoundError,
  ObjectStorageService: () => ObjectStorageService,
  objectStorageClient: () => objectStorageClient
});
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
function createStorageClient() {
  if (process.env.GOOGLE_CLOUD_KEY_BASE64) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CLOUD_KEY_BASE64, "base64").toString("utf-8")
    );
    return new Storage({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
  }
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token"
        }
      },
      universe_domain: "googleapis.com"
    },
    projectId: ""
  });
}
function parseObjectPath(path) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  if (process.env.GOOGLE_CLOUD_KEY_BASE64) {
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: method.toLowerCase(),
      expires: Date.now() + ttlSec * 1e3
    });
    return signedUrl;
  }
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
var REPLIT_SIDECAR_ENDPOINT, objectStorageClient, ObjectNotFoundError, ObjectStorageService;
var init_objectStorage = __esm({
  "server/objectStorage.ts"() {
    "use strict";
    init_objectAcl();
    REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
    objectStorageClient = createStorageClient();
    ObjectNotFoundError = class _ObjectNotFoundError extends Error {
      constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
      }
    };
    ObjectStorageService = class {
      constructor() {
      }
      // Gets the private object directory.
      getPrivateObjectDir() {
        const dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        return dir;
      }
      // Downloads an object to the response.
      async downloadObject(file, res, cacheTtlSec = 3600) {
        try {
          const [metadata] = await file.getMetadata();
          const aclPolicy = await getObjectAclPolicy(file);
          const isPublic = aclPolicy?.visibility === "public";
          res.set({
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Content-Length": metadata.size,
            "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
          });
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
        } catch (error) {
          console.error("Error downloading file:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        }
      }
      // Gets the upload URL for an object entity.
      async getObjectEntityUploadURL() {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        const objectId = randomUUID();
        const fullPath = `${privateObjectDir}/uploads/${objectId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        return signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 900
        });
      }
      // Gets the object entity file from the object path.
      async getObjectEntityFile(objectPath) {
        if (!objectPath.startsWith("/objects/")) {
          throw new ObjectNotFoundError();
        }
        const parts = objectPath.slice(1).split("/");
        if (parts.length < 2) {
          throw new ObjectNotFoundError();
        }
        const entityId = parts.slice(1).join("/");
        let entityDir = this.getPrivateObjectDir();
        if (!entityDir.endsWith("/")) {
          entityDir = `${entityDir}/`;
        }
        const objectEntityPath = `${entityDir}${entityId}`;
        const { bucketName, objectName } = parseObjectPath(objectEntityPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(objectName);
        const [exists] = await objectFile.exists();
        if (!exists) {
          throw new ObjectNotFoundError();
        }
        return objectFile;
      }
      normalizeObjectEntityPath(rawPath) {
        if (!rawPath.startsWith("https://storage.googleapis.com/")) {
          return rawPath;
        }
        const url = new URL(rawPath);
        let rawObjectPath = url.pathname;
        rawObjectPath = rawObjectPath.replace(/^\//, "");
        let objectEntityDir = this.getPrivateObjectDir();
        objectEntityDir = objectEntityDir.replace(/^\//, "");
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
          return `/${rawObjectPath}`;
        }
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return `/objects/${entityId}`;
      }
      // Tries to set the ACL policy for the object entity and return the normalized path.
      async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
        const normalizedPath = this.normalizeObjectEntityPath(rawPath);
        if (!normalizedPath.startsWith("/")) {
          return normalizedPath;
        }
        const objectFile = await this.getObjectEntityFile(normalizedPath);
        await setObjectAclPolicy(objectFile, aclPolicy);
        return normalizedPath;
      }
      // Checks if the user can access the object entity.
      async canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission
      }) {
        return canAccessObject({
          userId,
          objectFile,
          requestedPermission: requestedPermission ?? "read" /* READ */
        });
      }
    };
  }
});

// server/app.ts
import express from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  agentBrandingSettings: () => agentBrandingSettings,
  applicationDocuments: () => applicationDocuments,
  applicationDocumentsRelations: () => applicationDocumentsRelations,
  brokerageAgents: () => brokerageAgents,
  brokerageTeamAgents: () => brokerageTeamAgents,
  brokerageTeams: () => brokerageTeams,
  brokerages: () => brokerages,
  calendarEvents: () => calendarEvents,
  calendarEventsRelations: () => calendarEventsRelations,
  calendarIntegrations: () => calendarIntegrations,
  calendarIntegrationsRelations: () => calendarIntegrationsRelations,
  clientContactLinks: () => clientContactLinks,
  clientGroups: () => clientGroups,
  clientGroupsRelations: () => clientGroupsRelations,
  clientRequirements: () => clientRequirements,
  coachingNotes: () => coachingNotes,
  contacts: () => contacts,
  conversations: () => conversations,
  directMessages: () => directMessages,
  documents: () => documents,
  documentsRelations: () => documentsRelations,
  employmentHistory: () => employmentHistory,
  employmentHistoryRelations: () => employmentHistoryRelations,
  financialInformation: () => financialInformation,
  financialInformationRelations: () => financialInformationRelations,
  groupMembers: () => groupMembers,
  groupMembersRelations: () => groupMembersRelations,
  groupMessages: () => groupMessages,
  groupMessagesRelations: () => groupMessagesRelations,
  impersonationLogs: () => impersonationLogs,
  insertAgentBrandingSettingSchema: () => insertAgentBrandingSettingSchema,
  insertApplicationDocumentSchema: () => insertApplicationDocumentSchema,
  insertBrokerageAgentSchema: () => insertBrokerageAgentSchema,
  insertBrokerageSchema: () => insertBrokerageSchema,
  insertBrokerageTeamAgentSchema: () => insertBrokerageTeamAgentSchema,
  insertBrokerageTeamSchema: () => insertBrokerageTeamSchema,
  insertCalendarEventSchema: () => insertCalendarEventSchema,
  insertCalendarIntegrationSchema: () => insertCalendarIntegrationSchema,
  insertClientContactLinkSchema: () => insertClientContactLinkSchema,
  insertClientGroupSchema: () => insertClientGroupSchema,
  insertClientRequirementSchema: () => insertClientRequirementSchema,
  insertCoachingNoteSchema: () => insertCoachingNoteSchema,
  insertContactSchema: () => insertContactSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertDirectMessageSchema: () => insertDirectMessageSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertEmploymentHistorySchema: () => insertEmploymentHistorySchema,
  insertFinancialInformationSchema: () => insertFinancialInformationSchema,
  insertGroupMessageSchema: () => insertGroupMessageSchema,
  insertImpersonationLogSchema: () => insertImpersonationLogSchema,
  insertLocationHistorySchema: () => insertLocationHistorySchema,
  insertLocationShareSchema: () => insertLocationShareSchema,
  insertOfferSchema: () => insertOfferSchema,
  insertPersonalReferencesSchema: () => insertPersonalReferencesSchema,
  insertPropertyMatchSchema: () => insertPropertyMatchSchema,
  insertPropertyMediaSchema: () => insertPropertyMediaSchema,
  insertPropertyPhotoSchema: () => insertPropertyPhotoSchema,
  insertPropertyRatingSchema: () => insertPropertyRatingSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertPropertyShortlistSchema: () => insertPropertyShortlistSchema,
  insertPropertySuggestionSchema: () => insertPropertySuggestionSchema,
  insertRentalApplicationSchema: () => insertRentalApplicationSchema,
  insertRentalHistorySchema: () => insertRentalHistorySchema,
  insertRentalProfileSchema: () => insertRentalProfileSchema,
  insertRequirementsExceptionSchema: () => insertRequirementsExceptionSchema,
  insertRequirementsVersionSchema: () => insertRequirementsVersionSchema,
  insertSettingsVersionSchema: () => insertSettingsVersionSchema,
  insertShowingRequestSchema: () => insertShowingRequestSchema,
  insertShowingScheduleSchema: () => insertShowingScheduleSchema,
  insertTourRecapSchema: () => insertTourRecapSchema,
  insertTourReminderSchema: () => insertTourReminderSchema,
  insertTourSchema: () => insertTourSchema,
  insertUserSchema: () => insertUserSchema,
  locationHistory: () => locationHistory,
  locationHistoryRelations: () => locationHistoryRelations,
  locationShares: () => locationShares,
  locationSharesRelations: () => locationSharesRelations,
  offers: () => offers,
  offersRelations: () => offersRelations,
  personalReferences: () => personalReferences,
  personalReferencesRelations: () => personalReferencesRelations,
  properties: () => properties,
  propertiesRelations: () => propertiesRelations,
  propertyMatches: () => propertyMatches,
  propertyMedia: () => propertyMedia,
  propertyPhotos: () => propertyPhotos,
  propertyPhotosRelations: () => propertyPhotosRelations,
  propertyRatings: () => propertyRatings,
  propertyRatingsRelations: () => propertyRatingsRelations,
  propertyShortlists: () => propertyShortlists,
  propertySuggestions: () => propertySuggestions,
  rentalApplications: () => rentalApplications,
  rentalApplicationsRelations: () => rentalApplicationsRelations,
  rentalHistory: () => rentalHistory,
  rentalHistoryRelations: () => rentalHistoryRelations,
  rentalProfiles: () => rentalProfiles,
  requestedProperties: () => requestedProperties,
  requestedPropertiesRelations: () => requestedPropertiesRelations,
  requirementsExceptions: () => requirementsExceptions,
  requirementsVersions: () => requirementsVersions,
  sessions: () => sessions,
  settingsVersions: () => settingsVersions,
  showingRequests: () => showingRequests,
  showingRequestsRelations: () => showingRequestsRelations,
  showingSchedules: () => showingSchedules,
  showingSchedulesRelations: () => showingSchedulesRelations,
  tourProperties: () => tourProperties,
  tourPropertiesRelations: () => tourPropertiesRelations,
  tourRecaps: () => tourRecaps,
  tourRecapsRelations: () => tourRecapsRelations,
  tourReminders: () => tourReminders,
  tourRemindersRelations: () => tourRemindersRelations,
  tours: () => tours,
  toursRelations: () => toursRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  // Hashed password for client accounts
  role: varchar("role", { enum: ["agent", "client", "brokerage", "superadmin"] }).notNull().default("client"),
  clientType: varchar("client_type", { enum: ["buyer", "renter"] }),
  // Only for clients
  agentId: varchar("agent_id"),
  driveFolderUrl: varchar("drive_folder_url"),
  // Manual Google Drive folder URL (simplified integration)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var clientRequirements = pgTable("client_requirements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientType: varchar("client_type", { enum: ["buyer", "renter"] }).notNull(),
  version: integer("version").notNull().default(1),
  status: varchar("status", {
    enum: ["incomplete", "pending_validation", "validated", "needs_review", "approved", "expired"]
  }).default("incomplete"),
  // Validation tracking
  validationScore: decimal("validation_score", { precision: 3, scale: 2 }).default("0"),
  // 0-1 completeness score
  lastValidatedAt: timestamp("last_validated_at"),
  validatedBy: varchar("validated_by").references(() => users.id),
  // Common fields for all client types
  budgetMin: decimal("budget_min", { precision: 12, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 12, scale: 2 }),
  preferredAreas: text("preferred_areas").array(),
  propertyTypes: text("property_types").array(),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  parkingRequired: boolean("parking_required").default(false),
  parkingSpots: integer("parking_spots").default(0),
  // Buyer-specific fields
  preApprovalAmount: decimal("pre_approval_amount", { precision: 12, scale: 2 }),
  downPaymentAmount: decimal("down_payment_amount", { precision: 12, scale: 2 }),
  mortgagePreApprovalExpiry: timestamp("mortgage_pre_approval_expiry"),
  firstTimeBuyer: boolean("first_time_buyer").default(false),
  desiredClosingDate: timestamp("desired_closing_date"),
  // Renter-specific fields  
  monthlyIncomeVerified: boolean("monthly_income_verified").default(false),
  combinedFamilyIncome: decimal("combined_family_income", { precision: 12, scale: 2 }),
  preferredMoveInDate: timestamp("preferred_move_in_date"),
  willingToPrepayRent: boolean("willing_to_prepay_rent").default(false),
  prepayMonths: integer("prepay_months").default(0),
  // Timeline and urgency
  urgencyLevel: varchar("urgency_level", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  timeframe: varchar("timeframe", { enum: ["asap", "1_month", "3_months", "6_months", "flexible"] }),
  // Metadata
  notes: text("notes"),
  agentId: varchar("agent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true)
});
var requirementsVersions = pgTable("requirements_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: uuid("requirement_id").notNull().references(() => clientRequirements.id),
  version: integer("version").notNull(),
  changeType: varchar("change_type", { enum: ["created", "updated", "validated", "approved"] }).notNull(),
  changes: jsonb("changes"),
  // Store diff of what changed
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow()
});
var requirementsExceptions = pgTable("requirements_exceptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: uuid("requirement_id").notNull().references(() => clientRequirements.id),
  exceptionType: varchar("exception_type", {
    enum: ["budget_override", "area_expansion", "criteria_waiver", "timeline_extension", "special_circumstance"]
  }).notNull(),
  description: text("description").notNull(),
  justification: text("justification").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  status: varchar("status", { enum: ["pending", "approved", "rejected", "expired"] }).default("pending"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var propertyMatches = pgTable("property_matches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: uuid("requirement_id").notNull().references(() => clientRequirements.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }).notNull(),
  // 0-1 match score
  // Individual scoring components
  budgetScore: decimal("budget_score", { precision: 3, scale: 2 }),
  locationScore: decimal("location_score", { precision: 3, scale: 2 }),
  sizeScore: decimal("size_score", { precision: 3, scale: 2 }),
  typeScore: decimal("type_score", { precision: 3, scale: 2 }),
  amenityScore: decimal("amenity_score", { precision: 3, scale: 2 }),
  timelineScore: decimal("timeline_score", { precision: 3, scale: 2 }),
  // Match metadata
  matchReason: text("match_reason"),
  // Explanation of why it's a good match
  dealBreakers: text("deal_breakers").array(),
  // What doesn't match
  highlights: text("highlights").array(),
  // What matches really well
  calculatedAt: timestamp("calculated_at").defaultNow(),
  agentReview: varchar("agent_review", { enum: ["pending", "approved", "rejected"] }),
  agentNotes: text("agent_notes")
});
var rentalProfiles = pgTable("rental_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  parkingRequired: boolean("parking_required").default(false),
  parkingSpots: integer("parking_spots").default(0),
  numberOfOccupants: integer("number_of_occupants").notNull(),
  monthlyBudget: decimal("monthly_budget", { precision: 10, scale: 2 }).notNull(),
  // CAD
  preferredAreas: text("preferred_areas").array(),
  // Array of cities/areas
  propertyType: varchar("property_type", {
    enum: ["condo", "townhouse", "detached", "apartment", "basement", "duplex", "other"]
  }).notNull(),
  preferredMoveInDate: timestamp("preferred_move_in_date"),
  combinedFamilyIncome: decimal("combined_family_income", { precision: 12, scale: 2 }).notNull(),
  // CAD annually
  willingToPrepayRent: boolean("willing_to_prepay_rent").default(false),
  prepayMonths: integer("prepay_months").default(0),
  // How many months willing to prepay
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var rentalApplications = pgTable("rental_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  applicationNumber: varchar("application_number").notNull().unique(),
  // Property & Lease Information
  intendedStartDate: timestamp("intended_start_date").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  rentDueDate: integer("rent_due_date").notNull(),
  // Day of month (1-31)
  // Personal Information
  dateOfBirth: timestamp("date_of_birth").notNull(),
  socialInsuranceNumber: varchar("social_insurance_number"),
  // Optional
  driversLicenseNumber: varchar("drivers_license_number"),
  phoneNumber: varchar("phone_number").notNull(),
  occupation: varchar("occupation"),
  // Vehicle Information
  vehicleMake: varchar("vehicle_make"),
  vehicleModel: varchar("vehicle_model"),
  vehicleYear: integer("vehicle_year"),
  vehicleLicensePlate: varchar("vehicle_license_plate"),
  // Pet Information
  hasPets: boolean("has_pets").default(false),
  petDetails: text("pet_details"),
  // Type, breed, age, etc.
  // Additional Occupants
  additionalOccupants: jsonb("additional_occupants"),
  // Array of {name, relationship, age}
  // Application Status
  status: varchar("status", {
    enum: ["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"]
  }).default("draft"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  // Consent and Signatures
  consentBackgroundCheck: boolean("consent_background_check").default(false),
  consentCreditCheck: boolean("consent_credit_check").default(false),
  consentReferenceCheck: boolean("consent_reference_check").default(false),
  applicationSignedAt: timestamp("application_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var employmentHistory = pgTable("employment_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  isCurrent: boolean("is_current").notNull(),
  employerName: varchar("employer_name").notNull(),
  businessAddress: text("business_address").notNull(),
  businessPhone: varchar("business_phone").notNull(),
  position: varchar("position").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // NULL for current employment
  supervisorName: varchar("supervisor_name"),
  monthlySalary: decimal("monthly_salary", { precision: 10, scale: 2 }).notNull(),
  salaryType: varchar("salary_type", { enum: ["hourly", "salary", "commission", "contract"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var financialInformation = pgTable("financial_information", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  bankName: varchar("bank_name").notNull(),
  branchAddress: text("branch_address").notNull(),
  accountType: varchar("account_type", { enum: ["checking", "savings", "credit"] }).notNull(),
  accountNumber: varchar("account_number").notNull(),
  // Encrypted in practice
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }).notNull(),
  otherIncome: decimal("other_income", { precision: 12, scale: 2 }).default("0"),
  otherIncomeSource: text("other_income_source"),
  monthlyDebts: decimal("monthly_debts", { precision: 10, scale: 2 }).default("0"),
  debtDetails: text("debt_details"),
  // Credit cards, loans, etc.
  bankruptcyHistory: boolean("bankruptcy_history").default(false),
  bankruptcyDetails: text("bankruptcy_details"),
  createdAt: timestamp("created_at").defaultNow()
});
var rentalHistory = pgTable("rental_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  address: text("address").notNull(),
  landlordName: varchar("landlord_name").notNull(),
  landlordPhone: varchar("landlord_phone").notNull(),
  landlordEmail: varchar("landlord_email"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // NULL for current rental
  reasonForLeaving: text("reason_for_leaving"),
  wasEvicted: boolean("was_evicted").default(false),
  latePayments: boolean("late_payments").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var personalReferences = pgTable("personal_references", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  name: varchar("name").notNull(),
  relationship: varchar("relationship").notNull(),
  // Friend, colleague, etc.
  phoneNumber: varchar("phone_number").notNull(),
  email: varchar("email"),
  yearsKnown: integer("years_known").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var applicationDocuments = pgTable("application_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  documentType: varchar("document_type", {
    enum: ["pay_stub", "bank_statement", "employment_letter", "tax_return", "reference_letter", "id_document", "other"]
  }).notNull(),
  documentName: varchar("document_name").notNull(),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  isRequired: boolean("is_required").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});
var agentBrandingSettings = pgTable("agent_branding_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  logoUrl: text("logo_url").notNull(),
  agentName: varchar("agent_name", { length: 120 }).notNull(),
  agentEmail: varchar("agent_email", { length: 120 }).notNull(),
  brokerageName: varchar("brokerage_name", { length: 120 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id)
});
var settingsVersions = pgTable("settings_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  tab: varchar("tab", { enum: ["branding", "general", "notifications"] }).notNull(),
  diff: jsonb("diff"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id)
});
var properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  mlsNumber: integer("mls_number").notNull().unique(),
  address: text("address").notNull(),
  city: varchar("city"),
  province: varchar("province"),
  postalCode: varchar("postal_code"),
  propertyType: varchar("property_type", { enum: ["detached", "semi-detached", "townhouse", "condo", "apartment"] }),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  area: varchar("area"),
  description: text("description"),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var propertyShortlists = pgTable("property_shortlists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userPropertyIdx: sql`CREATE UNIQUE INDEX user_property_idx ON ${table} (user_id, property_id)`
}));
var clientGroups = pgTable("client_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => clientGroups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow()
});
var groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => clientGroups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var tours = pgTable("tours", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  groupId: uuid("group_id").references(() => clientGroups.id),
  scheduledDate: timestamp("scheduled_date"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: varchar("status", { enum: ["requested", "scheduled", "in_progress", "completed", "cancelled"] }).default("requested"),
  totalDistance: decimal("total_distance", { precision: 8, scale: 2 }),
  estimatedDuration: integer("estimated_duration_minutes"),
  actualDuration: integer("actual_duration_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var tourProperties = pgTable("tour_properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  order: integer("order").notNull(),
  scheduledTime: timestamp("scheduled_time"),
  visitedAt: timestamp("visited_at"),
  status: varchar("status", { enum: ["scheduled", "viewed", "liked", "rejected", "offer_made"] }).default("scheduled"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  agentRating: integer("agent_rating"),
  agentNotes: text("agent_notes")
});
var propertyRatings = pgTable("property_ratings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  // 1-5 stars
  feedbackCategory: varchar("feedback_category", {
    enum: ["offer_now", "hold_later", "reject"]
  }).notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  remindLater: boolean("remind_later").default(false),
  remindedAt: timestamp("reminded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var propertyPhotos = pgTable("property_photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  tourId: uuid("tour_id").references(() => tours.id),
  clientId: varchar("client_id").references(() => users.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow()
});
var propertyMedia = pgTable("property_media", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  mediaType: varchar("media_type", {
    enum: ["photo", "video", "document"]
  }).notNull(),
  documentType: varchar("document_type", {
    enum: ["offer", "inspection", "appraisal", "floor_plan", "listing", "other"]
  }),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  caption: text("caption"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var offers = pgTable("offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "rejected", "withdrawn"] }).default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  notes: text("notes")
});
var showingRequests = pgTable("showing_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  groupId: uuid("group_id").references(() => clientGroups.id),
  preferredDate: timestamp("preferred_date"),
  preferredTime: varchar("preferred_time"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var requestedProperties = pgTable("requested_properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id").notNull().references(() => showingRequests.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id)
});
var tourRecaps = pgTable("tour_recaps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  tourDate: timestamp("tour_date").notNull(),
  totalDistance: varchar("total_distance"),
  totalDuration: varchar("total_duration"),
  showingsCompleted: integer("showings_completed").notNull().default(0),
  clientsSatisfaction: integer("clients_satisfaction").notNull().default(5),
  keyInsights: text("key_insights"),
  challengesFaced: text("challenges_faced"),
  opportunitiesIdentified: text("opportunities_identified"),
  followUpActions: text("follow_up_actions"),
  overallNotes: text("overall_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var showingSchedules = pgTable("showing_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: varchar("start_time").notNull(),
  estimatedDuration: integer("estimated_duration").notNull().default(30),
  status: varchar("status", { enum: ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] }).default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var tourReminders = pgTable("tour_reminders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  method: varchar("method", { enum: ["notification", "email", "sms"] }).notNull(),
  intervalValue: integer("interval_value").notNull().default(1),
  intervalUnit: varchar("interval_unit", { enum: ["minutes", "hours", "days", "weeks"] }).notNull().default("days"),
  timing: varchar("timing").notNull().default("09:00"),
  isEnabled: boolean("is_enabled").default(true),
  lastSent: timestamp("last_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var propertySuggestions = pgTable("property_suggestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  mlsNumber: varchar("mls_number").notNull(),
  preferredDate: timestamp("preferred_date"),
  preferredTime: varchar("preferred_time"),
  notes: text("notes"),
  status: varchar("status", { enum: ["pending", "approved", "rejected", "scheduled"] }).default("pending"),
  tourId: uuid("tour_id").references(() => tours.id),
  agentNotes: text("agent_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => users.id),
  documentType: varchar("document_type", {
    enum: [
      "offer_placed",
      "client_id",
      "representative_agreement",
      "offer_received",
      "property_listing",
      "inspection_report",
      "appraisal",
      "legal_document",
      "financial_document",
      "insurance",
      "lease_agreement",
      "purchase_agreement",
      "closing_document",
      "marketing_material",
      "floor_plan",
      "photo_gallery",
      "disclosure_form",
      "warranty",
      "contract",
      "deed",
      "title",
      "survey",
      "hoa_document",
      "property_tax",
      "utility_bill",
      "mls_listing",
      "other"
    ]
  }).notNull(),
  title: varchar("title").notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  description: text("description"),
  relatedId: uuid("related_id"),
  // Links to offers, users, etc.
  tags: text("tags").array(),
  // Custom tags for organization
  expirationDate: timestamp("expiration_date"),
  // For time-sensitive documents
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var locationShares = pgTable("location_shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tourId: uuid("tour_id").references(() => tours.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  address: varchar("address"),
  sharingType: varchar("sharing_type", { enum: ["live", "checkpoint", "destination"] }).notNull().default("live"),
  sharedWith: text("shared_with").array(),
  // Array of user IDs
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  // Additional location data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var locationHistory = pgTable("location_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  // GPS accuracy in meters
  address: varchar("address"),
  activityType: varchar("activity_type", {
    enum: ["touring", "traveling", "meeting", "showing", "office", "unknown"]
  }).default("unknown"),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  // Speed in km/h
  heading: decimal("heading", { precision: 5, scale: 2 }),
  // Direction in degrees
  tourId: uuid("tour_id").references(() => tours.id),
  propertyId: uuid("property_id").references(() => properties.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
  source: varchar("source", { enum: ["automatic", "manual", "tour"] }).default("automatic")
});
var calendarIntegrations = pgTable("calendar_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  provider: varchar("provider", { enum: ["google", "outlook", "apple"] }).notNull(),
  calendarId: varchar("calendar_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").default(true),
  syncPreferences: jsonb("sync_preferences"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  integrationId: uuid("integration_id").references(() => calendarIntegrations.id),
  tourId: uuid("tour_id").references(() => tours.id),
  externalEventId: varchar("external_event_id"),
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location"),
  isBlocked: boolean("is_blocked").default(true),
  eventType: varchar("event_type", { enum: ["tour", "showing", "personal", "blocked"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ one, many }) => ({
  agent: one(users, {
    fields: [users.agentId],
    references: [users.id],
    relationName: "agent_clients"
  }),
  clients: many(users, { relationName: "agent_clients" }),
  createdGroups: many(clientGroups),
  groupMemberships: many(groupMembers),
  agentTours: many(tours, { relationName: "agent_tours" }),
  clientTours: many(tours, { relationName: "client_tours" }),
  properties: many(properties),
  uploadedPhotos: many(propertyPhotos),
  uploadedMedia: many(propertyMedia),
  offers: many(offers, { relationName: "client_offers" }),
  agentOffers: many(offers, { relationName: "agent_offers" }),
  showingRequests: many(showingRequests, { relationName: "client_requests" }),
  agentRequests: many(showingRequests, { relationName: "agent_requests" }),
  tourReminders: many(tourReminders),
  documents: many(documents),
  locationShares: many(locationShares),
  locationHistory: many(locationHistory),
  calendarIntegrations: many(calendarIntegrations),
  calendarEvents: many(calendarEvents)
}));
var propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id]
  }),
  tourProperties: many(tourProperties),
  photos: many(propertyPhotos),
  media: many(propertyMedia),
  ratings: many(propertyRatings),
  offers: many(offers),
  requestedProperties: many(requestedProperties)
}));
var clientGroupsRelations = relations(clientGroups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clientGroups.createdById],
    references: [users.id]
  }),
  members: many(groupMembers),
  messages: many(groupMessages),
  tours: many(tours),
  showingRequests: many(showingRequests)
}));
var groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(clientGroups, {
    fields: [groupMembers.groupId],
    references: [clientGroups.id]
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id]
  })
}));
var groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  group: one(clientGroups, {
    fields: [groupMessages.groupId],
    references: [clientGroups.id]
  }),
  user: one(users, {
    fields: [groupMessages.userId],
    references: [users.id]
  })
}));
var toursRelations = relations(tours, ({ one, many }) => ({
  agent: one(users, {
    fields: [tours.agentId],
    references: [users.id],
    relationName: "agent_tours"
  }),
  client: one(users, {
    fields: [tours.clientId],
    references: [users.id],
    relationName: "client_tours"
  }),
  group: one(clientGroups, {
    fields: [tours.groupId],
    references: [clientGroups.id]
  }),
  tourProperties: many(tourProperties),
  photos: many(propertyPhotos)
}));
var tourPropertiesRelations = relations(tourProperties, ({ one }) => ({
  tour: one(tours, {
    fields: [tourProperties.tourId],
    references: [tours.id]
  }),
  property: one(properties, {
    fields: [tourProperties.propertyId],
    references: [properties.id]
  })
}));
var propertyRatingsRelations = relations(propertyRatings, ({ one }) => ({
  property: one(properties, {
    fields: [propertyRatings.propertyId],
    references: [properties.id]
  }),
  tour: one(tours, {
    fields: [propertyRatings.tourId],
    references: [tours.id]
  }),
  client: one(users, {
    fields: [propertyRatings.clientId],
    references: [users.id]
  })
}));
var propertyPhotosRelations = relations(propertyPhotos, ({ one }) => ({
  property: one(properties, {
    fields: [propertyPhotos.propertyId],
    references: [properties.id]
  }),
  tour: one(tours, {
    fields: [propertyPhotos.tourId],
    references: [tours.id]
  }),
  uploader: one(users, {
    fields: [propertyPhotos.uploadedBy],
    references: [users.id]
  })
}));
var offersRelations = relations(offers, ({ one }) => ({
  property: one(properties, {
    fields: [offers.propertyId],
    references: [properties.id]
  }),
  client: one(users, {
    fields: [offers.clientId],
    references: [users.id],
    relationName: "client_offers"
  }),
  agent: one(users, {
    fields: [offers.agentId],
    references: [users.id],
    relationName: "agent_offers"
  })
}));
var showingRequestsRelations = relations(showingRequests, ({ one, many }) => ({
  client: one(users, {
    fields: [showingRequests.clientId],
    references: [users.id],
    relationName: "client_requests"
  }),
  agent: one(users, {
    fields: [showingRequests.agentId],
    references: [users.id],
    relationName: "agent_requests"
  }),
  group: one(clientGroups, {
    fields: [showingRequests.groupId],
    references: [clientGroups.id]
  }),
  requestedProperties: many(requestedProperties)
}));
var requestedPropertiesRelations = relations(requestedProperties, ({ one }) => ({
  request: one(showingRequests, {
    fields: [requestedProperties.requestId],
    references: [showingRequests.id]
  }),
  property: one(properties, {
    fields: [requestedProperties.propertyId],
    references: [properties.id]
  })
}));
var tourRecapsRelations = relations(tourRecaps, ({ one }) => ({
  agent: one(users, {
    fields: [tourRecaps.agentId],
    references: [users.id]
  })
}));
var showingSchedulesRelations = relations(showingSchedules, ({ one }) => ({
  tour: one(tours, {
    fields: [showingSchedules.tourId],
    references: [tours.id]
  }),
  property: one(properties, {
    fields: [showingSchedules.propertyId],
    references: [properties.id]
  })
}));
var tourRemindersRelations = relations(tourReminders, ({ one }) => ({
  user: one(users, {
    fields: [tourReminders.userId],
    references: [users.id]
  }),
  tour: one(tours, {
    fields: [tourReminders.tourId],
    references: [tours.id]
  })
}));
var documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id]
  })
}));
var locationSharesRelations = relations(locationShares, ({ one }) => ({
  user: one(users, {
    fields: [locationShares.userId],
    references: [users.id]
  }),
  tour: one(tours, {
    fields: [locationShares.tourId],
    references: [tours.id]
  })
}));
var locationHistoryRelations = relations(locationHistory, ({ one }) => ({
  user: one(users, {
    fields: [locationHistory.userId],
    references: [users.id]
  }),
  tour: one(tours, {
    fields: [locationHistory.tourId],
    references: [tours.id]
  }),
  property: one(properties, {
    fields: [locationHistory.propertyId],
    references: [properties.id]
  })
}));
var calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarIntegrations.userId],
    references: [users.id]
  }),
  events: many(calendarEvents)
}));
var calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id]
  }),
  integration: one(calendarIntegrations, {
    fields: [calendarEvents.integrationId],
    references: [calendarIntegrations.id]
  }),
  tour: one(tours, {
    fields: [calendarEvents.tourId],
    references: [tours.id]
  })
}));
var rentalApplicationsRelations = relations(rentalApplications, ({ one, many }) => ({
  user: one(users, {
    fields: [rentalApplications.userId],
    references: [users.id]
  }),
  property: one(properties, {
    fields: [rentalApplications.propertyId],
    references: [properties.id]
  }),
  agent: one(users, {
    fields: [rentalApplications.agentId],
    references: [users.id],
    relationName: "agent_rental_applications"
  }),
  employmentHistory: many(employmentHistory),
  financialInformation: many(financialInformation),
  rentalHistory: many(rentalHistory),
  personalReferences: many(personalReferences),
  applicationDocuments: many(applicationDocuments)
}));
var employmentHistoryRelations = relations(employmentHistory, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [employmentHistory.applicationId],
    references: [rentalApplications.id]
  })
}));
var financialInformationRelations = relations(financialInformation, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [financialInformation.applicationId],
    references: [rentalApplications.id]
  })
}));
var rentalHistoryRelations = relations(rentalHistory, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [rentalHistory.applicationId],
    references: [rentalApplications.id]
  })
}));
var personalReferencesRelations = relations(personalReferences, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [personalReferences.applicationId],
    references: [rentalApplications.id]
  })
}));
var applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [applicationDocuments.applicationId],
    references: [rentalApplications.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true
});
var insertTourSchema = createInsertSchema(tours).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertShowingRequestSchema = createInsertSchema(showingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  submittedAt: true,
  respondedAt: true
});
var insertClientGroupSchema = createInsertSchema(clientGroups).omit({
  id: true,
  createdAt: true
});
var insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true
});
var insertPropertyRatingSchema = createInsertSchema(propertyRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPropertyPhotoSchema = createInsertSchema(propertyPhotos).omit({
  id: true,
  createdAt: true
});
var insertPropertyMediaSchema = createInsertSchema(propertyMedia).omit({
  id: true,
  createdAt: true
});
var insertTourRecapSchema = createInsertSchema(tourRecaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertShowingScheduleSchema = createInsertSchema(showingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTourReminderSchema = createInsertSchema(tourReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPropertySuggestionSchema = createInsertSchema(propertySuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertLocationShareSchema = createInsertSchema(locationShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertLocationHistorySchema = createInsertSchema(locationHistory).omit({
  id: true,
  recordedAt: true
});
var insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true
});
var insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
  isRead: true
});
var insertRentalProfileSchema = createInsertSchema(rentalProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientRequirementSchema = createInsertSchema(clientRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRequirementsVersionSchema = createInsertSchema(requirementsVersions).omit({
  id: true,
  createdAt: true
});
var insertRequirementsExceptionSchema = createInsertSchema(requirementsExceptions).omit({
  id: true,
  createdAt: true
});
var insertPropertyMatchSchema = createInsertSchema(propertyMatches).omit({
  id: true,
  calculatedAt: true
});
var insertRentalApplicationSchema = createInsertSchema(rentalApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
  applicationSignedAt: true
});
var insertEmploymentHistorySchema = createInsertSchema(employmentHistory).omit({
  id: true,
  createdAt: true
});
var insertFinancialInformationSchema = createInsertSchema(financialInformation).omit({
  id: true,
  createdAt: true
});
var insertRentalHistorySchema = createInsertSchema(rentalHistory).omit({
  id: true,
  createdAt: true
});
var insertPersonalReferencesSchema = createInsertSchema(personalReferences).omit({
  id: true,
  createdAt: true
});
var insertApplicationDocumentSchema = createInsertSchema(applicationDocuments).omit({
  id: true,
  uploadedAt: true
});
var insertAgentBrandingSettingSchema = createInsertSchema(agentBrandingSettings).omit({
  id: true,
  updatedAt: true
});
var insertSettingsVersionSchema = createInsertSchema(settingsVersions).omit({
  id: true,
  updatedAt: true
});
var insertPropertyShortlistSchema = createInsertSchema(propertyShortlists).omit({
  id: true,
  createdAt: true
});
var contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  phones: jsonb("phones").default("[]"),
  // [{label: string, number: string}]
  emails: jsonb("emails").default("[]"),
  // [{label: string, address: string}]
  notes: text("notes"),
  hasApp: boolean("has_app").default(false),
  lastActiveAt: timestamp("last_active_at"),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var clientContactLinks = pgTable("client_contact_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  relationshipType: varchar("relationship_type", {
    enum: ["primary", "spouse", "parent", "child", "cobuyer", "guarantor", "roommate", "friend", "attorney", "broker", "other"]
  }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var brokerages = pgTable("brokerages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  status: varchar("status", { enum: ["active", "suspended"] }).default("active"),
  settings: jsonb("settings"),
  // permissions, comms, branding for broker portal
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var brokerageAgents = pgTable("brokerage_agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  role: varchar("role", { enum: ["member", "manager"] }).default("member"),
  createdAt: timestamp("created_at").defaultNow()
});
var impersonationLogs = pgTable("impersonation_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { enum: ["brokerage", "agent", "client"] }).notNull(),
  targetId: varchar("target_id").notNull(),
  mode: varchar("mode", { enum: ["read", "readwrite"] }).default("read"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at")
});
var coachingNotes = pgTable("coaching_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var brokerageTeams = pgTable("brokerage_teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var brokerageTeamAgents = pgTable("brokerage_team_agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").notNull().references(() => brokerageTeams.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientContactLinkSchema = createInsertSchema(clientContactLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBrokerageSchema = createInsertSchema(brokerages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBrokerageAgentSchema = createInsertSchema(brokerageAgents).omit({
  id: true,
  createdAt: true
});
var insertCoachingNoteSchema = createInsertSchema(coachingNotes).omit({
  id: true,
  createdAt: true
});
var insertBrokerageTeamSchema = createInsertSchema(brokerageTeams).omit({
  id: true,
  createdAt: true
});
var insertBrokerageTeamAgentSchema = createInsertSchema(brokerageTeamAgents).omit({
  id: true,
  createdAt: true
});
var insertImpersonationLogSchema = createInsertSchema(impersonationLogs).omit({
  id: true,
  startedAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import dotenv from "dotenv";
dotenv.config();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, desc, asc, sql as sql2, count, sum, or, inArray } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations (mandatory for Replit Auth)
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async upsertUser(userData) {
    try {
      const existingUser = await this.getUser(userData.id);
      const updateSet = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        passwordHash: userData.passwordHash,
        clientType: userData.clientType,
        agentId: userData.agentId,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (userData.role !== void 0) {
        updateSet.role = userData.role;
      } else if (existingUser) {
        updateSet.role = existingUser.role;
      }
      const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
        target: users.id,
        set: updateSet
      }).returning();
      return user;
    } catch (error) {
      if (error.code === "23505" && error.detail?.includes("email")) {
        const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email));
        if (existingUser) {
          const [user] = await db.update(users).set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            passwordHash: userData.passwordHash,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(users.email, userData.email)).returning();
          return user;
        }
      }
      console.error("Error in upsertUser:", error);
      throw error;
    }
  }
  async deleteUser(id) {
    const clientReqs = await db.select().from(clientRequirements).where(eq(clientRequirements.userId, id));
    for (const req of clientReqs) {
      await db.delete(requirementsExceptions).where(eq(requirementsExceptions.requirementId, req.id));
      await db.delete(requirementsVersions).where(eq(requirementsVersions.requirementId, req.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, req.id));
    }
    await db.delete(clientRequirements).where(eq(clientRequirements.userId, id));
    await db.delete(tours).where(or(eq(tours.clientId, id), eq(tours.agentId, id)));
    await db.delete(offers).where(or(eq(offers.clientId, id), eq(offers.agentId, id)));
    await db.delete(showingRequests).where(or(eq(showingRequests.clientId, id), eq(showingRequests.agentId, id)));
    await db.delete(propertyRatings).where(eq(propertyRatings.clientId, id));
    await db.delete(groupMembers).where(eq(groupMembers.userId, id));
    await db.delete(groupMessages).where(eq(groupMessages.userId, id));
    await db.delete(clientGroups).where(eq(clientGroups.createdById, id));
    await db.delete(documents).where(eq(documents.userId, id));
    await db.delete(tourReminders).where(eq(tourReminders.userId, id));
    await db.delete(locationShares).where(eq(locationShares.userId, id));
    await db.delete(locationHistory).where(eq(locationHistory.userId, id));
    await db.delete(calendarIntegrations).where(eq(calendarIntegrations.userId, id));
    await db.delete(rentalProfiles).where(eq(rentalProfiles.userId, id));
    await db.delete(rentalApplications).where(eq(rentalApplications.userId, id));
    const userProperties = await db.select().from(properties).where(eq(properties.agentId, id));
    for (const property of userProperties) {
      await db.delete(propertyPhotos).where(eq(propertyPhotos.propertyId, property.id));
      await db.delete(requestedProperties).where(eq(requestedProperties.propertyId, property.id));
      await db.delete(tourProperties).where(eq(tourProperties.propertyId, property.id));
    }
    await db.delete(properties).where(eq(properties.agentId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  // Client operations
  async getClients(agentId) {
    try {
      const result = await db.select().from(users).where(and(eq(users.agentId, agentId), eq(users.role, "client"))).orderBy(sql2`${users.updatedAt} DESC`);
      return result.map((client) => ({
        ...client,
        firstName: client.firstName ?? null,
        lastName: client.lastName ?? null,
        email: client.email ?? null,
        profileImageUrl: client.profileImageUrl ?? null,
        clientType: client.clientType ?? null,
        agentId: client.agentId ?? null,
        createdAt: client.createdAt ?? null,
        updatedAt: client.updatedAt ?? null
      }));
    } catch (error) {
      console.error("Error in getClients:", error);
      throw error;
    }
  }
  async getClientsWithStats(agentId) {
    try {
      const clients = await this.getClients(agentId);
      const clientsWithStats = await Promise.all(clients.map(async (client) => {
        try {
          const [toursResult] = await db.select({ count: count() }).from(tours).where(eq(tours.clientId, client.id));
          const [offersResult] = await db.select({ count: count() }).from(offers).where(eq(offers.clientId, client.id));
          const [lastTour] = await db.select({ date: tours.scheduledDate }).from(tours).where(eq(tours.clientId, client.id)).orderBy(sql2`${tours.scheduledDate} DESC`).limit(1);
          const [lastOffer] = await db.select({ date: offers.submittedAt }).from(offers).where(eq(offers.clientId, client.id)).orderBy(sql2`${offers.submittedAt} DESC`).limit(1);
          let lastActivity = null;
          if (lastTour?.date || lastOffer?.date) {
            const tourDate = lastTour?.date ? new Date(lastTour.date) : /* @__PURE__ */ new Date(0);
            const offerDate = lastOffer?.date ? new Date(lastOffer.date) : /* @__PURE__ */ new Date(0);
            lastActivity = tourDate > offerDate ? tourDate : offerDate;
          }
          const [requestsResult] = await db.select({ count: count() }).from(showingRequests).where(eq(showingRequests.clientId, client.id));
          const [rejectedResult] = await db.select({ count: count() }).from(propertyRatings).where(and(
            eq(propertyRatings.clientId, client.id),
            eq(propertyRatings.feedbackCategory, "reject")
          ));
          const [distanceResult] = await db.select({ total: sum(tours.totalDistance) }).from(tours).where(eq(tours.clientId, client.id));
          const [durationResult] = await db.select({ total: sum(tours.estimatedDuration) }).from(tours).where(eq(tours.clientId, client.id));
          const totalKm = Number(distanceResult?.total || 0);
          const totalMinutes = Number(durationResult?.total || 0);
          const totalHours = totalMinutes > 0 ? (totalMinutes / 60).toFixed(1) : 0;
          return {
            ...client,
            stats: {
              totalTours: Number(toursResult?.count || 0),
              shortlistedProperties: Number(requestsResult?.count || 0),
              activeOffers: Number(offersResult?.count || 0),
              propertiesRejected: Number(rejectedResult?.count || 0),
              kmTravelled: Number(totalKm.toFixed(1)),
              hoursInvested: Number(totalHours),
              lastActivity: lastActivity ? lastActivity.toISOString() : null
            }
          };
        } catch (statError) {
          console.error(`Error getting stats for client ${client.id}:`, statError);
          return {
            ...client,
            stats: {
              totalTours: 0,
              shortlistedProperties: 0,
              activeOffers: 0,
              propertiesRejected: 0,
              kmTravelled: 0,
              hoursInvested: 0,
              lastActivity: null
            }
          };
        }
      }));
      return clientsWithStats;
    } catch (error) {
      console.error("Error in getClientsWithStats:", error);
      throw error;
    }
  }
  async getClientRequirements(clientId) {
    const [rentalProfile] = await db.select().from(rentalProfiles).where(eq(rentalProfiles.userId, clientId));
    if (rentalProfile) {
      return {
        type: "rental",
        profile: rentalProfile
      };
    }
    return {
      type: "buyer",
      profile: {
        status: "pending",
        message: "Buyer requirements not yet completed"
      }
    };
  }
  async getClientShortlists(clientId) {
    return [];
  }
  async getClientMedia(clientId) {
    return [];
  }
  async getClientNotes(clientId) {
    const notes = await db.select().from(documents).where(and(
      eq(documents.userId, clientId),
      eq(documents.documentType, "note")
    )).orderBy(sql2`${documents.createdAt} DESC`);
    return notes.map((note) => ({
      id: note.id,
      content: note.title,
      // Use title field for note content
      author: "Agent",
      // Could be enhanced with actual agent info
      date: note.createdAt,
      createdAt: note.createdAt
    }));
  }
  async createClientNote(clientId, agentId, content) {
    const filename = `note-${Date.now()}.txt`;
    const noteDocument = {
      userId: clientId,
      documentType: "note",
      title: content,
      // Store note content in title field
      filename,
      originalName: filename,
      url: "",
      // Notes don't have URLs
      mimeType: "text/plain",
      size: content.length,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [note] = await db.insert(documents).values(noteDocument).returning();
    return {
      id: note.id,
      content: note.title,
      author: "Agent",
      date: note.createdAt,
      createdAt: note.createdAt
    };
  }
  // Property operations
  async getProperties(agentId) {
    let whereConditions = [eq(properties.isActive, true)];
    if (agentId) {
      whereConditions.push(eq(properties.agentId, agentId));
    }
    return await db.select().from(properties).where(and(...whereConditions)).orderBy(sql2`${properties.createdAt} DESC`);
  }
  async getProperty(id) {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }
  async createProperty(property) {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }
  async updateProperty(id, updates) {
    const [updatedProperty] = await db.update(properties).set(updates).where(eq(properties.id, id)).returning();
    return updatedProperty;
  }
  // Tour operations
  async getTours(filters) {
    const conditions = [];
    if (filters.agentId) conditions.push(eq(tours.agentId, filters.agentId));
    if (filters.clientId) conditions.push(eq(tours.clientId, filters.clientId));
    if (filters.status) conditions.push(eq(tours.status, filters.status));
    const baseQuery = db.select({
      id: tours.id,
      agentId: tours.agentId,
      clientId: tours.clientId,
      groupId: tours.groupId,
      scheduledDate: tours.scheduledDate,
      startTime: tours.startTime,
      endTime: tours.endTime,
      status: tours.status,
      totalDistance: tours.totalDistance,
      estimatedDuration: tours.estimatedDuration,
      actualDuration: tours.actualDuration,
      notes: tours.notes,
      createdAt: tours.createdAt,
      updatedAt: tours.updatedAt,
      clientName: sql2`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
      clientEmail: users.email,
      clientFirstName: users.firstName,
      clientLastName: users.lastName,
      propertiesCount: sql2`(SELECT COUNT(*) FROM tour_properties WHERE tour_properties.tour_id = ${tours.id})`
    }).from(tours).leftJoin(users, eq(tours.clientId, users.id));
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(sql2`${tours.scheduledDate} DESC`);
    }
    return await baseQuery.orderBy(sql2`${tours.scheduledDate} DESC`);
  }
  async getTour(id) {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour;
  }
  async checkDuplicateTour(agentId, clientId, scheduledDate, propertyIds) {
    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);
    const existingTours = await db.select().from(tours).where(
      and(
        eq(tours.agentId, agentId),
        eq(tours.clientId, clientId),
        sql2`${tours.scheduledDate} >= ${dayStart}`,
        sql2`${tours.scheduledDate} <= ${dayEnd}`,
        sql2`${tours.status} != 'cancelled'`
      )
    );
    if (existingTours.length === 0) return null;
    const tourIds = existingTours.map((t) => t.id);
    const allTourProperties = await db.select().from(tourProperties).where(sql2`${tourProperties.tourId} IN (${sql2.join(tourIds.map((id) => sql2`${id}`), sql2`, `)})`);
    const tourPropertiesMap = /* @__PURE__ */ new Map();
    for (const tp of allTourProperties) {
      if (!tourPropertiesMap.has(tp.tourId)) {
        tourPropertiesMap.set(tp.tourId, []);
      }
      tourPropertiesMap.get(tp.tourId).push(tp.propertyId);
    }
    const sortedPropertyIds = [...propertyIds].sort();
    for (const tour of existingTours) {
      const tourPropertyIds = (tourPropertiesMap.get(tour.id) || []).sort();
      if (JSON.stringify(tourPropertyIds) === JSON.stringify(sortedPropertyIds)) {
        return tour;
      }
    }
    return null;
  }
  async createTour(tour) {
    const [newTour] = await db.insert(tours).values(tour).returning();
    return newTour;
  }
  async updateTour(id, updates) {
    const [updatedTour] = await db.update(tours).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tours.id, id)).returning();
    return updatedTour;
  }
  async getClientHistory(clientId, agentId) {
    const [client] = await db.select().from(users).where(eq(users.id, clientId));
    if (!client) {
      return null;
    }
    if (agentId && client.agentId !== agentId) {
      return null;
    }
    const clientTours = await db.select().from(tours).where(eq(tours.clientId, clientId)).orderBy(sql2`${tours.scheduledDate} DESC`);
    const toursWithDetails = await Promise.all(
      clientTours.map(async (tour) => {
        const tourProps = await db.select().from(tourProperties).where(eq(tourProperties.tourId, tour.id)).orderBy(sql2`${tourProperties.order} ASC`);
        const propertyIds = tourProps.map((tp) => tp.propertyId);
        const props = propertyIds.length > 0 ? await db.select().from(properties).where(sql2`${properties.id} IN (${sql2.join(propertyIds.map((id) => sql2`${id}`), sql2`, `)})`) : [];
        const ratings = await db.select().from(propertyRatings).where(eq(propertyRatings.tourId, tour.id));
        const tourMedia = await db.select().from(propertyMedia).where(eq(propertyMedia.tourId, tour.id));
        const legacyPhotos = await db.select().from(propertyPhotos).where(eq(propertyPhotos.tourId, tour.id));
        const propertiesWithRatings = props.map((prop) => {
          const rating = ratings.find((r) => r.propertyId === prop.id);
          const propMedia = tourMedia.filter((m) => m.propertyId === prop.id);
          const propLegacyPhotos = legacyPhotos.filter((p) => p.propertyId === prop.id);
          const photos = [
            ...propMedia.filter((m) => m.mediaType === "photo"),
            ...propLegacyPhotos.map((p) => ({ ...p, mediaType: "photo" }))
          ];
          const videos = propMedia.filter((m) => m.mediaType === "video");
          const documents2 = propMedia.filter((m) => m.mediaType === "document");
          return {
            ...prop,
            rating: rating || null,
            media: {
              photos,
              videos,
              documents: documents2,
              totalCount: photos.length + videos.length + documents2.length
            }
          };
        });
        return {
          ...tour,
          properties: propertiesWithRatings,
          totalProperties: props.length,
          totalRatings: ratings.length
        };
      })
    );
    const clientOffers = await db.select().from(offers).where(eq(offers.clientId, clientId)).orderBy(sql2`${offers.submittedAt} DESC`);
    const offersWithProperties = await Promise.all(
      clientOffers.map(async (offer) => {
        const [property] = await db.select().from(properties).where(eq(properties.id, offer.propertyId));
        return {
          ...offer,
          property: property || null
        };
      })
    );
    return {
      client,
      tours: toursWithDetails,
      offers: offersWithProperties,
      summary: {
        totalTours: clientTours.length,
        completedTours: clientTours.filter((t) => t.status === "completed").length,
        totalPropertiesViewed: toursWithDetails.reduce((sum2, t) => sum2 + t.totalProperties, 0),
        totalRatings: toursWithDetails.reduce((sum2, t) => sum2 + t.totalRatings, 0),
        totalOffers: clientOffers.length,
        acceptedOffers: clientOffers.filter((o) => o.status === "accepted").length
      }
    };
  }
  async getToursForReport(filters) {
    const conditions = [];
    if (filters.agentId) {
      conditions.push(eq(tours.agentId, filters.agentId));
    }
    if (filters.startDate) {
      conditions.push(sql2`${tours.scheduledDate} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql2`${tours.scheduledDate} <= ${filters.endDate}`);
    }
    if (filters.statusFilter && filters.statusFilter !== "all") {
      conditions.push(eq(tours.status, filters.statusFilter));
    }
    const toursData = conditions.length > 0 ? await db.select().from(tours).where(and(...conditions)).orderBy(sql2`${tours.scheduledDate} DESC`) : await db.select().from(tours).orderBy(sql2`${tours.scheduledDate} DESC`);
    const toursWithDetails = await Promise.all(
      toursData.map(async (tour) => {
        const [client] = await db.select().from(users).where(eq(users.id, tour.clientId));
        if (filters.clientFilter) {
          const clientName = `${client?.firstName || ""} ${client?.lastName || ""}`.toLowerCase();
          if (!clientName.includes(filters.clientFilter.toLowerCase())) {
            return null;
          }
        }
        const tourProps = await db.select().from(tourProperties).where(eq(tourProperties.tourId, tour.id));
        const propertyIds = tourProps.map((tp) => tp.propertyId);
        const props = propertyIds.length > 0 ? await db.select().from(properties).where(sql2`${properties.id} IN (${sql2.join(propertyIds.map((id) => sql2`${id}`), sql2`, `)})`) : [];
        const ratings = await db.select().from(propertyRatings).where(eq(propertyRatings.tourId, tour.id));
        const avgRating = ratings.length > 0 ? ratings.reduce((sum2, r) => sum2 + (r.starRating || 0), 0) / ratings.length : null;
        return {
          ...tour,
          client,
          properties: props,
          totalRatings: ratings.length,
          averageRating: avgRating
        };
      })
    );
    return toursWithDetails.filter((t) => t !== null);
  }
  async getTourProperties(tourId) {
    return await db.select().from(tourProperties).where(eq(tourProperties.tourId, tourId)).orderBy(sql2`${tourProperties.order} ASC`);
  }
  async addPropertyToTour(tourId, propertyId, order) {
    const [tourProperty] = await db.insert(tourProperties).values({ tourId, propertyId, order }).returning();
    return tourProperty;
  }
  async createTourProperty(tourProperty) {
    const [newTourProperty] = await db.insert(tourProperties).values({
      tourId: tourProperty.tourId,
      propertyId: tourProperty.propertyId,
      order: tourProperty.order,
      scheduledTime: tourProperty.scheduledTime || null
    }).returning();
    return newTourProperty;
  }
  async updateTourPropertyStatus(tourId, propertyId, status, rejectionReason) {
    const [updatedTourProperty] = await db.update(tourProperties).set({
      status,
      rejectionReason,
      visitedAt: status === "viewed" ? /* @__PURE__ */ new Date() : void 0
    }).where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId))).returning();
    return updatedTourProperty;
  }
  async getTourProperty(tourId, propertyId) {
    const [tp] = await db.select().from(tourProperties).where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId))).limit(1);
    return tp || null;
  }
  async updateAgentPropertyReview(tourId, propertyId, agentRating, agentNotes) {
    const [updated] = await db.update(tourProperties).set({ agentRating, agentNotes }).where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId))).returning();
    return updated;
  }
  // Showing request operations
  async getShowingRequests(filters) {
    const conditions = [];
    if (filters.agentId) conditions.push(eq(showingRequests.agentId, filters.agentId));
    if (filters.clientId) conditions.push(eq(showingRequests.clientId, filters.clientId));
    if (filters.status) conditions.push(eq(showingRequests.status, filters.status));
    const clientUsers = db.select().from(users).as("clientUsers");
    const baseQuery = db.select({
      id: showingRequests.id,
      clientId: showingRequests.clientId,
      agentId: showingRequests.agentId,
      groupId: showingRequests.groupId,
      preferredDate: showingRequests.preferredDate,
      preferredTime: showingRequests.preferredTime,
      status: showingRequests.status,
      notes: showingRequests.notes,
      createdAt: showingRequests.createdAt,
      updatedAt: showingRequests.updatedAt,
      clientName: sql2`COALESCE(${clientUsers.firstName}, '') || ' ' || COALESCE(${clientUsers.lastName}, '')`,
      propertyAddress: sql2`(
          SELECT p.address FROM requested_properties rp
          JOIN properties p ON p.id = rp.property_id
          WHERE rp.request_id = ${showingRequests.id}
          LIMIT 1
        )`,
      propertyCount: sql2`(
          SELECT COUNT(*) FROM requested_properties rp
          WHERE rp.request_id = ${showingRequests.id}
        )`
    }).from(showingRequests).leftJoin(clientUsers, eq(showingRequests.clientId, clientUsers.id));
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(sql2`${showingRequests.createdAt} DESC`);
    }
    return await baseQuery.orderBy(sql2`${showingRequests.createdAt} DESC`);
  }
  async createShowingRequest(request) {
    const [newRequest] = await db.insert(showingRequests).values(request).returning();
    return newRequest;
  }
  async updateShowingRequestStatus(id, status) {
    const [updatedRequest] = await db.update(showingRequests).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(showingRequests.id, id)).returning();
    return updatedRequest;
  }
  async addPropertyToRequest(requestId, propertyId) {
    await db.insert(requestedProperties).values({ requestId, propertyId });
  }
  async getRequestedProperties(requestId) {
    const results = await db.select({ propertyId: requestedProperties.propertyId }).from(requestedProperties).where(eq(requestedProperties.requestId, requestId));
    return results.map((r) => r.propertyId);
  }
  async getShowingRequest(id) {
    const [request] = await db.select().from(showingRequests).where(eq(showingRequests.id, id)).limit(1);
    return request || null;
  }
  // Photo operations
  async getPropertyPhotos(propertyId) {
    return await db.select().from(propertyPhotos).where(eq(propertyPhotos.propertyId, propertyId)).orderBy(sql2`${propertyPhotos.createdAt} DESC`);
  }
  async getPhotosByAgent(agentId, clientId) {
    const agentProperties = await db.select().from(properties).where(eq(properties.agentId, agentId));
    const propertyIds = agentProperties.map((p) => p.id);
    if (propertyIds.length === 0) {
      return [];
    }
    const conditions = [inArray(propertyPhotos.propertyId, propertyIds)];
    if (clientId === null) {
      conditions.push(sql2`${propertyPhotos.clientId} IS NULL`);
    } else if (clientId !== void 0) {
      conditions.push(eq(propertyPhotos.clientId, clientId));
    }
    const photos = await db.select({
      id: propertyPhotos.id,
      propertyId: propertyPhotos.propertyId,
      tourId: propertyPhotos.tourId,
      clientId: propertyPhotos.clientId,
      uploadedBy: propertyPhotos.uploadedBy,
      filename: propertyPhotos.filename,
      originalName: propertyPhotos.originalName,
      url: propertyPhotos.url,
      mimeType: propertyPhotos.mimeType,
      size: propertyPhotos.size,
      caption: propertyPhotos.caption,
      createdAt: propertyPhotos.createdAt,
      clientName: sql2`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
      clientEmail: users.email
    }).from(propertyPhotos).leftJoin(users, eq(propertyPhotos.clientId, users.id)).where(and(...conditions)).orderBy(sql2`${propertyPhotos.createdAt} DESC`);
    return photos;
  }
  async uploadPropertyPhoto(photo) {
    const [newPhoto] = await db.insert(propertyPhotos).values(photo).returning();
    return newPhoto;
  }
  // Property Media operations
  async getPropertyMedia(propertyId, tourId) {
    return await db.select().from(propertyMedia).where(
      and(
        eq(propertyMedia.propertyId, propertyId),
        eq(propertyMedia.tourId, tourId)
      )
    ).orderBy(sql2`${propertyMedia.createdAt} DESC`);
  }
  async uploadPropertyMedia(media) {
    const [newMedia] = await db.insert(propertyMedia).values(media).returning();
    return newMedia;
  }
  async deletePropertyMedia(mediaId) {
    await db.delete(propertyMedia).where(eq(propertyMedia.id, mediaId));
  }
  // Property Rating operations
  async getPropertyRating(propertyId, clientId, tourId) {
    const [rating] = await db.select().from(propertyRatings).where(
      and(
        eq(propertyRatings.propertyId, propertyId),
        eq(propertyRatings.clientId, clientId),
        eq(propertyRatings.tourId, tourId)
      )
    );
    return rating || null;
  }
  async createPropertyRating(rating) {
    const [newRating] = await db.insert(propertyRatings).values(rating).returning();
    return newRating;
  }
  async updatePropertyRating(id, updates) {
    const [updatedRating] = await db.update(propertyRatings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(propertyRatings.id, id)).returning();
    return updatedRating;
  }
  async getPropertyRatingsByClient(clientId) {
    return await db.select().from(propertyRatings).where(eq(propertyRatings.clientId, clientId)).orderBy(sql2`${propertyRatings.createdAt} DESC`);
  }
  async getPropertyRatingsByTour(tourId) {
    return await db.select().from(propertyRatings).where(eq(propertyRatings.tourId, tourId)).orderBy(sql2`${propertyRatings.createdAt} DESC`);
  }
  async getPropertyReviews(propertyId) {
    const clientReviews = await db.select({
      id: propertyRatings.id,
      reviewType: sql2`'client'`,
      rating: propertyRatings.rating,
      feedbackCategory: propertyRatings.feedbackCategory,
      reason: propertyRatings.reason,
      notes: propertyRatings.notes,
      tourId: propertyRatings.tourId,
      createdAt: propertyRatings.createdAt,
      reviewerName: sql2`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`
    }).from(propertyRatings).leftJoin(users, eq(propertyRatings.clientId, users.id)).where(eq(propertyRatings.propertyId, propertyId)).orderBy(sql2`${propertyRatings.createdAt} DESC`);
    const agentReviews = await db.select({
      id: tourProperties.id,
      reviewType: sql2`'agent'`,
      rating: tourProperties.agentRating,
      notes: tourProperties.agentNotes,
      tourId: tourProperties.tourId,
      createdAt: tours.createdAt,
      reviewerName: sql2`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`
    }).from(tourProperties).leftJoin(tours, eq(tourProperties.tourId, tours.id)).leftJoin(users, eq(tours.agentId, users.id)).where(
      and(
        eq(tourProperties.propertyId, propertyId),
        sql2`${tourProperties.agentRating} IS NOT NULL`
      )
    ).orderBy(sql2`${tours.createdAt} DESC`);
    const combined = [...clientReviews, ...agentReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const uniqueTourIds = [...new Set(combined.map((r) => r.tourId).filter(Boolean))];
    const mediaByTour = {};
    for (const tId of uniqueTourIds) {
      const media = await db.select().from(propertyMedia).where(
        and(
          eq(propertyMedia.propertyId, propertyId),
          eq(propertyMedia.tourId, tId)
        )
      ).orderBy(sql2`${propertyMedia.createdAt} ASC`);
      mediaByTour[tId] = media;
    }
    return combined.map((r) => ({
      ...r,
      photos: mediaByTour[r.tourId] ?? []
    }));
  }
  // Offer operations
  async getOffers(filters) {
    const conditions = [];
    if (filters.propertyId) conditions.push(eq(offers.propertyId, filters.propertyId));
    if (filters.clientId) conditions.push(eq(offers.clientId, filters.clientId));
    if (filters.agentId) conditions.push(eq(offers.agentId, filters.agentId));
    if (conditions.length > 0) {
      return await db.select().from(offers).where(and(...conditions)).orderBy(sql2`${offers.submittedAt} DESC`);
    }
    return await db.select().from(offers).orderBy(sql2`${offers.submittedAt} DESC`);
  }
  async createOffer(offer) {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }
  async updateOfferStatus(id, status, respondedAt) {
    const [updatedOffer] = await db.update(offers).set({ status, respondedAt: respondedAt || /* @__PURE__ */ new Date() }).where(eq(offers.id, id)).returning();
    return updatedOffer;
  }
  // Group operations
  async getClientGroups(userId) {
    return await db.select().from(clientGroups).innerJoin(groupMembers, eq(clientGroups.id, groupMembers.groupId)).where(eq(groupMembers.userId, userId)).then((results) => results.map((r) => r.client_groups));
  }
  async createClientGroup(group) {
    const [newGroup] = await db.insert(clientGroups).values(group).returning();
    await this.addGroupMember(newGroup.id, group.createdById);
    return newGroup;
  }
  async addGroupMember(groupId, userId) {
    await db.insert(groupMembers).values({ groupId, userId });
  }
  async getGroupMessages(groupId) {
    const messages = await db.select({
      id: groupMessages.id,
      groupId: groupMessages.groupId,
      userId: groupMessages.userId,
      message: groupMessages.message,
      createdAt: groupMessages.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    }).from(groupMessages).innerJoin(users, eq(groupMessages.userId, users.id)).where(eq(groupMessages.groupId, groupId)).orderBy(asc(groupMessages.createdAt));
    return messages;
  }
  async createGroupMessage(message) {
    const [newMessage] = await db.insert(groupMessages).values(message).returning();
    return newMessage;
  }
  async getGroupMembers(groupId) {
    const members = await db.select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      joinedAt: groupMembers.joinedAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    }).from(groupMembers).innerJoin(users, eq(groupMembers.userId, users.id)).where(eq(groupMembers.groupId, groupId)).orderBy(asc(groupMembers.joinedAt));
    return members;
  }
  async getAgentClientGroups(agentId) {
    const results = await db.selectDistinct({
      id: clientGroups.id,
      name: clientGroups.name,
      createdById: clientGroups.createdById,
      createdAt: clientGroups.createdAt
    }).from(clientGroups).innerJoin(groupMembers, eq(clientGroups.id, groupMembers.groupId)).innerJoin(users, eq(groupMembers.userId, users.id)).where(eq(users.agentId, agentId));
    return results;
  }
  // Statistics
  async getAgentStats(agentId) {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = /* @__PURE__ */ new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [todayToursResult] = await db.select({ count: count() }).from(tours).where(
      and(
        eq(tours.agentId, agentId),
        sql2`${tours.scheduledDate} >= ${today}`,
        sql2`${tours.scheduledDate} < ${tomorrow}`
      )
    );
    const [activeClientsResult] = await db.select({ count: count() }).from(users).where(and(eq(users.agentId, agentId), eq(users.role, "client")));
    const [pendingRequestsResult] = await db.select({ count: count() }).from(showingRequests).where(and(eq(showingRequests.agentId, agentId), eq(showingRequests.status, "pending")));
    const [weeklyDistanceResult] = await db.select({ total: sum(tours.totalDistance) }).from(tours).where(
      and(
        eq(tours.agentId, agentId),
        sql2`${tours.scheduledDate} >= ${weekAgo}`
      )
    );
    const [timeInvestedResult] = await db.select({ total: sum(tours.actualDuration) }).from(tours).where(eq(tours.agentId, agentId));
    const offersBreakdown = await db.select({
      status: offers.status,
      count: count()
    }).from(offers).where(eq(offers.agentId, agentId)).groupBy(offers.status);
    const offersPipeline = offersBreakdown.reduce((acc, row) => {
      if (row.status === "pending") acc.pending = row.count;
      if (row.status === "accepted") acc.accepted = row.count;
      if (row.status === "rejected") acc.rejected = row.count;
      acc.total += row.count;
      return acc;
    }, { pending: 0, accepted: 0, rejected: 0, total: 0 });
    const [avgScopeFitResult] = await db.select({ avgScore: sql2`AVG(CAST(${clientRequirements.validationScore} AS DECIMAL))` }).from(clientRequirements).where(eq(clientRequirements.agentId, agentId));
    const [exceptionsResult] = await db.select({ count: count() }).from(requirementsExceptions).innerJoin(clientRequirements, eq(requirementsExceptions.requirementId, clientRequirements.id)).where(eq(clientRequirements.agentId, agentId));
    const [recentChangesResult] = await db.select({ count: count() }).from(requirementsVersions).innerJoin(clientRequirements, eq(requirementsVersions.requirementId, clientRequirements.id)).where(
      and(
        eq(clientRequirements.agentId, agentId),
        sql2`${requirementsVersions.createdAt} >= ${weekAgo}`
      )
    );
    const totalMinutes = Number(timeInvestedResult.total || 0);
    const timeInvestedHours = Number((totalMinutes / 60).toFixed(1));
    return {
      todayTours: todayToursResult.count,
      activeClients: activeClientsResult.count,
      pendingRequests: pendingRequestsResult.count,
      weeklyDistance: Number(weeklyDistanceResult.total || 0),
      timeInvestedHours,
      offersPipeline,
      avgScopeFitScore: Number(avgScopeFitResult.avgScore || 0),
      exceptionsCount: exceptionsResult.count,
      recentChanges: recentChangesResult.count
    };
  }
  async getClientStats(clientId) {
    const [seenResult] = await db.select({ count: count() }).from(tourProperties).innerJoin(tours, eq(tourProperties.tourId, tours.id)).where(
      and(
        eq(tours.clientId, clientId),
        eq(tourProperties.status, "viewed")
      )
    );
    const [rejectedResult] = await db.select({ count: count() }).from(tourProperties).innerJoin(tours, eq(tourProperties.tourId, tours.id)).where(
      and(
        eq(tours.clientId, clientId),
        eq(tourProperties.status, "rejected")
      )
    );
    const [offersResult] = await db.select({ count: count() }).from(offers).where(eq(offers.clientId, clientId));
    const [distanceResult] = await db.select({ total: sum(tours.totalDistance) }).from(tours).where(eq(tours.clientId, clientId));
    const [timeResult] = await db.select({ total: sum(tours.actualDuration) }).from(tours).where(eq(tours.clientId, clientId));
    return {
      propertiesSeen: seenResult.count,
      propertiesRejected: rejectedResult.count,
      offersMade: offersResult.count,
      kmTraveled: Number(distanceResult.total || 0),
      timeInvested: Math.round(Number(timeResult.total || 0) / 60)
      // Convert to hours
    };
  }
  // Tour planning methods
  async getToursByDate(agentId, date) {
    return [
      {
        id: "tour-1",
        propertyAddress: "123 Main St, San Francisco, CA",
        clientName: "John Smith",
        scheduledDate: date,
        startTime: "10:00 AM",
        estimatedDuration: 30,
        status: "scheduled",
        property: {
          address: "123 Main St, San Francisco, CA",
          latitude: 37.7749,
          longitude: -122.4194
        },
        client: {
          firstName: "John",
          lastName: "Smith"
        }
      },
      {
        id: "tour-2",
        propertyAddress: "456 Oak Ave, San Francisco, CA",
        clientName: "Jane Doe",
        scheduledDate: date,
        startTime: "2:00 PM",
        estimatedDuration: 45,
        status: "scheduled",
        property: {
          address: "456 Oak Ave, San Francisco, CA",
          latitude: 37.7849,
          longitude: -122.4294
        },
        client: {
          firstName: "Jane",
          lastName: "Doe"
        }
      }
    ];
  }
  async saveTourRecap(recap) {
    return { id: "mock-recap-id", ...recap };
  }
  async getTourRecap(agentId, date) {
    return null;
  }
  async getSchedulesByDate(date) {
    return [
      {
        id: "schedule-1",
        tourId: "tour-1",
        property: {
          id: "prop-1",
          address: "123 Main St, San Francisco, CA",
          listingPrice: 85e4
        },
        client: {
          id: "client-1",
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com"
        },
        scheduledDate: date,
        startTime: "10:00 AM",
        estimatedDuration: 30,
        status: "scheduled",
        notes: "First showing for this client"
      },
      {
        id: "schedule-2",
        tourId: "tour-2",
        property: {
          id: "prop-2",
          address: "456 Oak Ave, San Francisco, CA",
          listingPrice: 75e4
        },
        client: {
          id: "client-2",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com"
        },
        scheduledDate: date,
        startTime: "2:00 PM",
        estimatedDuration: 45,
        status: "confirmed",
        notes: "Follow-up showing"
      }
    ];
  }
  async updateSchedule(scheduleId, updates) {
    return { id: scheduleId, ...updates };
  }
  async deleteSchedule(scheduleId) {
  }
  async getTourSummary(agentId, date) {
    return [
      {
        id: "tour-1",
        propertyAddress: "123 Main St, San Francisco, CA",
        clientName: "John Smith",
        status: "completed",
        duration: 45,
        clientFeedback: "Great property with excellent location",
        interestLevel: 4
      },
      {
        id: "tour-2",
        propertyAddress: "456 Oak Ave, San Francisco, CA",
        clientName: "Jane Doe",
        status: "completed",
        duration: 30,
        clientFeedback: "Nice but a bit small for our needs",
        interestLevel: 3
      }
    ];
  }
  async updateTourRecap(recapId, updates) {
    return { id: recapId, ...updates, updatedAt: /* @__PURE__ */ new Date() };
  }
  // Reminder operations
  async getTourReminders(userId, tourId) {
    const conditions = [eq(tourReminders.userId, userId)];
    if (tourId) {
      conditions.push(eq(tourReminders.tourId, tourId));
    }
    return db.select().from(tourReminders).where(and(...conditions)).orderBy(sql2`${tourReminders.createdAt} DESC`);
  }
  async createTourReminder(reminder) {
    const [created] = await db.insert(tourReminders).values(reminder).returning();
    return created;
  }
  async updateTourReminder(id, updates) {
    const [updated] = await db.update(tourReminders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tourReminders.id, id)).returning();
    return updated;
  }
  async deleteTourReminder(id) {
    await db.delete(tourReminders).where(eq(tourReminders.id, id));
  }
  // Property suggestion operations
  async getPropertySuggestions(filters) {
    const conditions = [];
    if (filters.clientId) conditions.push(eq(propertySuggestions.clientId, filters.clientId));
    if (filters.agentId) conditions.push(eq(propertySuggestions.agentId, filters.agentId));
    if (filters.status) conditions.push(eq(propertySuggestions.status, filters.status));
    return db.select().from(propertySuggestions).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(sql2`${propertySuggestions.createdAt} DESC`);
  }
  async createPropertySuggestion(suggestion) {
    const [created] = await db.insert(propertySuggestions).values(suggestion).returning();
    return created;
  }
  async updatePropertySuggestion(id, updates) {
    const [updated] = await db.update(propertySuggestions).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(propertySuggestions.id, id)).returning();
    return updated;
  }
  async deletePropertySuggestion(id) {
    await db.delete(propertySuggestions).where(eq(propertySuggestions.id, id));
  }
  // Document operations
  async getDocuments(userId, documentType) {
    const conditions = [eq(documents.userId, userId)];
    if (documentType) {
      conditions.push(eq(documents.documentType, documentType));
    }
    return db.select().from(documents).where(and(...conditions)).orderBy(sql2`${documents.createdAt} DESC`);
  }
  async getDocumentsByAgent(agentId, clientId, documentType) {
    const conditions = [eq(documents.userId, agentId)];
    if (clientId === null) {
      conditions.push(sql2`${documents.clientId} IS NULL`);
    } else if (clientId !== void 0) {
      conditions.push(eq(documents.clientId, clientId));
    }
    if (documentType) {
      conditions.push(eq(documents.documentType, documentType));
    }
    const docs = await db.select({
      id: documents.id,
      userId: documents.userId,
      clientId: documents.clientId,
      documentType: documents.documentType,
      title: documents.title,
      filename: documents.filename,
      originalName: documents.originalName,
      url: documents.url,
      mimeType: documents.mimeType,
      size: documents.size,
      description: documents.description,
      relatedId: documents.relatedId,
      tags: documents.tags,
      expirationDate: documents.expirationDate,
      isArchived: documents.isArchived,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      clientName: sql2`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
      clientEmail: users.email
    }).from(documents).leftJoin(users, eq(documents.clientId, users.id)).where(and(...conditions)).orderBy(sql2`${documents.createdAt} DESC`);
    return docs;
  }
  async getDocument(id) {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }
  async createDocument(document) {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }
  async updateDocument(id, updates) {
    const [updated] = await db.update(documents).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(documents.id, id)).returning();
    return updated;
  }
  async deleteDocument(id) {
    await db.delete(documents).where(eq(documents.id, id));
  }
  // Location sharing operations
  async getLocationShares(filters) {
    const conditions = [];
    if (filters.userId) conditions.push(eq(locationShares.userId, filters.userId));
    if (filters.tourId) conditions.push(eq(locationShares.tourId, filters.tourId));
    if (filters.isActive !== void 0) conditions.push(eq(locationShares.isActive, filters.isActive));
    return db.select().from(locationShares).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(sql2`${locationShares.createdAt} DESC`);
  }
  async createLocationShare(share) {
    const [created] = await db.insert(locationShares).values(share).returning();
    return created;
  }
  async updateLocationShare(id, updates) {
    const [updated] = await db.update(locationShares).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(locationShares.id, id)).returning();
    return updated;
  }
  async deleteLocationShare(id) {
    await db.delete(locationShares).where(eq(locationShares.id, id));
  }
  // Location history and analytics operations
  async getLocationHistory(filters) {
    const conditions = [];
    if (filters.userId) conditions.push(eq(locationHistory.userId, filters.userId));
    if (filters.tourId) conditions.push(eq(locationHistory.tourId, filters.tourId));
    if (filters.propertyId) conditions.push(eq(locationHistory.propertyId, filters.propertyId));
    if (filters.activityType) conditions.push(eq(locationHistory.activityType, filters.activityType));
    if (filters.startDate) {
      conditions.push(sql2`${locationHistory.recordedAt} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql2`${locationHistory.recordedAt} <= ${filters.endDate}`);
    }
    return db.select().from(locationHistory).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(sql2`${locationHistory.recordedAt} DESC`);
  }
  async createLocationHistory(history) {
    const [created] = await db.insert(locationHistory).values(history).returning();
    return created;
  }
  async getLocationAnalytics(userId, dateRange) {
    const conditions = [eq(locationHistory.userId, userId)];
    if (dateRange?.start) {
      conditions.push(sql2`${locationHistory.recordedAt} >= ${dateRange.start}`);
    }
    if (dateRange?.end) {
      conditions.push(sql2`${locationHistory.recordedAt} <= ${dateRange.end}`);
    }
    const locationData = await db.select().from(locationHistory).where(and(...conditions)).orderBy(asc(locationHistory.recordedAt));
    let totalDistance = 0;
    let totalTime = 0;
    const visitedProperties = /* @__PURE__ */ new Set();
    let totalSpeed = 0;
    let speedCount = 0;
    const activityCounts = /* @__PURE__ */ new Map();
    const heatmapData = [];
    for (let i = 0; i < locationData.length; i++) {
      const point = locationData[i];
      const activity = point.activityType || "unknown";
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
      if (point.propertyId) visitedProperties.add(point.propertyId);
      if (point.speed && Number(point.speed) > 0) {
        totalSpeed += Number(point.speed);
        speedCount++;
      }
      heatmapData.push({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        weight: 1
      });
      if (i > 0) {
        const prevPoint = locationData[i - 1];
        const currentTime = point.recordedAt ? new Date(point.recordedAt).getTime() : 0;
        const prevTime = prevPoint.recordedAt ? new Date(prevPoint.recordedAt).getTime() : 0;
        const timeDiff = currentTime - prevTime;
        totalTime += timeDiff;
        const latDiff = Number(point.latitude) - Number(prevPoint.latitude);
        const lngDiff = Number(point.longitude) - Number(prevPoint.longitude);
        totalDistance += Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111e3;
      }
    }
    const totalActivities = Array.from(activityCounts.values()).reduce((sum2, count2) => sum2 + count2, 0);
    const activityBreakdown = Array.from(activityCounts.entries()).map(([activityType, count2]) => ({
      activityType,
      count: count2,
      percentage: totalActivities > 0 ? count2 / totalActivities * 100 : 0
    }));
    return {
      totalDistance: Math.round(totalDistance),
      // in meters
      totalTime: Math.round(totalTime / 1e3),
      // in seconds
      visitedProperties: visitedProperties.size,
      avgSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
      activityBreakdown,
      heatmapData
    };
  }
  // Calendar operations
  async getCalendarIntegrations(userId) {
    return db.select().from(calendarIntegrations).where(eq(calendarIntegrations.userId, userId)).orderBy(sql2`${calendarIntegrations.createdAt} DESC`);
  }
  async createCalendarIntegration(integration) {
    const [created] = await db.insert(calendarIntegrations).values(integration).returning();
    return created;
  }
  async updateCalendarIntegration(id, updates) {
    const [updated] = await db.update(calendarIntegrations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(calendarIntegrations.id, id)).returning();
    return updated;
  }
  async deleteCalendarIntegration(id) {
    await db.delete(calendarIntegrations).where(eq(calendarIntegrations.id, id));
  }
  async getCalendarEvents(filters) {
    const conditions = [];
    if (filters.userId) conditions.push(eq(calendarEvents.userId, filters.userId));
    if (filters.integrationId) conditions.push(eq(calendarEvents.integrationId, filters.integrationId));
    return db.select().from(calendarEvents).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(asc(calendarEvents.startTime));
  }
  async createCalendarEvent(event) {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }
  async updateCalendarEvent(id, updates) {
    const [updated] = await db.update(calendarEvents).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(calendarEvents.id, id)).returning();
    return updated;
  }
  async deleteCalendarEvent(id) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }
  // Rental profile operations
  async getRentalProfile(userId) {
    const [profile] = await db.select().from(rentalProfiles).where(eq(rentalProfiles.userId, userId));
    return profile;
  }
  async createRentalProfile(profile) {
    try {
      const [created] = await db.insert(rentalProfiles).values(profile).returning();
      return created;
    } catch (error) {
      if (error.code === "23505" && error.detail?.includes("user_id")) {
        return this.updateRentalProfile(profile.userId, profile);
      }
      throw error;
    }
  }
  async updateRentalProfile(userId, updates) {
    const [updated] = await db.update(rentalProfiles).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(rentalProfiles.userId, userId)).returning();
    return updated;
  }
  async deleteRentalProfile(userId) {
    await db.delete(rentalProfiles).where(eq(rentalProfiles.userId, userId));
  }
  // ==================== REQUIREMENTS SYSTEM ====================
  // Core Requirements Management
  async getClientRequirement(clientId) {
    const [requirement] = await db.select().from(clientRequirements).where(and(
      eq(clientRequirements.userId, clientId),
      eq(clientRequirements.isActive, true)
    )).orderBy(sql2`${clientRequirements.version} DESC`).limit(1);
    return requirement || null;
  }
  async createClientRequirement(requirement) {
    const existing = await this.getClientRequirement(requirement.userId);
    if (existing) {
      const newVersion = existing.version + 1;
      const [newRequirement] = await db.insert(clientRequirements).values({
        ...requirement,
        version: newVersion,
        status: "incomplete",
        validationScore: "0"
      }).returning();
      await db.update(clientRequirements).set({ isActive: false }).where(eq(clientRequirements.id, existing.id));
      await this.createRequirementVersion({
        requirementId: newRequirement.id,
        version: newVersion,
        changeType: "updated",
        changes: { created: "new_version" },
        changedBy: requirement.agentId || requirement.userId,
        changeReason: requirement.agentId ? "Requirements updated by agent" : "Requirements updated by client"
      });
      return newRequirement;
    } else {
      const [newRequirement] = await db.insert(clientRequirements).values({
        ...requirement,
        version: 1,
        status: "incomplete",
        validationScore: "0"
      }).returning();
      await this.createRequirementVersion({
        requirementId: newRequirement.id,
        version: 1,
        changeType: "created",
        changes: { created: "initial" },
        changedBy: requirement.agentId || requirement.userId,
        changeReason: requirement.agentId ? "Initial requirements created by agent" : "Initial requirements created by client"
      });
      return newRequirement;
    }
  }
  async updateClientRequirement(id, updates) {
    const [updated] = await db.update(clientRequirements).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clientRequirements.id, id)).returning();
    await this.createRequirementVersion({
      requirementId: id,
      version: updated.version,
      changeType: "updated",
      changes: updates,
      changedBy: updates.agentId || updated.agentId,
      changeReason: "Requirements updated"
    });
    return updated;
  }
  // Requirements Validation
  async validateRequirements(requirementId, agentId) {
    const [requirement] = await db.select().from(clientRequirements).where(eq(clientRequirements.id, requirementId));
    if (!requirement) {
      throw new Error("Requirement not found");
    }
    const issues = [];
    let scoreComponents = 0;
    let maxComponents = 0;
    maxComponents += 5;
    if (requirement.budgetMin && requirement.budgetMax) {
      scoreComponents++;
    } else {
      issues.push("Budget range is required");
    }
    if (requirement.preferredAreas && requirement.preferredAreas.length > 0) {
      scoreComponents++;
    } else {
      issues.push("At least one preferred area is required");
    }
    if (requirement.propertyTypes && requirement.propertyTypes.length > 0) {
      scoreComponents++;
    } else {
      issues.push("Property type preferences are required");
    }
    if (requirement.bedrooms && requirement.bedrooms > 0) {
      scoreComponents++;
    } else {
      issues.push("Bedroom preference is required");
    }
    if (requirement.timeframe) {
      scoreComponents++;
    } else {
      issues.push("Timeframe is required");
    }
    if (requirement.clientType === "buyer") {
      maxComponents += 2;
      if (requirement.preApprovalAmount) {
        scoreComponents++;
      } else {
        issues.push("Pre-approval amount is required for buyers");
      }
      if (requirement.desiredClosingDate) {
        scoreComponents++;
      } else {
        issues.push("Desired closing date is required for buyers");
      }
    } else if (requirement.clientType === "renter") {
      maxComponents += 2;
      if (requirement.monthlyIncomeVerified) {
        scoreComponents++;
      } else {
        issues.push("Income verification is required for renters");
      }
      if (requirement.preferredMoveInDate) {
        scoreComponents++;
      } else {
        issues.push("Preferred move-in date is required for renters");
      }
    }
    const score = scoreComponents / maxComponents;
    await db.update(clientRequirements).set({
      validationScore: score.toFixed(2),
      lastValidatedAt: /* @__PURE__ */ new Date(),
      validatedBy: agentId,
      status: score >= 0.8 ? "validated" : score >= 0.5 ? "pending_validation" : "incomplete"
    }).where(eq(clientRequirements.id, requirementId));
    return { score, issues };
  }
  // Requirements Versioning
  async getRequirementVersions(requirementId) {
    return await db.select().from(requirementsVersions).where(eq(requirementsVersions.requirementId, requirementId)).orderBy(sql2`${requirementsVersions.version} DESC`);
  }
  async createRequirementVersion(version) {
    const [created] = await db.insert(requirementsVersions).values(version).returning();
    return created;
  }
  // Requirements Exceptions
  async getRequirementExceptions(requirementId) {
    return await db.select().from(requirementsExceptions).where(eq(requirementsExceptions.requirementId, requirementId)).orderBy(sql2`${requirementsExceptions.createdAt} DESC`);
  }
  async createRequirementException(exception) {
    const [created] = await db.insert(requirementsExceptions).values(exception).returning();
    return created;
  }
  // Property Matching and Scoring
  async calculatePropertyMatches(requirementId) {
    const [requirement] = await db.select().from(clientRequirements).where(eq(clientRequirements.id, requirementId));
    if (!requirement) {
      return [];
    }
    const allProperties = await db.select().from(properties).where(eq(properties.isActive, true));
    const matches = [];
    for (const property of allProperties) {
      const match = await this.calculateSinglePropertyMatch(requirement, property);
      matches.push(match);
    }
    await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, requirementId));
    if (matches.length > 0) {
      await db.insert(propertyMatches).values(matches);
    }
    return matches.sort((a, b) => Number(b.overallScore) - Number(a.overallScore));
  }
  async calculateSinglePropertyMatch(requirement, property) {
    let budgetScore = 0;
    let locationScore = 0;
    let sizeScore = 0;
    let typeScore = 0;
    let amenityScore = 0;
    let timelineScore = 0;
    const dealBreakers = [];
    const highlights = [];
    const propertyPrice = Number(property.price);
    const minBudget = Number(requirement.budgetMin || 0);
    const maxBudget = Number(requirement.budgetMax || Infinity);
    if (propertyPrice >= minBudget && propertyPrice <= maxBudget) {
      budgetScore = 1;
      highlights.push("Within budget range");
    } else if (propertyPrice > maxBudget) {
      budgetScore = Math.max(0, 1 - (propertyPrice - maxBudget) / maxBudget);
      if (budgetScore < 0.5) dealBreakers.push("Over budget");
    } else {
      budgetScore = 0.8;
      highlights.push("Under budget");
    }
    const propertyArea = property.area?.toLowerCase() || "";
    const preferredAreas = requirement.preferredAreas || [];
    locationScore = preferredAreas.some(
      (area) => propertyArea.includes(area.toLowerCase()) || area.toLowerCase().includes(propertyArea)
    ) ? 1 : 0.3;
    if (locationScore === 1) {
      highlights.push("In preferred area");
    } else if (locationScore < 0.5) {
      dealBreakers.push("Not in preferred area");
    }
    const propertyBedrooms = property.bedrooms;
    const requiredBedrooms = requirement.bedrooms || 0;
    if (propertyBedrooms === requiredBedrooms) {
      sizeScore = 1;
      highlights.push("Exact bedroom match");
    } else if (Math.abs(propertyBedrooms - requiredBedrooms) === 1) {
      sizeScore = 0.7;
    } else {
      sizeScore = 0.3;
      dealBreakers.push(`${propertyBedrooms} bedrooms vs ${requiredBedrooms} required`);
    }
    const propertyBathrooms = Number(property.bathrooms);
    const requiredBathrooms = Number(requirement.bathrooms || 1);
    const bathroomScore = propertyBathrooms >= requiredBathrooms ? 1 : 0.5;
    sizeScore = (sizeScore + bathroomScore) / 2;
    typeScore = 0.8;
    if (requirement.parkingRequired && requirement.parkingSpots > 0) {
      amenityScore = 0.5;
    } else {
      amenityScore = 1;
    }
    timelineScore = 1;
    const weights = {
      budget: 0.3,
      location: 0.25,
      size: 0.2,
      type: 0.1,
      amenity: 0.1,
      timeline: 0.05
    };
    const overallScore = budgetScore * weights.budget + locationScore * weights.location + sizeScore * weights.size + typeScore * weights.type + amenityScore * weights.amenity + timelineScore * weights.timeline;
    let matchReason = "";
    if (overallScore >= 0.8) {
      matchReason = "Excellent match - meets most key criteria";
    } else if (overallScore >= 0.6) {
      matchReason = "Good match - meets important criteria with minor gaps";
    } else if (overallScore >= 0.4) {
      matchReason = "Partial match - some criteria met";
    } else {
      matchReason = "Poor match - significant gaps in requirements";
    }
    return {
      requirementId: requirement.id,
      propertyId: property.id,
      overallScore: overallScore.toFixed(2),
      budgetScore: budgetScore.toFixed(2),
      locationScore: locationScore.toFixed(2),
      sizeScore: sizeScore.toFixed(2),
      typeScore: typeScore.toFixed(2),
      amenityScore: amenityScore.toFixed(2),
      timelineScore: timelineScore.toFixed(2),
      matchReason,
      dealBreakers: dealBreakers.length > 0 ? dealBreakers : null,
      highlights: highlights.length > 0 ? highlights : null,
      calculatedAt: /* @__PURE__ */ new Date(),
      agentReview: "pending",
      agentNotes: null
    };
  }
  async getPropertyMatchesForClient(clientId) {
    const requirement = await this.getClientRequirement(clientId);
    if (!requirement) {
      return [];
    }
    return await db.select().from(propertyMatches).where(eq(propertyMatches.requirementId, requirement.id)).orderBy(sql2`${propertyMatches.overallScore} DESC`);
  }
  // OREA Form 410 Rental Application methods
  async createRentalApplication(applicationData) {
    return await db.transaction(async (tx) => {
      const {
        currentEmployment,
        previousEmployment,
        financialInfo,
        currentRental,
        previousRental,
        reference1,
        reference2,
        ...mainData
      } = applicationData;
      const [application] = await tx.insert(rentalApplications).values({
        ...mainData,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      const applicationId = application.id;
      if (currentEmployment && currentEmployment.employerName) {
        await tx.insert(employmentHistory).values({
          applicationId,
          employerName: currentEmployment.employerName,
          position: currentEmployment.position,
          businessAddress: currentEmployment.businessAddress,
          businessPhone: currentEmployment.businessPhone,
          startDate: currentEmployment.startDate,
          endDate: currentEmployment.endDate,
          supervisorName: currentEmployment.supervisorName,
          monthlySalary: parseFloat(currentEmployment.monthlySalary || "0"),
          salaryType: currentEmployment.salaryType,
          isCurrent: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (previousEmployment && previousEmployment.employerName) {
        await tx.insert(employmentHistory).values({
          applicationId,
          employerName: previousEmployment.employerName,
          position: previousEmployment.position,
          businessAddress: previousEmployment.businessAddress,
          businessPhone: previousEmployment.businessPhone,
          startDate: previousEmployment.startDate,
          endDate: previousEmployment.endDate,
          supervisorName: previousEmployment.supervisorName,
          monthlySalary: parseFloat(previousEmployment.monthlySalary || "0"),
          salaryType: previousEmployment.salaryType,
          isCurrent: false,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (financialInfo && financialInfo.bankName) {
        await tx.insert(financialInformation).values({
          applicationId,
          bankName: financialInfo.bankName,
          branchAddress: financialInfo.branchAddress,
          accountType: financialInfo.accountType,
          accountNumber: financialInfo.accountNumber,
          monthlyIncome: parseFloat(financialInfo.monthlyIncome || "0"),
          otherIncome: parseFloat(financialInfo.otherIncome || "0"),
          otherIncomeSource: financialInfo.otherIncomeSource,
          monthlyDebts: parseFloat(financialInfo.monthlyDebts || "0"),
          debtDetails: financialInfo.debtDetails,
          bankruptcyHistory: financialInfo.bankruptcyHistory || false,
          bankruptcyDetails: financialInfo.bankruptcyDetails,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (currentRental && currentRental.address) {
        await tx.insert(rentalHistory).values({
          applicationId,
          address: currentRental.address,
          landlordName: currentRental.landlordName || "",
          landlordPhone: currentRental.landlordPhone || "",
          landlordEmail: currentRental.landlordEmail,
          monthlyRent: parseFloat(currentRental.monthlyRent || "0"),
          startDate: currentRental.startDate,
          endDate: null,
          // Current rental, no end date
          reasonForLeaving: currentRental.reasonForLeaving,
          wasEvicted: currentRental.wasEvicted || false,
          latePayments: currentRental.latePayments || false,
          isCurrent: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (previousRental && previousRental.address) {
        await tx.insert(rentalHistory).values({
          applicationId,
          address: previousRental.address,
          landlordName: previousRental.landlordName || "",
          landlordPhone: previousRental.landlordPhone || "",
          landlordEmail: previousRental.landlordEmail,
          monthlyRent: parseFloat(previousRental.monthlyRent || "0"),
          startDate: previousRental.startDate,
          endDate: previousRental.endDate,
          reasonForLeaving: previousRental.reasonForLeaving,
          wasEvicted: previousRental.wasEvicted || false,
          latePayments: previousRental.latePayments || false,
          isCurrent: false,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (reference1 && reference1.name) {
        await tx.insert(personalReferences).values({
          applicationId,
          name: reference1.name,
          relationship: reference1.relationship,
          phoneNumber: reference1.phoneNumber,
          email: reference1.email,
          yearsKnown: parseInt(reference1.yearsKnown || "0"),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (reference2 && reference2.name) {
        await tx.insert(personalReferences).values({
          applicationId,
          name: reference2.name,
          relationship: reference2.relationship,
          phoneNumber: reference2.phoneNumber,
          email: reference2.email,
          yearsKnown: parseInt(reference2.yearsKnown || "0"),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      return application;
    });
  }
  async getRentalApplication(applicationId) {
    const [application] = await db.select().from(rentalApplications).where(eq(rentalApplications.id, applicationId)).limit(1);
    if (!application) return null;
    const [employmentRecords, financialRecord, references, rentalRecords] = await Promise.all([
      db.select().from(employmentHistory).where(eq(employmentHistory.applicationId, applicationId)),
      db.select().from(financialInformation).where(eq(financialInformation.applicationId, applicationId)).limit(1),
      db.select().from(personalReferences).where(eq(personalReferences.applicationId, applicationId)),
      db.select().from(rentalHistory).where(eq(rentalHistory.applicationId, applicationId))
    ]);
    return {
      ...application,
      employmentHistory: employmentRecords,
      financialInformation: financialRecord[0] || null,
      references,
      rentalHistory: rentalRecords
    };
  }
  async getUserRentalApplications(userId) {
    return db.select().from(rentalApplications).where(eq(rentalApplications.userId, userId)).orderBy(rentalApplications.createdAt);
  }
  async getAgentRentalApplications(agentId) {
    return db.select().from(rentalApplications).where(eq(rentalApplications.agentId, agentId)).orderBy(rentalApplications.createdAt);
  }
  async updateRentalApplicationStatus(applicationId, status, reviewNotes, agentId) {
    const [updatedApplication] = await db.update(rentalApplications).set({
      status,
      reviewNotes,
      reviewedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(rentalApplications.id, applicationId)).returning();
    return updatedApplication;
  }
  // Directory - Contact operations
  async getContacts(agentId, filters) {
    let query = db.select({
      id: contacts.id,
      fullName: contacts.fullName,
      dateOfBirth: contacts.dateOfBirth,
      phones: contacts.phones,
      emails: contacts.emails,
      notes: contacts.notes,
      hasApp: contacts.hasApp,
      lastActiveAt: contacts.lastActiveAt,
      createdAt: contacts.createdAt,
      primaryClient: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      relationshipType: clientContactLinks.relationshipType,
      isPrimary: clientContactLinks.isPrimary
    }).from(contacts).leftJoin(clientContactLinks, eq(contacts.id, clientContactLinks.contactId)).leftJoin(users, eq(clientContactLinks.clientId, users.id)).where(eq(contacts.agentId, agentId));
    const results = await query;
    let filteredResults = results;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResults = filteredResults.filter((c) => {
        const nameMatch = c.fullName?.toLowerCase().includes(searchLower);
        const emailMatch = c.emails && Array.isArray(c.emails) && c.emails.some((e) => {
          if (typeof e === "string") return e.toLowerCase().includes(searchLower);
          return e?.address?.toLowerCase().includes(searchLower);
        });
        const phoneMatch = c.phones && Array.isArray(c.phones) && c.phones.some((p) => {
          if (typeof p === "string") return p.includes(searchLower);
          return p?.number?.includes(searchLower);
        });
        return nameMatch || emailMatch || phoneMatch;
      });
    }
    if (filters?.relationshipType && filters.relationshipType !== "all") {
      filteredResults = filteredResults.filter((c) => c.relationshipType === filters.relationshipType);
    }
    if (filters?.hasApp !== void 0) {
      filteredResults = filteredResults.filter((c) => c.hasApp === filters.hasApp);
    }
    return filteredResults;
  }
  async getContact(id) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }
  async createContact(contact) {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }
  async updateContact(id, updates) {
    const [updated] = await db.update(contacts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contacts.id, id)).returning();
    return updated;
  }
  async deleteContact(id) {
    await db.delete(clientContactLinks).where(eq(clientContactLinks.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
  }
  async linkContactToClient(link) {
    const [newLink] = await db.insert(clientContactLinks).values(link).returning();
    return newLink;
  }
  async unlinkContactFromClient(clientId, contactId) {
    await db.delete(clientContactLinks).where(
      and(
        eq(clientContactLinks.clientId, clientId),
        eq(clientContactLinks.contactId, contactId)
      )
    );
  }
  async getClientContacts(clientId) {
    const results = await db.select({
      id: contacts.id,
      fullName: contacts.fullName,
      dateOfBirth: contacts.dateOfBirth,
      phones: contacts.phones,
      emails: contacts.emails,
      notes: contacts.notes,
      hasApp: contacts.hasApp,
      lastActiveAt: contacts.lastActiveAt,
      relationshipType: clientContactLinks.relationshipType,
      isPrimary: clientContactLinks.isPrimary
    }).from(clientContactLinks).innerJoin(contacts, eq(clientContactLinks.contactId, contacts.id)).where(eq(clientContactLinks.clientId, clientId));
    return results;
  }
  async getContactTimeline(contactId) {
    const contactLinks = await db.select({ clientId: clientContactLinks.clientId }).from(clientContactLinks).where(eq(clientContactLinks.contactId, contactId));
    if (contactLinks.length === 0) return [];
    const clientIds = contactLinks.map((link) => link.clientId);
    const tourActivity = await db.select({
      type: sql2`'tour'`,
      id: tours.id,
      date: tours.scheduledDate,
      description: sql2`'Attended property tour'`,
      data: tours
    }).from(tours).where(inArray(tours.clientId, clientIds)).orderBy(desc(tours.scheduledDate));
    const offerActivity = await db.select({
      type: sql2`'offer'`,
      id: offers.id,
      date: offers.submittedAt,
      description: sql2`'Submitted offer'`,
      data: offers
    }).from(offers).where(inArray(offers.clientId, clientIds)).orderBy(desc(offers.submittedAt));
    return [...tourActivity, ...offerActivity].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }
  // Brokerage methods
  async createBrokerage(brokerage) {
    const [newBrokerage] = await db.insert(brokerages).values(brokerage).returning();
    return newBrokerage;
  }
  async getBrokerage(id) {
    const [brokerage] = await db.select().from(brokerages).where(eq(brokerages.id, id));
    return brokerage;
  }
  async getBrokerageByOwnerEmail(email) {
    const [brokerage] = await db.select().from(brokerages).where(eq(brokerages.contactEmail, email));
    return brokerage;
  }
  async updateBrokerage(id, updates) {
    const [updated] = await db.update(brokerages).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brokerages.id, id)).returning();
    return updated;
  }
  async deleteBrokerage(id) {
    await db.delete(brokerageAgents).where(eq(brokerageAgents.brokerageId, id));
    await db.delete(brokerages).where(eq(brokerages.id, id));
  }
  async linkAgentToBrokerage(brokerageId, agentId, role = "member") {
    const [link] = await db.insert(brokerageAgents).values({
      brokerageId,
      agentId,
      role
    }).returning();
    return link;
  }
  async unlinkAgentFromBrokerage(brokerageId, agentId) {
    await db.delete(brokerageAgents).where(
      and(
        eq(brokerageAgents.brokerageId, brokerageId),
        eq(brokerageAgents.agentId, agentId)
      )
    );
  }
  async getBrokerageAgents(brokerageId) {
    return await db.select().from(brokerageAgents).where(eq(brokerageAgents.brokerageId, brokerageId));
  }
  async createCoachingNote(note) {
    const [newNote] = await db.insert(coachingNotes).values(note).returning();
    return newNote;
  }
  async getCoachingNotes(agentId) {
    return await db.select().from(coachingNotes).where(eq(coachingNotes.agentId, agentId)).orderBy(desc(coachingNotes.createdAt));
  }
  async getBrokerageForAgent(agentId) {
    const [link] = await db.select({
      brokerageId: brokerageAgents.brokerageId,
      role: brokerageAgents.role,
      brokerage: brokerages
    }).from(brokerageAgents).innerJoin(brokerages, eq(brokerageAgents.brokerageId, brokerages.id)).where(eq(brokerageAgents.agentId, agentId));
    return link;
  }
  async addToShortlist(propertyId, userId) {
    const [shortlist] = await db.insert(propertyShortlists).values({
      propertyId,
      userId
    }).onConflictDoNothing().returning();
    return shortlist || { id: "", propertyId, userId, createdAt: /* @__PURE__ */ new Date() };
  }
  async removeFromShortlist(propertyId, userId) {
    await db.delete(propertyShortlists).where(
      and(
        eq(propertyShortlists.propertyId, propertyId),
        eq(propertyShortlists.userId, userId)
      )
    );
  }
  async getShortlistedProperties(userId) {
    return await db.select({
      id: propertyShortlists.id,
      createdAt: propertyShortlists.createdAt,
      propertyId: propertyShortlists.propertyId,
      property: properties
    }).from(propertyShortlists).innerJoin(properties, eq(propertyShortlists.propertyId, properties.id)).where(eq(propertyShortlists.userId, userId)).orderBy(desc(propertyShortlists.createdAt));
  }
  async isPropertyShortlisted(propertyId, userId) {
    const [result] = await db.select().from(propertyShortlists).where(
      and(
        eq(propertyShortlists.propertyId, propertyId),
        eq(propertyShortlists.userId, userId)
      )
    );
    return !!result;
  }
  // Chat operations
  async getOrCreateConversation(agentId, clientId) {
    const [existing] = await db.select().from(conversations).where(and(eq(conversations.agentId, agentId), eq(conversations.clientId, clientId)));
    if (existing) return existing;
    const [created] = await db.insert(conversations).values({ agentId, clientId }).returning();
    return created;
  }
  async getConversations(userId, role) {
    const condition = role === "agent" ? eq(conversations.agentId, userId) : eq(conversations.clientId, userId);
    const rows = await db.select().from(conversations).where(condition).orderBy(desc(conversations.lastMessageAt));
    return Promise.all(rows.map(async (conv) => {
      const otherUserId = role === "agent" ? conv.clientId : conv.agentId;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
      const [lastMsg] = await db.select().from(directMessages).where(eq(directMessages.conversationId, conv.id)).orderBy(desc(directMessages.createdAt)).limit(1);
      const unread = await db.select({ count: count() }).from(directMessages).where(and(
        eq(directMessages.conversationId, conv.id),
        eq(directMessages.isRead, false),
        eq(directMessages.senderId, otherUserId)
      ));
      return {
        ...conv,
        otherUser: otherUser ? {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          email: otherUser.email
        } : null,
        lastMessage: lastMsg || null,
        unreadCount: unread[0]?.count ?? 0
      };
    }));
  }
  async getMessages(conversationId) {
    return db.select().from(directMessages).where(eq(directMessages.conversationId, conversationId)).orderBy(asc(directMessages.createdAt));
  }
  async sendMessage(conversationId, senderId, content) {
    const [message] = await db.insert(directMessages).values({ conversationId, senderId, content }).returning();
    await db.update(conversations).set({ lastMessageAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, conversationId));
    return message;
  }
  async markMessagesRead(conversationId, userId) {
    await db.update(directMessages).set({ isRead: true }).where(and(
      eq(directMessages.conversationId, conversationId),
      eq(directMessages.isRead, false),
      // Only mark messages sent by the OTHER user as read
      sql2`${directMessages.senderId} != ${userId}`
    ));
  }
  async getUnreadMessageCount(userId) {
    const userConvs = await db.select({ id: conversations.id }).from(conversations).where(or(eq(conversations.agentId, userId), eq(conversations.clientId, userId)));
    if (userConvs.length === 0) return 0;
    const convIds = userConvs.map((c) => c.id);
    const [result] = await db.select({ count: count() }).from(directMessages).where(and(
      inArray(directMessages.conversationId, convIds),
      eq(directMessages.isRead, false),
      sql2`${directMessages.senderId} != ${userId}`
    ));
    return result?.count ?? 0;
  }
};
var storage = new DatabaseStorage();

// server/simpleAuth.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import jwt from "jsonwebtoken";
import { eq as eq2 } from "drizzle-orm";
import { createHash } from "crypto";
var PgStore = connectPgSimple(session);
var TEST_USERS = {
  agent: {
    id: "agent-test-001",
    email: "agent@example.com",
    firstName: "John",
    lastName: "Agent",
    role: "agent",
    password: "password123",
    agentId: null
  },
  client: {
    id: "client-test-001",
    email: "client@example.com",
    firstName: "Jane",
    lastName: "Client",
    role: "client",
    password: "password123",
    agentId: null
  },
  brokerage: {
    id: "brokerage-test-001",
    email: "brokerage@example.com",
    firstName: "Bob",
    lastName: "Broker",
    role: "brokerage",
    password: "password123",
    agentId: null
  },
  superadmin: {
    id: "superadmin-test-001",
    email: "admin@example.com",
    firstName: "Super",
    lastName: "Admin",
    role: "superadmin",
    password: "password123",
    agentId: null
  }
};
function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "your-secret-key-change-in-production";
  if (secret === "your-secret-key-change-in-production" && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production");
  }
  return secret;
}
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  return session({
    secret: getJwtSecret(),
    // PostgreSQL-backed session store — survives cold starts and scales across
    // multiple serverless function instances (required on Vercel).
    // createTableIfMissing auto-creates the "session" table on first run.
    store: new PgStore({
      pool,
      createTableIfMissing: true,
      ttl: sessionTtl / 1e3
      // PgStore expects seconds
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax"
    }
  });
}
async function getRandomAgent() {
  try {
    const agents = await db.select().from(users).where(eq2(users.role, "agent"));
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
async function createOrUpdateUser(user) {
  try {
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImageUrl: user.profileImageUrl || null,
      agentId: user.agentId || null
    };
    const createdUser = await storage.upsertUser(userData);
    return createdUser;
  } catch (error) {
    console.error("Failed to upsert user:", error);
    throw error;
  }
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  const initOrder = [TEST_USERS.agent, TEST_USERS.client, TEST_USERS.brokerage, TEST_USERS.superadmin];
  for (const user of initOrder) {
    try {
      const existingUser = await storage.getUser(user.id);
      if (existingUser) {
        console.log(`Test user already exists: ${user.email} (${user.role}) - skipping initialization`);
        continue;
      }
      const { password, ...userData } = user;
      if (userData.role === "client") {
        const randomAgent = await getRandomAgent();
        userData.agentId = randomAgent?.id || TEST_USERS.agent.id || null;
      }
      const createdUser = await createOrUpdateUser(userData);
      console.log(`Created new test user: ${user.email} (${userData.role}) - agentId: ${userData.agentId}`);
    } catch (error) {
      console.error(`Failed to initialize test user ${user.email}:`, error);
    }
  }
  function hashPassword3(password) {
    return createHash("sha256").update(password).digest("hex");
  }
  app2.post("/api/login", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const dbUsers = await db.select().from(users).where(eq2(users.email, email));
      if (dbUsers.length > 0) {
        const dbUser2 = dbUsers[0];
        const passwordHash = hashPassword3(password);
        if (dbUser2.passwordHash === passwordHash) {
          const actualRole2 = dbUser2.role || (role || "client");
          const token2 = jwt.sign(
            {
              id: dbUser2.id,
              email: dbUser2.email,
              role: actualRole2
            },
            getJwtSecret(),
            { expiresIn: "7d" }
          );
          req.session.user = {
            id: dbUser2.id,
            email: dbUser2.email,
            firstName: dbUser2.firstName,
            lastName: dbUser2.lastName,
            role: actualRole2,
            agentId: dbUser2.agentId,
            accessToken: token2
          };
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ message: "Login failed" });
            }
            res.json({
              message: "Login successful",
              user: {
                id: dbUser2.id,
                email: dbUser2.email,
                firstName: dbUser2.firstName,
                lastName: dbUser2.lastName,
                role: actualRole2
              },
              accessToken: token2
            });
          });
          return;
        }
      }
      let user = null;
      for (const testUser of Object.values(TEST_USERS)) {
        if (testUser.email === email && testUser.password === password) {
          if (role && testUser.role !== role) {
            continue;
          }
          user = testUser;
          break;
        }
      }
      if (!user) {
        const roleMsg = role ? ` for role '${role}'` : "";
        return res.status(401).json({ message: `Invalid credentials${roleMsg}` });
      }
      const { password: _, ...userData } = user;
      if (userData.role === "client") {
        const existingUser = await storage.getUser(user.id);
        if (!existingUser?.agentId) {
          const randomAgent = await getRandomAgent();
          userData.agentId = randomAgent?.id || null;
        }
      }
      const dbUser = await createOrUpdateUser(userData);
      const actualUserId = dbUser.id;
      const actualRole = dbUser.role || user.role;
      const token = jwt.sign(
        {
          id: actualUserId,
          email: dbUser.email,
          role: actualRole
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );
      req.session.user = {
        id: actualUserId,
        email: dbUser.email,
        firstName: dbUser.firstName || user.firstName,
        lastName: dbUser.lastName || user.lastName,
        role: actualRole,
        agentId: dbUser.agentId || userData.agentId,
        accessToken: token
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
            role: actualRole
          },
          accessToken: token
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/login", async (req, res) => {
    try {
      const role = req.query.role || "client";
      const user = TEST_USERS[role];
      if (!user) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const { password: _, ...userData } = user;
      const dbUser = await createOrUpdateUser(userData);
      const actualUserId = dbUser.id;
      const actualRole = dbUser.role || user.role;
      const token = jwt.sign(
        {
          id: actualUserId,
          email: dbUser.email,
          role: actualRole
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );
      req.session.user = {
        id: actualUserId,
        email: dbUser.email,
        firstName: dbUser.firstName || user.firstName,
        lastName: dbUser.lastName || user.lastName,
        role: actualRole,
        agentId: dbUser.agentId || null,
        accessToken: token
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
  app2.post("/api/signup", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role } = req.body;
      if (!email || !firstName || !lastName || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!["agent", "client", "brokerage", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        role,
        agentId
      };
      const createdUser = await createOrUpdateUser(newUser);
      const token = jwt.sign(
        {
          id: userId,
          email,
          role
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );
      req.session.user = {
        id: userId,
        email,
        firstName,
        lastName,
        role,
        agentId: createdUser.agentId,
        accessToken: token
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
            role
          },
          accessToken: token
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const { email, firstName, lastName, password, role } = req.body;
      if (!email || !firstName || !lastName || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!["agent", "client", "brokerage", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        role,
        agentId
      };
      const createdUser = await createOrUpdateUser(newUser);
      const token = jwt.sign(
        {
          id: userId,
          email,
          role
        },
        getJwtSecret(),
        { expiresIn: "7d" }
      );
      res.json({
        message: "Account created successfully",
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role
        },
        accessToken: token
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect("/");
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  let user = req.session?.user;
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret());
        const dbUser = await storage.getUser(decoded.id);
        if (dbUser) {
          req.session.user = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: dbUser.role,
            agentId: dbUser.agentId
          };
          user = req.session.user;
        }
      } catch (error) {
        console.error("JWT verification failed:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }
  }
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// server/routes.ts
import { z } from "zod";
import { eq as eq4 } from "drizzle-orm";
import { Client } from "@googlemaps/google-maps-services-js";

// server/emailService.ts
import { MailService } from "@sendgrid/mail";
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set - email notifications will be disabled");
}
var mailService = new MailService();
var sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  mailService.setApiKey(sendgridApiKey);
}
async function sendEmail(params) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("Email would have been sent:", params.subject);
    return true;
  }
  try {
    const emailData = {
      to: params.to,
      from: params.from,
      subject: params.subject
    };
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    return false;
  }
}
function generateTourReminderEmail(data) {
  const subject = `Reminder: Property Tour Tomorrow - ${data.propertyAddress}`;
  const text2 = `Hi ${data.agentName},

This is a friendly reminder about your scheduled property tour tomorrow:

Property: ${data.propertyAddress}
Date: ${data.tourDate}
Time: ${data.tourTime}
Client: ${data.clientName}
${data.agentPhone ? `Contact: ${data.agentPhone}` : ""}

${data.notes ? `Notes: ${data.notes}` : ""}

Please ensure you arrive 15 minutes early to prepare the property and have all necessary materials ready.

Best regards,
Estate Vista Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">\u{1F3E0} Tour Reminder</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Don't forget about your upcoming property tour</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.agentName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          This is a friendly reminder about your scheduled property tour tomorrow:
        </p>
        
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <div style="display: grid; gap: 12px;">
            <div><strong style="color: #111827;">Property:</strong> <span style="color: #374151;">${data.propertyAddress}</span></div>
            <div><strong style="color: #111827;">Date:</strong> <span style="color: #374151;">${data.tourDate}</span></div>
            <div><strong style="color: #111827;">Time:</strong> <span style="color: #374151;">${data.tourTime}</span></div>
            <div><strong style="color: #111827;">Client:</strong> <span style="color: #374151;">${data.clientName}</span></div>
            ${data.agentPhone ? `<div><strong style="color: #111827;">Contact:</strong> <span style="color: #374151;">${data.agentPhone}</span></div>` : ""}
          </div>
        </div>
        
        ${data.notes ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
            <strong style="color: #92400e;">Notes:</strong>
            <p style="color: #92400e; margin: 8px 0 0 0;">${data.notes}</p>
          </div>
        ` : ""}
        
        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #047857; margin: 0; font-weight: 500;">\u{1F4A1} Pro Tip:</p>
          <p style="color: #047857; margin: 8px 0 0 0;">Please arrive 15 minutes early to prepare the property and have all necessary materials ready.</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;
  return { subject, text: text2, html };
}
function generateClientWelcomeEmail(data) {
  const subject = `Welcome to Estate Vista - Your Account is Ready`;
  const text2 = `Hi ${data.clientName},

Welcome to Estate Vista! Your agent ${data.agentName} has created an account for you.

Here are your login credentials:

Email: ${data.email}
Password: ${data.password}

You can now log in to Estate Vista at https://estate-vista.replit.dev to:
- View properties your agent is showing you
- Rate and provide feedback on properties
- Access documents and important information
- View your tour history and shortlisted properties

For security, we recommend changing your password after your first login.

If you have any questions, please contact your agent:
${data.agentName} (${data.agentEmail})

Welcome aboard!

Best regards,
Estate Vista Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">\u{1F44B} Welcome to Estate Vista</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Your account is ready to use</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.clientName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Welcome to <strong>Estate Vista</strong>! Your agent <strong>${data.agentName}</strong> has created an account for you to streamline your property search.
        </p>
        
        <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <p style="color: #1d4ed8; margin: 0 0 12px 0; font-weight: 600;">\u{1F4DD} Your Login Credentials</p>
          <div style="background: white; border-radius: 6px; padding: 16px; margin-top: 8px;">
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; font-weight: 600;">Email</span>
              <p style="color: #111827; font-size: 15px; margin: 4px 0 0 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${data.email}</p>
            </div>
            <div>
              <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; font-weight: 600;">Password</span>
              <p style="color: #111827; font-size: 15px; margin: 4px 0 0 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${data.password}</p>
            </div>
          </div>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #047857; margin: 0; font-weight: 500;">\u2728 What You Can Do Now</p>
          <ul style="color: #047857; margin: 12px 0 0 16px; padding: 0;">
            <li style="margin-bottom: 6px;">View properties your agent is showing you</li>
            <li style="margin-bottom: 6px;">Rate and provide feedback on properties</li>
            <li style="margin-bottom: 6px;">Access documents and important information</li>
            <li style="margin-bottom: 6px;">View your tour history and shortlisted properties</li>
          </ul>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #92400e; margin: 0; font-weight: 500;">\u{1F510} Security Tip</p>
          <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">We recommend changing your password after your first login for security.</p>
        </div>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
          <strong>Questions?</strong> Contact your agent directly:
        </p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          <strong>${data.agentName}</strong><br>
          ${data.agentEmail}
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;
  return { subject, text: text2, html };
}

// server/seedData.ts
import { nanoid } from "nanoid";
import { eq as eq3 } from "drizzle-orm";
import { createHash as createHash2 } from "crypto";
function hashPassword(password) {
  return createHash2("sha256").update(password).digest("hex");
}
async function seedDatabase() {
  try {
    console.log("\u{1F331} Starting database seed...");
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("\u26A0\uFE0F  Database already seeded, clearing old data...");
      return {
        success: false,
        message: "Database already contains seed data. Please clear it first or test with existing data."
      };
    }
    const agentId = "agent-" + nanoid();
    const clientId1 = "client-" + nanoid();
    const clientId2 = "client-" + nanoid();
    const brokerageId = "brokerage-" + nanoid();
    await db.insert(users).values([
      {
        id: agentId,
        email: "agent@example.com",
        firstName: "John",
        lastName: "Smith",
        role: "agent",
        profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: clientId1,
        email: "client1@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        role: "client",
        clientType: "buyer",
        agentId,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: clientId2,
        email: "client2@example.com",
        firstName: "Michael",
        lastName: "Chen",
        role: "client",
        clientType: "renter",
        agentId,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: brokerageId,
        email: "brokerage@example.com",
        firstName: "Admin",
        lastName: "User",
        role: "brokerage",
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Users created");
    const property1Id = "prop-" + nanoid();
    const property2Id = "prop-" + nanoid();
    const property3Id = "prop-" + nanoid();
    await db.insert(properties).values([
      {
        id: property1Id,
        address: "123 Main Street",
        city: "Toronto",
        province: "ON",
        postalCode: "M1A 1A1",
        propertyType: "detached",
        bedrooms: 4,
        bathrooms: "2.5",
        price: "750000",
        area: "Downtown",
        description: "Beautiful family home with spacious backyard",
        agentId,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: property2Id,
        address: "456 Park Avenue",
        city: "Toronto",
        province: "ON",
        postalCode: "M2B 2B2",
        propertyType: "condo",
        bedrooms: 2,
        bathrooms: "2",
        price: "550000",
        area: "Downtown",
        description: "Modern downtown condo with amazing views",
        agentId,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: property3Id,
        address: "789 Queen Street",
        city: "Toronto",
        province: "ON",
        postalCode: "M3C 3C3",
        propertyType: "townhouse",
        bedrooms: 3,
        bathrooms: "1.5",
        price: "650000",
        area: "Midtown",
        description: "Newly renovated townhouse near transit",
        agentId,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Properties created");
    await db.insert(clientRequirements).values([
      {
        clientType: "buyer",
        userId: clientId1,
        budgetMin: "500000",
        budgetMax: "800000",
        preferredAreas: ["Toronto", "Mississauga"],
        propertyTypes: ["detached", "semi-detached"],
        bedrooms: 4,
        bathrooms: "2",
        urgencyLevel: "high",
        timeframe: "1_month",
        agentId,
        status: "validated",
        version: 1,
        validationScore: "0.85"
      },
      {
        clientType: "renter",
        userId: clientId2,
        budgetMin: "2000",
        budgetMax: "3500",
        preferredAreas: ["Toronto Downtown"],
        propertyTypes: ["condo", "apartment"],
        bedrooms: 2,
        bathrooms: "1",
        urgencyLevel: "medium",
        timeframe: "3_months",
        agentId,
        status: "incomplete",
        version: 1,
        validationScore: "0.5"
      }
    ]);
    console.log("\u2705 Client Requirements created");
    const groupId = "group-" + nanoid();
    await db.insert(clientGroups).values([
      {
        id: groupId,
        name: "Downtown Buyers 2024",
        createdById: agentId,
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    await db.insert(groupMembers).values([
      {
        groupId,
        userId: clientId1,
        joinedAt: /* @__PURE__ */ new Date()
      }
    ]);
    await db.insert(groupMessages).values([
      {
        groupId,
        userId: agentId,
        message: "Welcome to the group! I'll be sharing properties that match your criteria.",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        groupId,
        userId: clientId1,
        message: "Thanks John! Looking forward to viewing properties.",
        createdAt: new Date(Date.now() + 6e4)
      }
    ]);
    console.log("\u2705 Client Groups created");
    const tourId1 = "tour-" + nanoid();
    const tourId2 = "tour-" + nanoid();
    const now = /* @__PURE__ */ new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    await db.insert(tours).values([
      {
        id: tourId1,
        agentId,
        clientId: clientId1,
        groupId,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1e3),
        status: "scheduled",
        totalDistance: "12.5",
        estimatedDuration: 120,
        notes: "Client interested in 4-bedroom homes",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: tourId2,
        agentId,
        clientId: clientId2,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1e3),
        status: "scheduled",
        totalDistance: "8.3",
        estimatedDuration: 90,
        notes: "Downtown condo viewing",
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Tours created");
    await db.insert(tourProperties).values([
      {
        tourId: tourId1,
        propertyId: property1Id,
        order: 1,
        status: "scheduled"
      },
      {
        tourId: tourId1,
        propertyId: property3Id,
        order: 2,
        status: "scheduled"
      },
      {
        tourId: tourId2,
        propertyId: property2Id,
        order: 1,
        status: "scheduled"
      }
    ]);
    console.log("\u2705 Tour Properties created");
    await db.insert(propertyRatings).values([
      {
        propertyId: property1Id,
        tourId: tourId1,
        clientId: clientId1,
        rating: 5,
        feedbackCategory: "hold_later",
        reason: "Great location but want to see more options",
        notes: "Beautiful backyard, great schools nearby",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        propertyId: property2Id,
        tourId: tourId2,
        clientId: clientId2,
        rating: 4,
        feedbackCategory: "offer_now",
        reason: "Modern amenities and perfect location",
        notes: "Close to work, good building management",
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Property Ratings created");
    await db.insert(offers).values([
      {
        propertyId: property2Id,
        clientId: clientId2,
        agentId,
        amount: "520000",
        status: "pending",
        notes: "Subject to inspection",
        submittedAt: /* @__PURE__ */ new Date()
      },
      {
        propertyId: property1Id,
        clientId: clientId1,
        agentId,
        amount: "720000",
        status: "accepted",
        submittedAt: /* @__PURE__ */ new Date(),
        respondedAt: /* @__PURE__ */ new Date(),
        notes: "Accepted by seller"
      }
    ]);
    console.log("\u2705 Offers created");
    const showingRequestId = "sr-" + nanoid();
    await db.insert(showingRequests).values([
      {
        id: showingRequestId,
        clientId: clientId1,
        agentId,
        groupId,
        preferredDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1e3),
        preferredTime: "14:00",
        status: "pending",
        notes: "Would like to see properties with updated kitchens",
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    await db.insert(requestedProperties).values([
      {
        requestId: showingRequestId,
        propertyId: property1Id
      },
      {
        requestId: showingRequestId,
        propertyId: property3Id
      }
    ]);
    console.log("\u2705 Showing Requests created");
    await db.insert(documents).values([
      {
        userId: agentId,
        clientId: clientId1,
        documentType: "representative_agreement",
        title: "Sarah Johnson - Buyer Agreement",
        filename: "buyer-agreement-2024.pdf",
        originalName: "Buyer Agreement.pdf",
        url: "https://example.com/docs/buyer-agreement.pdf",
        mimeType: "application/pdf",
        size: 245e3,
        description: "Standard buyer representation agreement",
        tags: ["legal", "buyer", "2024"],
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        userId: agentId,
        clientId: clientId2,
        documentType: "lease_agreement",
        title: "Michael Chen - Lease Agreement",
        filename: "lease-agreement-2024.pdf",
        originalName: "Lease Agreement.pdf",
        url: "https://example.com/docs/lease-agreement.pdf",
        mimeType: "application/pdf",
        size: 18e4,
        description: "Lease agreement for 456 Park Avenue",
        tags: ["legal", "lease", "property"],
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Documents created");
    await db.insert(agentBrandingSettings).values([
      {
        agentId,
        logoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=agent",
        agentName: "John Smith",
        agentEmail: "john.smith@realtor.com",
        brokerageName: "Premier Realty Group",
        updatedBy: agentId,
        updatedAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Agent Branding Settings created");
    await db.insert(tourReminders).values([
      {
        userId: clientId1,
        tourId: tourId1,
        method: "email",
        intervalValue: 24,
        intervalUnit: "hours",
        timing: "09:00",
        isEnabled: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        userId: clientId2,
        tourId: tourId2,
        method: "notification",
        intervalValue: 2,
        intervalUnit: "hours",
        timing: "14:30",
        isEnabled: true,
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Tour Reminders created");
    const integrationId = "cal-" + nanoid();
    await db.insert(calendarIntegrations).values([
      {
        id: integrationId,
        userId: agentId,
        provider: "google",
        calendarId: "primary@gmail.com",
        isActive: true,
        lastSyncAt: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    await db.insert(calendarEvents).values([
      {
        userId: agentId,
        integrationId,
        tourId: tourId1,
        title: "Tour - Downtown Buyers Group",
        description: "Property tour with Sarah Johnson and group",
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1e3),
        endTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1e3),
        eventType: "tour",
        isBlocked: false,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        userId: agentId,
        integrationId,
        title: "Team Meeting",
        description: "Weekly team sync",
        startTime: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1e3),
        endTime: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1e3),
        eventType: "personal",
        isBlocked: true,
        createdAt: /* @__PURE__ */ new Date()
      }
    ]);
    console.log("\u2705 Calendar Integration & Events created");
    console.log("\u{1F389} Database seeding completed successfully!");
    return {
      success: true,
      message: "Database seeded with test data",
      data: {
        agentId,
        clientId1,
        clientId2,
        property1Id,
        property2Id,
        property3Id,
        tourId1,
        tourId2,
        groupId
      }
    };
  } catch (error) {
    console.error("\u274C Error seeding database:", error);
    throw error;
  }
}
async function seedBrokerageDemo() {
  try {
    console.log("\u{1F3E2} Starting brokerage demo seed...");
    const [brokerageUser] = await db.select().from(users).where(eq3(users.email, "brokerage@example.com"));
    if (!brokerageUser) {
      throw new Error("brokerage@example.com user not found. Make sure the app has been started at least once to create test users.");
    }
    const existingBrokerages = await db.select().from(brokerages).limit(1);
    let brokerageId;
    if (existingBrokerages.length > 0) {
      brokerageId = existingBrokerages[0].id;
      await db.update(brokerages).set({ contactEmail: "brokerage@example.com" }).where(eq3(brokerages.id, brokerageId));
      console.log(`\u26A0\uFE0F  Reusing existing brokerage: ${existingBrokerages[0].name} (contactEmail updated)`);
    } else {
      const [brokerage] = await db.insert(brokerages).values({
        name: "Premier Realty Group",
        contactEmail: "brokerage@example.com",
        contactPhone: "+1 416 555 0100",
        website: "https://premierrealty.example.com"
      }).returning();
      brokerageId = brokerage.id;
      console.log("\u2705 Brokerage company created");
    }
    const agent1Id = "agent-demo-001";
    const agent2Id = "agent-demo-002";
    await db.insert(users).values([
      {
        id: agent1Id,
        email: "sarah.agent@example.com",
        firstName: "Sarah",
        lastName: "Mitchell",
        role: "agent",
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: agent2Id,
        email: "mike.agent@example.com",
        firstName: "Mike",
        lastName: "Torres",
        role: "agent",
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      }
    ]).onConflictDoNothing();
    console.log("\u2705 Demo agents created");
    await db.insert(brokerageAgents).values([
      { brokerageId, agentId: agent1Id, role: "manager" },
      { brokerageId, agentId: agent2Id, role: "member" }
    ]).onConflictDoNothing();
    console.log("\u2705 Agents linked to brokerage");
    const client1Id = "client-demo-001";
    const client2Id = "client-demo-002";
    const client3Id = "client-demo-003";
    const client4Id = "client-demo-004";
    await db.insert(users).values([
      {
        id: client1Id,
        email: "emma.buyer@example.com",
        firstName: "Emma",
        lastName: "Clarke",
        role: "client",
        clientType: "buyer",
        agentId: agent1Id,
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: client2Id,
        email: "liam.renter@example.com",
        firstName: "Liam",
        lastName: "Park",
        role: "client",
        clientType: "renter",
        agentId: agent1Id,
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: client3Id,
        email: "olivia.buyer@example.com",
        firstName: "Olivia",
        lastName: "Nguyen",
        role: "client",
        clientType: "buyer",
        agentId: agent2Id,
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: client4Id,
        email: "james.buyer@example.com",
        firstName: "James",
        lastName: "Patel",
        role: "client",
        clientType: "buyer",
        agentId: agent2Id,
        passwordHash: hashPassword("password123"),
        createdAt: /* @__PURE__ */ new Date()
      }
    ]).onConflictDoNothing();
    console.log("\u2705 Demo clients created");
    const insertedProps = await db.insert(properties).values([
      {
        mlsNumber: 20240001,
        address: "22 Birchwood Lane",
        city: "Toronto",
        province: "ON",
        postalCode: "M4B 1B3",
        propertyType: "detached",
        bedrooms: 4,
        bathrooms: "2.5",
        price: "875000",
        area: "East York",
        description: "Spacious 4-bed family home with updated kitchen, double garage, and large fenced backyard.",
        agentId: agent1Id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        mlsNumber: 20240002,
        address: "310 Lakeshore Blvd West, Unit 1205",
        city: "Toronto",
        province: "ON",
        postalCode: "M5V 1C1",
        propertyType: "condo",
        bedrooms: 2,
        bathrooms: "2",
        price: "2800",
        area: "Downtown",
        description: "Modern lakeview condo with floor-to-ceiling windows, gym, and concierge.",
        agentId: agent1Id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        mlsNumber: 20240003,
        address: "88 Maple Street",
        city: "Mississauga",
        province: "ON",
        postalCode: "L5B 2C4",
        propertyType: "semi-detached",
        bedrooms: 3,
        bathrooms: "2",
        price: "720000",
        area: "Port Credit",
        description: "Renovated semi-detached near GO train, open concept main floor, private patio.",
        agentId: agent2Id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        mlsNumber: 20240004,
        address: "14 Heritage Court",
        city: "Oakville",
        province: "ON",
        postalCode: "L6H 3K7",
        propertyType: "detached",
        bedrooms: 5,
        bathrooms: "3.5",
        price: "1250000",
        area: "Old Oakville",
        description: "Luxury executive home with finished basement, three-car garage, and pool-sized lot.",
        agentId: agent2Id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        mlsNumber: 20240005,
        address: "55 St. Clair Avenue East, Unit 402",
        city: "Toronto",
        province: "ON",
        postalCode: "M4T 1M9",
        propertyType: "condo",
        bedrooms: 1,
        bathrooms: "1",
        price: "2200",
        area: "Midtown",
        description: "Bright 1-bed condo near subway, updated bathroom, rooftop terrace access.",
        agentId: agent1Id,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }
    ]).onConflictDoNothing().returning();
    const [prop1, prop2, prop3, prop4, prop5] = insertedProps;
    const prop1Id = prop1?.id;
    const prop2Id = prop2?.id;
    const prop3Id = prop3?.id;
    const prop4Id = prop4?.id;
    const prop5Id = prop5?.id;
    console.log("\u2705 Demo properties created");
    const now = /* @__PURE__ */ new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1e3);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1e3);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1e3);
    const insertedTours = await db.insert(tours).values([
      {
        agentId: agent1Id,
        clientId: client1Id,
        scheduledDate: twoDaysAgo,
        startTime: new Date(twoDaysAgo.getTime() + 10 * 60 * 60 * 1e3),
        status: "completed",
        totalDistance: "14.2",
        estimatedDuration: 120,
        notes: "Emma preferred the Birchwood Lane property \u2014 wants to revisit.",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        agentId: agent1Id,
        clientId: client2Id,
        scheduledDate: yesterday,
        startTime: new Date(yesterday.getTime() + 14 * 60 * 60 * 1e3),
        status: "completed",
        totalDistance: "8.5",
        estimatedDuration: 90,
        notes: "Liam liked Unit 1205 but concerned about HOA fees.",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        agentId: agent1Id,
        clientId: client1Id,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1e3),
        status: "scheduled",
        totalDistance: "9.8",
        estimatedDuration: 90,
        notes: "Follow-up visit to 22 Birchwood + one new listing.",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        agentId: agent2Id,
        clientId: client3Id,
        scheduledDate: threeDaysFromNow,
        startTime: new Date(threeDaysFromNow.getTime() + 13 * 60 * 60 * 1e3),
        status: "scheduled",
        totalDistance: "22.6",
        estimatedDuration: 150,
        notes: "Olivia is interested in Oakville and Port Credit areas.",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        agentId: agent2Id,
        clientId: client4Id,
        scheduledDate: fiveDaysFromNow,
        startTime: new Date(fiveDaysFromNow.getTime() + 10 * 60 * 60 * 1e3),
        status: "scheduled",
        totalDistance: "18.1",
        estimatedDuration: 120,
        notes: "James looking for 4+ beds under $1.3M.",
        createdAt: /* @__PURE__ */ new Date()
      }
    ]).returning();
    const [tour1, tour2, tour3, tour4, tour5] = insertedTours;
    const tour1Id = tour1?.id;
    const tour2Id = tour2?.id;
    const tour3Id = tour3?.id;
    const tour4Id = tour4?.id;
    const tour5Id = tour5?.id;
    console.log("\u2705 Demo tours created");
    if (prop1Id && prop2Id && prop3Id && prop4Id && prop5Id && tour1Id && tour2Id && tour3Id && tour4Id && tour5Id) {
      await db.insert(tourProperties).values([
        // Tour 1 (completed): Emma saw prop1 + prop3
        { tourId: tour1Id, propertyId: prop1Id, order: 1, status: "viewed" },
        { tourId: tour1Id, propertyId: prop3Id, order: 2, status: "viewed" },
        // Tour 2 (completed): Liam saw prop2 + prop5
        { tourId: tour2Id, propertyId: prop2Id, order: 1, status: "viewed" },
        { tourId: tour2Id, propertyId: prop5Id, order: 2, status: "viewed" },
        // Tour 3 (upcoming): Emma revisits prop1 + sees prop4
        { tourId: tour3Id, propertyId: prop1Id, order: 1, status: "scheduled" },
        { tourId: tour3Id, propertyId: prop4Id, order: 2, status: "scheduled" },
        // Tour 4 (upcoming): Olivia sees prop3 + prop4
        { tourId: tour4Id, propertyId: prop3Id, order: 1, status: "scheduled" },
        { tourId: tour4Id, propertyId: prop4Id, order: 2, status: "scheduled" },
        // Tour 5 (upcoming): James sees prop4
        { tourId: tour5Id, propertyId: prop4Id, order: 1, status: "scheduled" }
      ]);
    }
    console.log("\u2705 Tour properties linked");
    if (prop1Id && prop2Id && prop3Id && prop5Id && tour1Id && tour2Id) {
      await db.insert(propertyRatings).values([
        {
          propertyId: prop1Id,
          tourId: tour1Id,
          clientId: client1Id,
          rating: 5,
          feedbackCategory: "hold_later",
          reason: "Love the neighbourhood and layout \u2014 want to see more first",
          notes: "Backyard is perfect for the kids. Kitchen needs updating.",
          createdAt: /* @__PURE__ */ new Date()
        },
        {
          propertyId: prop3Id,
          tourId: tour1Id,
          clientId: client1Id,
          rating: 3,
          feedbackCategory: "reject",
          reason: "Too far from work",
          notes: "Nice renovation but the commute to downtown is too long.",
          createdAt: /* @__PURE__ */ new Date()
        },
        {
          propertyId: prop2Id,
          tourId: tour2Id,
          clientId: client2Id,
          rating: 4,
          feedbackCategory: "hold_later",
          reason: "Great views but HOA fees are high",
          notes: "Would need to revisit the numbers. Loved the gym access.",
          createdAt: /* @__PURE__ */ new Date()
        },
        {
          propertyId: prop5Id,
          tourId: tour2Id,
          clientId: client2Id,
          rating: 5,
          feedbackCategory: "offer_now",
          reason: "Perfect size and price for the location",
          notes: "Subway access is ideal. Ready to make an offer.",
          createdAt: /* @__PURE__ */ new Date()
        }
      ]);
    }
    console.log("\u2705 Property ratings added");
    if (prop1Id && prop5Id) {
      await db.insert(offers).values([
        {
          propertyId: prop5Id,
          clientId: client2Id,
          agentId: agent1Id,
          amount: "2150",
          status: "pending",
          notes: "Offering slightly below asking \u2014 flexible on move-in date.",
          submittedAt: /* @__PURE__ */ new Date()
        },
        {
          propertyId: prop1Id,
          clientId: client1Id,
          agentId: agent1Id,
          amount: "850000",
          status: "accepted",
          notes: "Accepted \u2014 subject to home inspection.",
          submittedAt: twoDaysAgo,
          respondedAt: yesterday
        }
      ]);
    }
    console.log("\u2705 Offers added");
    console.log("\u{1F389} Brokerage demo seed completed!");
    return {
      success: true,
      message: "Brokerage demo data seeded successfully",
      data: {
        brokerageId,
        agents: [
          { id: agent1Id, email: "sarah.agent@example.com", password: "password123" },
          { id: agent2Id, email: "mike.agent@example.com", password: "password123" }
        ],
        clients: [
          { id: client1Id, email: "emma.buyer@example.com", password: "password123" },
          { id: client2Id, email: "liam.renter@example.com", password: "password123" },
          { id: client3Id, email: "olivia.buyer@example.com", password: "password123" },
          { id: client4Id, email: "james.buyer@example.com", password: "password123" }
        ]
      }
    };
  } catch (error) {
    console.error("\u274C Error seeding brokerage demo:", error);
    throw error;
  }
}

// server/routes.ts
import { createHash as createHash3 } from "crypto";

// server/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
var CloudinaryService = class {
  isConfigured;
  constructor() {
    this.isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    if (!this.isConfigured) {
      console.warn("Cloudinary credentials not configured. File uploads will fail.");
    }
  }
  isEnabled() {
    return this.isConfigured;
  }
  async uploadFromBuffer(buffer, options = {}) {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    }
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || "estate-vista",
        resource_type: options.resourceType || "auto",
        tags: options.tags
      };
      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }
      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
          } else if (result) {
            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              format: result.format,
              resourceType: result.resource_type,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              duration: result.duration
            });
          } else {
            reject(new Error("Upload failed with no result"));
          }
        }
      );
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }
  async uploadFromBase64(base64Data, options = {}) {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    }
    const uploadOptions = {
      folder: options.folder || "estate-vista",
      resource_type: options.resourceType || "auto",
      tags: options.tags
    };
    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }
    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }
    const dataUri = base64Data.startsWith("data:") ? base64Data : `data:application/octet-stream;base64,${base64Data}`;
    try {
      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }
  async uploadFromUrl(url, options = {}) {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    }
    const uploadOptions = {
      folder: options.folder || "estate-vista",
      resource_type: options.resourceType || "auto",
      tags: options.tags
    };
    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }
    try {
      const result = await cloudinary.uploader.upload(url, uploadOptions);
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }
  async deleteResource(publicId, resourceType = "image") {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured.");
    }
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      return result.result === "ok";
    } catch (error) {
      console.error("Cloudinary delete failed:", error.message);
      return false;
    }
  }
  getOptimizedUrl(publicId, options = {}) {
    const transformations = {
      fetch_format: options.format || "auto",
      quality: options.quality || "auto"
    };
    if (options.width) transformations.width = options.width;
    if (options.height) transformations.height = options.height;
    if (options.crop) transformations.crop = options.crop;
    return cloudinary.url(publicId, transformations);
  }
  generateSignedUploadParams() {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured.");
    }
    const timestamp2 = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp2, folder: "estate-vista" },
      process.env.CLOUDINARY_API_SECRET
    );
    return {
      timestamp: timestamp2,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    };
  }
};
var cloudinaryService = new CloudinaryService();

// server/routes.ts
function auditPIIAccess(userId, action, resourceType, resourceId) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[AUDIT] ${timestamp2} | User: ${userId} | Action: ${action} | Resource: ${resourceType}:${resourceId}`);
}
function generatePassword(length = 12) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}
function hashPassword2(password) {
  return createHash3("sha256").update(password).digest("hex");
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
async function optimizeTourRoute(startingAddress, tours2) {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    const toursWithAddress = tours2.filter((tour) => tour.propertyAddress);
    if (toursWithAddress.length === 0) {
      console.warn("No tours with propertyAddress provided for optimization");
      return {
        optimizedOrder: tours2,
        totalDistance: "0 miles",
        totalDuration: "0 minutes",
        startLocation: startingAddress
      };
    }
    if (!apiKey) {
      console.log("No Google Maps API key found, using mock route optimization");
      return {
        optimizedOrder: toursWithAddress.sort((a, b) => (a.propertyAddress || "").localeCompare(b.propertyAddress || "")),
        totalDistance: "12.4 miles",
        totalDuration: "35 minutes",
        startLocation: startingAddress
      };
    }
    const mapsClient = new Client({});
    const destinations = toursWithAddress.map((tour) => tour.propertyAddress);
    const distanceResponse = await mapsClient.distancematrix({
      params: {
        origins: [startingAddress],
        destinations,
        key: apiKey,
        units: "imperial",
        mode: "driving"
      }
    });
    const distances = distanceResponse.data.rows[0].elements;
    const tourDistances = toursWithAddress.map((tour, index2) => ({
      tour,
      distance: distances[index2].distance?.value || Infinity,
      duration: distances[index2].duration?.value || 0
    }));
    const optimizedTours = tourDistances.filter((item) => item.distance !== Infinity).sort((a, b) => a.distance - b.distance);
    const optimizedAddresses = optimizedTours.map((item) => item.tour.propertyAddress);
    let totalDistance = 0;
    let totalDuration = 0;
    if (optimizedTours.length > 0) {
      totalDistance += optimizedTours[0].distance;
      totalDuration += optimizedTours[0].duration;
    }
    if (optimizedAddresses.length > 1) {
      try {
        const routeDistanceResponse = await mapsClient.distancematrix({
          params: {
            origins: optimizedAddresses.slice(0, -1),
            destinations: optimizedAddresses.slice(1),
            key: apiKey,
            units: "imperial",
            mode: "driving"
          }
        });
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
        totalDistance = optimizedTours.reduce((sum2, item) => sum2 + item.distance, 0);
        totalDuration = optimizedTours.reduce((sum2, item) => sum2 + item.duration, 0);
      }
    }
    return {
      optimizedOrder: optimizedTours.map((item) => item.tour),
      totalDistance: `${(totalDistance * 621371e-9).toFixed(1)} miles`,
      totalDuration: `${Math.ceil(totalDuration / 60)} minutes`,
      startLocation: startingAddress
    };
  } catch (error) {
    console.error("Error optimizing route:", error);
    const toursWithAddress = tours2.filter((tour) => tour.propertyAddress);
    return {
      optimizedOrder: toursWithAddress.sort((a, b) => (a.propertyAddress || "").localeCompare(b.propertyAddress || "")),
      totalDistance: "12.4 miles",
      totalDuration: "35 minutes",
      startLocation: startingAddress
    };
  }
}
async function registerRoutes(app2) {
  app2.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("User not found in database, userId:", userId);
        return res.status(404).json({ message: "User not found" });
      }
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.patch("/api/auth/user/role", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { role, agentId } = req.body;
      if (!["agent", "client"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updates = { role };
      if (role === "client" && agentId) {
        updates.agentId = agentId;
      }
      const user = await storage.upsertUser({ id: userId, ...updates });
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  app2.get("/api/auth/user/agent", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "client" || !user.agentId) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.status(200).json(null);
      }
      const agent = await storage.getUser(user.agentId);
      if (!agent || agent.role !== "agent") {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.status(200).json(null);
      }
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        profileImageUrl: agent.profileImageUrl
      });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent information" });
    }
  });
  app2.put("/api/auth/client-type", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { clientType } = req.body;
      if (!["buyer", "renter"].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client") {
        return res.status(403).json({ message: "Only clients can set client type" });
      }
      const updatedUser = await storage.upsertUser({
        id: userId,
        clientType
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating client type:", error);
      res.status(500).json({ message: "Failed to update client type" });
    }
  });
  app2.get("/api/rental-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client" || user.clientType !== "renter") {
        return res.status(403).json({ message: "Only renter clients can access rental profiles" });
      }
      const profile = await storage.getRentalProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching rental profile:", error);
      res.status(500).json({ message: "Failed to fetch rental profile" });
    }
  });
  app2.post("/api/rental-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client" || user.clientType !== "renter") {
        return res.status(403).json({ message: "Only renter clients can create rental profiles" });
      }
      const profileData = insertRentalProfileSchema.parse({
        ...req.body,
        userId
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
  app2.put("/api/rental-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client" || user.clientType !== "renter") {
        return res.status(403).json({ message: "Only renter clients can update rental profiles" });
      }
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
  app2.get("/api/rental-applications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const applications = user.role === "agent" ? await storage.getAgentRentalApplications(userId) : await storage.getUserRentalApplications(userId);
      const sanitizedApplications = applications.map((app3) => {
        const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = app3;
        if (safeData.financialInfo) {
          const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
          safeData.financialInfo = safeFinancialInfo;
        }
        return safeData;
      });
      res.json(sanitizedApplications);
    } catch (error) {
      console.error("Error fetching rental applications:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: "Failed to fetch rental applications" });
    }
  });
  app2.post("/api/rental-applications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client" || user.clientType !== "renter") {
        return res.status(403).json({ message: "Only renter clients can submit rental applications" });
      }
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
          startDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          supervisorName: z.string().optional(),
          monthlySalary: z.string().optional(),
          salaryType: z.enum(["hourly", "salary", "commission", "contract"]).optional()
        }).optional(),
        previousEmployment: z.object({
          employerName: z.string().optional(),
          position: z.string().optional(),
          businessAddress: z.string().optional(),
          businessPhone: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          supervisorName: z.string().optional(),
          monthlySalary: z.string().optional(),
          salaryType: z.enum(["hourly", "salary", "commission", "contract"]).optional()
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
          bankruptcyDetails: z.string().optional()
        }).optional(),
        currentRental: z.object({
          address: z.string().optional(),
          landlordName: z.string().optional(),
          landlordPhone: z.string().optional(),
          landlordEmail: z.string().optional(),
          monthlyRent: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          reasonForLeaving: z.string().optional(),
          wasEvicted: z.boolean().optional(),
          latePayments: z.boolean().optional()
        }).optional(),
        previousRental: z.object({
          address: z.string().optional(),
          landlordName: z.string().optional(),
          landlordPhone: z.string().optional(),
          landlordEmail: z.string().optional(),
          monthlyRent: z.string().optional(),
          startDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          endDate: z.string().optional().transform((str) => str ? new Date(str) : void 0),
          reasonForLeaving: z.string().optional(),
          wasEvicted: z.boolean().optional(),
          latePayments: z.boolean().optional()
        }).optional(),
        reference1: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phoneNumber: z.string().optional(),
          email: z.string().optional(),
          yearsKnown: z.string().optional()
        }).optional(),
        reference2: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phoneNumber: z.string().optional(),
          email: z.string().optional(),
          yearsKnown: z.string().optional()
        }).optional()
      });
      const parsedData = oreaApplicationSchema.parse({
        ...req.body,
        userId,
        applicantName: `${req.body.firstName || ""} ${req.body.lastName || ""}`.trim() || user.firstName + " " + user.lastName,
        email: req.body.email || user.email,
        status: "submitted",
        // Fix: Use valid enum value instead of 'pending'
        agentId: req.body.agentId
      });
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
      const applicationData = {
        ...mainApplicationData,
        // Nested sections for related tables
        currentEmployment,
        previousEmployment,
        financialInfo,
        currentRental,
        previousRental,
        reference1,
        reference2
      };
      const application = await storage.createRentalApplication(applicationData);
      auditPIIAccess(userId, "CREATE", "rental_application", application.id);
      const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = application;
      if (safeData.financialInfo) {
        const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
        safeData.financialInfo = safeFinancialInfo;
      }
      res.json(safeData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid application data", errors: error.errors });
      }
      console.error("Error creating rental application:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: "Failed to create rental application" });
    }
  });
  app2.get("/api/rental-applications/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const applicationId = req.params.id;
      const application = await storage.getRentalApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const user = await storage.getUser(userId);
      if (user?.role === "client" && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user?.role === "agent" && application.agentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      auditPIIAccess(userId, "VIEW", "rental_application", applicationId);
      const { socialInsuranceNumber, driversLicenseNumber, ...safeData } = application;
      if (safeData.financialInfo) {
        const { accountNumber, ...safeFinancialInfo } = safeData.financialInfo;
        safeData.financialInfo = safeFinancialInfo;
      }
      res.json(safeData);
    } catch (error) {
      console.error("Error fetching rental application:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: "Failed to fetch rental application" });
    }
  });
  app2.put("/api/rental-applications/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const applicationId = req.params.id;
      const { status, reviewNotes } = req.body;
      const user = await storage.getUser(userId);
      if (user?.role !== "agent") {
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
      console.error("Error updating application status:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: "Failed to update application status" });
    }
  });
  app2.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const agentId = user.role === "agent" ? user.id : user.agentId || void 0;
      const properties2 = await storage.getProperties(agentId);
      res.json(properties2);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });
  app2.get("/api/properties/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });
  app2.get("/api/properties/:propertyId/reviews", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getPropertyReviews(req.params.propertyId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching property reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  app2.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.get("/api/tours", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const filters = {};
      if (user.role === "agent") {
        filters.agentId = user.id;
      } else {
        filters.clientId = user.id;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }
      const tours2 = await storage.getTours(filters);
      res.json(tours2);
    } catch (error) {
      console.error("Error fetching tours:", error);
      res.status(500).json({ message: "Failed to fetch tours" });
    }
  });
  app2.post("/api/tours", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can create tours" });
      }
      const { properties: properties2, ...tourData } = req.body;
      const dataToValidate = {
        ...tourData,
        agentId: user.id,
        status: "scheduled",
        // Agent-created tours are immediately scheduled, no approval step
        scheduledDate: tourData.scheduledDate ? new Date(tourData.scheduledDate) : void 0,
        startTime: tourData.startTime ? new Date(tourData.startTime) : void 0,
        endTime: tourData.endTime ? new Date(tourData.endTime) : void 0
      };
      const validatedTourData = insertTourSchema.parse(dataToValidate);
      if (validatedTourData.scheduledDate && properties2 && Array.isArray(properties2) && properties2.length > 0) {
        const propertyIds = properties2.map((p) => p.propertyId);
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
      let tour = await storage.createTour(validatedTourData);
      if (properties2 && Array.isArray(properties2) && properties2.length > 0) {
        for (const property of properties2) {
          await storage.createTourProperty({
            tourId: tour.id,
            propertyId: property.propertyId,
            order: property.order,
            scheduledTime: property.scheduledTime ? new Date(property.scheduledTime) : null
          });
        }
        const sortedProperties = [...properties2].sort((a, b) => a.order - b.order);
        let totalDistance = 0;
        for (let i = 0; i < sortedProperties.length - 1; i++) {
          const prop1 = await storage.getProperty(sortedProperties[i].propertyId);
          const prop2 = await storage.getProperty(sortedProperties[i + 1].propertyId);
          if (prop1 && prop2 && "latitude" in prop1 && "longitude" in prop1 && "latitude" in prop2 && "longitude" in prop2) {
            const distance = calculateDistance(
              prop1.latitude,
              prop1.longitude,
              prop2.latitude,
              prop2.longitude
            );
            totalDistance += distance;
          }
        }
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
  app2.get("/api/tours/:tourId/properties", isAuthenticated, async (req, res) => {
    try {
      const tourProperties2 = await storage.getTourProperties(req.params.tourId);
      const propertiesWithDetails = [];
      for (const tp of tourProperties2) {
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
              imageUrl: property.imageUrl
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
  app2.post("/api/tours/:tourId/properties", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }
      const existingProperties = await storage.getTourProperties(req.params.tourId);
      if (existingProperties.some((tp) => tp.propertyId === propertyId)) {
        return res.status(409).json({ message: "Property already in tour" });
      }
      const tourProperty = await storage.createTourProperty({
        tourId: req.params.tourId,
        propertyId,
        order: existingProperties.length + 1,
        scheduledTime: null
      });
      res.json(tourProperty);
    } catch (error) {
      console.error("Error adding property to tour:", error);
      res.status(500).json({ message: "Failed to add property to tour" });
    }
  });
  app2.patch("/api/tours/:tourId/properties/:propertyId/status", isAuthenticated, async (req, res) => {
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
  app2.patch("/api/tours/:tourId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can edit tours" });
      }
      const updates = { ...req.body };
      if (updates.startNow) {
        updates.startTime = /* @__PURE__ */ new Date();
        delete updates.startNow;
      }
      const updatedTour = await storage.updateTour(req.params.tourId, updates);
      res.json(updatedTour);
    } catch (error) {
      console.error("Error updating tour:", error);
      res.status(500).json({ message: "Failed to update tour" });
    }
  });
  app2.patch("/api/tours/:tourId/complete", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can complete tours" });
      }
      const existingTour = await storage.getTour(req.params.tourId);
      if (!existingTour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      const endTime = /* @__PURE__ */ new Date();
      let actualDuration;
      if (existingTour.startTime) {
        actualDuration = Math.floor(
          (endTime.getTime() - new Date(existingTour.startTime).getTime()) / (1e3 * 60)
        );
      } else {
        actualDuration = existingTour.estimatedDuration || 0;
      }
      const updateData = {
        status: "completed",
        endTime,
        actualDuration
      };
      if (req.body.totalDistance) {
        updateData.totalDistance = req.body.totalDistance;
      }
      if (!updateData.totalDistance && !existingTour.totalDistance) {
        try {
          const tourProperties2 = await storage.getTourProperties(req.params.tourId);
          const sortedTps = (tourProperties2 || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const propertyAddresses = [];
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
                  mode: "driving",
                  units: "metric"
                }
              });
              let totalKm = 0;
              for (let i = 0; i < matrixResponse.data.rows.length; i++) {
                const el = matrixResponse.data.rows[i]?.elements[i];
                if (el?.distance?.value) totalKm += el.distance.value / 1e3;
              }
              if (totalKm > 0) {
                updateData.totalDistance = totalKm.toFixed(2);
              }
            }
          }
        } catch (distErr) {
          console.warn("Could not calculate route distance on tour complete:", distErr);
        }
      }
      const updatedTour = await storage.updateTour(req.params.tourId, updateData);
      res.json(updatedTour);
    } catch (error) {
      console.error("Error completing tour:", error);
      res.status(500).json({ message: "Failed to complete tour" });
    }
  });
  app2.post("/api/tours/:tourId/calculate-route-distance", isAuthenticated, async (req, res) => {
    try {
      const { tourId } = req.params;
      const { originLat, originLng } = req.body;
      const tourProperties2 = await storage.getTourProperties(tourId);
      if (!tourProperties2 || tourProperties2.length === 0) {
        return res.json({ totalDistanceKm: 0 });
      }
      const sortedTps = [...tourProperties2].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const propertyAddresses = [];
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
          const origins = [];
          const destinations = [];
          if (originLat != null && originLng != null) {
            origins.push(`${originLat},${originLng}`);
            destinations.push(propertyAddresses[0]);
            for (let i = 0; i < propertyAddresses.length - 1; i++) {
              origins.push(propertyAddresses[i]);
              destinations.push(propertyAddresses[i + 1]);
            }
          } else {
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
                mode: "driving",
                units: "metric"
              }
            });
            for (let i = 0; i < matrixResponse.data.rows.length; i++) {
              const element = matrixResponse.data.rows[i]?.elements[i];
              if (element?.distance?.value) {
                totalDistanceKm += element.distance.value / 1e3;
              }
            }
          }
        } catch (mapsError) {
          console.warn("Google Maps distance matrix failed, using Haversine fallback:", mapsError);
          totalDistanceKm = 0;
        }
      }
      if (totalDistanceKm === 0 && originLat != null && originLng != null) {
      }
      if (totalDistanceKm > 0) {
        await storage.updateTour(tourId, { totalDistance: totalDistanceKm.toFixed(2) });
      }
      res.json({ totalDistanceKm: Math.round(totalDistanceKm * 10) / 10 });
    } catch (error) {
      console.error("Error calculating route distance:", error);
      res.json({ totalDistanceKm: 0 });
    }
  });
  app2.get("/api/showing-requests", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const filters = {};
      if (user.role === "agent") {
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
  app2.get("/api/showing-requests/:requestId", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getShowingRequest(req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      const propertyIds = await storage.getRequestedProperties(req.params.requestId);
      const properties2 = [];
      for (const propertyId of propertyIds) {
        const property = await storage.getProperty(propertyId);
        if (property) properties2.push(property);
      }
      res.json({
        ...request,
        properties: properties2
      });
    } catch (error) {
      console.error("Error fetching showing request:", error);
      res.status(500).json({ message: "Failed to fetch showing request" });
    }
  });
  app2.post("/api/showing-requests", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "client") {
        return res.status(403).json({ message: "Only clients can create showing requests" });
      }
      const agentId = req.session.user.agentId || user.agentId;
      if (!agentId) {
        return res.status(400).json({ message: "You must be assigned an agent before requesting a tour" });
      }
      const { propertyIds, preferredDate, ...requestData } = req.body;
      const parsedPreferredDate = preferredDate ? new Date(preferredDate) : null;
      const request = await storage.createShowingRequest({
        ...requestData,
        preferredDate: parsedPreferredDate,
        clientId: user.id,
        agentId
      });
      const properties2 = [];
      if (propertyIds && Array.isArray(propertyIds)) {
        for (const propertyId of propertyIds) {
          await storage.addPropertyToRequest(request.id, propertyId);
          try {
            const property = await storage.getProperty(propertyId);
            if (property) properties2.push(property);
          } catch (e) {
            console.error("Failed to fetch property for email:", e);
          }
        }
      }
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating showing request:", error);
      res.status(500).json({ message: "Failed to create showing request" });
    }
  });
  app2.patch("/api/showing-requests/:requestId/status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can update request status" });
      }
      const { status } = req.body;
      const requestId = req.params.requestId;
      const showingRequest = await storage.getShowingRequest(requestId);
      if (!showingRequest) {
        return res.status(404).json({ message: "Showing request not found" });
      }
      const updatedRequest = await storage.updateShowingRequestStatus(requestId, status);
      if (status === "approved") {
        try {
          const propertyIds = await storage.getRequestedProperties(requestId);
          const tourDate = showingRequest.preferredDate || /* @__PURE__ */ new Date();
          const tour = await storage.createTour({
            agentId: showingRequest.agentId,
            clientId: showingRequest.clientId,
            scheduledDate: tourDate,
            status: "scheduled",
            notes: showingRequest.notes || `Auto-created from approved showing request`
          });
          for (let i = 0; i < propertyIds.length; i++) {
            await storage.createTourProperty({
              tourId: tour.id,
              propertyId: propertyIds[i],
              order: i + 1,
              scheduledTime: null
            });
          }
          console.log(`Auto-created tour ${tour.id} from approved showing request ${requestId}`);
          return res.json({
            ...updatedRequest,
            autoCreatedTour: {
              id: tour.id,
              date: tour.scheduledDate,
              propertiesCount: propertyIds.length
            }
          });
        } catch (tourError) {
          console.error("Error auto-creating tour:", tourError);
        }
      }
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating showing request status:", error);
      res.status(500).json({ message: "Failed to update showing request status" });
    }
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can create tours" });
      }
      const { properties: properties2, ...tourData } = req.body;
      const dataToValidate = {
        ...tourData,
        agentId: user.id,
        scheduledDate: tourData.scheduledDate ? new Date(tourData.scheduledDate) : void 0,
        startTime: tourData.startTime ? new Date(tourData.startTime) : void 0,
        endTime: tourData.endTime ? new Date(tourData.endTime) : void 0
      };
      const validatedTourData = insertTourSchema.parse(dataToValidate);
      if (validatedTourData.scheduledDate && properties2 && Array.isArray(properties2) && properties2.length > 0) {
        const propertyIds = properties2.map((p) => p.propertyId);
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
      let tour = await storage.createTour(validatedTourData);
      if (properties2 && Array.isArray(properties2) && properties2.length > 0) {
        for (const property of properties2) {
          await storage.createTourProperty({
            tourId: tour.id,
            propertyId: property.propertyId,
            order: property.order,
            scheduledTime: property.scheduledTime ? new Date(property.scheduledTime) : null
          });
        }
        const sortedProperties = [...properties2].sort((a, b) => a.order - b.order);
        let totalDistance = 0;
        for (let i = 0; i < sortedProperties.length - 1; i++) {
          const prop1 = await storage.getProperty(sortedProperties[i].propertyId);
          const prop2 = await storage.getProperty(sortedProperties[i + 1].propertyId);
          if (prop1 && prop2 && "latitude" in prop1 && "longitude" in prop1 && "latitude" in prop2 && "longitude" in prop2) {
            const distance = calculateDistance(
              prop1.latitude,
              prop1.longitude,
              prop2.latitude,
              prop2.longitude
            );
            totalDistance += distance;
          }
        }
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
  app2.get("/api/offers", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const filters = {};
      if (user.role === "agent") {
        filters.agentId = user.id;
      } else {
        filters.clientId = user.id;
      }
      if (req.query.propertyId) {
        filters.propertyId = req.query.propertyId;
      }
      const offers2 = await storage.getOffers(filters);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(offers2);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });
  app2.post("/api/offers", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "client") {
        return res.status(403).json({ message: "Only clients can make offers" });
      }
      const offerData = insertOfferSchema.parse({
        ...req.body,
        clientId: user.id,
        agentId: user.agentId
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
  app2.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client list" });
      }
      const clients = await storage.getClientsWithStats(user.id);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can create clients" });
      }
      const { firstName, lastName, email, clientType } = req.body;
      if (!firstName || !lastName || !email || !clientType) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!["buyer", "renter"].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }
      const generatedPassword = generatePassword();
      const passwordHash = hashPassword2(generatedPassword);
      const clientData = {
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        email,
        role: "client",
        clientType,
        agentId: user.id,
        passwordHash
      };
      const newClient = await storage.upsertUser(clientData);
      const emailData = {
        clientName: `${firstName} ${lastName}`,
        email,
        password: generatedPassword,
        agentName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        agentEmail: user.email || "agent@estate-vista.com"
      };
      const emailTemplate = generateClientWelcomeEmail(emailData);
      const emailSent = await sendEmail({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@estate-vista.com",
        subject: emailTemplate.subject,
        html: emailTemplate.html
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
  app2.patch("/api/clients/:clientId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can update clients" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const { firstName, lastName, email, clientType, phone, profileImageUrl } = req.body;
      if (clientType && !["buyer", "renter"].includes(clientType)) {
        return res.status(400).json({ message: "Invalid client type" });
      }
      const updatedData = { ...client };
      if (firstName !== void 0) updatedData.firstName = firstName;
      if (lastName !== void 0) updatedData.lastName = lastName;
      if (email !== void 0) updatedData.email = email;
      if (clientType !== void 0) updatedData.clientType = clientType;
      if (phone !== void 0) updatedData.phone = phone;
      if (profileImageUrl !== void 0) updatedData.profileImageUrl = profileImageUrl;
      const updatedClient = await storage.upsertUser(updatedData);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });
  app2.delete("/api/clients/:clientId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can delete clients" });
      }
      const { clientId } = req.params;
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
  app2.get("/api/clients/:clientId/requirements", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const requirements = await storage.getClientRequirements(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching client requirements:", error);
      res.status(500).json({ message: "Failed to fetch client requirements" });
    }
  });
  app2.get("/api/clients/:clientId/history", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const history = await storage.getClientHistory(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(history);
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ message: "Failed to fetch client history" });
    }
  });
  app2.get("/api/clients/:clientId/shortlists", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const shortlists = await storage.getShortlistedProperties(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(shortlists);
    } catch (error) {
      console.error("Error fetching client shortlists:", error);
      res.status(500).json({ message: "Failed to fetch client shortlists" });
    }
  });
  app2.get("/api/clients/:clientId/offers", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const offers2 = await storage.getOffers({ clientId });
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(offers2);
    } catch (error) {
      console.error("Error fetching client offers:", error);
      res.status(500).json({ message: "Failed to fetch client offers" });
    }
  });
  app2.get("/api/clients/:clientId/documents", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const documents2 = await storage.getDocuments(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(documents2);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ message: "Failed to fetch client documents" });
    }
  });
  app2.get("/api/clients/:clientId/media", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const media = await storage.getClientMedia(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(media);
    } catch (error) {
      console.error("Error fetching client media:", error);
      res.status(500).json({ message: "Failed to fetch client media" });
    }
  });
  app2.get("/api/clients/:clientId/notes", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const notes = await storage.getClientNotes(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(notes);
    } catch (error) {
      console.error("Error fetching client notes:", error);
      res.status(500).json({ message: "Failed to fetch client notes" });
    }
  });
  app2.post("/api/clients/:clientId/notes", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can create client notes" });
      }
      const { clientId } = req.params;
      const { content } = req.body;
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
  app2.get("/api/clients/:clientId/groups", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client data" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const groups = await storage.getClientGroups(clientId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(groups);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });
  app2.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const clientGroups2 = await storage.getClientGroups(userId);
      res.json(clientGroups2);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });
  app2.get("/api/groups/:groupId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { groupId } = req.params;
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some((member) => member.userId === userId);
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
  app2.post("/api/groups/:groupId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { groupId } = req.params;
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some((member) => member.userId === userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      const newMessage = await storage.createGroupMessage({
        groupId,
        userId,
        message: message.trim()
      });
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending group message:", error);
      res.status(500).json({ message: "Failed to send group message" });
    }
  });
  app2.get("/api/groups/:groupId/members", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { groupId } = req.params;
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some((member) => member.userId === userId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });
  app2.get("/api/clients/:clientId/requirements-enhanced", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client requirements" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const requirement = await storage.getClientRequirement(clientId);
      if (requirement) {
        const [versions, exceptions, propertyMatches2] = await Promise.all([
          storage.getRequirementVersions(requirement.id),
          storage.getRequirementExceptions(requirement.id),
          storage.getPropertyMatchesForClient(clientId)
        ]);
        res.json({
          requirement,
          versions,
          exceptions,
          propertyMatches: propertyMatches2.slice(0, 10)
          // Top 10 matches
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
  app2.post("/api/clients/:clientId/requirements-enhanced", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can manage client requirements" });
      }
      const { clientId } = req.params;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const requirementData = {
        ...req.body,
        userId: clientId,
        agentId: user.id,
        clientType: client.clientType || "buyer",
        // Convert date strings to Date objects for database timestamp columns
        mortgagePreApprovalExpiry: req.body.mortgagePreApprovalExpiry ? new Date(req.body.mortgagePreApprovalExpiry) : null,
        desiredClosingDate: req.body.desiredClosingDate ? new Date(req.body.desiredClosingDate) : null,
        preferredMoveInDate: req.body.preferredMoveInDate ? new Date(req.body.preferredMoveInDate) : null
      };
      const requirement = await storage.createClientRequirement(requirementData);
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
  app2.post("/api/requirements/:requirementId/validate", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.post("/api/requirements/:requirementId/calculate-matches", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can calculate property matches" });
      }
      const { requirementId } = req.params;
      const matches = await storage.calculatePropertyMatches(requirementId);
      res.json({
        matches: matches.slice(0, 20),
        // Top 20 matches
        totalMatches: matches.length
      });
    } catch (error) {
      console.error("Error calculating property matches:", error);
      res.status(500).json({ message: "Failed to calculate property matches" });
    }
  });
  app2.post("/api/requirements/:requirementId/exceptions", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can create exceptions" });
      }
      const { requirementId } = req.params;
      const [requirement] = await db.select().from(clientRequirements).where(eq4(clientRequirements.id, requirementId));
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      if (requirement.agentId !== user.id) {
        return res.status(403).json({ message: "You can only create exceptions for your own clients' requirements" });
      }
      const exceptionSchema = insertRequirementsExceptionSchema.extend({
        requirementId: z.string().uuid()
      });
      const validationResult = exceptionSchema.safeParse({
        requirementId,
        exceptionType: req.body.exceptionType,
        description: req.body.description,
        justification: req.body.justification,
        approvedBy: user.id,
        approvedAt: /* @__PURE__ */ new Date(),
        status: "approved",
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null
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
  app2.get("/api/client-requirements", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "client") {
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
  app2.post("/api/client-requirements", isAuthenticated, async (req, res) => {
    try {
      console.log("[DEBUG] Client requirements endpoint hit with data:", JSON.stringify(req.body, null, 2));
      const user = await storage.getUser(req.session.user.id);
      console.log("[DEBUG] User fetched:", user ? { id: user.id, role: user.role, clientType: user.clientType, agentId: user.agentId } : null);
      if (!user) {
        console.log("[DEBUG] Authorization failed - user not found");
        return res.status(403).json({ message: "User not found" });
      }
      let targetClientId = user.id;
      let targetClientType = user.clientType;
      if (user.role === "client") {
        targetClientId = user.id;
        targetClientType = user.clientType;
      } else if (user.role === "agent") {
        if (!req.body.targetClientId) {
          console.log("[DEBUG] Agent missing targetClientId");
          return res.status(400).json({ message: "Agent must specify targetClientId when creating requirements" });
        }
        const targetClient = await storage.getUser(req.body.targetClientId);
        if (!targetClient || targetClient.role !== "client" || targetClient.agentId !== user.id) {
          console.log("[DEBUG] Invalid client for agent");
          return res.status(403).json({ message: "Client not found or not assigned to this agent" });
        }
        targetClientId = targetClient.id;
        targetClientType = targetClient.clientType;
      } else {
        console.log("[DEBUG] Authorization failed - invalid role");
        return res.status(403).json({ message: "Only clients and agents can create requirements" });
      }
      if (!targetClientType) {
        console.log("[DEBUG] No client type set");
        return res.status(400).json({ message: "Client type must be set before creating requirements" });
      }
      const requirementData = {
        ...req.body,
        userId: targetClientId,
        agentId: user.role === "agent" ? user.id : user.agentId || null,
        clientType: targetClientType,
        // Convert date strings to Date objects for database timestamp columns
        mortgagePreApprovalExpiry: req.body.mortgagePreApprovalExpiry ? new Date(req.body.mortgagePreApprovalExpiry) : null,
        desiredClosingDate: req.body.desiredClosingDate ? new Date(req.body.desiredClosingDate) : null,
        preferredMoveInDate: req.body.preferredMoveInDate ? new Date(req.body.preferredMoveInDate) : null
      };
      console.log("[DEBUG] Formatted requirement data:", JSON.stringify(requirementData, null, 2));
      const requirement = await storage.createClientRequirement(requirementData);
      console.log("[DEBUG] Requirement created successfully:", requirement.id);
      const validatorAgentId = user.role === "agent" ? user.id : user.agentId;
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
        const defaultValidation = {
          score: 0.5,
          // Default completeness score
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
  app2.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      let stats;
      if (user.role === "agent") {
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
  app2.get("/api/reports/summary", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access reports" });
      }
      const { period = "all", clientId } = req.query;
      const now = /* @__PURE__ */ new Date();
      let startDate;
      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
          break;
        default:
          startDate = void 0;
      }
      const agentStats = !clientId ? await storage.getAgentStats(user.id) : {
        todayTours: 0,
        activeClients: 0,
        pendingRequests: 0,
        weeklyDistance: 0
      };
      const allTours = await storage.getTours({ agentId: user.id });
      let filteredTours = startDate ? allTours.filter((t) => t.createdAt && new Date(t.createdAt) >= startDate) : allTours;
      if (clientId) {
        filteredTours = filteredTours.filter((t) => t.clientId === clientId);
      }
      const offers2 = await storage.getOffers({ agentId: user.id });
      let filteredOffers = startDate ? offers2.filter((o) => o.submittedAt && new Date(o.submittedAt) >= startDate) : offers2;
      if (clientId) {
        filteredOffers = filteredOffers.filter((o) => o.clientId === clientId);
      }
      const offerStats = {
        total: filteredOffers.length,
        pending: filteredOffers.filter((o) => o.status === "pending").length,
        accepted: filteredOffers.filter((o) => o.status === "accepted").length,
        rejected: filteredOffers.filter((o) => o.status === "rejected").length,
        withdrawn: filteredOffers.filter((o) => o.status === "withdrawn").length
      };
      const rejectionReasons = filteredOffers.filter((o) => o.status === "rejected" && o.rejectionReason).reduce((acc, offer) => {
        const reason = offer.rejectionReason || "Unknown";
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
      const totalDistance = filteredTours.reduce((sum2, tour) => {
        const dist = tour.totalDistance ? parseFloat(tour.totalDistance.toString()) : 0;
        return sum2 + dist;
      }, 0);
      const totalHours = filteredTours.reduce((sum2, tour) => {
        return sum2 + (tour.actualDuration || tour.estimatedDuration || 0);
      }, 0) / 60;
      let activeClients = agentStats.activeClients;
      if (clientId) {
        activeClients = filteredTours.length > 0 ? 1 : 0;
      }
      const summary = {
        period,
        clientId: clientId || null,
        dateRange: startDate ? { from: startDate, to: now } : null,
        totalTours: filteredTours.length,
        completedTours: filteredTours.filter((t) => t.status === "completed").length,
        activeClients,
        distanceTraveled: Math.round(totalDistance * 10) / 10,
        hoursInvested: Math.round(totalHours * 10) / 10,
        offers: offerStats,
        rejectionReasons,
        todayTours: clientId ? 0 : agentStats.todayTours,
        pendingRequests: clientId ? 0 : agentStats.pendingRequests,
        weeklyDistance: clientId ? 0 : agentStats.weeklyDistance
      };
      res.json(summary);
    } catch (error) {
      console.error("Error fetching reports summary:", error);
      res.status(500).json({ message: "Failed to fetch reports summary" });
    }
  });
  app2.get("/api/tours/:tourId/reminders", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { tourId } = req.params;
      const reminders = await storage.getTourReminders(user.id, tourId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching tour reminders:", error);
      res.status(500).json({ message: "Failed to fetch tour reminders" });
    }
  });
  app2.post("/api/tours/:tourId/reminders", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { tourId } = req.params;
      const reminderData = {
        ...req.body,
        userId: user.id,
        tourId
      };
      const reminder = await storage.createTourReminder(reminderData);
      res.json(reminder);
    } catch (error) {
      console.error("Error creating tour reminder:", error);
      res.status(500).json({ message: "Failed to create tour reminder" });
    }
  });
  app2.delete("/api/tours/:tourId/reminders/:reminderId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { reminderId } = req.params;
      await storage.deleteTourReminder(reminderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tour reminder:", error);
      res.status(500).json({ message: "Failed to delete tour reminder" });
    }
  });
  app2.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "client") {
        return res.status(403).json({ message: "Only clients can access groups" });
      }
      const groups = await storage.getClientGroups(user.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching client groups:", error);
      res.status(500).json({ message: "Failed to fetch client groups" });
    }
  });
  app2.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "client") {
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
  app2.get("/api/client-groups", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client groups" });
      }
      const agentClients = await storage.getClients(user.id);
      const clientIds = agentClients.map((client) => client.id);
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
  app2.patch("/api/clients/:clientId/drive-folder", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can update Drive folder URLs" });
      }
      const { clientId } = req.params;
      const { driveFolderUrl } = req.body;
      const client = await storage.getUser(clientId);
      if (!client || client.agentId !== user.id) {
        return res.status(403).json({ message: "You can only update Drive folders for your own clients" });
      }
      if (driveFolderUrl && !driveFolderUrl.startsWith("https://drive.google.com/")) {
        return res.status(400).json({ message: "Invalid Drive folder URL. Must start with https://drive.google.com/" });
      }
      const [updated] = await db.update(users).set({ driveFolderUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, clientId)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating Drive folder URL:", error);
      res.status(500).json({ message: "Failed to update Drive folder URL" });
    }
  });
  app2.get("/api/clients/:clientId/drive-folder", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access Drive folder URLs" });
      }
      const { clientId } = req.params;
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
  app2.get("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.query;
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can view all photos" });
      }
      const filterClientId = clientId === "null" ? null : clientId;
      const photos = await storage.getPhotosByAgent(user.id, filterClientId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching all photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });
  app2.get("/api/properties/:propertyId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getPropertyPhotos(req.params.propertyId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching property photos:", error);
      res.status(500).json({ message: "Failed to fetch property photos" });
    }
  });
  app2.post("/api/properties/:propertyId/photos", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "agent") {
        return res.status(403).json({ message: "Only agents can upload photos" });
      }
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
      const maxSize = 10 * 1024 * 1024;
      if (size && size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB" });
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed" });
      }
      let photoUrl;
      if (cloudinaryService.isEnabled()) {
        try {
          const uploadResult = await cloudinaryService.uploadFromBase64(base64Data, {
            folder: `estate-vista/photos/${req.params.propertyId}`,
            resourceType: "image",
            tags: [req.params.propertyId, user.id, "property-photo"]
          });
          photoUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload image to cloud storage" });
        }
      } else {
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
        caption: caption || null
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
  app2.get("/api/properties/:propertyId/tours/:tourId/media", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { propertyId, tourId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      if (user.role === "client" && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view media for your own tours" });
      }
      if (user.role === "agent" && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view media for your tours" });
      }
      const media = await storage.getPropertyMedia(propertyId, tourId);
      res.json(media);
    } catch (error) {
      console.error("Error fetching property media:", error);
      res.status(500).json({ message: "Failed to fetch property media" });
    }
  });
  app2.post("/api/properties/:propertyId/tours/:tourId/media", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { propertyId, tourId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      if (user.role === "client" && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only upload media for your own tours" });
      }
      if (user.role === "agent" && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only upload media for your tours" });
      }
      const existingMedia = await storage.getPropertyMedia(propertyId, tourId);
      if (existingMedia.length >= 15) {
        return res.status(400).json({ message: "Maximum 15 files allowed per property viewing" });
      }
      const { file, mediaType, documentType, caption, description } = req.body;
      if (!file || !mediaType) {
        return res.status(400).json({ message: "Missing required fields: file, mediaType" });
      }
      const { filename, mimeType, size, base64Data } = file;
      if (!filename || !mimeType || !base64Data) {
        return res.status(400).json({ message: "Invalid file data" });
      }
      const maxSize = mediaType === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (size && size > maxSize) {
        return res.status(400).json({
          message: `File too large. Maximum size is ${mediaType === "video" ? "100MB" : "10MB"}`
        });
      }
      let mediaUrl;
      const resourceType = mediaType === "video" ? "video" : mediaType === "document" ? "raw" : "image";
      if (cloudinaryService.isEnabled()) {
        try {
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          const uploadResult = await cloudinaryService.uploadFromBase64(dataUri, {
            folder: `estate-vista/media/${propertyId}`,
            resourceType,
            tags: [propertyId, tourId, user.id, mediaType]
          });
          mediaUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed, falling back to base64:", cloudinaryError);
          mediaUrl = `data:${mimeType};base64,${base64Data}`;
        }
      } else {
        mediaUrl = `data:${mimeType};base64,${base64Data}`;
      }
      const mediaData = {
        propertyId,
        tourId,
        uploadedBy: user.id,
        mediaType,
        documentType: documentType || null,
        filename,
        originalName: filename,
        url: mediaUrl,
        mimeType,
        size: size || 0,
        caption: caption || null,
        description: description || null
      };
      const newMedia = await storage.uploadPropertyMedia(mediaData);
      res.json(newMedia);
    } catch (error) {
      console.error("Error uploading property media:", error);
      res.status(500).json({ message: "Failed to upload property media" });
    }
  });
  app2.delete("/api/media/:mediaId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { mediaId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.deletePropertyMedia(mediaId);
      res.json({ message: "Media deleted successfully" });
    } catch (error) {
      console.error("Error deleting property media:", error);
      res.status(500).json({ message: "Failed to delete property media" });
    }
  });
  app2.get("/api/tours/:tourId/properties/:propertyId/rating", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { tourId, propertyId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      if (user.role === "client" && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your own tours" });
      }
      if (user.role === "agent" && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your tours" });
      }
      const tourProperties2 = await storage.getTourProperties(tourId);
      const propertyInTour = tourProperties2.find((tp) => tp.propertyId === propertyId);
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
  app2.post("/api/tours/:tourId/properties/:propertyId/rating", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { tourId, propertyId } = req.params;
      const { rating, feedbackCategory, reason, notes, remindLater } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "client") {
        return res.status(403).json({ message: "Only clients can rate properties" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      if (tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only rate properties in your own tours" });
      }
      const tourProperties2 = await storage.getTourProperties(tourId);
      const propertyInTour = tourProperties2.find((tp) => tp.propertyId === propertyId);
      if (!propertyInTour) {
        return res.status(404).json({ message: "Property not found in this tour" });
      }
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      if (!remindLater) {
        if (!feedbackCategory || !["offer_now", "hold_later", "reject"].includes(feedbackCategory)) {
          return res.status(400).json({ message: "Invalid feedback category" });
        }
        if (!reason || !reason.trim()) {
          return res.status(400).json({ message: "Reason is required" });
        }
      }
      let newStatus = "viewed";
      if (!remindLater) {
        if (feedbackCategory === "reject") {
          newStatus = "rejected";
        } else if (feedbackCategory === "hold_later") {
          newStatus = "liked";
        } else if (feedbackCategory === "offer_now") {
          newStatus = "offer_made";
        }
      }
      const existingRating = await storage.getPropertyRating(propertyId, userId, tourId);
      if (existingRating) {
        const updatedRating = await storage.updatePropertyRating(existingRating.id, {
          rating,
          feedbackCategory,
          reason: reason?.trim() || "Remind me later",
          notes: notes?.trim() || null,
          remindLater: remindLater || false
        });
        await storage.updateTourPropertyStatus(tourId, propertyId, newStatus);
        res.json(updatedRating);
      } else {
        const newRating = await storage.createPropertyRating({
          propertyId,
          tourId,
          clientId: userId,
          rating,
          feedbackCategory,
          reason: reason?.trim() || "Remind me later",
          notes: notes?.trim() || null,
          remindLater: remindLater || false
        });
        await storage.updateTourPropertyStatus(tourId, propertyId, newStatus);
        res.json(newRating);
      }
    } catch (error) {
      console.error("Error saving property rating:", error);
      res.status(500).json({ message: "Failed to save property rating" });
    }
  });
  app2.get("/api/tours/:tourId/ratings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { tourId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ message: "Tour not found" });
      }
      if (user.role === "client" && tour.clientId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your own tours" });
      }
      if (user.role === "agent" && tour.agentId !== userId) {
        return res.status(403).json({ message: "You can only view ratings for your tours" });
      }
      const ratings = await storage.getPropertyRatingsByTour(tourId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching tour ratings:", error);
      res.status(500).json({ message: "Failed to fetch tour ratings" });
    }
  });
  app2.get("/api/clients/:clientId/ratings", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      const { clientId } = req.params;
      if (user?.role === "client" && user.id !== clientId) {
        return res.status(403).json({ message: "You can only view your own ratings" });
      }
      if (user?.role === "agent") {
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
  app2.get("/api/tours/:tourId/properties/:propertyId/agent-review", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.id;
      const { tourId, propertyId } = req.params;
      const tour = await storage.getTour(tourId);
      if (!tour) return res.status(404).json({ message: "Tour not found" });
      if (tour.agentId !== userId) return res.status(403).json({ message: "Access denied" });
      const tp = await storage.getTourProperty(tourId, propertyId);
      if (!tp) return res.status(404).json({ message: "Tour property not found" });
      res.json({ agentRating: tp.agentRating ?? null, agentNotes: tp.agentNotes ?? null });
    } catch (error) {
      console.error("Error fetching agent review:", error);
      res.status(500).json({ message: "Failed to fetch agent review" });
    }
  });
  app2.patch("/api/tours/:tourId/properties/:propertyId/agent-review", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.id;
      const { tourId, propertyId } = req.params;
      const { agentRating, agentNotes } = req.body;
      if (!agentRating || agentRating < 1 || agentRating > 5) {
        return res.status(400).json({ message: "agentRating must be between 1 and 5" });
      }
      if (!agentNotes || typeof agentNotes !== "string" || agentNotes.trim().length === 0) {
        return res.status(400).json({ message: "agentNotes is required" });
      }
      const tour = await storage.getTour(tourId);
      if (!tour) return res.status(404).json({ message: "Tour not found" });
      if (tour.agentId !== userId) return res.status(403).json({ message: "Only the tour agent can add agent reviews" });
      const updated = await storage.updateAgentPropertyReview(tourId, propertyId, agentRating, agentNotes.trim());
      res.json(updated);
    } catch (error) {
      console.error("Error saving agent review:", error);
      res.status(500).json({ message: "Failed to save agent review" });
    }
  });
  app2.get("/api/tours/date/:date", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const date = req.params.date;
      const tours2 = await storage.getToursByDate(userId, date);
      res.json(tours2);
    } catch (error) {
      console.error("Error fetching tours by date:", error);
      res.status(500).json({ message: "Failed to fetch tours" });
    }
  });
  app2.post("/api/tours/optimize-route", isAuthenticated, async (req, res) => {
    try {
      console.log("Optimize route request received:", { startingAddress: req.body.startingAddress, toursCount: req.body.tours?.length });
      const { startingAddress, tours: tours2 } = req.body;
      if (!startingAddress || !tours2 || tours2.length === 0) {
        console.log("Invalid request data:", { startingAddress, toursLength: tours2?.length });
        return res.status(400).json({ message: "Starting address and tours are required" });
      }
      const optimizedRoute = await optimizeTourRoute(startingAddress, tours2);
      console.log("Sending optimized route response:", optimizedRoute);
      res.json(optimizedRoute);
    } catch (error) {
      console.error("Error optimizing route:", error);
      res.status(500).json({ message: "Failed to optimize route" });
    }
  });
  app2.post("/api/tours/recap", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const recapData = req.body;
      const recap = await storage.saveTourRecap({
        ...recapData,
        agentId: userId
      });
      res.json(recap);
    } catch (error) {
      console.error("Error saving tour recap:", error);
      res.status(500).json({ message: "Failed to save tour recap" });
    }
  });
  app2.get("/api/tours/recap/:date", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { date } = req.params;
      const recap = await storage.getTourRecap(userId, date);
      res.json(recap);
    } catch (error) {
      console.error("Error fetching tour recap:", error);
      res.status(500).json({ message: "Failed to fetch tour recap" });
    }
  });
  app2.patch("/api/tours/recap/:id", isAuthenticated, async (req, res) => {
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
  app2.get("/api/tours/summary/:date", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { date } = req.params;
      const summary = await storage.getTourSummary(userId, date);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching tour summary:", error);
      res.status(500).json({ message: "Failed to fetch tour summary" });
    }
  });
  app2.get("/api/tours/report", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { startDate, endDate, clientFilter, statusFilter } = req.query;
      const tours2 = await storage.getToursForReport({
        agentId: currentUser.id,
        startDate,
        endDate,
        clientFilter,
        statusFilter
      });
      res.json(tours2);
    } catch (error) {
      console.error("Error fetching tour report:", error);
      res.status(500).json({ message: "Failed to fetch tour report" });
    }
  });
  app2.get("/api/clients/:clientId/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const currentUser = await storage.getUser(userId);
      const { clientId } = req.params;
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const agentId = currentUser.role === "agent" ? currentUser.id : void 0;
      if (currentUser.role === "client" && clientId !== currentUser.id) {
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
  app2.get("/api/reminders/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const reminders = await storage.getTourReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });
  app2.post("/api/reminders", isAuthenticated, async (req, res) => {
    try {
      const reminderData = req.body;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== reminderData.userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const reminder = await storage.createTourReminder(reminderData);
      try {
        const fullName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Agent";
        if (reminderData.sendEmail !== false && currentUser.email) {
          if (reminderData.tourId || reminderData.propertyAddress) {
            const emailData = {
              agentName: fullName,
              clientName: reminderData.clientName || "Client",
              propertyAddress: reminderData.propertyAddress || "Property",
              tourDate: new Date(reminderData.reminderDate).toLocaleDateString(),
              tourTime: reminderData.reminderTime || "9:00 AM",
              agentPhone: reminderData.agentPhone,
              // Use phone from reminder data
              notes: reminderData.notes
            };
            const emailTemplate = generateTourReminderEmail(emailData);
            await sendEmail({
              to: currentUser.email,
              from: "notifications@estatevista.com",
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html
            });
            console.log(`Tour reminder email sent to ${currentUser.email}`);
          } else {
            await sendEmail({
              to: currentUser.email,
              from: "notifications@estatevista.com",
              subject: `Reminder: ${reminderData.title || "Estate Vista Notification"}`,
              text: `Hi ${fullName || "there"},

This is a reminder about: ${reminderData.notes || reminderData.title}

Scheduled for: ${new Date(reminderData.reminderDate).toLocaleString()}

Best regards,
Estate Vista Team`,
              html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #3b82f6;">\u{1F4CB} Reminder Notification</h2>
                  <p>Hi <strong>${fullName || "there"}</strong>,</p>
                  <p>This is a reminder about:</p>
                  <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <strong>${reminderData.title || "Estate Vista Notification"}</strong>
                    ${reminderData.notes ? `<p style="margin: 8px 0 0 0; color: #6b7280;">${reminderData.notes}</p>` : ""}
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
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });
  app2.put("/api/reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let canAccess = false;
      if (currentUser.role === "client") {
        const userReminders = await storage.getTourReminders(currentUser.id);
        canAccess = userReminders.some((r) => r.id === id);
      } else if (currentUser.role === "agent") {
        const agentClients = await storage.getClients(currentUser.id);
        for (const client of agentClients) {
          const clientReminders = await storage.getTourReminders(client.id);
          if (clientReminders.some((r) => r.id === id)) {
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
  app2.delete("/api/reminders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let canAccess = false;
      if (currentUser.role === "client") {
        const userReminders = await storage.getTourReminders(currentUser.id);
        canAccess = userReminders.some((r) => r.id === id);
      } else if (currentUser.role === "agent") {
        const agentClients = await storage.getClients(currentUser.id);
        for (const client of agentClients) {
          const clientReminders = await storage.getTourReminders(client.id);
          if (clientReminders.some((r) => r.id === id)) {
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
  app2.get("/api/property-suggestions", isAuthenticated, async (req, res) => {
    try {
      const { clientId, agentId, status } = req.query;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const filters = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
        if (clientId) filters.clientId = clientId;
      }
      if (status) filters.status = status;
      const suggestions = await storage.getPropertySuggestions(filters);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching property suggestions:", error);
      res.status(500).json({ message: "Failed to fetch property suggestions" });
    }
  });
  app2.post("/api/property-suggestions", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (currentUser.role !== "client") {
        return res.status(403).json({ message: "Only clients can suggest properties" });
      }
      const suggestionData = {
        ...req.body,
        clientId: currentUser.id,
        agentId: currentUser.agentId || req.body.agentId
      };
      const suggestion = await storage.createPropertySuggestion(suggestionData);
      res.json(suggestion);
    } catch (error) {
      console.error("Error creating property suggestion:", error);
      res.status(500).json({ message: "Failed to create property suggestion" });
    }
  });
  app2.put("/api/property-suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const filters = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
      }
      const suggestions = await storage.getPropertySuggestions(filters);
      const existingSuggestion = suggestions.find((s) => s.id === id);
      if (!existingSuggestion) {
        return res.status(403).json({ message: "Access denied - not authorized to update this suggestion" });
      }
      const updates = req.body;
      const suggestion = await storage.updatePropertySuggestion(id, updates);
      res.json(suggestion);
    } catch (error) {
      console.error("Error updating property suggestion:", error);
      res.status(500).json({ message: "Failed to update property suggestion" });
    }
  });
  app2.delete("/api/property-suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const filters = {};
      if (currentUser.role === "client") {
        filters.clientId = currentUser.id;
      } else if (currentUser.role === "agent") {
        filters.agentId = currentUser.id;
      }
      const suggestions = await storage.getPropertySuggestions(filters);
      const existingSuggestion = suggestions.find((s) => s.id === id);
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
  app2.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.sendStatus(401);
      }
      const userId = currentUser.id;
      const { ObjectStorageService: ObjectStorageService2, ObjectNotFoundError: ObjectNotFoundError2 } = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
      const { ObjectPermission: ObjectPermission2 } = await Promise.resolve().then(() => (init_objectAcl(), objectAcl_exports));
      const objectStorageService = new ObjectStorageService2();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId,
          requestedPermission: ObjectPermission2.READ
        });
        if (!canAccess) {
          return res.sendStatus(403);
        }
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        if (error instanceof ObjectNotFoundError2) {
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
  app2.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { clientId, type } = req.query;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access this endpoint" });
      }
      const filterClientId = clientId === "null" ? null : clientId;
      const documents2 = await storage.getDocumentsByAgent(currentUser.id, filterClientId, type);
      res.json(documents2);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  app2.get("/api/documents/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { type } = req.query;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const documents2 = await storage.getDocuments(userId, type);
      res.json(documents2);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  app2.post("/api/documents/upload", isAuthenticated, async (req, res) => {
    try {
      if (cloudinaryService.isEnabled()) {
        const signedParams = cloudinaryService.generateSignedUploadParams();
        res.json({
          type: "cloudinary",
          ...signedParams
        });
      } else {
        const { ObjectStorageService: ObjectStorageService2 } = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
        const objectStorageService = new ObjectStorageService2();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ type: "object-storage", uploadURL });
      }
    } catch (error) {
      console.error("Error getting upload params:", error);
      if (error instanceof Error && (error.message.includes("PRIVATE_OBJECT_DIR not set") || error.message.includes("not configured"))) {
        return res.status(503).json({
          message: "Document storage is not configured. Please contact your administrator.",
          error: "STORAGE_NOT_CONFIGURED"
        });
      }
      res.status(500).json({ message: "Failed to get upload parameters" });
    }
  });
  app2.post("/api/documents/upload-direct", isAuthenticated, async (req, res) => {
    try {
      const { title, description, documentType, tags, expirationDate, base64Data, mimeType, size, originalName, clientId } = req.body;
      if (!base64Data) {
        return res.status(400).json({ message: "base64Data is required" });
      }
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const userId = currentUser.id;
      const maxSize = 25 * 1024 * 1024;
      if (size && size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 25MB" });
      }
      let documentUrl;
      if (cloudinaryService.isEnabled()) {
        try {
          const uploadResult = await cloudinaryService.uploadFromBase64(base64Data, {
            folder: `estate-vista/documents/${userId}`,
            resourceType: "raw",
            tags: [userId, documentType || "document", clientId || "general"].filter(Boolean)
          });
          documentUrl = uploadResult.secureUrl;
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload document to cloud storage" });
        }
      } else {
        documentUrl = `data:${mimeType};base64,${base64Data}`;
      }
      const processedTags = tags ? typeof tags === "string" ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : tags : [];
      const document = await storage.createDocument({
        userId,
        clientId: clientId || null,
        documentType,
        title,
        description,
        tags: processedTags.length > 0 ? processedTags : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        filename: originalName || title || "document",
        originalName: originalName || title,
        url: documentUrl,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0
      });
      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });
  app2.put("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { title, description, documentType, tags, expirationDate, uploadURL, mimeType, size, originalName, clientId } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ message: "uploadURL is required" });
      }
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const userId = currentUser.id;
      const processedTags = tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
      let finalPath = uploadURL;
      if (!uploadURL.startsWith("https://res.cloudinary.com")) {
        try {
          const { ObjectStorageService: ObjectStorageService2 } = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
          const objectStorageService = new ObjectStorageService2();
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
          const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
            uploadURL,
            {
              owner: userId,
              visibility: "private"
            }
          );
          finalPath = objectPath.startsWith("/objects/") ? objectPath : normalizedPath;
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
        filename: finalPath.split("/").pop() || "unknown",
        originalName: originalName || title,
        url: finalPath,
        mimeType: mimeType || "application/octet-stream",
        size: size || 0
      });
      res.json(document);
    } catch (error) {
      console.error("Error creating document metadata:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });
  app2.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (document.userId !== currentUser.id && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      if (document.url.startsWith("https://res.cloudinary.com")) {
        return res.redirect(document.url);
      }
      if (document.url.startsWith("data:")) {
        const matches = document.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
          res.setHeader("Content-Length", buffer.length);
          return res.send(buffer);
        }
      }
      const { ObjectStorageService: ObjectStorageService2, ObjectNotFoundError: ObjectNotFoundError2 } = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
      const { ObjectPermission: ObjectPermission2 } = await Promise.resolve().then(() => (init_objectAcl(), objectAcl_exports));
      const objectStorageService = new ObjectStorageService2();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(document.url);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: currentUser.id,
          requestedPermission: ObjectPermission2.READ
        });
        if (!canAccess) {
          return res.sendStatus(403);
        }
        res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        if (error instanceof ObjectNotFoundError2) {
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
  app2.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
  app2.post("/api/documents/bulk-upload", isAuthenticated, async (req, res) => {
    try {
      const { userId, titles, descriptions, documentTypes } = req.body;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const titleArray = Array.isArray(titles) ? titles : [titles];
      const descriptionArray = Array.isArray(descriptions) ? descriptions : [descriptions];
      const typeArray = Array.isArray(documentTypes) ? documentTypes : [documentTypes];
      const uploadedDocuments = [];
      const failedUploads = [];
      for (let i = 0; i < titleArray.length; i++) {
        try {
          const title = titleArray[i] || `Document ${i + 1}`;
          const description = descriptionArray[i] || `Bulk uploaded document ${i + 1}`;
          const documentType = typeArray[i] || "offer_placed";
          const document = await storage.createDocument({
            userId,
            documentType,
            title,
            description,
            filename: `bulk-${Date.now()}-${i}-${title}`,
            originalName: title,
            url: `/uploads/bulk-${Date.now()}-${i}-${title}`,
            // Mock URL
            mimeType: "application/pdf",
            // Mock - would come from actual file
            size: Math.floor(Math.random() * 1024 * 1e3) + 1024 * 100
            // Mock - would come from actual file
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
  app2.delete("/api/documents/bulk-delete", isAuthenticated, async (req, res) => {
    try {
      const { documentIds } = req.body;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "Document IDs array is required" });
      }
      const deletedDocuments = [];
      const failedDeletes = [];
      for (const docId of documentIds) {
        try {
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
  app2.post("/api/documents/bulk-download", isAuthenticated, async (req, res) => {
    try {
      const { documentIds, zipFilename } = req.body;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ message: "Document IDs array is required" });
      }
      const filename = zipFilename || `documents-${Date.now()}.zip`;
      const mockZipContent = {
        filename,
        documentsIncluded: documentIds.length,
        estimatedSize: documentIds.length * 1024 * 200,
        // Mock 200KB per document
        created: (/* @__PURE__ */ new Date()).toISOString(),
        note: "This is a mock implementation. In production, this would contain the actual document files."
      };
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.json(mockZipContent);
      console.log(`Mock bulk download: ${documentIds.length} documents for user ${currentUser?.id || "unknown"}`);
    } catch (error) {
      console.error("Error in bulk download:", error);
      res.status(500).json({ message: "Failed to process bulk download" });
    }
  });
  app2.get("/api/location-shares/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const locationShares2 = await storage.getLocationShares(userId);
      res.json(locationShares2);
    } catch (error) {
      console.error("Error fetching location shares:", error);
      res.status(500).json({ message: "Failed to fetch location shares" });
    }
  });
  app2.post("/api/location-shares", isAuthenticated, async (req, res) => {
    try {
      const locationShare = await storage.createLocationShare(req.body);
      res.json(locationShare);
    } catch (error) {
      console.error("Error creating location share:", error);
      res.status(500).json({ message: "Failed to create location share" });
    }
  });
  app2.delete("/api/location-shares/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLocationShare(id);
      res.json({ message: "Location share stopped successfully" });
    } catch (error) {
      console.error("Error stopping location share:", error);
      res.status(500).json({ message: "Failed to stop location share" });
    }
  });
  app2.get("/api/location-history/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { tourId, propertyId, startDate, endDate, activityType } = req.query;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const filters = { userId };
      if (tourId) filters.tourId = tourId;
      if (propertyId) filters.propertyId = propertyId;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filters.startDate = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.endDate = end;
      }
      if (activityType) filters.activityType = activityType;
      const locationHistory2 = await storage.getLocationHistory(filters);
      res.json(locationHistory2);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });
  app2.post("/api/location-history", isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const validationResult = insertLocationHistorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid location history data",
          errors: validationResult.error.errors
        });
      }
      const { userId } = validationResult.data;
      if (currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const locationHistory2 = await storage.createLocationHistory(validationResult.data);
      res.json(locationHistory2);
    } catch (error) {
      console.error("Error creating location history:", error);
      res.status(500).json({ message: "Failed to create location history" });
    }
  });
  app2.get("/api/location-analytics/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange = { start, end };
      }
      const analytics = await storage.getLocationAnalytics(userId, dateRange);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching location analytics:", error);
      res.status(500).json({ message: "Failed to fetch location analytics" });
    }
  });
  app2.get("/api/calendar-integrations/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.session.user.id !== userId && req.user.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const calendarBlocks = await storage.getCalendarIntegrations(userId);
      res.json(calendarBlocks);
    } catch (error) {
      console.error("Error fetching calendar integrations:", error);
      res.status(500).json({ message: "Failed to fetch calendar integrations" });
    }
  });
  app2.post("/api/calendar-integrations", isAuthenticated, async (req, res) => {
    try {
      const calendarBlock = await storage.createCalendarIntegration(req.body);
      res.json(calendarBlock);
    } catch (error) {
      console.error("Error creating calendar integration:", error);
      res.status(500).json({ message: "Failed to create calendar integration" });
    }
  });
  app2.patch("/api/calendar-integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const calendarBlock = await storage.updateCalendarIntegration(id, req.body);
      res.json(calendarBlock);
    } catch (error) {
      console.error("Error updating calendar integration:", error);
      res.status(500).json({ message: "Failed to update calendar integration" });
    }
  });
  app2.delete("/api/calendar-integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarIntegration(id);
      res.json({ message: "Calendar integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar integration:", error);
      res.status(500).json({ message: "Failed to delete calendar integration" });
    }
  });
  app2.get("/api/calendar-events/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser || currentUser.id !== userId && currentUser.role !== "agent") {
        return res.status(403).json({ message: "Access denied" });
      }
      const calendarEvents2 = await storage.getCalendarEvents(userId);
      res.json(calendarEvents2);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  app2.post("/api/calendar-events", isAuthenticated, async (req, res) => {
    try {
      const calendarEvent = await storage.createCalendarEvent(req.body);
      res.json(calendarEvent);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });
  app2.patch("/api/calendar-events/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const calendarEvent = await storage.updateCalendarEvent(id, req.body);
      res.json(calendarEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });
  app2.delete("/api/calendar-events/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarEvent(id);
      res.json({ message: "Calendar event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });
  app2.get("/api/schedules/date/:date", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.params;
      const schedules = await storage.getSchedulesByDate(date);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });
  app2.patch("/api/schedules/:id", isAuthenticated, async (req, res) => {
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
  app2.delete("/api/schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSchedule(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });
  app2.get("/api/settings/branding", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access branding settings" });
      }
      const settings = await db.select().from(agentBrandingSettings).where(eq4(agentBrandingSettings.agentId, userId)).limit(1);
      if (settings.length === 0) {
        return res.json(null);
      }
      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ message: "Failed to fetch branding settings" });
    }
  });
  app2.put("/api/settings/branding", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access branding settings" });
      }
      const validatedData = insertAgentBrandingSettingSchema.parse({
        ...req.body,
        agentId: userId,
        updatedBy: userId
      });
      const existing = await db.select().from(agentBrandingSettings).where(eq4(agentBrandingSettings.agentId, userId)).limit(1);
      let result;
      let diff = null;
      if (existing.length > 0) {
        diff = {
          before: existing[0],
          after: validatedData
        };
        const updated = await db.update(agentBrandingSettings).set({
          ...validatedData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq4(agentBrandingSettings.agentId, userId)).returning();
        result = updated[0];
      } else {
        diff = {
          before: null,
          after: validatedData
        };
        const created = await db.insert(agentBrandingSettings).values(validatedData).returning();
        result = created[0];
      }
      await db.insert(settingsVersions).values({
        agentId: userId,
        tab: "branding",
        diff,
        updatedBy: userId
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
  app2.post("/api/uploads/agent-logo", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can upload logos" });
      }
      const { base64Data, mimeType } = req.body;
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
            resourceType: "image",
            tags: [userId, "agent-logo"]
          });
          return res.json({ url: uploadResult.secureUrl, type: "cloudinary" });
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed:", cloudinaryError);
          return res.status(500).json({ message: "Failed to upload logo" });
        }
      }
      if (cloudinaryService.isEnabled()) {
        const signedParams = cloudinaryService.generateSignedUploadParams();
        return res.json({ type: "cloudinary-signed", ...signedParams });
      }
      const { ObjectStorageService: ObjectStorageService2 } = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
      const objectStorageService = new ObjectStorageService2();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ url: uploadURL, type: "object-storage" });
    } catch (error) {
      console.error("Error handling logo upload:", error);
      if (error instanceof Error && (error.message.includes("PRIVATE_OBJECT_DIR not set") || error.message.includes("not configured"))) {
        return res.status(503).json({
          message: "Logo storage is not configured. Please contact your administrator.",
          error: "STORAGE_NOT_CONFIGURED"
        });
      }
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });
  app2.get("/api/settings/branding/my-agent", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role?.toLowerCase() !== "client") {
        return res.status(403).json({ message: "Only clients can access this endpoint" });
      }
      const agentId = user.agentId;
      if (!agentId) {
        return res.json(null);
      }
      const settings = await db.select().from(agentBrandingSettings).where(eq4(agentBrandingSettings.agentId, agentId)).limit(1);
      if (settings.length === 0) {
        return res.json(null);
      }
      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching agent branding:", error);
      res.status(500).json({ message: "Failed to fetch agent branding" });
    }
  });
  app2.get("/api/directory/contacts", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access directory" });
      }
      const { search, relationshipType, hasApp } = req.query;
      const filters = {};
      if (search) filters.search = search;
      if (relationshipType) filters.relationshipType = relationshipType;
      if (hasApp !== void 0) filters.hasApp = hasApp === "true";
      const contacts2 = await storage.getContacts(user.id, filters);
      res.json(contacts2);
    } catch (error) {
      console.error("Error fetching directory contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.get("/api/directory/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.post("/api/directory/contacts", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.put("/api/directory/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.delete("/api/directory/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.post("/api/clients/:clientId/contacts/link", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can link contacts" });
      }
      const { clientId } = req.params;
      const { contactId, relationshipType } = req.body;
      const link = await storage.linkContactToClient({
        clientId,
        contactId,
        relationshipType,
        isPrimary: false
      });
      res.json(link);
    } catch (error) {
      console.error("Error linking contact:", error);
      res.status(500).json({ message: "Failed to link contact" });
    }
  });
  app2.delete("/api/clients/:clientId/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.get("/api/clients/:clientId/contacts", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
        return res.status(403).json({ message: "Only agents can access client contacts" });
      }
      const { clientId } = req.params;
      const contacts2 = await storage.getClientContacts(clientId);
      res.json(contacts2);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });
  app2.get("/api/directory/contacts/:contactId/timeline", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "agent") {
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
  app2.get("/api/broker/kpis", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }
      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const agentIds = linkedAgents.map((la) => la.agentId);
      const totalAgents = agentIds.length;
      const allClients = [];
      for (const agentId of agentIds) {
        const clients = await storage.getClients(agentId);
        allClients.push(...clients);
      }
      const allTours = [];
      for (const agentId of agentIds) {
        const agentTours = await storage.getTours({ agentId });
        allTours.push(...agentTours);
      }
      const allOffers = [];
      for (const client of allClients) {
        const clientOffers = await storage.getOffers({ clientId: client.id });
        allOffers.push(...clientOffers);
      }
      const completedTours = allTours.filter((t) => t.status === "completed").length;
      const upcomingTours = allTours.filter((t) => t.status === "scheduled").length;
      const totalDistance = allTours.reduce((sum2, t) => sum2 + (Number(t.totalDistance) || 0), 0);
      const totalHours = allTours.reduce((sum2, t) => sum2 + (Number(t.actualDuration) || 0) / 60, 0);
      const draftOffers = allOffers.filter((o) => o.status === "draft").length;
      const submittedOffers = allOffers.filter((o) => o.status === "submitted").length;
      const acceptedOffers = allOffers.filter((o) => o.status === "accepted").length;
      const rejectedOffers = allOffers.filter((o) => o.status === "rejected").length;
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
  app2.get("/api/broker/agents", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }
      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const agentsWithDetails = [];
      for (const link of linkedAgents) {
        const agent = await storage.getUser(link.agentId);
        if (agent) {
          const clients = await storage.getClients(agent.id);
          const tours2 = await storage.getTours({ agentId: agent.id });
          agentsWithDetails.push({
            ...agent,
            brokerageRole: link.role,
            activeClients: clients.length,
            totalTours: tours2.length,
            completedTours: tours2.filter((t) => t.status === "completed").length
          });
        }
      }
      res.json(agentsWithDetails);
    } catch (error) {
      console.error("Error fetching broker agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });
  app2.get("/api/broker/clients", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can access this endpoint" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }
      const linkedAgents = await storage.getBrokerageAgents(brokerage.id);
      const allClients = [];
      for (const link of linkedAgents) {
        const agent = await storage.getUser(link.agentId);
        const clients = await storage.getClients(link.agentId);
        for (const client of clients) {
          const tours2 = await storage.getTours({ clientId: client.id });
          allClients.push({
            ...client,
            agentName: `${agent?.firstName} ${agent?.lastName}`,
            totalTours: tours2.length,
            completedTours: tours2.filter((t) => t.status === "completed").length
          });
        }
      }
      res.json(allClients);
    } catch (error) {
      console.error("Error fetching broker clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.post("/api/broker/agents/link", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can link agents" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }
      const { agentId, agentEmail } = req.body;
      let resolvedAgentId = agentId;
      if (!resolvedAgentId && agentEmail) {
        const agentUser = await storage.getUserByEmail(agentEmail);
        if (!agentUser || agentUser.role !== "agent") {
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
  app2.get("/api/broker/settings", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can access settings" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
      if (!brokerage) {
        return res.status(404).json({ message: "Brokerage not found" });
      }
      res.json(brokerage);
    } catch (error) {
      console.error("Error fetching brokerage settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  app2.put("/api/broker/settings", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "brokerage") {
        return res.status(403).json({ message: "Only brokerage users can update settings" });
      }
      const brokerage = await storage.getBrokerageByOwnerEmail(user.email);
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
        logoUrl
      });
      res.json(updatedBrokerage);
    } catch (error) {
      console.error("Error updating brokerage settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  const isSuperAdmin = async (req, res, next) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role?.toLowerCase() !== "superadmin") {
        return res.status(403).json({ message: "Only super admins can access this endpoint" });
      }
      req.adminUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization error" });
    }
  };
  app2.get("/api/admin/kpis", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allBrokerages = await db.select().from(brokerages);
      const agents = allUsers.filter((u) => u.role === "agent");
      const clients = allUsers.filter((u) => u.role === "client");
      let allTours = [];
      for (const agent of agents) {
        const agentTours = await storage.getTours({ agentId: agent.id });
        allTours.push(...agentTours);
      }
      let allOffers = [];
      for (const client of clients) {
        const clientOffers = await storage.getOffers({ clientId: client.id });
        allOffers.push(...clientOffers);
      }
      const brokerageAgentLinks = await db.select().from(brokerageAgents);
      const brokerageAgentsCount = brokerageAgentLinks.length;
      const independentAgents = agents.length - brokerageAgentsCount;
      const completedTours = allTours.filter((t) => t.status === "completed").length;
      const upcomingTours = allTours.filter((t) => t.status === "scheduled").length;
      const totalDistance = allTours.reduce((sum2, t) => sum2 + (Number(t.totalDistance) || 0), 0);
      const totalHours = allTours.reduce((sum2, t) => sum2 + (Number(t.actualDuration) || 0) / 60, 0);
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
          draft: allOffers.filter((o) => o.status === "draft").length,
          submitted: allOffers.filter((o) => o.status === "submitted").length,
          accepted: allOffers.filter((o) => o.status === "accepted").length,
          rejected: allOffers.filter((o) => o.status === "rejected").length
        }
      });
    } catch (error) {
      console.error("Error fetching admin KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });
  app2.get("/api/admin/brokerages", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const allBrokerages = await db.select().from(brokerages);
      const enrichedBrokerages = await Promise.all(allBrokerages.map(async (brokerage) => {
        const agentLinks = await storage.getBrokerageAgents(brokerage.id);
        let clientCount = 0;
        let tourCount = 0;
        for (const link of agentLinks) {
          const clients = await storage.getClients(link.agentId);
          clientCount += clients.length;
          const tours2 = await storage.getTours({ agentId: link.agentId });
          tourCount += tours2.length;
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
  app2.post("/api/admin/brokerages", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { adminEmail, adminFirstName, adminLastName, ...brokerageData } = req.body;
      const brokerage = await storage.createBrokerage(brokerageData);
      let brokerageUser = null;
      let tempPassword = null;
      if (adminEmail) {
        tempPassword = generatePassword();
        const [newUser] = await db.insert(users).values({
          email: adminEmail,
          firstName: adminFirstName || brokerageData.name || "Brokerage",
          lastName: adminLastName || "Admin",
          role: "brokerage",
          passwordHash: hashPassword2(tempPassword)
        }).returning();
        brokerageUser = newUser;
      }
      res.json({ ...brokerage, brokerageUser, tempPassword });
    } catch (error) {
      console.error("Error creating brokerage:", error);
      res.status(500).json({ message: "Failed to create brokerage" });
    }
  });
  app2.put("/api/admin/brokerages/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const brokerage = await storage.updateBrokerage(req.params.id, req.body);
      res.json(brokerage);
    } catch (error) {
      console.error("Error updating brokerage:", error);
      res.status(500).json({ message: "Failed to update brokerage" });
    }
  });
  app2.delete("/api/admin/brokerages/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      await storage.deleteBrokerage(req.params.id);
      res.json({ message: "Brokerage deleted successfully" });
    } catch (error) {
      console.error("Error deleting brokerage:", error);
      res.status(500).json({ message: "Failed to delete brokerage" });
    }
  });
  app2.get("/api/admin/agents", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const agents = allUsers.filter((u) => u.role === "agent");
      const enrichedAgents = await Promise.all(agents.map(async (agent) => {
        const brokerageLink = await storage.getBrokerageForAgent(agent.id);
        let brokerageName = "Independent";
        if (brokerageLink) {
          const brokerage = await storage.getBrokerage(brokerageLink.brokerageId);
          brokerageName = brokerage?.name || "Unknown";
        }
        const clients = await storage.getClients(agent.id);
        const tours2 = await storage.getTours({ agentId: agent.id });
        const offers2 = [];
        for (const client of clients) {
          const clientOffers = await storage.getOffers({ clientId: client.id });
          offers2.push(...clientOffers);
        }
        return {
          ...agent,
          brokerageName,
          clientCount: clients.length,
          tourCount: tours2.filter((t) => t.status === "completed").length,
          upcomingTours: tours2.filter((t) => t.status === "scheduled").length,
          offerCount: offers2.length
        };
      }));
      res.json(enrichedAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });
  app2.post("/api/admin/agents", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, brokerageId } = req.body;
      const tempPassword = generatePassword();
      const [agent] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        role: "agent",
        passwordHash: hashPassword2(tempPassword)
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
  app2.put("/api/admin/agents/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { brokerageId, ...userData } = req.body;
      const [agent] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, req.params.id)).returning();
      const existingLink = await storage.getBrokerageForAgent(req.params.id);
      if (brokerageId && brokerageId !== "independent") {
        if (existingLink && existingLink.brokerageId !== brokerageId) {
          await storage.unlinkAgentFromBrokerage(existingLink.brokerageId, req.params.id);
        }
        if (!existingLink || existingLink.brokerageId !== brokerageId) {
          await storage.linkAgentToBrokerage(brokerageId, req.params.id);
        }
      } else if (brokerageId === "independent" && existingLink) {
        await storage.unlinkAgentFromBrokerage(existingLink.brokerageId, req.params.id);
      }
      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });
  app2.delete("/api/admin/agents/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "Agent deleted successfully" });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });
  app2.get("/api/admin/clients", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const clients = allUsers.filter((u) => u.role === "client");
      const enrichedClients = await Promise.all(clients.map(async (client) => {
        let agentName = "Unassigned";
        let brokerageName = "N/A";
        if (client.agentId) {
          const agent = await storage.getUser(client.agentId);
          if (agent) {
            agentName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim();
            const brokerageLink = await storage.getBrokerageForAgent(agent.id);
            if (brokerageLink) {
              const brokerage = await storage.getBrokerage(brokerageLink.brokerageId);
              brokerageName = brokerage?.name || "Unknown";
            } else {
              brokerageName = "Independent";
            }
          }
        }
        const tours2 = await storage.getTours({ clientId: client.id });
        const offers2 = await storage.getOffers({ clientId: client.id });
        return {
          ...client,
          agentName,
          brokerageName,
          tourCount: tours2.length,
          offerCount: offers2.length
        };
      }));
      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.get("/api/admin/reports", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const agents = allUsers.filter((u) => u.role === "agent");
      const clients = allUsers.filter((u) => u.role === "client");
      let allTours = [];
      let allOffers = [];
      let allRatings = [];
      for (const agent of agents) {
        const tours2 = await storage.getTours({ agentId: agent.id });
        allTours.push(...tours2);
      }
      for (const client of clients) {
        const offers2 = await storage.getOffers({ clientId: client.id });
        allOffers.push(...offers2);
        const ratings = await db.select().from(propertyRatings).where(eq4(propertyRatings.clientId, client.id));
        allRatings.push(...ratings);
      }
      const offerAnalytics = {
        total: allOffers.length,
        draft: allOffers.filter((o) => o.status === "draft").length,
        submitted: allOffers.filter((o) => o.status === "submitted").length,
        accepted: allOffers.filter((o) => o.status === "accepted").length,
        rejected: allOffers.filter((o) => o.status === "rejected").length
      };
      const ratingCategories = allRatings.reduce((acc, rating) => {
        const action = rating.actionCategory || "other";
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});
      res.json({
        tourMetrics: {
          total: allTours.length,
          completed: allTours.filter((t) => t.status === "completed").length,
          scheduled: allTours.filter((t) => t.status === "scheduled").length
        },
        offerAnalytics,
        ratingCategories
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });
  app2.post("/api/properties/:propertyId/shortlist", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const shortlist = await storage.addToShortlist(req.params.propertyId, user.id);
      res.json(shortlist);
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ message: "Failed to add to shortlist" });
    }
  });
  app2.delete("/api/properties/:propertyId/shortlist", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.removeFromShortlist(req.params.propertyId, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ message: "Failed to remove from shortlist" });
    }
  });
  app2.get("/api/shortlists", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const shortlists = await storage.getShortlistedProperties(user.id);
      res.json(shortlists);
    } catch (error) {
      console.error("Error fetching shortlists:", error);
      res.status(500).json({ message: "Failed to fetch shortlists" });
    }
  });
  app2.post("/api/seed", async (req, res) => {
    try {
      const result = await seedDatabase();
      res.json(result);
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ message: "Failed to seed database", error: String(error) });
    }
  });
  app2.post("/api/seed/brokerage-demo", async (req, res) => {
    try {
      const result = await seedBrokerageDemo();
      res.json(result);
    } catch (error) {
      console.error("Error seeding brokerage demo:", error);
      res.status(500).json({ message: "Failed to seed brokerage demo", error: error instanceof Error ? error.message : JSON.stringify(error) });
    }
  });
  app2.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const convs = await storage.getConversations(user.id, user.role || "client");
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  app2.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { otherUserId } = req.body;
      if (!otherUserId) return res.status(400).json({ message: "otherUserId required" });
      let agentId, clientId;
      if (user.role === "agent") {
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
  app2.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { conversationId } = req.params;
      const messages = await storage.getMessages(conversationId);
      await storage.markMessagesRead(conversationId, user.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/conversations/:conversationId/messages", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
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
  app2.get("/api/conversations/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const count2 = await storage.getUnreadMessageCount(user.id);
      res.json({ count: count2 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
var app = express();
function getAllowedOrigins() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const origins = [
    /^https:\/\/[^.]+\.vercel\.app$/,
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/
  ];
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean).forEach((o) => origins.push(o));
  }
  return origins;
}
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use((req, _res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = _res.json;
  _res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(_res, [bodyJson, ...args]);
  };
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${_res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "\u2026";
      console.log(logLine);
    }
  });
  next();
});
var initPromise = (async () => {
  await setupAuth(app);
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  return server;
})();

// api/_handler.ts
var ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[^.]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];
function resolveOrigin(requestOrigin) {
  if (!requestOrigin) return void 0;
  const extra = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean) : [];
  const allowed = ALLOWED_ORIGIN_PATTERNS.some((r) => r.test(requestOrigin)) || extra.includes(requestOrigin);
  return allowed ? requestOrigin : void 0;
}
async function handler(req, res) {
  const origin = resolveOrigin(req.headers.origin);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  await initPromise;
  app(req, res);
}
export {
  handler as default
};
