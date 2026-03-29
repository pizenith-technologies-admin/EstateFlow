import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClientDashboardScreen } from '../screens/client/ClientDashboardScreen';
import { BrowseScreen } from '../screens/client/BrowseScreen';
import { MyToursScreen } from '../screens/client/MyToursScreen';
import { MoreScreen } from '../screens/client/MoreScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ClientTabParamList } from './types';
import { Text, View } from 'react-native';

const Tab = createBottomTabNavigator<ClientTabParamList>();

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number; }) {
  const icons: Record<string, string> = {
    Dashboard: '🏠',
    Browse: '🔍',
    MyTours: '🗓️',
    Chat: '💬',
    More: '⋯',
  };
  return (
    <View>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
        {icons[name] || '•'}
      </Text>
      {badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            right: -8,
            top: -4,
            backgroundColor: '#dc2626',
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
            {badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
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
      <Tab.Screen name="Dashboard" component={ClientDashboardScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="MyTours" component={MyToursScreen} options={{ title: 'My Tours' }} />
      <Tab.Screen name="Chat" component={ChatListScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
