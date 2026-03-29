import {
  users,
  properties,
  propertyShortlists,
  tours,
  tourProperties,
  propertyPhotos,
  propertyMedia,
  offers,
  showingRequests,
  requestedProperties,
  clientGroups,
  groupMembers,
  groupMessages,
  propertyRatings,
  tourReminders,
  propertySuggestions,
  documents,
  locationShares,
  locationHistory,
  calendarIntegrations,
  calendarEvents,
  rentalProfiles,
  rentalApplications,
  employmentHistory,
  financialInformation,
  rentalHistory,
  personalReferences,
  clientRequirements,
  requirementsVersions,
  requirementsExceptions,
  propertyMatches,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Tour,
  type InsertTour,
  type TourProperty,
  type PropertyPhoto,
  type InsertPropertyPhoto,
  type PropertyMedia,
  type InsertPropertyMedia,
  type Offer,
  type InsertOffer,
  type ShowingRequest,
  type InsertShowingRequest,
  type ClientGroup,
  type InsertClientGroup,
  type GroupMessage,
  type InsertGroupMessage,
  type PropertyRating,
  type InsertPropertyRating,
  type TourReminder,
  type InsertTourReminder,
  type Document,
  type InsertDocument,
  type LocationShare,
  type InsertLocationShare,
  type LocationHistory,
  type InsertLocationHistory,
  type CalendarIntegration,
  type InsertCalendarIntegration,
  type CalendarEvent,
  type InsertCalendarEvent,
  type RentalProfile,
  type InsertRentalProfile,
  type ClientRequirement,
  type InsertClientRequirement,
  type RequirementsVersion,
  type InsertRequirementsVersion,
  type RequirementsException,
  type InsertRequirementsException,
  type PropertyMatch,
  type InsertPropertyMatch,
  type PropertySuggestion,
  type InsertPropertySuggestion,
  type PropertyShortlist,
  type InsertPropertyShortlist,
  contacts,
  clientContactLinks,
  type Contact,
  type InsertContact,
  type ClientContactLink,
  type InsertClientContactLink,
  brokerages,
  brokerageAgents,
  coachingNotes,
  brokerageTeams,
  brokerageTeamAgents,
  type Brokerage,
  type InsertBrokerage,
  type BrokerageAgent,
  type InsertBrokerageAgent,
  type CoachingNote,
  type InsertCoachingNote,
  type BrokerageTeam,
  type InsertBrokerageTeam,
  type BrokerageTeamAgent,
  type InsertBrokerageTeamAgent,
  conversations,
  directMessages,
  type Conversation,
  type DirectMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count, sum, isNull, or, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Client operations
  getClients(agentId: string): Promise<User[]>;
  getClientsWithStats(agentId: string): Promise<User[]>;
  getClientRequirements(clientId: string): Promise<any>;
  getClientHistory(clientId: string, agentId?: string): Promise<any>;
  getClientShortlists(clientId: string): Promise<any[]>;
  getClientMedia(clientId: string): Promise<any[]>;
  getClientNotes(clientId: string): Promise<any[]>;
  createClientNote(clientId: string, agentId: string, content: string): Promise<any>;

  // Requirements System
  getClientRequirement(clientId: string): Promise<ClientRequirement | null>;
  createClientRequirement(requirement: InsertClientRequirement): Promise<ClientRequirement>;
  updateClientRequirement(id: string, updates: Partial<InsertClientRequirement>): Promise<ClientRequirement>;
  validateRequirements(requirementId: string, agentId: string): Promise<{ score: number; issues: string[] }>;
  getRequirementVersions(requirementId: string): Promise<RequirementsVersion[]>;
  createRequirementVersion(version: InsertRequirementsVersion): Promise<RequirementsVersion>;
  getRequirementExceptions(requirementId: string): Promise<RequirementsException[]>;
  createRequirementException(exception: InsertRequirementsException): Promise<RequirementsException>;
  calculatePropertyMatches(requirementId: string): Promise<PropertyMatch[]>;
  getPropertyMatchesForClient(clientId: string): Promise<PropertyMatch[]>;
  
  // Property operations
  getProperties(agentId?: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property>;
  
  // Property Shortlist operations
  addToShortlist(propertyId: string, userId: string): Promise<PropertyShortlist>;
  removeFromShortlist(propertyId: string, userId: string): Promise<void>;
  getShortlistedProperties(userId: string): Promise<any[]>;
  isPropertyShortlisted(propertyId: string, userId: string): Promise<boolean>;
  
  // Tour operations
  getTours(filters: { agentId?: string; clientId?: string; status?: string }): Promise<Tour[]>;
  getTour(id: string): Promise<Tour | undefined>;
  checkDuplicateTour(agentId: string, clientId: string, scheduledDate: Date, propertyIds: string[]): Promise<Tour | null>;
  createTour(tour: InsertTour): Promise<Tour>;
  updateTour(id: string, updates: Partial<InsertTour>): Promise<Tour>;
  getTourProperties(tourId: string): Promise<TourProperty[]>;
  addPropertyToTour(tourId: string, propertyId: string, order: number): Promise<TourProperty>;
  createTourProperty(tourProperty: { tourId: string; propertyId: string; order: number; scheduledTime?: Date | null }): Promise<TourProperty>;
  updateTourPropertyStatus(tourId: string, propertyId: string, status: string, rejectionReason?: string): Promise<TourProperty>;
  getTourProperty(tourId: string, propertyId: string): Promise<TourProperty | null>;
  updateAgentPropertyReview(tourId: string, propertyId: string, agentRating: number, agentNotes: string): Promise<TourProperty>;

  // Showing request operations
  getShowingRequests(filters: { agentId?: string; clientId?: string; status?: string }): Promise<ShowingRequest[]>;
  getShowingRequest(id: string): Promise<ShowingRequest | null>;
  createShowingRequest(request: InsertShowingRequest): Promise<ShowingRequest>;
  updateShowingRequestStatus(id: string, status: string): Promise<ShowingRequest>;
  addPropertyToRequest(requestId: string, propertyId: string): Promise<void>;
  getRequestedProperties(requestId: string): Promise<string[]>;
  
  // Photo operations
  getPropertyPhotos(propertyId: string): Promise<PropertyPhoto[]>;
  uploadPropertyPhoto(photo: InsertPropertyPhoto): Promise<PropertyPhoto>;
  getPhotosByAgent(agentId: string, clientId?: string | null): Promise<any[]>;
  
  // Property Media operations
  getPropertyMedia(propertyId: string, tourId: string): Promise<PropertyMedia[]>;
  uploadPropertyMedia(media: InsertPropertyMedia): Promise<PropertyMedia>;
  deletePropertyMedia(mediaId: string): Promise<void>;
  
  // Property Rating operations
  getPropertyRating(propertyId: string, clientId: string, tourId: string): Promise<PropertyRating | null>;
  createPropertyRating(rating: InsertPropertyRating): Promise<PropertyRating>;
  updatePropertyRating(id: string, updates: Partial<InsertPropertyRating>): Promise<PropertyRating>;
  getPropertyRatingsByClient(clientId: string): Promise<PropertyRating[]>;
  getPropertyRatingsByTour(tourId: string): Promise<PropertyRating[]>;
  getPropertyReviews(propertyId: string): Promise<any[]>;
  
  // Offer operations
  getOffers(filters: { propertyId?: string; clientId?: string; agentId?: string }): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOfferStatus(id: string, status: string, respondedAt?: Date): Promise<Offer>;
  
  // Group operations
  getClientGroups(userId: string): Promise<ClientGroup[]>;
  createClientGroup(group: InsertClientGroup): Promise<ClientGroup>;
  addGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMessages(groupId: string): Promise<Array<GroupMessage & { user: { firstName: string; lastName: string; email: string } }>>;
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMembers(groupId: string): Promise<Array<{ id: string; userId: string; joinedAt: Date; user: { firstName: string; lastName: string; email: string } }>>;
  
  // Statistics
  getAgentStats(agentId: string): Promise<{
    todayTours: number;
    activeClients: number;
    pendingRequests: number;
    weeklyDistance: number;
    timeInvestedHours: number;
    offersPipeline: {
      pending: number;
      accepted: number;
      rejected: number;
      total: number;
    };
    avgScopeFitScore: number;
    exceptionsCount: number;
    recentChanges: number;
  }>;
  
  getClientStats(clientId: string): Promise<{
    propertiesSeen: number;
    propertiesRejected: number;
    offersMade: number;
    kmTraveled: number;
    timeInvested: number;
  }>;

  // Reminder operations
  getTourReminders(userId: string, tourId?: string): Promise<TourReminder[]>;
  createTourReminder(reminder: InsertTourReminder): Promise<TourReminder>;
  updateTourReminder(id: string, updates: Partial<TourReminder>): Promise<TourReminder>;
  deleteTourReminder(id: string): Promise<void>;

  // Property suggestion operations
  getPropertySuggestions(filters: { clientId?: string; agentId?: string; status?: string }): Promise<PropertySuggestion[]>;
  createPropertySuggestion(suggestion: InsertPropertySuggestion): Promise<PropertySuggestion>;
  updatePropertySuggestion(id: string, updates: Partial<InsertPropertySuggestion>): Promise<PropertySuggestion>;
  deletePropertySuggestion(id: string): Promise<void>;

  // Document operations
  getDocuments(userId: string, documentType?: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Location sharing operations
  getLocationShares(filters: { userId?: string; tourId?: string; isActive?: boolean }): Promise<LocationShare[]>;
  createLocationShare(share: InsertLocationShare): Promise<LocationShare>;
  updateLocationShare(id: string, updates: Partial<LocationShare>): Promise<LocationShare>;
  deleteLocationShare(id: string): Promise<void>;
  
  // Location history and analytics operations
  getLocationHistory(filters: { userId?: string; tourId?: string; propertyId?: string; startDate?: Date; endDate?: Date; activityType?: string }): Promise<LocationHistory[]>;
  createLocationHistory(history: InsertLocationHistory): Promise<LocationHistory>;
  getLocationAnalytics(userId: string, dateRange?: { start: Date; end: Date }): Promise<{
    totalDistance: number;
    totalTime: number;
    visitedProperties: number;
    avgSpeed: number;
    activityBreakdown: { activityType: string; count: number; percentage: number }[];
    heatmapData: { latitude: number; longitude: number; weight: number }[];
  }>;

  // Calendar operations
  getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]>;
  createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration>;
  updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration>;
  deleteCalendarIntegration(id: string): Promise<void>;
  
  getCalendarEvents(filters: { userId?: string; integrationId?: string; startTime?: Date; endTime?: Date }): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;

  // Rental profile operations
  getRentalProfile(userId: string): Promise<RentalProfile | undefined>;
  createRentalProfile(profile: InsertRentalProfile): Promise<RentalProfile>;
  updateRentalProfile(userId: string, updates: Partial<InsertRentalProfile>): Promise<RentalProfile>;
  deleteRentalProfile(userId: string): Promise<void>;
  
  // Directory - Contact operations
  getContacts(agentId: string, filters?: { search?: string; relationshipType?: string; hasApp?: boolean }): Promise<any[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  
  // Client-Contact Link operations
  linkContactToClient(link: InsertClientContactLink): Promise<ClientContactLink>;
  unlinkContactFromClient(clientId: string, contactId: string): Promise<void>;
  getClientContacts(clientId: string): Promise<any[]>;
  getContactTimeline(contactId: string): Promise<any[]>;

  // Chat operations
  getOrCreateConversation(agentId: string, clientId: string): Promise<Conversation>;
  getConversations(userId: string, role: string): Promise<any[]>;
  getMessages(conversationId: string): Promise<DirectMessage[]>;
  sendMessage(conversationId: string, senderId: string, content: string): Promise<DirectMessage>;
  markMessagesRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Check if user exists first to preserve role if not provided
      const existingUser = await this.getUser(userData.id);
      
      // Build update set, preserving role from existing user if not provided
      const updateSet: any = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        passwordHash: userData.passwordHash,
        clientType: userData.clientType,
        agentId: userData.agentId,
        updatedAt: new Date(),
      };
      
      // Only update role if explicitly provided, otherwise preserve existing
      if (userData.role !== undefined) {
        updateSet.role = userData.role;
      } else if (existingUser) {
        updateSet.role = existingUser.role;
      }
      
      // Atomic upsert: try insert first, handle conflicts
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: updateSet,
        })
        .returning();
      return user;
    } catch (error: any) {
      // Handle email unique constraint violations specifically
      if (error.code === '23505' && error.detail?.includes('email')) {
        // Email conflict: find existing user by email and update without changing ID
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email!));
        
        if (existingUser) {
          const [user] = await db
            .update(users)
            .set({
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              passwordHash: userData.passwordHash,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return user;
        }
      }
      
      console.error("Error in upsertUser:", error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    // Delete all related records first to avoid foreign key constraint violations
    // This ensures clean deletion without orphaning data
    
    // Delete client requirements and related data
    const clientReqs = await db.select().from(clientRequirements).where(eq(clientRequirements.userId, id));
    for (const req of clientReqs) {
      await db.delete(requirementsExceptions).where(eq(requirementsExceptions.requirementId, req.id));
      await db.delete(requirementsVersions).where(eq(requirementsVersions.requirementId, req.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, req.id));
    }
    await db.delete(clientRequirements).where(eq(clientRequirements.userId, id));
    
    // Delete tours as client or agent
    await db.delete(tours).where(or(eq(tours.clientId, id), eq(tours.agentId, id)));
    
    // Delete offers
    await db.delete(offers).where(or(eq(offers.clientId, id), eq(offers.agentId, id)));
    
    // Delete showing requests
    await db.delete(showingRequests).where(or(eq(showingRequests.clientId, id), eq(showingRequests.agentId, id)));
    
    // Delete property ratings
    await db.delete(propertyRatings).where(eq(propertyRatings.clientId, id));
    
    // Delete group memberships
    await db.delete(groupMembers).where(eq(groupMembers.userId, id));
    
    // Delete group messages
    await db.delete(groupMessages).where(eq(groupMessages.userId, id));
    
    // Delete client groups where user is owner
    await db.delete(clientGroups).where(eq(clientGroups.createdById, id));
    
    // Delete documents
    await db.delete(documents).where(eq(documents.userId, id));
    
    // Delete tour reminders
    await db.delete(tourReminders).where(eq(tourReminders.userId, id));
    
    // Delete location shares
    await db.delete(locationShares).where(eq(locationShares.userId, id));
    
    // Delete location history
    await db.delete(locationHistory).where(eq(locationHistory.userId, id));
    
    // Delete calendar integrations
    await db.delete(calendarIntegrations).where(eq(calendarIntegrations.userId, id));
    
    // Delete rental profile
    await db.delete(rentalProfiles).where(eq(rentalProfiles.userId, id));
    
    // Delete rental applications
    await db.delete(rentalApplications).where(eq(rentalApplications.userId, id));
    
    // Delete properties if user is agent
    const userProperties = await db.select().from(properties).where(eq(properties.agentId, id));
    for (const property of userProperties) {
      await db.delete(propertyPhotos).where(eq(propertyPhotos.propertyId, property.id));
      await db.delete(requestedProperties).where(eq(requestedProperties.propertyId, property.id));
      await db.delete(tourProperties).where(eq(tourProperties.propertyId, property.id));
    }
    await db.delete(properties).where(eq(properties.agentId, id));
    
    // Finally, delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // Client operations
  async getClients(agentId: string): Promise<User[]> {
    try {
      const result = await db.select().from(users)
        .where(and(eq(users.agentId, agentId), eq(users.role, "client")))
        .orderBy(sql`${users.updatedAt} DESC`);
      
      // Ensure no null/undefined values that could break query builder
      return result.map(client => ({
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

  async getClientsWithStats(agentId: string): Promise<User[]> {
    try {
      const clients = await this.getClients(agentId);
      
      // Enhance each client with statistics
      const clientsWithStats = await Promise.all(clients.map(async (client) => {
        try {
          // Count tours for this client
          const [toursResult] = await db
            .select({ count: count() })
            .from(tours)
            .where(eq(tours.clientId, client.id));

          // Count offers for this client
          const [offersResult] = await db
            .select({ count: count() })
            .from(offers)
            .where(eq(offers.clientId, client.id));

          // Get last activity from latest tour or offer
          const [lastTour] = await db
            .select({ date: tours.scheduledDate })
            .from(tours)
            .where(eq(tours.clientId, client.id))
            .orderBy(sql`${tours.scheduledDate} DESC`)
            .limit(1);

          const [lastOffer] = await db
            .select({ date: offers.submittedAt })
            .from(offers)
            .where(eq(offers.clientId, client.id))
            .orderBy(sql`${offers.submittedAt} DESC`)
            .limit(1);

          // Determine last activity date
          let lastActivity = null;
          if (lastTour?.date || lastOffer?.date) {
            const tourDate = lastTour?.date ? new Date(lastTour.date) : new Date(0);
            const offerDate = lastOffer?.date ? new Date(lastOffer.date) : new Date(0);
            lastActivity = tourDate > offerDate ? tourDate : offerDate;
          }

          // Count showing requests for this client
          const [requestsResult] = await db
            .select({ count: count() })
            .from(showingRequests)
            .where(eq(showingRequests.clientId, client.id));

          // Count rejected properties (ratings with reject feedback)
          const [rejectedResult] = await db
            .select({ count: count() })
            .from(propertyRatings)
            .where(and(
              eq(propertyRatings.clientId, client.id),
              eq(propertyRatings.feedbackCategory, 'reject')
            ));

          // Calculate total km travelled (sum of tour distances)
          const [distanceResult] = await db
            .select({ total: sum(tours.totalDistance) })
            .from(tours)
            .where(eq(tours.clientId, client.id));

          // Calculate total hours invested (sum of tour durations in hours)
          const [durationResult] = await db
            .select({ total: sum(tours.estimatedDuration) })
            .from(tours)
            .where(eq(tours.clientId, client.id));

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

  async getClientRequirements(clientId: string): Promise<any> {
    // Get rental profile if client is a renter
    const [rentalProfile] = await db
      .select()
      .from(rentalProfiles)
      .where(eq(rentalProfiles.userId, clientId));

    if (rentalProfile) {
      return {
        type: 'rental',
        profile: rentalProfile
      };
    }

    // For buyers, return basic requirements (can be expanded)
    return {
      type: 'buyer',
      profile: {
        status: 'pending',
        message: 'Buyer requirements not yet completed'
      }
    };
  }

  async getClientShortlists(clientId: string): Promise<any[]> {
    // TODO: Implement when shortlists table is added to schema
    // For now, return empty array
    return [];
  }

  async getClientMedia(clientId: string): Promise<any[]> {
    // TODO: Implement when client media storage is added
    // For now, return empty array
    return [];
  }

  async getClientNotes(clientId: string): Promise<any[]> {
    // Get documents with type 'note' for this client
    const notes = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.userId, clientId), 
        eq(documents.documentType, 'note')
      ))
      .orderBy(sql`${documents.createdAt} DESC`);

    return notes.map(note => ({
      id: note.id,
      content: note.title, // Use title field for note content
      author: 'Agent', // Could be enhanced with actual agent info
      date: note.createdAt,
      createdAt: note.createdAt
    }));
  }

  async createClientNote(clientId: string, agentId: string, content: string): Promise<any> {
    const filename = `note-${Date.now()}.txt`;
    const noteDocument = {
      userId: clientId,
      documentType: 'note' as const,
      title: content, // Store note content in title field
      filename: filename,
      originalName: filename,
      url: '', // Notes don't have URLs
      mimeType: 'text/plain',
      size: content.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [note] = await db
      .insert(documents)
      .values(noteDocument)
      .returning();

    return {
      id: note.id,
      content: note.title,
      author: 'Agent',
      date: note.createdAt,
      createdAt: note.createdAt
    };
  }

  // Property operations
  async getProperties(agentId?: string): Promise<Property[]> {
    let whereConditions = [eq(properties.isActive, true)];
    if (agentId) {
      whereConditions.push(eq(properties.agentId, agentId));
    }
    return await db.select().from(properties)
      .where(and(...whereConditions))
      .orderBy(sql`${properties.createdAt} DESC`);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property> {
    const [updatedProperty] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }

  // Tour operations
  async getTours(filters: { agentId?: string; clientId?: string; status?: string }): Promise<any[]> {
    const conditions = [];
    
    if (filters.agentId) conditions.push(eq(tours.agentId, filters.agentId));
    if (filters.clientId) conditions.push(eq(tours.clientId, filters.clientId));
    if (filters.status) conditions.push(eq(tours.status, filters.status as any));
    
    const baseQuery = db
      .select({
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
        clientName: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
        clientEmail: users.email,
        clientFirstName: users.firstName,
        clientLastName: users.lastName,
        propertiesCount: sql<number>`(SELECT COUNT(*) FROM tour_properties WHERE tour_properties.tour_id = ${tours.id})`,
      })
      .from(tours)
      .leftJoin(users, eq(tours.clientId, users.id));
    
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(sql`${tours.scheduledDate} DESC`);
    }
    
    return await baseQuery.orderBy(sql`${tours.scheduledDate} DESC`);
  }

  async getTour(id: string): Promise<Tour | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour;
  }

  async checkDuplicateTour(agentId: string, clientId: string, scheduledDate: Date, propertyIds: string[]): Promise<Tour | null> {
    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingTours = await db
      .select()
      .from(tours)
      .where(
        and(
          eq(tours.agentId, agentId),
          eq(tours.clientId, clientId),
          sql`${tours.scheduledDate} >= ${dayStart}`,
          sql`${tours.scheduledDate} <= ${dayEnd}`,
          sql`${tours.status} != 'cancelled'`
        )
      );

    if (existingTours.length === 0) return null;

    // Batch fetch all tour properties for existing tours
    const tourIds = existingTours.map(t => t.id);
    const allTourProperties = await db
      .select()
      .from(tourProperties)
      .where(sql`${tourProperties.tourId} IN (${sql.join(tourIds.map(id => sql`${id}`), sql`, `)})`);

    // Group properties by tour ID
    const tourPropertiesMap = new Map<string, string[]>();
    for (const tp of allTourProperties) {
      if (!tourPropertiesMap.has(tp.tourId)) {
        tourPropertiesMap.set(tp.tourId, []);
      }
      tourPropertiesMap.get(tp.tourId)!.push(tp.propertyId);
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

  async createTour(tour: InsertTour): Promise<Tour> {
    const [newTour] = await db.insert(tours).values(tour).returning();
    return newTour;
  }

  async updateTour(id: string, updates: Partial<InsertTour>): Promise<Tour> {
    const [updatedTour] = await db
      .update(tours)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tours.id, id))
      .returning();
    return updatedTour;
  }

  async getClientHistory(clientId: string, agentId?: string): Promise<any> {
    // Fetch client data first
    const [client] = await db.select().from(users).where(eq(users.id, clientId));
    
    if (!client) {
      return null; // Client not found
    }
    
    // Verify agent has access if agentId provided
    // Check the canonical agent-client relationship via client.agentId
    if (agentId && client.agentId !== agentId) {
      return null; // Agent doesn't have access to this client
    }
    
    // Fetch all tours for this client
    const clientTours = await db
      .select()
      .from(tours)
      .where(eq(tours.clientId, clientId))
      .orderBy(sql`${tours.scheduledDate} DESC`);
    
    // Fetch tour details with properties and ratings
    const toursWithDetails = await Promise.all(
      clientTours.map(async (tour) => {
        // Get tour properties
        const tourProps = await db
          .select()
          .from(tourProperties)
          .where(eq(tourProperties.tourId, tour.id))
          .orderBy(sql`${tourProperties.order} ASC`);
        
        // Get property details
        const propertyIds = tourProps.map(tp => tp.propertyId);
        const props = propertyIds.length > 0
          ? await db
              .select()
              .from(properties)
              .where(sql`${properties.id} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        
        // Get ratings for each property in this tour
        const ratings = await db
          .select()
          .from(propertyRatings)
          .where(eq(propertyRatings.tourId, tour.id));
        
        // Get media for this tour (photos, videos, documents)
        const tourMedia = await db
          .select()
          .from(propertyMedia)
          .where(eq(propertyMedia.tourId, tour.id));
        
        // Also get legacy property photos
        const legacyPhotos = await db
          .select()
          .from(propertyPhotos)
          .where(eq(propertyPhotos.tourId, tour.id));
        
        // Combine property data with ratings and media
        const propertiesWithRatings = props.map(prop => {
          const rating = ratings.find(r => r.propertyId === prop.id);
          const propMedia = tourMedia.filter(m => m.propertyId === prop.id);
          const propLegacyPhotos = legacyPhotos.filter(p => p.propertyId === prop.id);
          
          // Separate media by type
          const photos = [
            ...propMedia.filter(m => m.mediaType === 'photo'),
            ...propLegacyPhotos.map(p => ({ ...p, mediaType: 'photo' }))
          ];
          const videos = propMedia.filter(m => m.mediaType === 'video');
          const documents = propMedia.filter(m => m.mediaType === 'document');
          
          return {
            ...prop,
            rating: rating || null,
            media: {
              photos,
              videos,
              documents,
              totalCount: photos.length + videos.length + documents.length,
            },
          };
        });
        
        return {
          ...tour,
          properties: propertiesWithRatings,
          totalProperties: props.length,
          totalRatings: ratings.length,
        };
      })
    );
    
    // Fetch offers made by this client
    const clientOffers = await db
      .select()
      .from(offers)
      .where(eq(offers.clientId, clientId))
      .orderBy(sql`${offers.submittedAt} DESC`);
    
    // Fetch offer properties
    const offersWithProperties = await Promise.all(
      clientOffers.map(async (offer) => {
        const [property] = await db
          .select()
          .from(properties)
          .where(eq(properties.id, offer.propertyId));
        
        return {
          ...offer,
          property: property || null,
        };
      })
    );
    
    return {
      client,
      tours: toursWithDetails,
      offers: offersWithProperties,
      summary: {
        totalTours: clientTours.length,
        completedTours: clientTours.filter(t => t.status === 'completed').length,
        totalPropertiesViewed: toursWithDetails.reduce((sum, t) => sum + t.totalProperties, 0),
        totalRatings: toursWithDetails.reduce((sum, t) => sum + t.totalRatings, 0),
        totalOffers: clientOffers.length,
        acceptedOffers: clientOffers.filter(o => o.status === 'accepted').length,
      },
    };
  }

  async getToursForReport(filters: {
    agentId?: string;
    startDate?: string;
    endDate?: string;
    clientFilter?: string;
    statusFilter?: string;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters.agentId) {
      conditions.push(eq(tours.agentId, filters.agentId));
    }
    
    if (filters.startDate) {
      conditions.push(sql`${tours.scheduledDate} >= ${filters.startDate}`);
    }
    
    if (filters.endDate) {
      conditions.push(sql`${tours.scheduledDate} <= ${filters.endDate}`);
    }
    
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      conditions.push(eq(tours.status, filters.statusFilter as any));
    }
    
    // Fetch tours with conditions
    const toursData = conditions.length > 0
      ? await db.select().from(tours).where(and(...conditions)).orderBy(sql`${tours.scheduledDate} DESC`)
      : await db.select().from(tours).orderBy(sql`${tours.scheduledDate} DESC`);
    
    // Fetch related data for each tour
    const toursWithDetails = await Promise.all(
      toursData.map(async (tour) => {
        // Get client data
        const [client] = await db.select().from(users).where(eq(users.id, tour.clientId));
        
        // Apply client filter if provided
        if (filters.clientFilter) {
          const clientName = `${client?.firstName || ""} ${client?.lastName || ""}`.toLowerCase();
          if (!clientName.includes(filters.clientFilter.toLowerCase())) {
            return null;
          }
        }
        
        // Get tour properties
        const tourProps = await db
          .select()
          .from(tourProperties)
          .where(eq(tourProperties.tourId, tour.id));
        
        // Get property details
        const propertyIds = tourProps.map(tp => tp.propertyId);
        const props = propertyIds.length > 0
          ? await db
              .select()
              .from(properties)
              .where(sql`${properties.id} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        
        // Get ratings for this tour
        const ratings = await db
          .select()
          .from(propertyRatings)
          .where(eq(propertyRatings.tourId, tour.id));
        
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.starRating || 0), 0) / ratings.length
          : null;
        
        return {
          ...tour,
          client,
          properties: props,
          totalRatings: ratings.length,
          averageRating: avgRating,
        };
      })
    );
    
    // Filter out nulls (failed client filter)
    return toursWithDetails.filter(t => t !== null);
  }

  async getTourProperties(tourId: string): Promise<TourProperty[]> {
    return await db.select().from(tourProperties).where(eq(tourProperties.tourId, tourId)).orderBy(sql`${tourProperties.order} ASC`);
  }

  async addPropertyToTour(tourId: string, propertyId: string, order: number): Promise<TourProperty> {
    const [tourProperty] = await db
      .insert(tourProperties)
      .values({ tourId, propertyId, order })
      .returning();
    return tourProperty;
  }

  async createTourProperty(tourProperty: { tourId: string; propertyId: string; order: number; scheduledTime?: Date | null }): Promise<TourProperty> {
    const [newTourProperty] = await db
      .insert(tourProperties)
      .values({
        tourId: tourProperty.tourId,
        propertyId: tourProperty.propertyId,
        order: tourProperty.order,
        scheduledTime: tourProperty.scheduledTime || null,
      })
      .returning();
    return newTourProperty;
  }

  async updateTourPropertyStatus(tourId: string, propertyId: string, status: string, rejectionReason?: string): Promise<TourProperty> {
    const [updatedTourProperty] = await db
      .update(tourProperties)
      .set({
        status: status as any,
        rejectionReason,
        visitedAt: status === "viewed" ? new Date() : undefined
      })
      .where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId)))
      .returning();
    return updatedTourProperty;
  }

  async getTourProperty(tourId: string, propertyId: string): Promise<TourProperty | null> {
    const [tp] = await db
      .select()
      .from(tourProperties)
      .where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId)))
      .limit(1);
    return tp || null;
  }

  async updateAgentPropertyReview(tourId: string, propertyId: string, agentRating: number, agentNotes: string): Promise<TourProperty> {
    const [updated] = await db
      .update(tourProperties)
      .set({ agentRating, agentNotes } as any)
      .where(and(eq(tourProperties.tourId, tourId), eq(tourProperties.propertyId, propertyId)))
      .returning();
    return updated;
  }

  // Showing request operations
  async getShowingRequests(filters: { agentId?: string; clientId?: string; status?: string }): Promise<any[]> {
    const conditions = [];

    if (filters.agentId) conditions.push(eq(showingRequests.agentId, filters.agentId));
    if (filters.clientId) conditions.push(eq(showingRequests.clientId, filters.clientId));
    if (filters.status) conditions.push(eq(showingRequests.status, filters.status as any));

    const clientUsers = db.select().from(users).as('clientUsers');

    const baseQuery = db
      .select({
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
        clientName: sql<string>`COALESCE(${clientUsers.firstName}, '') || ' ' || COALESCE(${clientUsers.lastName}, '')`,
        propertyAddress: sql<string>`(
          SELECT p.address FROM requested_properties rp
          JOIN properties p ON p.id = rp.property_id
          WHERE rp.request_id = ${showingRequests.id}
          LIMIT 1
        )`,
        propertyCount: sql<number>`(
          SELECT COUNT(*) FROM requested_properties rp
          WHERE rp.request_id = ${showingRequests.id}
        )`,
      })
      .from(showingRequests)
      .leftJoin(clientUsers, eq(showingRequests.clientId, clientUsers.id));

    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(sql`${showingRequests.createdAt} DESC`);
    }

    return await baseQuery.orderBy(sql`${showingRequests.createdAt} DESC`);
  }

  async createShowingRequest(request: InsertShowingRequest): Promise<ShowingRequest> {
    const [newRequest] = await db.insert(showingRequests).values(request).returning();
    return newRequest;
  }

  async updateShowingRequestStatus(id: string, status: string): Promise<ShowingRequest> {
    const [updatedRequest] = await db
      .update(showingRequests)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(showingRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async addPropertyToRequest(requestId: string, propertyId: string): Promise<void> {
    await db.insert(requestedProperties).values({ requestId, propertyId });
  }

  async getRequestedProperties(requestId: string): Promise<string[]> {
    const results = await db.select({ propertyId: requestedProperties.propertyId })
      .from(requestedProperties)
      .where(eq(requestedProperties.requestId, requestId));
    return results.map(r => r.propertyId);
  }

  async getShowingRequest(id: string): Promise<ShowingRequest | null> {
    const [request] = await db.select().from(showingRequests).where(eq(showingRequests.id, id)).limit(1);
    return request || null;
  }

  // Photo operations
  async getPropertyPhotos(propertyId: string): Promise<PropertyPhoto[]> {
    return await db.select().from(propertyPhotos).where(eq(propertyPhotos.propertyId, propertyId)).orderBy(sql`${propertyPhotos.createdAt} DESC`);
  }

  async getPhotosByAgent(agentId: string, clientId?: string | null): Promise<any[]> {
    // First, get all properties for this agent
    const agentProperties = await db.select().from(properties).where(eq(properties.agentId, agentId));
    const propertyIds = agentProperties.map(p => p.id);
    
    if (propertyIds.length === 0) {
      return [];
    }
    
    const conditions = [inArray(propertyPhotos.propertyId, propertyIds)];
    
    // Handle clientId filtering: undefined = all, null = only photos with no client, string = specific client
    if (clientId === null) {
      conditions.push(sql`${propertyPhotos.clientId} IS NULL`);
    } else if (clientId !== undefined) {
      conditions.push(eq(propertyPhotos.clientId, clientId));
    }
    
    const photos = await db
      .select({
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
        clientName: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
        clientEmail: users.email
      })
      .from(propertyPhotos)
      .leftJoin(users, eq(propertyPhotos.clientId, users.id))
      .where(and(...conditions))
      .orderBy(sql`${propertyPhotos.createdAt} DESC`);
    
    return photos;
  }

  async uploadPropertyPhoto(photo: InsertPropertyPhoto): Promise<PropertyPhoto> {
    const [newPhoto] = await db.insert(propertyPhotos).values(photo).returning();
    return newPhoto;
  }

  // Property Media operations
  async getPropertyMedia(propertyId: string, tourId: string): Promise<PropertyMedia[]> {
    return await db
      .select()
      .from(propertyMedia)
      .where(
        and(
          eq(propertyMedia.propertyId, propertyId),
          eq(propertyMedia.tourId, tourId)
        )
      )
      .orderBy(sql`${propertyMedia.createdAt} DESC`);
  }

  async uploadPropertyMedia(media: InsertPropertyMedia): Promise<PropertyMedia> {
    const [newMedia] = await db.insert(propertyMedia).values(media).returning();
    return newMedia;
  }

  async deletePropertyMedia(mediaId: string): Promise<void> {
    await db.delete(propertyMedia).where(eq(propertyMedia.id, mediaId));
  }

  // Property Rating operations
  async getPropertyRating(propertyId: string, clientId: string, tourId: string): Promise<PropertyRating | null> {
    const [rating] = await db
      .select()
      .from(propertyRatings)
      .where(
        and(
          eq(propertyRatings.propertyId, propertyId),
          eq(propertyRatings.clientId, clientId),
          eq(propertyRatings.tourId, tourId)
        )
      );
    return rating || null;
  }

  async createPropertyRating(rating: InsertPropertyRating): Promise<PropertyRating> {
    const [newRating] = await db.insert(propertyRatings).values(rating).returning();
    return newRating;
  }

  async updatePropertyRating(id: string, updates: Partial<InsertPropertyRating>): Promise<PropertyRating> {
    const [updatedRating] = await db
      .update(propertyRatings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(propertyRatings.id, id))
      .returning();
    return updatedRating;
  }

  async getPropertyRatingsByClient(clientId: string): Promise<PropertyRating[]> {
    return await db
      .select()
      .from(propertyRatings)
      .where(eq(propertyRatings.clientId, clientId))
      .orderBy(sql`${propertyRatings.createdAt} DESC`);
  }

  async getPropertyRatingsByTour(tourId: string): Promise<PropertyRating[]> {
    return await db
      .select()
      .from(propertyRatings)
      .where(eq(propertyRatings.tourId, tourId))
      .orderBy(sql`${propertyRatings.createdAt} DESC`);
  }

  async getPropertyReviews(propertyId: string): Promise<any[]> {
    // Client reviews from propertyRatings joined with users
    const clientReviews = await db
      .select({
        id: propertyRatings.id,
        reviewType: sql<string>`'client'`,
        rating: propertyRatings.rating,
        feedbackCategory: propertyRatings.feedbackCategory,
        reason: propertyRatings.reason,
        notes: propertyRatings.notes,
        tourId: propertyRatings.tourId,
        createdAt: propertyRatings.createdAt,
        reviewerName: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
      })
      .from(propertyRatings)
      .leftJoin(users, eq(propertyRatings.clientId, users.id))
      .where(eq(propertyRatings.propertyId, propertyId))
      .orderBy(sql`${propertyRatings.createdAt} DESC`);

    // Agent reviews from tourProperties joined with tours then users (agent)
    const agentReviews = await db
      .select({
        id: tourProperties.id,
        reviewType: sql<string>`'agent'`,
        rating: tourProperties.agentRating,
        notes: tourProperties.agentNotes,
        tourId: tourProperties.tourId,
        createdAt: tours.createdAt,
        reviewerName: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
      })
      .from(tourProperties)
      .leftJoin(tours, eq(tourProperties.tourId, tours.id))
      .leftJoin(users, eq(tours.agentId, users.id))
      .where(
        and(
          eq(tourProperties.propertyId, propertyId),
          sql`${tourProperties.agentRating} IS NOT NULL`
        )
      )
      .orderBy(sql`${tours.createdAt} DESC`);

    const combined = [...clientReviews, ...agentReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Attach media photos for each review (keyed by tourId)
    const uniqueTourIds = [...new Set(combined.map((r) => r.tourId).filter(Boolean))];
    const mediaByTour: Record<string, any[]> = {};
    for (const tId of uniqueTourIds) {
      const media = await db
        .select()
        .from(propertyMedia)
        .where(
          and(
            eq(propertyMedia.propertyId, propertyId),
            eq(propertyMedia.tourId, tId),
          )
        )
        .orderBy(sql`${propertyMedia.createdAt} ASC`);
      mediaByTour[tId] = media;
    }

    return combined.map((r) => ({
      ...r,
      photos: mediaByTour[r.tourId] ?? [],
    }));
  }

  // Offer operations
  async getOffers(filters: { propertyId?: string; clientId?: string; agentId?: string }): Promise<Offer[]> {
    const conditions = [];
    
    if (filters.propertyId) conditions.push(eq(offers.propertyId, filters.propertyId));
    if (filters.clientId) conditions.push(eq(offers.clientId, filters.clientId));
    if (filters.agentId) conditions.push(eq(offers.agentId, filters.agentId));
    
    if (conditions.length > 0) {
      return await db.select().from(offers).where(and(...conditions)).orderBy(sql`${offers.submittedAt} DESC`);
    }
    
    return await db.select().from(offers).orderBy(sql`${offers.submittedAt} DESC`);
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }

  async updateOfferStatus(id: string, status: string, respondedAt?: Date): Promise<Offer> {
    const [updatedOffer] = await db
      .update(offers)
      .set({ status: status as any, respondedAt: respondedAt || new Date() })
      .where(eq(offers.id, id))
      .returning();
    return updatedOffer;
  }

  // Group operations
  async getClientGroups(userId: string): Promise<ClientGroup[]> {
    return await db
      .select()
      .from(clientGroups)
      .innerJoin(groupMembers, eq(clientGroups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .then(results => results.map(r => r.client_groups));
  }

  async createClientGroup(group: InsertClientGroup): Promise<ClientGroup> {
    const [newGroup] = await db.insert(clientGroups).values(group).returning();
    // Add creator as first member
    await this.addGroupMember(newGroup.id, group.createdById);
    return newGroup;
  }

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    await db.insert(groupMembers).values({ groupId, userId });
  }

  async getGroupMessages(groupId: string): Promise<Array<GroupMessage & { user: { firstName: string; lastName: string; email: string } }>> {
    const messages = await db
      .select({
        id: groupMessages.id,
        groupId: groupMessages.groupId,
        userId: groupMessages.userId,
        message: groupMessages.message,
        createdAt: groupMessages.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(groupMessages)
      .innerJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(asc(groupMessages.createdAt));
    
    return messages as any;
  }

  async createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage> {
    const [newMessage] = await db.insert(groupMessages).values(message).returning();
    return newMessage;
  }

  async getGroupMembers(groupId: string): Promise<Array<{ id: string; userId: string; joinedAt: Date; user: { firstName: string; lastName: string; email: string } }>> {
    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        joinedAt: groupMembers.joinedAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.joinedAt));
    
    return members as any;
  }

  async getAgentClientGroups(agentId: string): Promise<ClientGroup[]> {
    // Get all client groups where the agent's clients are members
    const results = await db
      .selectDistinct({
        id: clientGroups.id,
        name: clientGroups.name,
        createdById: clientGroups.createdById,
        createdAt: clientGroups.createdAt,
      })
      .from(clientGroups)
      .innerJoin(groupMembers, eq(clientGroups.id, groupMembers.groupId))
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(users.agentId, agentId));
    
    return results;
  }

  // Statistics
  async getAgentStats(agentId: string): Promise<{
    todayTours: number;
    activeClients: number;
    pendingRequests: number;
    weeklyDistance: number;
    timeInvestedHours: number;
    offersPipeline: {
      pending: number;
      accepted: number;
      rejected: number;
      total: number;
    };
    avgScopeFitScore: number;
    exceptionsCount: number;
    recentChanges: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayToursResult] = await db
      .select({ count: count() })
      .from(tours)
      .where(
        and(
          eq(tours.agentId, agentId),
          sql`${tours.scheduledDate} >= ${today}`,
          sql`${tours.scheduledDate} < ${tomorrow}`
        )
      );

    const [activeClientsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.agentId, agentId), eq(users.role, "client")));

    const [pendingRequestsResult] = await db
      .select({ count: count() })
      .from(showingRequests)
      .where(and(eq(showingRequests.agentId, agentId), eq(showingRequests.status, "pending")));

    const [weeklyDistanceResult] = await db
      .select({ total: sum(tours.totalDistance) })
      .from(tours)
      .where(
        and(
          eq(tours.agentId, agentId),
          sql`${tours.scheduledDate} >= ${weekAgo}`
        )
      );

    // Calculate time invested (sum of tour durations)
    const [timeInvestedResult] = await db
      .select({ total: sum(tours.actualDuration) })
      .from(tours)
      .where(eq(tours.agentId, agentId));

    // Calculate offers pipeline using grouped query for efficiency
    const offersBreakdown = await db
      .select({
        status: offers.status,
        count: count()
      })
      .from(offers)
      .where(eq(offers.agentId, agentId))
      .groupBy(offers.status);

    // Aggregate offers by status
    const offersPipeline = offersBreakdown.reduce((acc, row) => {
      if (row.status === 'pending') acc.pending = row.count;
      if (row.status === 'accepted') acc.accepted = row.count;
      if (row.status === 'rejected') acc.rejected = row.count;
      acc.total += row.count;
      return acc;
    }, { pending: 0, accepted: 0, rejected: 0, total: 0 });

    // Calculate average scope fit score across all client requirements
    const [avgScopeFitResult] = await db
      .select({ avgScore: sql<number>`AVG(CAST(${clientRequirements.validationScore} AS DECIMAL))` })
      .from(clientRequirements)
      .where(eq(clientRequirements.agentId, agentId));

    // Count exceptions
    const [exceptionsResult] = await db
      .select({ count: count() })
      .from(requirementsExceptions)
      .innerJoin(clientRequirements, eq(requirementsExceptions.requirementId, clientRequirements.id))
      .where(eq(clientRequirements.agentId, agentId));

    // Count recent requirement changes (last 7 days)
    const [recentChangesResult] = await db
      .select({ count: count() })
      .from(requirementsVersions)
      .innerJoin(clientRequirements, eq(requirementsVersions.requirementId, clientRequirements.id))
      .where(
        and(
          eq(clientRequirements.agentId, agentId),
          sql`${requirementsVersions.createdAt} >= ${weekAgo}`
        )
      );

    // Convert time invested to hours with one decimal place
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
      recentChanges: recentChangesResult.count,
    };
  }

  async getClientStats(clientId: string): Promise<{
    propertiesSeen: number;
    propertiesRejected: number;
    offersMade: number;
    kmTraveled: number;
    timeInvested: number;
  }> {
    const [seenResult] = await db
      .select({ count: count() })
      .from(tourProperties)
      .innerJoin(tours, eq(tourProperties.tourId, tours.id))
      .where(
        and(
          eq(tours.clientId, clientId),
          eq(tourProperties.status, "viewed")
        )
      );

    const [rejectedResult] = await db
      .select({ count: count() })
      .from(tourProperties)
      .innerJoin(tours, eq(tourProperties.tourId, tours.id))
      .where(
        and(
          eq(tours.clientId, clientId),
          eq(tourProperties.status, "rejected")
        )
      );

    const [offersResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(eq(offers.clientId, clientId));

    const [distanceResult] = await db
      .select({ total: sum(tours.totalDistance) })
      .from(tours)
      .where(eq(tours.clientId, clientId));

    const [timeResult] = await db
      .select({ total: sum(tours.actualDuration) })
      .from(tours)
      .where(eq(tours.clientId, clientId));

    return {
      propertiesSeen: seenResult.count,
      propertiesRejected: rejectedResult.count,
      offersMade: offersResult.count,
      kmTraveled: Number(distanceResult.total || 0),
      timeInvested: Math.round(Number(timeResult.total || 0) / 60), // Convert to hours
    };
  }

  // Tour planning methods
  async getToursByDate(agentId: string, date: string): Promise<any[]> {
    // Mock implementation with sample tour data for testing
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
          longitude: -122.4194,
        },
        client: {
          firstName: "John",
          lastName: "Smith",
        },
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
          longitude: -122.4294,
        },
        client: {
          firstName: "Jane",
          lastName: "Doe",
        },
      },
    ];
  }

  async saveTourRecap(recap: any): Promise<any> {
    // Mock implementation - would use tourRecaps table
    return { id: "mock-recap-id", ...recap };
  }

  async getTourRecap(agentId: string, date: string): Promise<any | null> {
    // Mock implementation - would query tourRecaps table
    return null;
  }

  async getSchedulesByDate(date: string): Promise<any[]> {
    // Mock implementation with sample schedule data for testing
    return [
      {
        id: "schedule-1",
        tourId: "tour-1",
        property: {
          id: "prop-1",
          address: "123 Main St, San Francisco, CA",
          listingPrice: 850000,
        },
        client: {
          id: "client-1",
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com",
        },
        scheduledDate: date,
        startTime: "10:00 AM",
        estimatedDuration: 30,
        status: "scheduled",
        notes: "First showing for this client",
      },
      {
        id: "schedule-2",
        tourId: "tour-2",
        property: {
          id: "prop-2",
          address: "456 Oak Ave, San Francisco, CA",
          listingPrice: 750000,
        },
        client: {
          id: "client-2",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
        },
        scheduledDate: date,
        startTime: "2:00 PM",
        estimatedDuration: 45,
        status: "confirmed",
        notes: "Follow-up showing",
      },
    ];
  }

  async updateSchedule(scheduleId: string, updates: any): Promise<any> {
    // Mock implementation - would update showingSchedules table
    return { id: scheduleId, ...updates };
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    // Mock implementation - would delete from showingSchedules table
  }

  async getTourSummary(agentId: string, date: string): Promise<any[]> {
    // Mock implementation with sample data for testing
    return [
      {
        id: "tour-1",
        propertyAddress: "123 Main St, San Francisco, CA",
        clientName: "John Smith",
        status: "completed",
        duration: 45,
        clientFeedback: "Great property with excellent location",
        interestLevel: 4,
      },
      {
        id: "tour-2", 
        propertyAddress: "456 Oak Ave, San Francisco, CA",
        clientName: "Jane Doe",
        status: "completed",
        duration: 30,
        clientFeedback: "Nice but a bit small for our needs",
        interestLevel: 3,
      },
    ];
  }

  async updateTourRecap(recapId: string, updates: any): Promise<any> {
    // Mock implementation - would update tourRecaps table
    return { id: recapId, ...updates, updatedAt: new Date() };
  }
  // Reminder operations
  async getTourReminders(userId: string, tourId?: string): Promise<TourReminder[]> {
    const conditions = [eq(tourReminders.userId, userId)];
    if (tourId) {
      conditions.push(eq(tourReminders.tourId, tourId));
    }
    return db.select().from(tourReminders)
      .where(and(...conditions))
      .orderBy(sql`${tourReminders.createdAt} DESC`);
  }

  async createTourReminder(reminder: InsertTourReminder): Promise<TourReminder> {
    const [created] = await db.insert(tourReminders).values(reminder).returning();
    return created;
  }

  async updateTourReminder(id: string, updates: Partial<TourReminder>): Promise<TourReminder> {
    const [updated] = await db.update(tourReminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tourReminders.id, id))
      .returning();
    return updated;
  }

  async deleteTourReminder(id: string): Promise<void> {
    await db.delete(tourReminders).where(eq(tourReminders.id, id));
  }

  // Property suggestion operations
  async getPropertySuggestions(filters: { clientId?: string; agentId?: string; status?: string }): Promise<PropertySuggestion[]> {
    const conditions = [];
    if (filters.clientId) conditions.push(eq(propertySuggestions.clientId, filters.clientId));
    if (filters.agentId) conditions.push(eq(propertySuggestions.agentId, filters.agentId));
    if (filters.status) conditions.push(eq(propertySuggestions.status, filters.status as any));
    
    return db.select().from(propertySuggestions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${propertySuggestions.createdAt} DESC`);
  }

  async createPropertySuggestion(suggestion: InsertPropertySuggestion): Promise<PropertySuggestion> {
    const [created] = await db.insert(propertySuggestions).values(suggestion).returning();
    return created;
  }

  async updatePropertySuggestion(id: string, updates: Partial<InsertPropertySuggestion>): Promise<PropertySuggestion> {
    const [updated] = await db.update(propertySuggestions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(propertySuggestions.id, id))
      .returning();
    return updated;
  }

  async deletePropertySuggestion(id: string): Promise<void> {
    await db.delete(propertySuggestions).where(eq(propertySuggestions.id, id));
  }

  // Document operations
  async getDocuments(userId: string, documentType?: string): Promise<Document[]> {
    const conditions = [eq(documents.userId, userId)];
    if (documentType) {
      conditions.push(eq(documents.documentType, documentType as any));
    }
    return db.select().from(documents).where(and(...conditions)).orderBy(sql`${documents.createdAt} DESC`);
  }

  async getDocumentsByAgent(agentId: string, clientId?: string | null, documentType?: string): Promise<any[]> {
    const conditions = [eq(documents.userId, agentId)];
    
    // Handle clientId filtering: undefined = all, null = only docs with no client, string = specific client
    if (clientId === null) {
      conditions.push(sql`${documents.clientId} IS NULL`);
    } else if (clientId !== undefined) {
      conditions.push(eq(documents.clientId, clientId));
    }
    
    if (documentType) {
      conditions.push(eq(documents.documentType, documentType as any));
    }
    
    const docs = await db
      .select({
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
        clientName: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
        clientEmail: users.email
      })
      .from(documents)
      .leftJoin(users, eq(documents.clientId, users.id))
      .where(and(...conditions))
      .orderBy(sql`${documents.createdAt} DESC`);
    
    return docs;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const [updated] = await db.update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Location sharing operations
  async getLocationShares(filters: { userId?: string; tourId?: string; isActive?: boolean }): Promise<LocationShare[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(locationShares.userId, filters.userId));
    if (filters.tourId) conditions.push(eq(locationShares.tourId, filters.tourId));
    if (filters.isActive !== undefined) conditions.push(eq(locationShares.isActive, filters.isActive));
    
    return db.select().from(locationShares)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${locationShares.createdAt} DESC`);
  }

  async createLocationShare(share: InsertLocationShare): Promise<LocationShare> {
    const [created] = await db.insert(locationShares).values(share).returning();
    return created;
  }

  async updateLocationShare(id: string, updates: Partial<LocationShare>): Promise<LocationShare> {
    const [updated] = await db.update(locationShares)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(locationShares.id, id))
      .returning();
    return updated;
  }

  async deleteLocationShare(id: string): Promise<void> {
    await db.delete(locationShares).where(eq(locationShares.id, id));
  }

  // Location history and analytics operations
  async getLocationHistory(filters: { 
    userId?: string; 
    tourId?: string; 
    propertyId?: string; 
    startDate?: Date; 
    endDate?: Date; 
    activityType?: string 
  }): Promise<LocationHistory[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(locationHistory.userId, filters.userId));
    if (filters.tourId) conditions.push(eq(locationHistory.tourId, filters.tourId));
    if (filters.propertyId) conditions.push(eq(locationHistory.propertyId, filters.propertyId));
    if (filters.activityType) conditions.push(eq(locationHistory.activityType, filters.activityType as any));
    
    // Add date range filters
    if (filters.startDate) {
      conditions.push(sql`${locationHistory.recordedAt} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${locationHistory.recordedAt} <= ${filters.endDate}`);
    }
    
    return db.select().from(locationHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${locationHistory.recordedAt} DESC`);
  }

  async createLocationHistory(history: InsertLocationHistory): Promise<LocationHistory> {
    const [created] = await db.insert(locationHistory).values(history).returning();
    return created;
  }

  async getLocationAnalytics(userId: string, dateRange?: { start: Date; end: Date }) {
    // Calculate analytics from location history
    const conditions = [eq(locationHistory.userId, userId)];
    
    // Add date range conditions if provided
    if (dateRange?.start) {
      conditions.push(sql`${locationHistory.recordedAt} >= ${dateRange.start}`);
    }
    if (dateRange?.end) {
      conditions.push(sql`${locationHistory.recordedAt} <= ${dateRange.end}`);
    }
    
    const locationData = await db.select().from(locationHistory)
      .where(and(...conditions))
      .orderBy(asc(locationHistory.recordedAt));

    // Calculate analytics
    let totalDistance = 0;
    let totalTime = 0;
    const visitedProperties = new Set();
    let totalSpeed = 0;
    let speedCount = 0;
    const activityCounts = new Map();
    const heatmapData = [];

    for (let i = 0; i < locationData.length; i++) {
      const point = locationData[i];
      
      // Count activities
      const activity = point.activityType || 'unknown';
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
      
      // Track properties
      if (point.propertyId) visitedProperties.add(point.propertyId);
      
      // Calculate speed averages
      if (point.speed && Number(point.speed) > 0) {
        totalSpeed += Number(point.speed);
        speedCount++;
      }
      
      // Add to heatmap data
      heatmapData.push({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        weight: 1
      });
      
      // Calculate distance (simplified - would use proper geo calculations in production)
      if (i > 0) {
        const prevPoint = locationData[i - 1];
        const currentTime = point.recordedAt ? new Date(point.recordedAt).getTime() : 0;
        const prevTime = prevPoint.recordedAt ? new Date(prevPoint.recordedAt).getTime() : 0;
        const timeDiff = currentTime - prevTime;
        totalTime += timeDiff;
        
        // Simple distance calculation (would use haversine formula in production)
        const latDiff = Number(point.latitude) - Number(prevPoint.latitude);
        const lngDiff = Number(point.longitude) - Number(prevPoint.longitude);
        totalDistance += Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // rough meters
      }
    }

    // Convert activity counts to percentages
    const totalActivities = Array.from(activityCounts.values()).reduce((sum, count) => sum + count, 0);
    const activityBreakdown = Array.from(activityCounts.entries()).map(([activityType, count]) => ({
      activityType,
      count,
      percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0
    }));

    return {
      totalDistance: Math.round(totalDistance), // in meters
      totalTime: Math.round(totalTime / 1000), // in seconds
      visitedProperties: visitedProperties.size,
      avgSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
      activityBreakdown,
      heatmapData
    };
  }

  // Calendar operations
  async getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]> {
    return db.select().from(calendarIntegrations).where(eq(calendarIntegrations.userId, userId)).orderBy(sql`${calendarIntegrations.createdAt} DESC`);
  }

  async createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const [created] = await db.insert(calendarIntegrations).values(integration).returning();
    return created;
  }

  async updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration> {
    const [updated] = await db.update(calendarIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarIntegration(id: string): Promise<void> {
    await db.delete(calendarIntegrations).where(eq(calendarIntegrations.id, id));
  }

  async getCalendarEvents(filters: { userId?: string; integrationId?: string; startTime?: Date; endTime?: Date }): Promise<CalendarEvent[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(calendarEvents.userId, filters.userId));
    if (filters.integrationId) conditions.push(eq(calendarEvents.integrationId, filters.integrationId));
    // Add time range filters if needed
    
    return db.select().from(calendarEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(calendarEvents.startTime));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db.update(calendarEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  // Rental profile operations
  async getRentalProfile(userId: string): Promise<RentalProfile | undefined> {
    const [profile] = await db.select().from(rentalProfiles).where(eq(rentalProfiles.userId, userId));
    return profile;
  }

  async createRentalProfile(profile: InsertRentalProfile): Promise<RentalProfile> {
    try {
      // Try insert first
      const [created] = await db.insert(rentalProfiles).values(profile).returning();
      return created;
    } catch (error: any) {
      // Handle unique constraint violation (23505 is PostgreSQL unique constraint violation)
      if (error.code === '23505' && error.detail?.includes('user_id')) {
        // User already has a profile, update it instead
        return this.updateRentalProfile(profile.userId, profile);
      }
      throw error;
    }
  }

  async updateRentalProfile(userId: string, updates: Partial<InsertRentalProfile>): Promise<RentalProfile> {
    const [updated] = await db.update(rentalProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rentalProfiles.userId, userId))
      .returning();
    return updated;
  }

  async deleteRentalProfile(userId: string): Promise<void> {
    await db.delete(rentalProfiles).where(eq(rentalProfiles.userId, userId));
  }

  // ==================== REQUIREMENTS SYSTEM ====================
  
  // Core Requirements Management
  async getClientRequirement(clientId: string): Promise<ClientRequirement | null> {
    const [requirement] = await db
      .select()
      .from(clientRequirements)
      .where(and(
        eq(clientRequirements.userId, clientId),
        eq(clientRequirements.isActive, true)
      ))
      .orderBy(sql`${clientRequirements.version} DESC`)
      .limit(1);
    
    return requirement || null;
  }

  async createClientRequirement(requirement: InsertClientRequirement): Promise<ClientRequirement> {
    // Check if client already has requirements
    const existing = await this.getClientRequirement(requirement.userId);
    
    if (existing) {
      // Create new version
      const newVersion = existing.version + 1;
      const [newRequirement] = await db
        .insert(clientRequirements)
        .values({
          ...requirement,
          version: newVersion,
          status: 'incomplete',
          validationScore: "0",
        })
        .returning();

      // Archive previous version
      await db
        .update(clientRequirements)
        .set({ isActive: false })
        .where(eq(clientRequirements.id, existing.id));

      // Create version record
      await this.createRequirementVersion({
        requirementId: newRequirement.id,
        version: newVersion,
        changeType: 'updated',
        changes: { created: 'new_version' },
        changedBy: requirement.agentId || requirement.userId,
        changeReason: requirement.agentId ? 'Requirements updated by agent' : 'Requirements updated by client'
      });

      return newRequirement;
    } else {
      // Create first requirement
      const [newRequirement] = await db
        .insert(clientRequirements)
        .values({
          ...requirement,
          version: 1,
          status: 'incomplete',
          validationScore: "0",
        })
        .returning();

      // Create version record
      await this.createRequirementVersion({
        requirementId: newRequirement.id,
        version: 1,
        changeType: 'created',
        changes: { created: 'initial' },
        changedBy: requirement.agentId || requirement.userId,
        changeReason: requirement.agentId ? 'Initial requirements created by agent' : 'Initial requirements created by client'
      });

      return newRequirement;
    }
  }

  async updateClientRequirement(id: string, updates: Partial<InsertClientRequirement>): Promise<ClientRequirement> {
    const [updated] = await db
      .update(clientRequirements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientRequirements.id, id))
      .returning();

    // Create version record for update
    await this.createRequirementVersion({
      requirementId: id,
      version: updated.version,
      changeType: 'updated',
      changes: updates,
      changedBy: updates.agentId || updated.agentId,
      changeReason: 'Requirements updated'
    });

    return updated;
  }

  // Requirements Validation
  async validateRequirements(requirementId: string, agentId: string): Promise<{ score: number; issues: string[] }> {
    const [requirement] = await db
      .select()
      .from(clientRequirements)
      .where(eq(clientRequirements.id, requirementId));

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const issues: string[] = [];
    let scoreComponents = 0;
    let maxComponents = 0;

    // Common validation checks
    maxComponents += 5; // Budget, areas, property types, bedrooms, timeline

    if (requirement.budgetMin && requirement.budgetMax) {
      scoreComponents++;
    } else {
      issues.push('Budget range is required');
    }

    if (requirement.preferredAreas && requirement.preferredAreas.length > 0) {
      scoreComponents++;
    } else {
      issues.push('At least one preferred area is required');
    }

    if (requirement.propertyTypes && requirement.propertyTypes.length > 0) {
      scoreComponents++;
    } else {
      issues.push('Property type preferences are required');
    }

    if (requirement.bedrooms && requirement.bedrooms > 0) {
      scoreComponents++;
    } else {
      issues.push('Bedroom preference is required');
    }

    if (requirement.timeframe) {
      scoreComponents++;
    } else {
      issues.push('Timeframe is required');
    }

    // Client-type specific validation
    if (requirement.clientType === 'buyer') {
      maxComponents += 2; // Pre-approval, closing date
      
      if (requirement.preApprovalAmount) {
        scoreComponents++;
      } else {
        issues.push('Pre-approval amount is required for buyers');
      }

      if (requirement.desiredClosingDate) {
        scoreComponents++;
      } else {
        issues.push('Desired closing date is required for buyers');
      }
    } else if (requirement.clientType === 'renter') {
      maxComponents += 2; // Income verification, move-in date
      
      if (requirement.monthlyIncomeVerified) {
        scoreComponents++;
      } else {
        issues.push('Income verification is required for renters');
      }

      if (requirement.preferredMoveInDate) {
        scoreComponents++;
      } else {
        issues.push('Preferred move-in date is required for renters');
      }
    }

    const score = scoreComponents / maxComponents;

    // Update validation score
    await db
      .update(clientRequirements)
      .set({
        validationScore: score.toFixed(2),
        lastValidatedAt: new Date(),
        validatedBy: agentId,
        status: score >= 0.8 ? 'validated' : score >= 0.5 ? 'pending_validation' : 'incomplete'
      })
      .where(eq(clientRequirements.id, requirementId));

    return { score, issues };
  }

  // Requirements Versioning
  async getRequirementVersions(requirementId: string): Promise<RequirementsVersion[]> {
    return await db
      .select()
      .from(requirementsVersions)
      .where(eq(requirementsVersions.requirementId, requirementId))
      .orderBy(sql`${requirementsVersions.version} DESC`);
  }

  async createRequirementVersion(version: InsertRequirementsVersion): Promise<RequirementsVersion> {
    const [created] = await db
      .insert(requirementsVersions)
      .values(version)
      .returning();
    return created;
  }

  // Requirements Exceptions
  async getRequirementExceptions(requirementId: string): Promise<RequirementsException[]> {
    return await db
      .select()
      .from(requirementsExceptions)
      .where(eq(requirementsExceptions.requirementId, requirementId))
      .orderBy(sql`${requirementsExceptions.createdAt} DESC`);
  }

  async createRequirementException(exception: InsertRequirementsException): Promise<RequirementsException> {
    const [created] = await db
      .insert(requirementsExceptions)
      .values(exception)
      .returning();
    return created;
  }

  // Property Matching and Scoring
  async calculatePropertyMatches(requirementId: string): Promise<PropertyMatch[]> {
    const [requirement] = await db
      .select()
      .from(clientRequirements)
      .where(eq(clientRequirements.id, requirementId));

    if (!requirement) {
      return [];
    }

    // Get all active properties
    const allProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.isActive, true));

    const matches: PropertyMatch[] = [];

    for (const property of allProperties) {
      const match = await this.calculateSinglePropertyMatch(requirement, property);
      matches.push(match);
    }

    // Save matches to database
    await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, requirementId));
    
    if (matches.length > 0) {
      await db.insert(propertyMatches).values(matches);
    }

    return matches.sort((a, b) => Number(b.overallScore) - Number(a.overallScore));
  }

  private async calculateSinglePropertyMatch(requirement: ClientRequirement, property: Property): Promise<PropertyMatch> {
    let budgetScore = 0;
    let locationScore = 0;
    let sizeScore = 0;
    let typeScore = 0;
    let amenityScore = 0;
    let timelineScore = 0;

    const dealBreakers: string[] = [];
    const highlights: string[] = [];

    // Budget scoring
    const propertyPrice = Number(property.price);
    const minBudget = Number(requirement.budgetMin || 0);
    const maxBudget = Number(requirement.budgetMax || Infinity);
    
    if (propertyPrice >= minBudget && propertyPrice <= maxBudget) {
      budgetScore = 1;
      highlights.push('Within budget range');
    } else if (propertyPrice > maxBudget) {
      budgetScore = Math.max(0, 1 - ((propertyPrice - maxBudget) / maxBudget));
      if (budgetScore < 0.5) dealBreakers.push('Over budget');
    } else {
      budgetScore = 0.8; // Under budget is generally good
      highlights.push('Under budget');
    }

    // Location scoring (simplified - would use geocoding in production)
    const propertyArea = property.area?.toLowerCase() || '';
    const preferredAreas = requirement.preferredAreas || [];
    locationScore = preferredAreas.some(area => 
      propertyArea.includes(area.toLowerCase()) || area.toLowerCase().includes(propertyArea)
    ) ? 1 : 0.3;

    if (locationScore === 1) {
      highlights.push('In preferred area');
    } else if (locationScore < 0.5) {
      dealBreakers.push('Not in preferred area');
    }

    // Size scoring
    const propertyBedrooms = property.bedrooms;
    const requiredBedrooms = requirement.bedrooms || 0;
    
    if (propertyBedrooms === requiredBedrooms) {
      sizeScore = 1;
      highlights.push('Exact bedroom match');
    } else if (Math.abs(propertyBedrooms - requiredBedrooms) === 1) {
      sizeScore = 0.7;
    } else {
      sizeScore = 0.3;
      dealBreakers.push(`${propertyBedrooms} bedrooms vs ${requiredBedrooms} required`);
    }

    // Bathroom scoring
    const propertyBathrooms = Number(property.bathrooms);
    const requiredBathrooms = Number(requirement.bathrooms || 1);
    const bathroomScore = propertyBathrooms >= requiredBathrooms ? 1 : 0.5;
    sizeScore = (sizeScore + bathroomScore) / 2;

    // Type scoring (simplified)
    typeScore = 0.8; // Default reasonable match

    // Amenity scoring (parking)
    if (requirement.parkingRequired && requirement.parkingSpots > 0) {
      // Would need property amenity data for proper scoring
      amenityScore = 0.5; // Neutral - can't determine from current schema
    } else {
      amenityScore = 1;
    }

    // Timeline scoring
    timelineScore = 1; // Assume all properties are available

    // Calculate overall score
    const weights = {
      budget: 0.3,
      location: 0.25,
      size: 0.2,
      type: 0.1,
      amenity: 0.1,
      timeline: 0.05
    };

    const overallScore = 
      (budgetScore * weights.budget) +
      (locationScore * weights.location) +
      (sizeScore * weights.size) +
      (typeScore * weights.type) +
      (amenityScore * weights.amenity) +
      (timelineScore * weights.timeline);

    // Generate match reason
    let matchReason = '';
    if (overallScore >= 0.8) {
      matchReason = 'Excellent match - meets most key criteria';
    } else if (overallScore >= 0.6) {
      matchReason = 'Good match - meets important criteria with minor gaps';
    } else if (overallScore >= 0.4) {
      matchReason = 'Partial match - some criteria met';
    } else {
      matchReason = 'Poor match - significant gaps in requirements';
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
      calculatedAt: new Date(),
      agentReview: 'pending',
      agentNotes: null
    };
  }

  async getPropertyMatchesForClient(clientId: string): Promise<PropertyMatch[]> {
    const requirement = await this.getClientRequirement(clientId);
    if (!requirement) {
      return [];
    }

    return await db
      .select()
      .from(propertyMatches)
      .where(eq(propertyMatches.requirementId, requirement.id))
      .orderBy(sql`${propertyMatches.overallScore} DESC`);
  }

  // OREA Form 410 Rental Application methods
  async createRentalApplication(applicationData: any): Promise<any> {
    return await db.transaction(async (tx) => {
      // Extract nested sections and create main application record with only valid table columns
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

      // Create the main rental application with only fields that exist in the table
      const [application] = await tx.insert(rentalApplications).values({
        ...mainData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const applicationId = application.id;

      // Create current employment history record if data exists
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create previous employment history record if data exists
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create financial information record if data exists
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create rental history records if data exists
      if (currentRental && currentRental.address) {
        await tx.insert(rentalHistory).values({
          applicationId,
          address: currentRental.address,
          landlordName: currentRental.landlordName || '',
          landlordPhone: currentRental.landlordPhone || '',
          landlordEmail: currentRental.landlordEmail,
          monthlyRent: parseFloat(currentRental.monthlyRent || "0"),
          startDate: currentRental.startDate,
          endDate: null, // Current rental, no end date
          reasonForLeaving: currentRental.reasonForLeaving,
          wasEvicted: currentRental.wasEvicted || false,
          latePayments: currentRental.latePayments || false,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (previousRental && previousRental.address) {
        await tx.insert(rentalHistory).values({
          applicationId,
          address: previousRental.address,
          landlordName: previousRental.landlordName || '',
          landlordPhone: previousRental.landlordPhone || '',
          landlordEmail: previousRental.landlordEmail,
          monthlyRent: parseFloat(previousRental.monthlyRent || "0"),
          startDate: previousRental.startDate,
          endDate: previousRental.endDate,
          reasonForLeaving: previousRental.reasonForLeaving,
          wasEvicted: previousRental.wasEvicted || false,
          latePayments: previousRental.latePayments || false,
          isCurrent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create personal references if they exist
      if (reference1 && reference1.name) {
        await tx.insert(personalReferences).values({
          applicationId,
          name: reference1.name,
          relationship: reference1.relationship,
          phoneNumber: reference1.phoneNumber,
          email: reference1.email,
          yearsKnown: parseInt(reference1.yearsKnown || "0"),
          createdAt: new Date(),
          updatedAt: new Date(),
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return application;
    });
  }

  async getRentalApplication(applicationId: string): Promise<any | null> {
    // Get the main application
    const [application] = await db.select().from(rentalApplications).where(eq(rentalApplications.id, applicationId)).limit(1);
    if (!application) return null;

    // Get related records
    const [employmentRecords, financialRecord, references, rentalRecords] = await Promise.all([
      db.select().from(employmentHistory).where(eq(employmentHistory.applicationId, applicationId)),
      db.select().from(financialInformation).where(eq(financialInformation.applicationId, applicationId)).limit(1),
      db.select().from(personalReferences).where(eq(personalReferences.applicationId, applicationId)),
      db.select().from(rentalHistory).where(eq(rentalHistory.applicationId, applicationId)),
    ]);

    // Return complete application data
    return {
      ...application,
      employmentHistory: employmentRecords,
      financialInformation: financialRecord[0] || null,
      references: references,
      rentalHistory: rentalRecords,
    };
  }

  async getUserRentalApplications(userId: string): Promise<any[]> {
    return db.select().from(rentalApplications).where(eq(rentalApplications.userId, userId)).orderBy(rentalApplications.createdAt);
  }

  async getAgentRentalApplications(agentId: string): Promise<any[]> {
    return db.select().from(rentalApplications).where(eq(rentalApplications.agentId, agentId)).orderBy(rentalApplications.createdAt);
  }

  async updateRentalApplicationStatus(applicationId: string, status: string, reviewNotes: string | null, agentId: string): Promise<any> {
    const [updatedApplication] = await db
      .update(rentalApplications)
      .set({
        status,
        reviewNotes,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rentalApplications.id, applicationId))
      .returning();
    return updatedApplication;
  }

  // Directory - Contact operations
  async getContacts(agentId: string, filters?: { search?: string; relationshipType?: string; hasApp?: boolean }): Promise<any[]> {
    let query = db
      .select({
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
          email: users.email,
        },
        relationshipType: clientContactLinks.relationshipType,
        isPrimary: clientContactLinks.isPrimary,
      })
      .from(contacts)
      .leftJoin(clientContactLinks, eq(contacts.id, clientContactLinks.contactId))
      .leftJoin(users, eq(clientContactLinks.clientId, users.id))
      .where(eq(contacts.agentId, agentId));

    const results = await query;
    
    // Apply filters
    let filteredResults = results;
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResults = filteredResults.filter(c => {
        const nameMatch = c.fullName?.toLowerCase().includes(searchLower);
        
        // Handle emails - support both object format and string format
        const emailMatch = c.emails && Array.isArray(c.emails) && c.emails.some((e: any) => {
          if (typeof e === 'string') return e.toLowerCase().includes(searchLower);
          return e?.address?.toLowerCase().includes(searchLower);
        });
        
        // Handle phones - support both object format and string format
        const phoneMatch = c.phones && Array.isArray(c.phones) && c.phones.some((p: any) => {
          if (typeof p === 'string') return p.includes(searchLower);
          return p?.number?.includes(searchLower);
        });
        
        return nameMatch || emailMatch || phoneMatch;
      });
    }
    
    if (filters?.relationshipType && filters.relationshipType !== 'all') {
      filteredResults = filteredResults.filter(c => c.relationshipType === filters.relationshipType);
    }
    
    if (filters?.hasApp !== undefined) {
      filteredResults = filteredResults.filter(c => c.hasApp === filters.hasApp);
    }

    return filteredResults;
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [updated] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContact(id: string): Promise<void> {
    // First delete all links
    await db.delete(clientContactLinks).where(eq(clientContactLinks.contactId, id));
    // Then delete the contact
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async linkContactToClient(link: InsertClientContactLink): Promise<ClientContactLink> {
    const [newLink] = await db.insert(clientContactLinks).values(link).returning();
    return newLink;
  }

  async unlinkContactFromClient(clientId: string, contactId: string): Promise<void> {
    await db.delete(clientContactLinks).where(
      and(
        eq(clientContactLinks.clientId, clientId),
        eq(clientContactLinks.contactId, contactId)
      )
    );
  }

  async getClientContacts(clientId: string): Promise<any[]> {
    const results = await db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        dateOfBirth: contacts.dateOfBirth,
        phones: contacts.phones,
        emails: contacts.emails,
        notes: contacts.notes,
        hasApp: contacts.hasApp,
        lastActiveAt: contacts.lastActiveAt,
        relationshipType: clientContactLinks.relationshipType,
        isPrimary: clientContactLinks.isPrimary,
      })
      .from(clientContactLinks)
      .innerJoin(contacts, eq(clientContactLinks.contactId, contacts.id))
      .where(eq(clientContactLinks.clientId, clientId));
    
    return results;
  }

  async getContactTimeline(contactId: string): Promise<any[]> {
    // Get tours where this contact's client participated
    const contactLinks = await db
      .select({ clientId: clientContactLinks.clientId })
      .from(clientContactLinks)
      .where(eq(clientContactLinks.contactId, contactId));

    if (contactLinks.length === 0) return [];

    const clientIds = contactLinks.map(link => link.clientId);
    
    // Get tour activity
    const tourActivity = await db
      .select({
        type: sql`'tour'`,
        id: tours.id,
        date: tours.scheduledDate,
        description: sql`'Attended property tour'`,
        data: tours,
      })
      .from(tours)
      .where(inArray(tours.clientId, clientIds))
      .orderBy(desc(tours.scheduledDate));

    // Get offers
    const offerActivity = await db
      .select({
        type: sql`'offer'`,
        id: offers.id,
        date: offers.submittedAt,
        description: sql`'Submitted offer'`,
        data: offers,
      })
      .from(offers)
      .where(inArray(offers.clientId, clientIds))
      .orderBy(desc(offers.submittedAt));

    // Combine and sort by date
    return [...tourActivity, ...offerActivity].sort((a, b) => 
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }

  // Brokerage methods
  async createBrokerage(brokerage: InsertBrokerage): Promise<Brokerage> {
    const [newBrokerage] = await db.insert(brokerages).values(brokerage).returning();
    return newBrokerage;
  }

  async getBrokerage(id: string): Promise<Brokerage | undefined> {
    const [brokerage] = await db.select().from(brokerages).where(eq(brokerages.id, id));
    return brokerage;
  }

  async getBrokerageByOwnerEmail(email: string): Promise<Brokerage | undefined> {
    const [brokerage] = await db.select().from(brokerages).where(eq(brokerages.contactEmail, email));
    return brokerage;
  }

  async updateBrokerage(id: string, updates: Partial<InsertBrokerage>): Promise<Brokerage> {
    const [updated] = await db
      .update(brokerages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brokerages.id, id))
      .returning();
    return updated;
  }

  async deleteBrokerage(id: string): Promise<void> {
    await db.delete(brokerageAgents).where(eq(brokerageAgents.brokerageId, id));
    await db.delete(brokerages).where(eq(brokerages.id, id));
  }

  async linkAgentToBrokerage(brokerageId: string, agentId: string, role: string = 'member'): Promise<BrokerageAgent> {
    const [link] = await db.insert(brokerageAgents).values({
      brokerageId,
      agentId,
      role: role as 'member' | 'manager'
    }).returning();
    return link;
  }

  async unlinkAgentFromBrokerage(brokerageId: string, agentId: string): Promise<void> {
    await db.delete(brokerageAgents).where(
      and(
        eq(brokerageAgents.brokerageId, brokerageId),
        eq(brokerageAgents.agentId, agentId)
      )
    );
  }

  async getBrokerageAgents(brokerageId: string): Promise<BrokerageAgent[]> {
    return await db.select().from(brokerageAgents).where(eq(brokerageAgents.brokerageId, brokerageId));
  }

  async createCoachingNote(note: InsertCoachingNote): Promise<CoachingNote> {
    const [newNote] = await db.insert(coachingNotes).values(note).returning();
    return newNote;
  }

  async getCoachingNotes(agentId: string): Promise<CoachingNote[]> {
    return await db.select().from(coachingNotes).where(eq(coachingNotes.agentId, agentId)).orderBy(desc(coachingNotes.createdAt));
  }

  async getBrokerageForAgent(agentId: string): Promise<any | undefined> {
    const [link] = await db
      .select({
        brokerageId: brokerageAgents.brokerageId,
        role: brokerageAgents.role,
        brokerage: brokerages
      })
      .from(brokerageAgents)
      .innerJoin(brokerages, eq(brokerageAgents.brokerageId, brokerages.id))
      .where(eq(brokerageAgents.agentId, agentId));
    return link;
  }

  async addToShortlist(propertyId: string, userId: string): Promise<PropertyShortlist> {
    const [shortlist] = await db.insert(propertyShortlists).values({
      propertyId,
      userId,
    }).onConflictDoNothing().returning();
    return shortlist || { id: '', propertyId, userId, createdAt: new Date() };
  }

  async removeFromShortlist(propertyId: string, userId: string): Promise<void> {
    await db.delete(propertyShortlists).where(
      and(
        eq(propertyShortlists.propertyId, propertyId),
        eq(propertyShortlists.userId, userId)
      )
    );
  }

  async getShortlistedProperties(userId: string): Promise<any[]> {
    return await db
      .select({
        id: propertyShortlists.id,
        createdAt: propertyShortlists.createdAt,
        propertyId: propertyShortlists.propertyId,
        property: properties,
      })
      .from(propertyShortlists)
      .innerJoin(properties, eq(propertyShortlists.propertyId, properties.id))
      .where(eq(propertyShortlists.userId, userId))
      .orderBy(desc(propertyShortlists.createdAt));
  }

  async isPropertyShortlisted(propertyId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(propertyShortlists)
      .where(
        and(
          eq(propertyShortlists.propertyId, propertyId),
          eq(propertyShortlists.userId, userId)
        )
      );
    return !!result;
  }

  // Chat operations
  async getOrCreateConversation(agentId: string, clientId: string): Promise<Conversation> {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.agentId, agentId), eq(conversations.clientId, clientId)));
    if (existing) return existing;
    const [created] = await db
      .insert(conversations)
      .values({ agentId, clientId })
      .returning();
    return created;
  }

  async getConversations(userId: string, role: string): Promise<any[]> {
    const condition = role === 'agent'
      ? eq(conversations.agentId, userId)
      : eq(conversations.clientId, userId);

    const rows = await db
      .select()
      .from(conversations)
      .where(condition)
      .orderBy(desc(conversations.lastMessageAt));

    // Enrich with other user info and last message + unread count
    return Promise.all(rows.map(async (conv) => {
      const otherUserId = role === 'agent' ? conv.clientId : conv.agentId;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
      const [lastMsg] = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conv.id))
        .orderBy(desc(directMessages.createdAt))
        .limit(1);
      const unread = await db
        .select({ count: count() })
        .from(directMessages)
        .where(and(
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
          email: otherUser.email,
        } : null,
        lastMessage: lastMsg || null,
        unreadCount: unread[0]?.count ?? 0,
      };
    }));
  }

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    return db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(asc(directMessages.createdAt));
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<DirectMessage> {
    const [message] = await db
      .insert(directMessages)
      .values({ conversationId, senderId, content })
      .returning();
    // Update lastMessageAt on conversation
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    return message;
  }

  async markMessagesRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(
        eq(directMessages.conversationId, conversationId),
        eq(directMessages.isRead, false),
        // Only mark messages sent by the OTHER user as read
        sql`${directMessages.senderId} != ${userId}`
      ));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Get all conversations involving this user
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(or(eq(conversations.agentId, userId), eq(conversations.clientId, userId)));
    if (userConvs.length === 0) return 0;
    const convIds = userConvs.map(c => c.id);
    const [result] = await db
      .select({ count: count() })
      .from(directMessages)
      .where(and(
        inArray(directMessages.conversationId, convIds),
        eq(directMessages.isRead, false),
        sql`${directMessages.senderId} != ${userId}`
      ));
    return result?.count ?? 0;
  }
}

export const storage = new DatabaseStorage();
