import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Alert,
  Vibration,
  useColorScheme,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [speakIndex, setSpeakIndex] = useState(0);
  const [konusmaHizi, setKonusmaHizi] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wordsRef = useRef([]);
  const speakIndexRef = useRef(0);
  const konusmaHiziRef = useRef(konusmaHizi);

  useEffect(() => {
    konusmaHiziRef.current = konusmaHizi;
  }, [konusmaHizi]);

  useEffect(() => {
    speakIndexRef.current = speakIndex;
  }, [speakIndex]);

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
      setSpeakIndex(0);
      setText('');
      setIsSpeaking(false);
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
      setSpeakIndex(0);
      setText('');
      setIsSpeaking(false);
    }
  };

  const recognizeText = async () => {
    if (!image || !image.base64) return;

    try {
      const res = await fetch('http://192.168.1.105:3000/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${image.base64}` }),
      });

      const data = await res.json();
      if (data.text) {
        Speech.stop();
        setText(data.text);
        setSpeakIndex(0);
        setIsSpeaking(false);
        wordsRef.current = data.text.split(/\s+/);
      } else {
        setText('');
        Vibration.vibrate([0, 250, 250, 250]);
      }
    } catch (error) {
      console.error('Text recognition error:', error);
      setText('');
      Vibration.vibrate([0, 250, 250, 250]);
    }
  };

  useEffect(() => {
    if (image) {
      recognizeText();
    }
  }, [image]);

  const speakFromIndex = (index, rate = konusmaHiziRef.current) => {
    const words = wordsRef.current;
    if (words.length === 0 || index >= words.length) {
      setIsSpeaking(false);
      return;
    }

    const toSpeak = words.slice(index).join(' ');
    setIsSpeaking(true);
    setSpeakIndex(index);
    speakIndexRef.current = index;

    Speech.stop();
    Speech.speak(toSpeak, {
      language: 'tr-TR',
      rate,
      onDone: () => {
        setIsSpeaking(false);
        setSpeakIndex(words.length);
      },
      onStopped: () => {
        setIsSpeaking(false);
      },
    });
  };

  const speakText = () => {
    if (!text) {
      Speech.speak('Merhaba, OCR sonucu bulunamadı.', { language: 'tr-TR' });
      return;
    }
    speakFromIndex(speakIndexRef.current, konusmaHiziRef.current);
  };

  const pauseSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  const resumeSpeech = () => {
    if (!isSpeaking) {
      speakFromIndex(speakIndexRef.current, konusmaHiziRef.current);
    }
  };

  const toggleSpeechRate = () => {
    let newRate;
    if (konusmaHizi === 1.0) newRate = 1.25;
    else if (konusmaHizi === 1.25) newRate = 1.5;
    else newRate = 1.0;

    setKonusmaHizi(newRate);
    konusmaHiziRef.current = newRate;

    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => {
        speakFromIndex(speakIndexRef.current, newRate);
      }, 50);
    }
  };

  const forward10s = () => {
    const words = wordsRef.current;
    if (words.length === 0) return;

    const avgWordsPerSec = 2;
    let newIndex = Math.min(speakIndexRef.current + 10 * avgWordsPerSec, words.length - 1);
    setSpeakIndex(newIndex);
    speakIndexRef.current = newIndex;

    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => {
        speakFromIndex(newIndex, konusmaHiziRef.current);
      }, 50);
    }
  };

  const rewind10s = () => {
    const words = wordsRef.current;
    if (words.length === 0) return;

    const avgWordsPerSec = 2;
    let newIndex = Math.max(speakIndexRef.current - 10 * avgWordsPerSec, 0);
    setSpeakIndex(newIndex);
    speakIndexRef.current = newIndex;

    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => {
        speakFromIndex(newIndex, konusmaHiziRef.current);
      }, 50);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <Button onPress={pickImage} title="Fotoğraf Yükle" />
          <View style={{ height: 10 }} />
          <Button onPress={openCamera} title="Fotoğraf Çek" />
          {image && <Image source={{ uri: image.uri }} style={styles.image} />}

          {text !== '' && (
            <>
              <Button onPress={speakText} title="Metni Seslendir" />
              <View style={styles.buttonRow}>
                <Button title="⏪ -10s" onPress={rewind10s} />
                <View style={{ width: 10 }} />
                <Button title="⏩ +10s" onPress={forward10s} />
              </View>

              <View style={styles.buttonRow}>
                <Button title={isSpeaking ? 'Duraklat' : 'Devam Ettir'} onPress={isSpeaking ? pauseSpeech : resumeSpeech} />
                <View style={{ width: 10 }} />
                <Button title={`Hız: ${konusmaHizi.toFixed(2)}`} onPress={toggleSpeechRate} />
              </View>
            </>
          )}
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
    marginTop: 40,
    paddingBottom: 100,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 20,
  },
  buttonRow: { flexDirection: 'row', marginVertical: 16, justifyContent: 'center' },
});

export default App;
