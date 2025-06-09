import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';
import OCRScreen from './OCRScreen'; // OCR sayfamız (eski App içeriği buraya taşınacak)

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="OCR" component={OCRScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
