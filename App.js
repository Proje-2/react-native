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
import * as Speech from 'expo-speech';

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
      base64: true,
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
      const res = await fetch('http://10.40.126.99:3000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${image.base64}` })
      });

      const data = await res.json();
      if (data.text) {
        Speech.stop(); // Eski TTS durdur
        console.log("OCR Text:", data.text);
        setText(data.text);
      } else {
        setText('No text found');
      }
    } catch (error) {
      console.error("Text recognition error:", error);
      setText('Error recognizing text');
    }
  };

  const speakText = () => {
    const toSpeak = text || "Merhaba, OCR sonucu bulunamadı.";
    Speech.speak(toSpeak, { language: 'tr-TR', rate: 1.0 });
  };

  const pauseSpeech = () => Speech.pause();

  const resumeSpeech = () => Speech.resume();

  useEffect(() => {
    if (image) {
      recognizeText();
    }
  }, [image]);

  return (
    <SafeAreaView style={styles.container}>
      
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <Text style={styles.title}>Text Recognition & Speech (Turkish)</Text>

          <View style={styles.buttonRow}>
            <Button onPress={pickImage} title='Pick Image' />
            <View style={styles.spacer} />
            <Button onPress={openCamera} title='Open Camera' />
          </View>

          {image && (
            <Image
              source={{ uri: image.uri }}
              style={styles.image}
            />
          )}

          <Text style={styles.textResult}>{text}</Text>

          <Button onPress={speakText} title="Speak Text (Turkish)" />

          <View style={styles.buttonRow}>
            <Button title="Pause" onPress={pauseSpeech} />
            <View style={styles.spacer} />
            <Button title="Resume" onPress={resumeSpeech} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 64,
    paddingBottom: 100,
  },
  title: { fontSize: 20, marginBottom: 20 },
  buttonRow: { flexDirection: 'row', marginVertical: 16 },
  spacer: { width: 10 },
  image: { width: 200, height: 200, resizeMode: 'contain', marginVertical: 20 },
  textResult: { textAlign: 'justify', fontSize: 16, paddingHorizontal: 16, marginBottom: 20 },
});

export default App;
