import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { BrokerageTabParamList } from './types';
import { BrokerageDashboardScreen } from '../screens/brokerage/BrokerageDashboardScreen';
import { BrokerageAgentsScreen } from '../screens/brokerage/BrokerageAgentsScreen';
import { BrokerageClientsScreen } from '../screens/brokerage/BrokerageClientsScreen';
import { BrokerageSettingsScreen } from '../screens/brokerage/BrokerageSettingsScreen';

const Tab = createBottomTabNavigator<BrokerageTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🏢',
    Agents: '👥',
    Clients: '🏠',
    Settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export function BrokerageTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={BrokerageDashboardScreen} />
      <Tab.Screen name="Agents" component={BrokerageAgentsScreen} />
      <Tab.Screen name="Clients" component={BrokerageClientsScreen} />
      <Tab.Screen name="Settings" component={BrokerageSettingsScreen} />
    </Tab.Navigator>
  );
}
