import { sql } from 'drizzle-orm';
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
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage (Drizzle; connect-pg-simple uses separate `session` table)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  // Name must differ from connect-pg-simple's "IDX_session_expire" on table "session"
  (table) => [index("IDX_sessions_table_expire").on(table.expire)],
);

// Application users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // Hashed password for client accounts
  role: varchar("role", { enum: ["agent", "client", "brokerage", "superadmin"] }).notNull().default("client"),
  clientType: varchar("client_type", { enum: ["buyer", "renter"] }), // Only for clients
  agentId: varchar("agent_id"),
  driveFolderUrl: varchar("drive_folder_url"), // Manual Google Drive folder URL (simplified integration)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rental profiles for renter clients
// Enhanced Requirements System for comprehensive client management

// Core requirements table with versioning and validation
export const clientRequirements = pgTable("client_requirements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientType: varchar("client_type", { enum: ["buyer", "renter"] }).notNull(),
  version: integer("version").notNull().default(1),
  status: varchar("status", { 
    enum: ["incomplete", "pending_validation", "validated", "needs_review", "approved", "expired"] 
  }).default("incomplete"),
  
  // Validation tracking
  validationScore: decimal("validation_score", { precision: 3, scale: 2 }).default("0"), // 0-1 completeness score
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
  isActive: boolean("is_active").default(true),
});

