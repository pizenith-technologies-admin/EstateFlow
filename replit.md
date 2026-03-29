# replit.md

## Overview
Estate Vista is a real estate viewing management application designed to streamline property tours for real estate agents and clients. It provides both a web application and a native mobile app (React Native Expo) for organizing, scheduling, and tracking property viewings, offering clients transparency. Key capabilities include a complete tour management system with duplicate prevention, distance calculation, and Google Maps integration; a comprehensive property rating and feedback system; a robust documents center with object storage integration; an advanced requirements hub for managing client needs; a brokerage portal for monitoring agent activities; and a client directory for contact management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Mobile App Architecture (React Native Expo)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: TanStack React Query for server state, React Hook Form for forms
- **Secure Storage**: expo-secure-store for JWT tokens, AsyncStorage for cart
- **API Client**: Axios with automatic token injection
- **Location**: Mobile directory at `/mobile` with independent package.json

### Web Frontend Architecture
- **Frameworks**: React with TypeScript, Vite for build tooling.
- **UI/UX**: Shadcn/ui components with Radix UI primitives, Tailwind CSS for styling, Wouter for routing. Mobile-first responsive design.
- **State Management**: TanStack React Query for server state, React Hook Form for form handling.

### Backend Architecture
- **Framework**: Node.js with Express.js.
- **Language**: TypeScript for end-to-end type consistency.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Authentication**: Replit Auth with OpenID Connect, Express sessions with PostgreSQL store.
- **API Design**: RESTful endpoints with JSON responses and standard HTTP status codes.

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless).
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL for server-side session persistence.
- **Data Models**: Comprehensive schema for users, properties, tours, showing requests, offers, client groups, messages, contacts, and branding settings.
- **Media Storage**: Cloudinary for photos, videos, documents, and agent logos. Provides CDN delivery, automatic format optimization, and reliable cloud storage.
- **Object Storage (Fallback)**: Replit Object Storage as fallback when Cloudinary is not configured.

### Authentication & Authorization
- **Authentication Provider**: JWT-based authentication with local user accounts.
- **Session Management**: JWT tokens stored in localStorage with server-side validation.
- **Role-Based Access**: Agent, client, and brokerage roles with distinct permissions and dashboard views.
- **Security**: JWT token validation, authenticated route protection, secure password hashing with bcrypt.

### Mobile Responsiveness
- **Navigation**: Hamburger menu drawer on mobile (<768px), sidebar on desktop for agents.
- **Responsive Breakpoints**: Uses Tailwind's sm (640px), md (768px), and lg (1024px) breakpoints.
- **Layout Patterns**: Grid layouts adapt (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4), card padding responsive (p-2 sm:p-4 lg:p-6).
- **Mobile Detection**: useIsMobile hook with proper initialization to prevent layout flash.

### Feature Specifications
- **Tours & Scheduling**: Duplicate prevention, Haversine-based distance calculation, batch property fetches, Google Maps integration with route optimization and navigation redirect.
- **Route Planner**: Optimizes tour route and provides "Start Tour" button that redirects to Google Maps with all stops pre-loaded as waypoints for direct navigation.
- **Property Rating & Feedback**: 1-5 star rating, categorized feedback, notes, and "Remind Me Later" functionality.
- **Requirements Hub**: Dashboard for client requirements, scope fit scoring, exceptions register, version history, and validation workflows.
- **Documents Center**: Client-specific organization, direct-to-storage uploads via presigned URLs with ACL security, grouped display by client, CRUD operations.
- **Media Center**: Client-specific photo/video organization, grouped display by client, upload workflow with client association.
- **Reports System**: Analytics Dashboard with period-based filtering, KPI cards (Total Tours, Active Clients, Distance Traveled, Hours Invested), Offer Analytics, Top Rejection Reasons, and Client-Specific Reports. CSV export functionality.
- **Tour Reminders**: Multiple reminders per tour with scheduling, notes, and full CRUD operations.
- **Branding & Settings**: White-label agent portal customization with configurable fields (Agent Logo, Name, Email, Brokerage), live preview, and dynamic display in client portal.
- **View Mode Switcher**: Allows users to toggle between portal views with state management and localStorage persistence. Agents can switch between agent and client views, while superadmins can switch between admin, agent, and client views.
- **Brokerage Portal**: Read-only monitoring of agent activities, including Dashboard KPIs, agent and client lists with performance metrics.
- **Client Directory**: Comprehensive contact management with database tables for contacts and relationships, filtering by search, relationship type, and app status.
- **Email Integration**: SendGrid for tour reminders, showing confirmations, and schedule changes.
- **Calendar Management**: Full CRUD operations for personal calendars.
- **Group Collaboration**: Real-time group messaging with polling updates.

