import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AgentDashboardScreen } from '../screens/agent/AgentDashboardScreen';
import { ClientsScreen } from '../screens/agent/ClientsScreen';
import { ToursScreen } from '../screens/agent/ToursScreen';
import { MoreScreen } from '../screens/agent/MoreScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { AgentTabParamList } from './types';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<AgentTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🏠',
    Clients: '👥',
    Tours: '🗓️',
    Chat: '💬',
    More: '⋯',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export function AgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AgentDashboardScreen} />
      <Tab.Screen name="Clients" component={ClientsScreen} />
      <Tab.Screen name="Tours" component={ToursScreen} />
      <Tab.Screen name="Chat" component={ChatListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
