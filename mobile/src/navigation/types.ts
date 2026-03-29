export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  PropertyDetails: { propertyId: string };
  TourDetails: { tourId: string };
  TourCart: undefined;
  CreateTour: undefined
  ClientProfile: { clientId: string };
  TourHistory: { clientId: string };
  ClientRequirements: { clientId: string };
  ClientDocuments: { clientId: string };
  ClientMedia: { clientId: string };
  ClientShortlists: { clientId: string };
  ClientNotes: { clientId: string };
  ClientGroups: { clientId: string };
  Settings: undefined;
  AddPropertyToTour: { tourId: string };
  PropertyReview: { tourId: string; propertyId: string; propertyAddress: string; userRole: 'client' | 'agent' };
  MyDocuments: undefined;
  ChatRoom: { conversationId: string; otherUserName: string };
};

export type AgentTabParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Tours: undefined;
  Chat: undefined;
  More: undefined;
};

export type ClientTabParamList = {
  Dashboard: undefined;
  Browse: undefined;
  MyTours: undefined;
  Chat: undefined;
  More: undefined;
};

export type BrokerageTabParamList = {
  Dashboard: undefined;
  Agents: undefined;
  Clients: undefined;
  Settings: undefined;
};

export type SuperAdminTabParamList = {
  Dashboard: undefined;
  Brokerages: undefined;
  Agents: undefined;
  Clients: undefined;
  More: undefined;
};
