import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { AgentTabs } from './AgentTabs';
import { ClientTabs } from './ClientTabs';
import { BrokerageTabs } from './BrokerageTabs';
import { SuperAdminTabs } from './SuperAdminTabs';
import { PropertyDetailsScreen } from '../screens/PropertyDetailsScreen';
import { TourDetailsScreen } from '../screens/TourDetailsScreen';
import { TourCartScreen } from '../screens/TourCartScreen';
import { ClientProfileScreen } from '../screens/agent/ClientProfileScreen';
import { TourHistoryScreen } from '../screens/agent/TourHistoryScreen';
import { ClientRequirementsScreen } from '../screens/agent/ClientRequirementsScreen';
import { ClientShortlistsScreen } from '../screens/agent/ClientShortlistsScreen';
import { ClientDocumentsScreen } from '../screens/agent/ClientDocumentsScreen';
import { ClientMediaScreen } from '../screens/agent/ClientMediaScreen';
import { ClientNotesScreen } from '../screens/agent/ClientNotesScreen';
import { ClientGroupsScreen } from '../screens/agent/ClientGroupsScreen';
import { CreateTourScreen } from '../screens/agent/CreateTourScreen';
import { AddPropertyToTourScreen } from '../screens/client/AddPropertyToTourScreen';
import { PropertyReviewScreen } from '../screens/PropertyReviewScreen';
import { MyDocumentsScreen } from '../screens/client/MyDocumentsScreen';
import { ChatRoomScreen } from '../screens/ChatRoomScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            {user?.role === 'agent' ? (
              <Stack.Screen name="Main" component={AgentTabs} />
            ) : user?.role === 'brokerage' ? (
              <Stack.Screen name="Main" component={BrokerageTabs} />
            ) : user?.role === 'superadmin' ? (
              <Stack.Screen name="Main" component={SuperAdminTabs} />
            ) : (
              <Stack.Screen name="Main" component={ClientTabs} />
            )}
            <Stack.Screen
              name="PropertyDetails"
              component={PropertyDetailsScreen}
              options={{ headerShown: true, title: 'Property Details' }}
            />
            <Stack.Screen
              name="TourDetails"
              component={TourDetailsScreen}
              options={{ headerShown: true, title: 'Tour Details' }}
            />
            <Stack.Screen
              name="TourCart"
              component={TourCartScreen}
              options={{ headerShown: true, title: 'Tour Cart' }}
            />
            <Stack.Screen
              name="CreateTour"
              component={CreateTourScreen}
              options={{ headerShown: true, title: 'Create Tour' }}
            />
            <Stack.Screen
              name="ClientProfile"
              component={ClientProfileScreen}
              options={{ headerShown: true, title: 'Client Profile' }}
            />
            <Stack.Screen
              name="TourHistory"
              component={TourHistoryScreen}
              options={{ headerShown: true, title: 'Tour History' }}
            />
            <Stack.Screen
              name="ClientRequirements"
              component={ClientRequirementsScreen}
              options={{ headerShown: true, title: 'Requirements' }}
            />
            <Stack.Screen
              name="ClientShortlists"
              component={ClientShortlistsScreen}
              options={{ headerShown: true, title: 'Shortlists' }}
            />
            <Stack.Screen
              name="ClientDocuments"
              component={ClientDocumentsScreen}
              options={{ headerShown: true, title: 'Documents' }}
            />
            <Stack.Screen
              name="ClientMedia"
              component={ClientMediaScreen}
              options={{ headerShown: true, title: 'Media Gallery' }}
            />
            <Stack.Screen
              name="ClientNotes"
              component={ClientNotesScreen}
              options={{ headerShown: true, title: 'Client Notes' }}
            />
            <Stack.Screen
              name="ClientGroups"
              component={ClientGroupsScreen}
              options={{ headerShown: true, title: 'Groups' }}
            />
            <Stack.Screen
              name="AddPropertyToTour"
              component={AddPropertyToTourScreen}
              options={{ headerShown: true, title: 'Add Property to Tour' }}
            />
            <Stack.Screen
              name="PropertyReview"
              component={PropertyReviewScreen}
              options={{ headerShown: true, title: 'Property Review' }}
            />
            <Stack.Screen
              name="MyDocuments"
              component={MyDocumentsScreen}
              options={{ headerShown: true, title: 'My Documents' }}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{ headerShown: true, title: 'Chat' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