// Requirements versioning for audit trail
export const requirementsVersions = pgTable("requirements_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: uuid("requirement_id").notNull().references(() => clientRequirements.id),
  version: integer("version").notNull(),
  changeType: varchar("change_type", { enum: ["created", "updated", "validated", "approved"] }).notNull(),
  changes: jsonb("changes"), // Store diff of what changed
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exceptions and special cases register
export const requirementsExceptions = pgTable("requirements_exceptions", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Scope fit scoring for properties
export const propertyMatches = pgTable("property_matches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requirementId: uuid("requirement_id").notNull().references(() => clientRequirements.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }).notNull(), // 0-1 match score
  
  // Individual scoring components
  budgetScore: decimal("budget_score", { precision: 3, scale: 2 }),
  locationScore: decimal("location_score", { precision: 3, scale: 2 }),
  sizeScore: decimal("size_score", { precision: 3, scale: 2 }),
  typeScore: decimal("type_score", { precision: 3, scale: 2 }),
  amenityScore: decimal("amenity_score", { precision: 3, scale: 2 }),
  timelineScore: decimal("timeline_score", { precision: 3, scale: 2 }),
  
  // Match metadata
  matchReason: text("match_reason"), // Explanation of why it's a good match
  dealBreakers: text("deal_breakers").array(), // What doesn't match
  highlights: text("highlights").array(), // What matches really well
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  agentReview: varchar("agent_review", { enum: ["pending", "approved", "rejected"] }),
  agentNotes: text("agent_notes"),
});

// Legacy rental profiles table (keeping for backward compatibility)
export const rentalProfiles = pgTable("rental_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  parkingRequired: boolean("parking_required").default(false),
  parkingSpots: integer("parking_spots").default(0),
  numberOfOccupants: integer("number_of_occupants").notNull(),
  monthlyBudget: decimal("monthly_budget", { precision: 10, scale: 2 }).notNull(), // CAD
  preferredAreas: text("preferred_areas").array(), // Array of cities/areas
  propertyType: varchar("property_type", { 
    enum: ["condo", "townhouse", "detached", "apartment", "basement", "duplex", "other"] 
  }).notNull(),
  preferredMoveInDate: timestamp("preferred_move_in_date"),
  combinedFamilyIncome: decimal("combined_family_income", { precision: 12, scale: 2 }).notNull(), // CAD annually
  willingToPrepayRent: boolean("willing_to_prepay_rent").default(false),
  prepayMonths: integer("prepay_months").default(0), // How many months willing to prepay
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OREA Form 410 Rental Application tables
export const rentalApplications = pgTable("rental_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  applicationNumber: varchar("application_number").notNull().unique(),
  // Property & Lease Information
  intendedStartDate: timestamp("intended_start_date").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  rentDueDate: integer("rent_due_date").notNull(), // Day of month (1-31)
  // Personal Information
  dateOfBirth: timestamp("date_of_birth").notNull(),
  socialInsuranceNumber: varchar("social_insurance_number"), // Optional
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
  petDetails: text("pet_details"), // Type, breed, age, etc.
  // Additional Occupants
  additionalOccupants: jsonb("additional_occupants"), // Array of {name, relationship, age}
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employmentHistory = pgTable("employment_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  isCurrent: boolean("is_current").notNull(),
  employerName: varchar("employer_name").notNull(),
  businessAddress: text("business_address").notNull(),
  businessPhone: varchar("business_phone").notNull(),
  position: varchar("position").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // NULL for current employment
  supervisorName: varchar("supervisor_name"),
  monthlySalary: decimal("monthly_salary", { precision: 10, scale: 2 }).notNull(),
  salaryType: varchar("salary_type", { enum: ["hourly", "salary", "commission", "contract"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialInformation = pgTable("financial_information", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  bankName: varchar("bank_name").notNull(),
  branchAddress: text("branch_address").notNull(),
  accountType: varchar("account_type", { enum: ["checking", "savings", "credit"] }).notNull(),
  accountNumber: varchar("account_number").notNull(), // Encrypted in practice
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }).notNull(),
  otherIncome: decimal("other_income", { precision: 12, scale: 2 }).default("0"),
  otherIncomeSource: text("other_income_source"),
  monthlyDebts: decimal("monthly_debts", { precision: 10, scale: 2 }).default("0"),
  debtDetails: text("debt_details"), // Credit cards, loans, etc.
  bankruptcyHistory: boolean("bankruptcy_history").default(false),
  bankruptcyDetails: text("bankruptcy_details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rentalHistory = pgTable("rental_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  address: text("address").notNull(),
  landlordName: varchar("landlord_name").notNull(),
  landlordPhone: varchar("landlord_phone").notNull(),
  landlordEmail: varchar("landlord_email"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // NULL for current rental
  reasonForLeaving: text("reason_for_leaving"),
  wasEvicted: boolean("was_evicted").default(false),
  latePayments: boolean("late_payments").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const personalReferences = pgTable("personal_references", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull().references(() => rentalApplications.id),
  name: varchar("name").notNull(),
  relationship: varchar("relationship").notNull(), // Friend, colleague, etc.
  phoneNumber: varchar("phone_number").notNull(),
  email: varchar("email"),
  yearsKnown: integer("years_known").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicationDocuments = pgTable("application_documents", {
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
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const agentBrandingSettings = pgTable("agent_branding_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  logoUrl: text("logo_url").notNull(),
  agentName: varchar("agent_name", { length: 120 }).notNull(),
  agentEmail: varchar("agent_email", { length: 120 }).notNull(),
  brokerageName: varchar("brokerage_name", { length: 120 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id),
});

export const settingsVersions = pgTable("settings_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  tab: varchar("tab", { enum: ["branding", "general", "notifications"] }).notNull(),
  diff: jsonb("diff"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id),
});

export const properties = pgTable("properties", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertyShortlists = pgTable("property_shortlists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPropertyIdx: sql`CREATE UNIQUE INDEX user_property_idx ON ${table} (user_id, property_id)`,
}));

export const clientGroups = pgTable("client_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => clientGroups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => clientGroups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tours = pgTable("tours", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tourProperties = pgTable("tour_properties", {
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
  agentNotes: text("agent_notes"),
});

export const propertyRatings = pgTable("property_ratings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  feedbackCategory: varchar("feedback_category", { 
    enum: ["offer_now", "hold_later", "reject"] 
  }).notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  remindLater: boolean("remind_later").default(false),
  remindedAt: timestamp("reminded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const propertyPhotos = pgTable("property_photos", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Property media for comprehensive viewing documentation (photos, videos, documents)
export const propertyMedia = pgTable("property_media", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "rejected", "withdrawn"] }).default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  notes: text("notes"),
});

export const showingRequests = pgTable("showing_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  groupId: uuid("group_id").references(() => clientGroups.id),
  preferredDate: timestamp("preferred_date"),
  preferredTime: varchar("preferred_time"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const requestedProperties = pgTable("requested_properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id").notNull().references(() => showingRequests.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
});

// Tour recaps for end-of-day summaries
export const tourRecaps = pgTable("tour_recaps", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Showing schedules for detailed schedule management
export const showingSchedules = pgTable("showing_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tourId: uuid("tour_id").notNull().references(() => tours.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: varchar("start_time").notNull(),
  estimatedDuration: integer("estimated_duration").notNull().default(30),
  status: varchar("status", { enum: ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] }).default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tour reminders for notifications before tours
export const tourReminders = pgTable("tour_reminders", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property suggestions from clients
export const propertySuggestions = pgTable("property_suggestions", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document center for storing important documents
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => users.id),
  documentType: varchar("document_type", { 
    enum: [
      "offer_placed", "client_id", "representative_agreement", "offer_received",
      "property_listing", "inspection_report", "appraisal", "legal_document", 
      "financial_document", "insurance", "lease_agreement", "purchase_agreement",
      "closing_document", "marketing_material", "floor_plan", "photo_gallery",
      "disclosure_form", "warranty", "contract", "deed", "title", "survey",
      "hoa_document", "property_tax", "utility_bill", "mls_listing", "other"
    ] 
  }).notNull(),
  title: varchar("title").notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  url: varchar("url").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  description: text("description"),
  relatedId: uuid("related_id"), // Links to offers, users, etc.
  tags: text("tags").array(), // Custom tags for organization
  expirationDate: timestamp("expiration_date"), // For time-sensitive documents
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location sharing for coordination
export const locationShares = pgTable("location_shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tourId: uuid("tour_id").references(() => tours.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  address: varchar("address"),
  sharingType: varchar("sharing_type", { enum: ["live", "checkpoint", "destination"] }).notNull().default("live"),
  sharedWith: text("shared_with").array(), // Array of user IDs
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Additional location data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location history for tracking agent movement patterns and analytics
export const locationHistory = pgTable("location_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // GPS accuracy in meters
  address: varchar("address"),
  activityType: varchar("activity_type", { 
    enum: ["touring", "traveling", "meeting", "showing", "office", "unknown"] 
  }).default("unknown"),
  speed: decimal("speed", { precision: 6, scale: 2 }), // Speed in km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // Direction in degrees
  tourId: uuid("tour_id").references(() => tours.id),
  propertyId: uuid("property_id").references(() => properties.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
  source: varchar("source", { enum: ["automatic", "manual", "tour"] }).default("automatic"),
});

// Calendar integrations for blocking schedules
export const calendarIntegrations = pgTable("calendar_integrations", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar events for blocking time slots
export const calendarEvents = pgTable("calendar_events", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Direct messaging between agents and clients
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  agent: one(users, {
    fields: [users.agentId],
    references: [users.id],
    relationName: "agent_clients",
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
  calendarEvents: many(calendarEvents),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  tourProperties: many(tourProperties),
  photos: many(propertyPhotos),
  media: many(propertyMedia),
  ratings: many(propertyRatings),
  offers: many(offers),
  requestedProperties: many(requestedProperties),
}));

export const clientGroupsRelations = relations(clientGroups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clientGroups.createdById],
    references: [users.id],
  }),
  members: many(groupMembers),
  messages: many(groupMessages),
  tours: many(tours),
  showingRequests: many(showingRequests),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(clientGroups, {
    fields: [groupMembers.groupId],
    references: [clientGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  group: one(clientGroups, {
    fields: [groupMessages.groupId],
    references: [clientGroups.id],
  }),
  user: one(users, {
    fields: [groupMessages.userId],
    references: [users.id],
  }),
}));

export const toursRelations = relations(tours, ({ one, many }) => ({
  agent: one(users, {
    fields: [tours.agentId],
    references: [users.id],
    relationName: "agent_tours",
  }),
  client: one(users, {
    fields: [tours.clientId],
    references: [users.id],
    relationName: "client_tours",
  }),
  group: one(clientGroups, {
    fields: [tours.groupId],
    references: [clientGroups.id],
  }),
  tourProperties: many(tourProperties),
  photos: many(propertyPhotos),
}));

export const tourPropertiesRelations = relations(tourProperties, ({ one }) => ({
  tour: one(tours, {
    fields: [tourProperties.tourId],
    references: [tours.id],
  }),
  property: one(properties, {
    fields: [tourProperties.propertyId],
    references: [properties.id],
  }),
}));

export const propertyRatingsRelations = relations(propertyRatings, ({ one }) => ({
  property: one(properties, {
    fields: [propertyRatings.propertyId],
    references: [properties.id],
  }),
  tour: one(tours, {
    fields: [propertyRatings.tourId],
    references: [tours.id],
  }),
  client: one(users, {
    fields: [propertyRatings.clientId],
    references: [users.id],
  }),
}));

export const propertyPhotosRelations = relations(propertyPhotos, ({ one }) => ({
  property: one(properties, {
    fields: [propertyPhotos.propertyId],
    references: [properties.id],
  }),
  tour: one(tours, {
    fields: [propertyPhotos.tourId],
    references: [tours.id],
  }),
  uploader: one(users, {
    fields: [propertyPhotos.uploadedBy],
    references: [users.id],
  }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  property: one(properties, {
    fields: [offers.propertyId],
    references: [properties.id],
  }),
  client: one(users, {
    fields: [offers.clientId],
    references: [users.id],
    relationName: "client_offers",
  }),
  agent: one(users, {
    fields: [offers.agentId],
    references: [users.id],
    relationName: "agent_offers",
  }),
}));

export const showingRequestsRelations = relations(showingRequests, ({ one, many }) => ({
  client: one(users, {
    fields: [showingRequests.clientId],
    references: [users.id],
    relationName: "client_requests",
  }),
  agent: one(users, {
    fields: [showingRequests.agentId],
    references: [users.id],
    relationName: "agent_requests",
  }),
  group: one(clientGroups, {
    fields: [showingRequests.groupId],
    references: [clientGroups.id],
  }),
  requestedProperties: many(requestedProperties),
}));

export const requestedPropertiesRelations = relations(requestedProperties, ({ one }) => ({
  request: one(showingRequests, {
    fields: [requestedProperties.requestId],
    references: [showingRequests.id],
  }),
  property: one(properties, {
    fields: [requestedProperties.propertyId],
    references: [properties.id],
  }),
}));

export const tourRecapsRelations = relations(tourRecaps, ({ one }) => ({
  agent: one(users, {
    fields: [tourRecaps.agentId],
    references: [users.id],
  }),
}));

export const showingSchedulesRelations = relations(showingSchedules, ({ one }) => ({
  tour: one(tours, {
    fields: [showingSchedules.tourId],
    references: [tours.id],
  }),
  property: one(properties, {
    fields: [showingSchedules.propertyId],
    references: [properties.id],
  }),
}));

export const tourRemindersRelations = relations(tourReminders, ({ one }) => ({
  user: one(users, {
    fields: [tourReminders.userId],
    references: [users.id],
  }),
  tour: one(tours, {
    fields: [tourReminders.tourId],
    references: [tours.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const locationSharesRelations = relations(locationShares, ({ one }) => ({
  user: one(users, {
    fields: [locationShares.userId],
    references: [users.id],
  }),
  tour: one(tours, {
    fields: [locationShares.tourId],
    references: [tours.id],
  }),
}));

export const locationHistoryRelations = relations(locationHistory, ({ one }) => ({
  user: one(users, {
    fields: [locationHistory.userId],
    references: [users.id],
  }),
  tour: one(tours, {
    fields: [locationHistory.tourId],
    references: [tours.id],
  }),
  property: one(properties, {
    fields: [locationHistory.propertyId],
    references: [properties.id],
  }),
}));

export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarIntegrations.userId],
    references: [users.id],
  }),
  events: many(calendarEvents),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  integration: one(calendarIntegrations, {
    fields: [calendarEvents.integrationId],
    references: [calendarIntegrations.id],
  }),
  tour: one(tours, {
    fields: [calendarEvents.tourId],
    references: [tours.id],
  }),
}));

// OREA Form 410 Relations
export const rentalApplicationsRelations = relations(rentalApplications, ({ one, many }) => ({
  user: one(users, {
    fields: [rentalApplications.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [rentalApplications.propertyId],
    references: [properties.id],
  }),
  agent: one(users, {
    fields: [rentalApplications.agentId],
    references: [users.id],
    relationName: "agent_rental_applications",
  }),
  employmentHistory: many(employmentHistory),
  financialInformation: many(financialInformation),
  rentalHistory: many(rentalHistory),
  personalReferences: many(personalReferences),
  applicationDocuments: many(applicationDocuments),
}));

export const employmentHistoryRelations = relations(employmentHistory, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [employmentHistory.applicationId],
    references: [rentalApplications.id],
  }),
}));

export const financialInformationRelations = relations(financialInformation, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [financialInformation.applicationId],
    references: [rentalApplications.id],
  }),
}));

export const rentalHistoryRelations = relations(rentalHistory, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [rentalHistory.applicationId],
    references: [rentalApplications.id],
  }),
}));

