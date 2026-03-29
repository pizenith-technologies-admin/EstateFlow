import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { SuperAdminTabParamList } from './types';
import { SuperAdminDashboardScreen } from '../screens/superadmin/SuperAdminDashboardScreen';
import { AdminBrokeragesScreen } from '../screens/superadmin/AdminBrokeragesScreen';
import { AdminAgentsScreen } from '../screens/superadmin/AdminAgentsScreen';
import { AdminClientsScreen } from '../screens/superadmin/AdminClientsScreen';
import { SuperAdminMoreScreen } from '../screens/superadmin/SuperAdminMoreScreen';

const Tab = createBottomTabNavigator<SuperAdminTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Brokerages: '🏛️',
    Agents: '👤',
    Clients: '👥',
    More: '⋯',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export function SuperAdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SuperAdminDashboardScreen} />
      <Tab.Screen name="Brokerages" component={AdminBrokeragesScreen} />
      <Tab.Screen name="Agents" component={AdminAgentsScreen} />
      <Tab.Screen name="Clients" component={AdminClientsScreen} />
      <Tab.Screen name="More" component={SuperAdminMoreScreen} />
    </Tab.Navigator>
  );
}
