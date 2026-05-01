import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '@/screens/onboarding/SplashScreen';
import UserTypeScreen from '@/screens/onboarding/UserTypeScreen';
import FavoriteItemsScreen from '@/screens/onboarding/FavoriteItemsScreen';
import NotificationPermissionScreen from '@/screens/onboarding/NotificationPermissionScreen';

export type OnboardingStackParamList = {
  Splash: undefined;
  UserType: undefined;
  FavoriteItems: undefined;
  NotificationPermission: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="UserType" component={UserTypeScreen} />
      <Stack.Screen name="FavoriteItems" component={FavoriteItemsScreen} />
      <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
    </Stack.Navigator>
  );
}
