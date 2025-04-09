import React, { useEffect, useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Image,
  Alert,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true, // needed for OCR API
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const recognizeText = async () => {
    if (!image || !image.base64) return;
  
    try {
      const res = await fetch('http://172.16.0.103:3000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${image.base64}` })
      });
  
      const data = await res.json();
      if (data.text) {
        setText(data.text);
      } else {
        setText('No text found');
      }
    } catch (error) {
      console.error("Text recognition error:", error);
      setText('Error recognizing text');
    }
  };
  

  useEffect(() => {
    if (image) {
      recognizeText();
    }
  }, [image]);

  return (
    <SafeAreaView>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 64 }}>
          <Text style={{ fontSize: 20 }}>Text Recognition Demo</Text>
          <View style={{ flexDirection: 'row', marginVertical: 16 }}>
            <Button onPress={pickImage} title='Pick Image' />
            <View style={{ width: 10 }} />
            <Button onPress={openCamera} title='Open Camera' />
          </View>

          {image && (
            <Image
              source={{ uri: image.uri }}
              style={{ width: 200, height: 200, resizeMode: 'contain', marginVertical: 20 }}
            />
          )}

          <Text style={{ textAlign: 'justify', fontSize: 16, paddingHorizontal: 16 }}>{text}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