## Recent Changes (Dec 27, 2025)
- **React Native Expo Mobile App**: Full conversion from web-only to cross-platform mobile app
  - Created Expo project in `/mobile` directory with TypeScript
  - Implemented React Navigation with Stack and Bottom Tab navigators
  - Built AuthContext with SecureStore for JWT token management
  - Created TourCartContext with AsyncStorage persistence
  - Built complete screen set for both Agent and Client roles
  - Added core UI components (Button, Card, Input) in React Native StyleSheet
  - Configured app.json with iOS/Android settings and plugin configurations
  - Added CORS support to backend for mobile API access

## Previous Changes (Dec 16, 2025)
- **Cloudinary Integration**: Migrated all file uploads (photos, videos, documents, logos) from Replit Object Storage to Cloudinary for better CDN delivery, automatic format optimization, and reliable cloud storage. Fallback to Object Storage when Cloudinary is not configured.
- **Updated Backend Routes**: Photo upload, media upload, document upload, and logo upload routes now use Cloudinary service with base64 direct upload.
- **Updated Frontend Components**: DocumentCenterModal and BrandingSettingsPage now use direct Cloudinary upload workflow.

## Previous Changes (Dec 10, 2025)
- **Implemented Full Document Upload Feature**: Agents can now upload documents for clients with title and document type. File input with validation, object storage integration, and metadata creation implemented. Uploaded documents display with download links.
- **Implemented Client Welcome Email**: When agents add new clients, an automated welcome email is sent with:
  - Client login credentials (email and auto-generated password)
  - Account activation link and features overview
  - Agent contact information for support
  - Security recommendations (password change prompt)
- **Fixed Requirements targetClientId Error**: Added automatic client ID passing in RequirementsFormModal mutation - when agent creates requirements from client profile, targetClientId is automatically included.
- **Fixed Upload Document Button**: Replaced placeholder with full upload implementation including file selection, title input, document type categorization, and download functionality.
- **Fixed "Illegal Constructor" Error**: Replaced `react-google-autocomplete` component with standard Input fields in TourWizardModal and TourPlannerModal.
- **Fixed "Create Tour" Button Disabled**: Added missing `Navigation` icon import and removed overly strict button disable logic.
- **Fixed Client Notes Database Error**: Updated `createClientNote` function to include all required fields for documents table insertion.
- **Fixed Hardcoded Client Notes**: Replaced hardcoded note examples with real database data fetched from `/api/clients/:clientId/notes` endpoint.

## Previous Changes (Dec 6, 2025)
- **Mobile Responsiveness**: Completed mobile-responsive updates for all agent dashboard pages (ClientsPage, ToursPage, DocumentsPage, ReportsPage, MediaPage, RequirementsHub, DirectoryPage, BrandingSettingsPage). Applied responsive text sizing (text-2xl md:text-3xl), padding (p-4 md:p-6), and gap spacing to all major pages.
- **Google Maps Navigation**: Integrated Google Maps into the route planner "Start Tour" button. When clicked, it constructs a Google Maps directions URL with the starting location as origin, the last stop as destination, and all intermediate stops as waypoints, then opens in a new tab for seamless navigation.

## External Dependencies

### Core Technologies
- **Database**: Neon PostgreSQL serverless.
- **Authentication**: Replit Auth service.
- **Media Storage**: Cloudinary (CDN, auto-optimization, cloud storage for photos/videos/documents).
- **UI Components**: Radix UI primitives.
- **Fonts**: Google Fonts.

### Runtime Dependencies
- **Server**: Express.js.
- **Database Client**: Neon serverless PostgreSQL client.
- **ORM**: Drizzle ORM.
- **Validation**: Zod.
- **Date Handling**: date-fns.
- **Email Service**: SendGrid.
- **Mapping Service**: Google Maps API.

### Styling & UI
- **CSS Framework**: Tailwind CSS.
- **Icons**: Lucide React.