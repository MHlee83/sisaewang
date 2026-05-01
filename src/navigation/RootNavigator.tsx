import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';

import TabNavigator from './TabNavigator';
import OnboardingNavigator from './OnboardingNavigator';

export type RootStackParamList = {
  Onboarding:          undefined;
  Main:                undefined;
  ItemDetail:          { itemCode: string; itemName: string };
  AlertCreate:         { itemCode: string; itemName: string };
  PostDetail:          { postId: string };
  PostCreate:          Record<string, never>;
  BasketCalculator:    undefined;
  ShipmentCalculator:  undefined;
  CostCalculator:      undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return null;

  const needsOnboarding = !isAuthenticated || !user?.userType;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="ItemDetail"
              component={require('@/screens/explore/ItemDetailScreen').default}
              options={{ headerShown: true, title: '' }}
            />
            <Stack.Screen
              name="AlertCreate"
              component={require('@/screens/mypage/AlertCreateScreen').default}
              options={{ headerShown: true, title: '알림 추가' }}
            />
            <Stack.Screen
              name="PostDetail"
              component={require('@/screens/community/PostDetailScreen').default}
              options={{ headerShown: true, title: '' }}
            />
            <Stack.Screen
              name="PostCreate"
              component={require('@/screens/community/PostCreateScreen').default}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BasketCalculator"
              component={require('@/screens/tools/BasketCalculatorScreen').default}
              options={{ headerShown: true, title: '🛒 장바구니 계산기' }}
            />
            <Stack.Screen
              name="ShipmentCalculator"
              component={require('@/screens/tools/ShipmentCalculatorScreen').default}
              options={{ headerShown: true, title: '🌾 출하 수익 계산기' }}
            />
            <Stack.Screen
              name="CostCalculator"
              component={require('@/screens/tools/CostCalculatorScreen').default}
              options={{ headerShown: true, title: '🍽️ 원가 계산기' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
