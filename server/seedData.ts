import { db } from "./db";
import {
  users,
  properties,
  tours,
  tourProperties,
  propertyRatings,
  offers,
  showingRequests,
  requestedProperties,
  clientGroups,
  groupMembers,
  groupMessages,
  clientRequirements,
  documents,
  agentBrandingSettings,
  tourReminders,
  propertyPhotos,
  calendarEvents,
  calendarIntegrations,
  brokerages,
  brokerageAgents,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...");

    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("⚠️  Database already seeded, clearing old data...");
      // For now, return early to avoid duplicates
      return {
        success: false,
        message: "Database already contains seed data. Please clear it first or test with existing data.",
      };
    }

    // 1. Create Users
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
        createdAt: new Date(),
      },
      {
        id: clientId1,
        email: "client1@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        role: "client",
        clientType: "buyer",
        agentId: agentId,
        createdAt: new Date(),
      },
      {
        id: clientId2,
        email: "client2@example.com",
        firstName: "Michael",
        lastName: "Chen",
        role: "client",
        clientType: "renter",
        agentId: agentId,
        createdAt: new Date(),
      },
      {
        id: brokerageId,
        email: "brokerage@example.com",
        firstName: "Admin",
        lastName: "User",
        role: "brokerage",
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Users created");

    // 2. Create Properties
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
        agentId: agentId,
        isActive: true,
        createdAt: new Date(),
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
        agentId: agentId,
        isActive: true,
        createdAt: new Date(),
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
        agentId: agentId,
        isActive: true,
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Properties created");

    // 3. Create Client Requirements
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
        agentId: agentId,
        status: "validated",
        version: 1,
        validationScore: "0.85",
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
        agentId: agentId,
        status: "incomplete",
        version: 1,
        validationScore: "0.5",
      },
    ]);
    console.log("✅ Client Requirements created");

    // 4. Create Client Groups
    const groupId = "group-" + nanoid();
    await db.insert(clientGroups).values([
      {
        id: groupId,
        name: "Downtown Buyers 2024",
        createdById: agentId,
        createdAt: new Date(),
      },
    ]);

    await db.insert(groupMembers).values([
      {
        groupId: groupId,
        userId: clientId1,
        joinedAt: new Date(),
      },
    ]);

    await db.insert(groupMessages).values([
      {
        groupId: groupId,
        userId: agentId,
        message: "Welcome to the group! I'll be sharing properties that match your criteria.",
        createdAt: new Date(),
      },
      {
        groupId: groupId,
        userId: clientId1,
        message: "Thanks John! Looking forward to viewing properties.",
        createdAt: new Date(Date.now() + 60000),
      },
    ]);
    console.log("✅ Client Groups created");

    // 5. Create Tours
    const tourId1 = "tour-" + nanoid();
    const tourId2 = "tour-" + nanoid();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(tours).values([
      {
        id: tourId1,
        agentId: agentId,
        clientId: clientId1,
        groupId: groupId,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        status: "scheduled",
        totalDistance: "12.5",
        estimatedDuration: 120,
        notes: "Client interested in 4-bedroom homes",
        createdAt: new Date(),
      },
      {
        id: tourId2,
        agentId: agentId,
        clientId: clientId2,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
        status: "scheduled",
        totalDistance: "8.3",
        estimatedDuration: 90,
        notes: "Downtown condo viewing",
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Tours created");

    // 6. Create Tour Properties
    await db.insert(tourProperties).values([
      {
        tourId: tourId1,
        propertyId: property1Id,
        order: 1,
        status: "scheduled",
      },
      {
        tourId: tourId1,
        propertyId: property3Id,
        order: 2,
        status: "scheduled",
      },
      {
        tourId: tourId2,
        propertyId: property2Id,
        order: 1,
        status: "scheduled",
      },
    ]);
    console.log("✅ Tour Properties created");

    // 7. Create Property Ratings
    await db.insert(propertyRatings).values([
      {
        propertyId: property1Id,
        tourId: tourId1,
        clientId: clientId1,
        rating: 5,
        feedbackCategory: "hold_later",
        reason: "Great location but want to see more options",
        notes: "Beautiful backyard, great schools nearby",
        createdAt: new Date(),
      },
      {
        propertyId: property2Id,
        tourId: tourId2,
        clientId: clientId2,
        rating: 4,
        feedbackCategory: "offer_now",
        reason: "Modern amenities and perfect location",
        notes: "Close to work, good building management",
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Property Ratings created");

    // 8. Create Offers
    await db.insert(offers).values([
      {
        propertyId: property2Id,
        clientId: clientId2,
        agentId: agentId,
        amount: "520000",
        status: "pending",
        notes: "Subject to inspection",
        submittedAt: new Date(),
      },
      {
        propertyId: property1Id,
        clientId: clientId1,
        agentId: agentId,
        amount: "720000",
        status: "accepted",
        submittedAt: new Date(),
        respondedAt: new Date(),
        notes: "Accepted by seller",
      },
    ]);
    console.log("✅ Offers created");

    // 9. Create Showing Requests
    const showingRequestId = "sr-" + nanoid();
    await db.insert(showingRequests).values([
      {
        id: showingRequestId,
        clientId: clientId1,
        agentId: agentId,
        groupId: groupId,
        preferredDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        preferredTime: "14:00",
        status: "pending",
        notes: "Would like to see properties with updated kitchens",
        createdAt: new Date(),
      },
    ]);

    await db.insert(requestedProperties).values([
      {
        requestId: showingRequestId,
        propertyId: property1Id,
      },
      {
        requestId: showingRequestId,
        propertyId: property3Id,
      },
    ]);
    console.log("✅ Showing Requests created");

    // 10. Create Documents
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
        size: 245000,
        description: "Standard buyer representation agreement",
        tags: ["legal", "buyer", "2024"],
        createdAt: new Date(),
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
        size: 180000,
        description: "Lease agreement for 456 Park Avenue",
        tags: ["legal", "lease", "property"],
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Documents created");

    // 11. Create Agent Branding Settings
    await db.insert(agentBrandingSettings).values([
      {
        agentId: agentId,
        logoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=agent",
        agentName: "John Smith",
        agentEmail: "john.smith@realtor.com",
        brokerageName: "Premier Realty Group",
        updatedBy: agentId,
        updatedAt: new Date(),
      },
    ]);
    console.log("✅ Agent Branding Settings created");

    // 12. Create Tour Reminders
    await db.insert(tourReminders).values([
      {
        userId: clientId1,
        tourId: tourId1,
        method: "email",
        intervalValue: 24,
        intervalUnit: "hours",
        timing: "09:00",
        isEnabled: true,
        createdAt: new Date(),
      },
      {
        userId: clientId2,
        tourId: tourId2,
        method: "notification",
        intervalValue: 2,
        intervalUnit: "hours",
        timing: "14:30",
        isEnabled: true,
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Tour Reminders created");

    // 13. Create Calendar Integration & Events
    const integrationId = "cal-" + nanoid();
    await db.insert(calendarIntegrations).values([
      {
        id: integrationId,
        userId: agentId,
        provider: "google",
        calendarId: "primary@gmail.com",
        isActive: true,
        lastSyncAt: new Date(),
        createdAt: new Date(),
      },
    ]);

    await db.insert(calendarEvents).values([
      {
        userId: agentId,
        integrationId: integrationId,
        tourId: tourId1,
        title: "Tour - Downtown Buyers Group",
        description: "Property tour with Sarah Johnson and group",
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
        eventType: "tour",
        isBlocked: false,
        createdAt: new Date(),
      },
      {
        userId: agentId,
        integrationId: integrationId,
        title: "Team Meeting",
        description: "Weekly team sync",
        startTime: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
        endTime: new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000),
        eventType: "personal",
        isBlocked: true,
        createdAt: new Date(),
      },
    ]);
    console.log("✅ Calendar Integration & Events created");

    console.log("🎉 Database seeding completed successfully!");
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
        groupId,
      },
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

export async function seedBrokerageDemo() {
  try {
    console.log("🏢 Starting brokerage demo seed...");

    // ── 1. Find the existing brokerage user account ──────────────────────────
    const [brokerageUser] = await db.select().from(users).where(eq(users.email, "brokerage@example.com"));
    if (!brokerageUser) {
      throw new Error("brokerage@example.com user not found. Make sure the app has been started at least once to create test users.");
    }

    // ── 2. Create (or reuse) a Brokerage company record ──────────────────────
    const existingBrokerages = await db.select().from(brokerages).limit(1);
    let brokerageId: string;

    if (existingBrokerages.length > 0) {
      brokerageId = existingBrokerages[0].id;
      // Ensure contactEmail matches the brokerage user so getBrokerageByOwnerEmail works
      await db.update(brokerages).set({ contactEmail: "brokerage@example.com" }).where(eq(brokerages.id, brokerageId));
      console.log(`⚠️  Reusing existing brokerage: ${existingBrokerages[0].name} (contactEmail updated)`);
    } else {
      const [brokerage] = await db.insert(brokerages).values({
        name: "Premier Realty Group",
        contactEmail: "brokerage@example.com",
        contactPhone: "+1 416 555 0100",
        website: "https://premierrealty.example.com",
      }).returning();
      brokerageId = brokerage.id;
      console.log("✅ Brokerage company created");
    }

    // ── 3. Create 2 demo agents ───────────────────────────────────────────────
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
        createdAt: new Date(),
      },
      {
        id: agent2Id,
        email: "mike.agent@example.com",
        firstName: "Mike",
        lastName: "Torres",
        role: "agent",
        passwordHash: hashPassword("password123"),
        createdAt: new Date(),
      },
    ]).onConflictDoNothing();
    console.log("✅ Demo agents created");

    // ── 4. Link agents to brokerage ───────────────────────────────────────────
    await db.insert(brokerageAgents).values([
      { brokerageId, agentId: agent1Id, role: "manager" },
      { brokerageId, agentId: agent2Id, role: "member" },
    ]).onConflictDoNothing();
    console.log("✅ Agents linked to brokerage");

    // ── 5. Create demo clients ────────────────────────────────────────────────
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
        createdAt: new Date(),
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
        createdAt: new Date(),
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
        createdAt: new Date(),
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
        createdAt: new Date(),
      },
    ]).onConflictDoNothing();
    console.log("✅ Demo clients created");

    // ── 6. Create properties (use gen_random_uuid via db default, capture returned ids) ──
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
        createdAt: new Date(),
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
        createdAt: new Date(),
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
        createdAt: new Date(),
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
        createdAt: new Date(),
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
        createdAt: new Date(),
      },
    ]).onConflictDoNothing().returning();
    const [prop1, prop2, prop3, prop4, prop5] = insertedProps;
    const prop1Id = prop1?.id;
    const prop2Id = prop2?.id;
    const prop3Id = prop3?.id;
    const prop4Id = prop4?.id;
    const prop5Id = prop5?.id;
    console.log("✅ Demo properties created");

    // ── 7. Create tours (uuid auto-generated, capture returned ids) ───────────
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const insertedTours = await db.insert(tours).values([
      {
        agentId: agent1Id,
        clientId: client1Id,
        scheduledDate: twoDaysAgo,
        startTime: new Date(twoDaysAgo.getTime() + 10 * 60 * 60 * 1000),
        status: "completed",
        totalDistance: "14.2",
        estimatedDuration: 120,
        notes: "Emma preferred the Birchwood Lane property — wants to revisit.",
        createdAt: new Date(),
      },
      {
        agentId: agent1Id,
        clientId: client2Id,
        scheduledDate: yesterday,
        startTime: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000),
        status: "completed",
        totalDistance: "8.5",
        estimatedDuration: 90,
        notes: "Liam liked Unit 1205 but concerned about HOA fees.",
        createdAt: new Date(),
      },
      {
        agentId: agent1Id,
        clientId: client1Id,
        scheduledDate: tomorrow,
        startTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000),
        status: "scheduled",
        totalDistance: "9.8",
        estimatedDuration: 90,
        notes: "Follow-up visit to 22 Birchwood + one new listing.",
        createdAt: new Date(),
      },
      {
        agentId: agent2Id,
        clientId: client3Id,
        scheduledDate: threeDaysFromNow,
        startTime: new Date(threeDaysFromNow.getTime() + 13 * 60 * 60 * 1000),
        status: "scheduled",
        totalDistance: "22.6",
        estimatedDuration: 150,
        notes: "Olivia is interested in Oakville and Port Credit areas.",
        createdAt: new Date(),
      },
      {
        agentId: agent2Id,
        clientId: client4Id,
        scheduledDate: fiveDaysFromNow,
        startTime: new Date(fiveDaysFromNow.getTime() + 10 * 60 * 60 * 1000),
        status: "scheduled",
        totalDistance: "18.1",
        estimatedDuration: 120,
        notes: "James looking for 4+ beds under $1.3M.",
        createdAt: new Date(),
      },
    ]).returning();
    const [tour1, tour2, tour3, tour4, tour5] = insertedTours;
    const tour1Id = tour1?.id;
    const tour2Id = tour2?.id;
    const tour3Id = tour3?.id;
    const tour4Id = tour4?.id;
    const tour5Id = tour5?.id;
    console.log("✅ Demo tours created");

    // ── 8. Link properties to tours (only if ids exist) ──────────────────────
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
        { tourId: tour5Id, propertyId: prop4Id, order: 1, status: "scheduled" },
      ]);
    }
    console.log("✅ Tour properties linked");

    // ── 9. Property ratings from completed tours ──────────────────────────────
    if (prop1Id && prop2Id && prop3Id && prop5Id && tour1Id && tour2Id) {
      await db.insert(propertyRatings).values([
        {
          propertyId: prop1Id,
          tourId: tour1Id,
          clientId: client1Id,
          rating: 5,
          feedbackCategory: "hold_later",
          reason: "Love the neighbourhood and layout — want to see more first",
          notes: "Backyard is perfect for the kids. Kitchen needs updating.",
          createdAt: new Date(),
        },
        {
          propertyId: prop3Id,
          tourId: tour1Id,
          clientId: client1Id,
          rating: 3,
          feedbackCategory: "reject",
          reason: "Too far from work",
          notes: "Nice renovation but the commute to downtown is too long.",
          createdAt: new Date(),
        },
        {
          propertyId: prop2Id,
          tourId: tour2Id,
          clientId: client2Id,
          rating: 4,
          feedbackCategory: "hold_later",
          reason: "Great views but HOA fees are high",
          notes: "Would need to revisit the numbers. Loved the gym access.",
          createdAt: new Date(),
        },
        {
          propertyId: prop5Id,
          tourId: tour2Id,
          clientId: client2Id,
          rating: 5,
          feedbackCategory: "offer_now",
          reason: "Perfect size and price for the location",
          notes: "Subway access is ideal. Ready to make an offer.",
          createdAt: new Date(),
        },
      ]);
    }
    console.log("✅ Property ratings added");

    // ── 10. Offers ────────────────────────────────────────────────────────────
    if (prop1Id && prop5Id) {
      await db.insert(offers).values([
        {
          propertyId: prop5Id,
          clientId: client2Id,
          agentId: agent1Id,
          amount: "2150",
          status: "pending",
          notes: "Offering slightly below asking — flexible on move-in date.",
          submittedAt: new Date(),
        },
        {
          propertyId: prop1Id,
          clientId: client1Id,
          agentId: agent1Id,
          amount: "850000",
          status: "accepted",
          notes: "Accepted — subject to home inspection.",
          submittedAt: twoDaysAgo,
          respondedAt: yesterday,
        },
      ]);
    }
    console.log("✅ Offers added");

    console.log("🎉 Brokerage demo seed completed!");
    return {
      success: true,
      message: "Brokerage demo data seeded successfully",
      data: {
        brokerageId,
        agents: [
          { id: agent1Id, email: "sarah.agent@example.com", password: "password123" },
          { id: agent2Id, email: "mike.agent@example.com", password: "password123" },
        ],
        clients: [
          { id: client1Id, email: "emma.buyer@example.com", password: "password123" },
          { id: client2Id, email: "liam.renter@example.com", password: "password123" },
          { id: client3Id, email: "olivia.buyer@example.com", password: "password123" },
          { id: client4Id, email: "james.buyer@example.com", password: "password123" },
        ],
      },
    };
  } catch (error) {
    console.error("❌ Error seeding brokerage demo:", error);
    throw error;
  }
}
