import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  SafeAreaView,
  StyleSheet,
  View,
  Image,
  Alert,
  Vibration,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [speakIndex, setSpeakIndex] = useState(0);
  const [konusmaHizi, setKonusmaHizi] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wordsRef = useRef([]);
  const speakIndexRef = useRef(0);
  const konusmaHiziRef = useRef(konusmaHizi);
  const lastTap = useRef(null);

  useEffect(() => {
    konusmaHiziRef.current = konusmaHizi;
  }, [konusmaHizi]);

  useEffect(() => {
    speakIndexRef.current = speakIndex;
  }, [speakIndex]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && (now - lastTap.current) < 300) {
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
      } else {
        speakFromIndex(speakIndexRef.current, konusmaHiziRef.current);
      }
    }
    lastTap.current = now;
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Galeriye erişim izni gerekli!');
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
      Alert.alert('İzin gerekli', 'Kameraya erişim izni gerekli!');
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
      const res = await fetch('http://192.168.175.89:3000/ocr', {
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
        const errorMessage = 'Metin algılanamadı.';
        setText(errorMessage);
        Vibration.vibrate([0, 250, 250, 250]);
        Speech.stop();
        Speech.speak(errorMessage, { language: 'tr-TR' });
      }
    } catch (error) {
      console.error('Text recognition error:', error);
      const errorMessage = 'Metin algılanamadı.';
      setText(errorMessage);
      Vibration.vibrate([0, 250, 250, 250]);
      Speech.stop();
      Speech.speak(errorMessage, { language: 'tr-TR' });
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
    if (!text || text === 'Metin algılanamadı.') {
      Speech.speak('Merhaba, OCR sonucu bulunamadı.', { language: 'tr-TR' });
      return;
    }
    speakFromIndex(speakIndexRef.current, konusmaHiziRef.current);
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
    <TouchableWithoutFeedback onPressIn={handleDoubleTap}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, image && styles.contentWithImage]}>
          {!image && (
            <>
              <Button onPress={pickImage} title="Fotoğraf Yükle" />
              <View style={{ height: 10 }} />
              <Button onPress={openCamera} title="Fotoğraf Çek" />
            </>
          )}

          {image && (
            <>
              <View style={styles.imageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.image} />
              </View>
              <Button onPress={speakText} title="Metni Seslendir" />
              <View style={styles.buttonRow}>
                <Button title="⏪ -10s" onPress={rewind10s} />
                <View style={{ width: 10 }} />
                <Button title="⏩ +10s" onPress={forward10s} />
              </View>
              <View style={styles.buttonRow}>
                <Button title={`Hız: ${konusmaHizi.toFixed(2)}`} onPress={toggleSpeechRate} />
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  contentWithImage: {
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  imageWrapper: {
    marginVertical: 20,
    alignItems: 'center',
  },
  image: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  buttonRow: {
    flexDirection: 'row',
    marginVertical: 12,
    justifyContent: 'center',
  },
});
