import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from '../screens/HomeScreen.tsx';
import ImageDetailScreen from '../screens/ImageDetailScreen.tsx';
import SearchScreen from '../screens/SearchScreen.tsx';
import { View, Text, StyleSheet, Pressable } from 'react-native';

// Import the new masked-view package
import 'react-native-gesture-handler';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }) => {
  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerHeaderText}>Picture Gallery</Text>
      </View>
      <View style={styles.drawerItem}>
        <Text 
          style={styles.drawerItemText}
          onPress={() => navigation.navigate('Home')}
        >
          Home
        </Text>
      </View>
    </View>
  );
};

const AppNavigator = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Drawer.Navigator 
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: true,
            headerTitle: 'Picture Gallery',
            headerStyle: {
              backgroundColor: '#0B1020',
            },
            headerTintColor: '#EAF0FF',
            headerTitleStyle: {
              fontWeight: '800',
              letterSpacing: 0.2,
            },
            drawerType: 'front',
            drawerStyle: {
              width: '74%',
              backgroundColor: '#0B1020',
            },
          }}
        >
          <Drawer.Screen
            name="Home"
            component={HomeScreen}
            options={({ navigation }) => ({
              headerRight: () => (
                <Pressable
                  onPress={() => navigation.navigate('Search')}
                  hitSlop={10}
                  style={styles.headerAction}
                >
                  <Text style={styles.headerActionText}>Search</Text>
                </Pressable>
              ),
            })}
          />
          <Drawer.Screen
            name="Search"
            component={SearchScreen}
            options={{
              headerShown: false,
              drawerLabel: () => null,
              title: undefined,
              drawerItemStyle: { height: 0 },
            }}
          />
          <Drawer.Screen
            name="ImageDetail"
            component={ImageDetailScreen}
            options={{
              headerShown: false,
              drawerLabel: () => null,
              title: undefined,
              drawerItemStyle: { height: 0 },
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#0B1020',
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  drawerHeaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EAF0FF',
    letterSpacing: 0.2,
  },
  drawerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  drawerItemText: {
    fontSize: 16,
    color: 'rgba(234,240,255,0.82)',
    fontWeight: '700',
  },
  headerAction: {
    marginRight: 10,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  headerActionText: {
    color: '#EAF0FF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

export default AppNavigator;