export const personalReferencesRelations = relations(personalReferences, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [personalReferences.applicationId],
    references: [rentalApplications.id],
  }),
}));

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(rentalApplications, {
    fields: [applicationDocuments.applicationId],
    references: [rentalApplications.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertTourSchema = createInsertSchema(tours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowingRequestSchema = createInsertSchema(showingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  submittedAt: true,
  respondedAt: true,
});

export const insertClientGroupSchema = createInsertSchema(clientGroups).omit({
  id: true,
  createdAt: true,
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyRatingSchema = createInsertSchema(propertyRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyPhotoSchema = createInsertSchema(propertyPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyMediaSchema = createInsertSchema(propertyMedia).omit({
  id: true,
  createdAt: true,
});

export const insertTourRecapSchema = createInsertSchema(tourRecaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowingScheduleSchema = createInsertSchema(showingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTourReminderSchema = createInsertSchema(tourReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySuggestionSchema = createInsertSchema(propertySuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationShareSchema = createInsertSchema(locationShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationHistorySchema = createInsertSchema(locationHistory).omit({
  id: true,
  recordedAt: true,
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertRentalProfileSchema = createInsertSchema(rentalProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Requirements System Insert Schemas
export const insertClientRequirementSchema = createInsertSchema(clientRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRequirementsVersionSchema = createInsertSchema(requirementsVersions).omit({
  id: true,
  createdAt: true,
});

export const insertRequirementsExceptionSchema = createInsertSchema(requirementsExceptions).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyMatchSchema = createInsertSchema(propertyMatches).omit({
  id: true,
  calculatedAt: true,
});

// OREA Form 410 Insert schemas
export const insertRentalApplicationSchema = createInsertSchema(rentalApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
  applicationSignedAt: true,
});

export const insertEmploymentHistorySchema = createInsertSchema(employmentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertFinancialInformationSchema = createInsertSchema(financialInformation).omit({
  id: true,
  createdAt: true,
});

export const insertRentalHistorySchema = createInsertSchema(rentalHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalReferencesSchema = createInsertSchema(personalReferences).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationDocumentSchema = createInsertSchema(applicationDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertAgentBrandingSettingSchema = createInsertSchema(agentBrandingSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSettingsVersionSchema = createInsertSchema(settingsVersions).omit({
  id: true,
  updatedAt: true,
});

export const insertPropertyShortlistSchema = createInsertSchema(propertyShortlists).omit({
  id: true,
  createdAt: true,
});

// Directory - Contacts and Related Persons
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  phones: jsonb("phones").default("[]"), // [{label: string, number: string}]
  emails: jsonb("emails").default("[]"), // [{label: string, address: string}]
  notes: text("notes"),
  hasApp: boolean("has_app").default(false),
  lastActiveAt: timestamp("last_active_at"),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientContactLinks = pgTable("client_contact_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  relationshipType: varchar("relationship_type", { 
    enum: ["primary", "spouse", "parent", "child", "cobuyer", "guarantor", "roommate", "friend", "attorney", "broker", "other"] 
  }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brokerage tables
export const brokerages = pgTable("brokerages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  status: varchar("status", { enum: ["active", "suspended"] }).default("active"),
  settings: jsonb("settings"), // permissions, comms, branding for broker portal
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const brokerageAgents = pgTable("brokerage_agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  role: varchar("role", { enum: ["member", "manager"] }).default("member"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const impersonationLogs = pgTable("impersonation_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { enum: ["brokerage", "agent", "client"] }).notNull(),
  targetId: varchar("target_id").notNull(),
  mode: varchar("mode", { enum: ["read", "readwrite"] }).default("read"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const coachingNotes = pgTable("coaching_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const brokerageTeams = pgTable("brokerage_teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerageId: uuid("brokerage_id").notNull().references(() => brokerages.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const brokerageTeamAgents = pgTable("brokerage_team_agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").notNull().references(() => brokerageTeams.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactLinkSchema = createInsertSchema(clientContactLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrokerageSchema = createInsertSchema(brokerages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrokerageAgentSchema = createInsertSchema(brokerageAgents).omit({
  id: true,
  createdAt: true,
});

export const insertCoachingNoteSchema = createInsertSchema(coachingNotes).omit({
  id: true,
  createdAt: true,
});

export const insertBrokerageTeamSchema = createInsertSchema(brokerageTeams).omit({
  id: true,
  createdAt: true,
});

export const insertBrokerageTeamAgentSchema = createInsertSchema(brokerageTeamAgents).omit({
  id: true,
  createdAt: true,
});

export const insertImpersonationLogSchema = createInsertSchema(impersonationLogs).omit({
  id: true,
  startedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type TourProperty = typeof tourProperties.$inferSelect;
export type PropertyRating = typeof propertyRatings.$inferSelect;
export type InsertPropertyRating = z.infer<typeof insertPropertyRatingSchema>;
export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = z.infer<typeof insertPropertyPhotoSchema>;
export type PropertyMedia = typeof propertyMedia.$inferSelect;
export type InsertPropertyMedia = z.infer<typeof insertPropertyMediaSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type ShowingRequest = typeof showingRequests.$inferSelect;
export type InsertShowingRequest = z.infer<typeof insertShowingRequestSchema>;
export type ClientGroup = typeof clientGroups.$inferSelect;
export type InsertClientGroup = z.infer<typeof insertClientGroupSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type TourRecap = typeof tourRecaps.$inferSelect;
export type InsertTourRecap = z.infer<typeof insertTourRecapSchema>;
export type ShowingSchedule = typeof showingSchedules.$inferSelect;
export type InsertShowingSchedule = z.infer<typeof insertShowingScheduleSchema>;
export type TourReminder = typeof tourReminders.$inferSelect;
export type InsertTourReminder = z.infer<typeof insertTourReminderSchema>;
export type PropertySuggestion = typeof propertySuggestions.$inferSelect;
export type InsertPropertySuggestion = z.infer<typeof insertPropertySuggestionSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type LocationShare = typeof locationShares.$inferSelect;
export type InsertLocationShare = z.infer<typeof insertLocationShareSchema>;
export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = z.infer<typeof insertLocationHistorySchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type RentalProfile = typeof rentalProfiles.$inferSelect;
export type InsertRentalProfile = z.infer<typeof insertRentalProfileSchema>;

// Requirements System Types
export type ClientRequirement = typeof clientRequirements.$inferSelect;
export type InsertClientRequirement = z.infer<typeof insertClientRequirementSchema>;
export type RequirementsVersion = typeof requirementsVersions.$inferSelect;
export type InsertRequirementsVersion = z.infer<typeof insertRequirementsVersionSchema>;
export type RequirementsException = typeof requirementsExceptions.$inferSelect;
export type InsertRequirementsException = z.infer<typeof insertRequirementsExceptionSchema>;
export type PropertyMatch = typeof propertyMatches.$inferSelect;
export type InsertPropertyMatch = z.infer<typeof insertPropertyMatchSchema>;

// OREA Form 410 Types
export type RentalApplication = typeof rentalApplications.$inferSelect;
export type InsertRentalApplication = z.infer<typeof insertRentalApplicationSchema>;
export type EmploymentHistory = typeof employmentHistory.$inferSelect;
export type InsertEmploymentHistory = z.infer<typeof insertEmploymentHistorySchema>;
export type FinancialInformation = typeof financialInformation.$inferSelect;
export type InsertFinancialInformation = z.infer<typeof insertFinancialInformationSchema>;
export type RentalHistory = typeof rentalHistory.$inferSelect;
export type InsertRentalHistory = z.infer<typeof insertRentalHistorySchema>;
export type PersonalReferences = typeof personalReferences.$inferSelect;
export type InsertPersonalReferences = z.infer<typeof insertPersonalReferencesSchema>;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = z.infer<typeof insertApplicationDocumentSchema>;

// Branding Settings Types
export type AgentBrandingSetting = typeof agentBrandingSettings.$inferSelect;
export type InsertAgentBrandingSetting = z.infer<typeof insertAgentBrandingSettingSchema>;
export type SettingsVersion = typeof settingsVersions.$inferSelect;
export type InsertSettingsVersion = z.infer<typeof insertSettingsVersionSchema>;

// Property Shortlist Types
export type PropertyShortlist = typeof propertyShortlists.$inferSelect;
export type InsertPropertyShortlist = z.infer<typeof insertPropertyShortlistSchema>;

// Directory Types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ClientContactLink = typeof clientContactLinks.$inferSelect;
export type InsertClientContactLink = z.infer<typeof insertClientContactLinkSchema>;

// Brokerage Types
export type Brokerage = typeof brokerages.$inferSelect;
export type InsertBrokerage = z.infer<typeof insertBrokerageSchema>;
export type BrokerageAgent = typeof brokerageAgents.$inferSelect;
export type InsertBrokerageAgent = z.infer<typeof insertBrokerageAgentSchema>;
export type CoachingNote = typeof coachingNotes.$inferSelect;
export type InsertCoachingNote = z.infer<typeof insertCoachingNoteSchema>;
export type BrokerageTeam = typeof brokerageTeams.$inferSelect;
export type InsertBrokerageTeam = z.infer<typeof insertBrokerageTeamSchema>;
export type BrokerageTeamAgent = typeof brokerageTeamAgents.$inferSelect;
export type InsertBrokerageTeamAgent = z.infer<typeof insertBrokerageTeamAgentSchema>;
export type ImpersonationLog = typeof impersonationLogs.$inferSelect;
export type InsertImpersonationLog = z.infer<typeof insertImpersonationLogSchema>;

// Chat Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
