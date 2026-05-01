import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';
import { COLORS } from '@/constants';

import HomeScreen from '@/screens/home/HomeScreen';
import AnalysisScreen from '@/screens/analysis/AnalysisScreen';
import CommunityScreen from '@/screens/community/CommunityScreen';
import MyPageScreen from '@/screens/mypage/MyPageScreen';

export type TabParamList = {
  Home:      undefined;
  Analysis:  undefined;
  Community: undefined;
  MyPage:    undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ──────────────────────────────────────────────
// SVG 아이콘 (react-native-svg 없이 View 기반)
// ──────────────────────────────────────────────
function HomeIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconWrap]}>
      {/* 집 지붕 */}
      <View style={[styles.roof, { borderBottomColor: color }]} />
      {/* 집 몸체 */}
      <View style={[styles.houseBody, { borderColor: color }]}>
        <View style={[styles.door, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function AnalysisIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconWrap, { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }]}>
      <View style={[styles.bar, { height: 8, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 14, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 20, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 11, backgroundColor: color }]} />
    </View>
  );
}

function CommunityIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.bubble, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
}

function MyIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.head, { borderColor: color }]} />
      <View style={[styles.body, { borderColor: color }]} />
    </View>
  );
}

export default function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenListeners={{
        state: (e) => {
          const state = (e.data as any)?.state;
          if (state) {
            const route = state.routes[state.index];
            setActiveTab(route.name);
          }
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          let icon;
          if (route.name === 'Home')      icon = <HomeIcon color={color} />;
          else if (route.name === 'Analysis')  icon = <AnalysisIcon color={color} />;
          else if (route.name === 'Community') icon = <CommunityIcon color={color} />;
          else icon = <MyIcon color={color} />;
          return (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              {icon}
            </View>
          );
        },
        tabBarLabel: ({ focused, color }) => {
          const label =
            route.name === 'Home'      ? '시세판' :
            route.name === 'Analysis'  ? '분석'   :
            route.name === 'Community' ? '커뮤니티' : '마이';
          return (
            <Text style={{
              fontSize: focused ? 11 : 10,
              fontWeight: focused ? '800' : '500',
              color,
              marginTop: 2,
            }}>
              {label}
            </Text>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.divider,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 4,
          height: 62,
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Analysis"  component={AnalysisScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="MyPage"    component={MyPageScreen} />
    </Tab.Navigator>

    {/* 글쓰기 FAB — TabNavigator 레벨 렌더링 (탭바 포함 전체 뷰 위에 올라탐) */}
    {activeTab === 'Community' && (
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PostCreate', {})}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
        <Text style={styles.fabText}>글쓰기</Text>
      </TouchableOpacity>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 70,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabIcon: { fontSize: 16 },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  iconPill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: '#E8F5E9',
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Home
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  houseBody: {
    width: 14,
    height: 10,
    borderWidth: 1.5,
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  door: {
    width: 4,
    height: 6,
    marginBottom: 0,
  },
  // Analysis
  bar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 1,
    alignSelf: 'flex-end',
  },
  // Community
  bubble: {
    width: 18,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 0,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  // My
  head: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginBottom: 1,
  },
  body: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
});
