import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Alert,
  Vibration,
  Text,
  Pressable,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

const CustomButton = ({ onPress, title, style = {} }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      {
        backgroundColor: pressed ? '#4682B4' : '#1E90FF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
      },
      style,
    ]}
  >
    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{title}</Text>
  </Pressable>
);

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [speakIndex, setSpeakIndex] = useState(0);
  const [konusmaHizi, setKonusmaHizi] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [initialInstructionPlayed, setInitialInstructionPlayed] = useState(false);

  const wordsRef = useRef([]);
  const speakIndexRef = useRef(0);
  const konusmaHiziRef = useRef(konusmaHizi);
  const lastTap = useRef(null);
  const longPressTimeout = useRef(null);

  useEffect(() => {
    konusmaHiziRef.current = konusmaHizi;
  }, [konusmaHizi]);

  useEffect(() => {
    speakIndexRef.current = speakIndex;
  }, [speakIndex]);

  useEffect(() => {
    if (!initialInstructionPlayed) {
      Speech.speak(
        'Uygulamaya hoş geldiniz. Fotoğraf yüklemek için ekranın ortasına çift dokunun. Fotoğraf çekmek için uzun basın.',
        {
          language: 'tr-TR',
          onDone: () => setInitialInstructionPlayed(true),
        }
      );
    }
  }, [initialInstructionPlayed]);

  const handleTouchStart = () => {
    longPressTimeout.current = setTimeout(() => {
      Vibration.vibrate(100);
      openCamera();
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    handleDoubleTap();
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && (now - lastTap.current) < 300) {
      if (!image) {
        pickImage();
      } else {
        if (isSpeaking) {
          Speech.stop();
          setIsSpeaking(false);
        } else {
          speakFromIndex(speakIndexRef.current, konusmaHiziRef.current);
        }
      }
    }
    lastTap.current = now;
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Galeriye erişim izni gereklidir!');
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
      Speech.speak('Fotoğraf başarıyla yüklendi', { language: 'tr-TR' });
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin gerekli', 'Kameraya erişim izni gereklidir!');
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
      Speech.speak('Fotoğraf başarıyla çekildi', { language: 'tr-TR' });
    }
  };

  const recognizeText = async () => {
    if (!image || !image.base64) return;
    try {
      const res = await fetch('https://backend-vhyh.onrender.com/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${image.base64}` }),
      });
      const data = await res.json();
      if (data.text && data.text.trim().length > 0) {
        Speech.stop();
        setText(data.text);
        setSpeakIndex(0);
        setIsSpeaking(false);
        wordsRef.current = data.text.split(/\s+/);
        Speech.speak('Metin algılandı', { language: 'tr-TR' });
      } else {
        setText('');
        wordsRef.current = [];
        setSpeakIndex(0);
        setIsSpeaking(false);
        Vibration.vibrate([0, 250, 250, 250]);
        Speech.speak('Metin algılanamadı. Lütfen tekrar deneyin.', { language: 'tr-TR' });
      }
    } catch (error) {
      console.error('Text recognition error:', error);
      setText('');
      Vibration.vibrate([0, 250, 250, 250]);
      Speech.speak('Bir hata oluştu. Lütfen tekrar deneyin.', { language: 'tr-TR' });
    }
  };

  useEffect(() => {
    if (image) recognizeText();
  }, [image]);

 const speakFromIndex = (index, rate = konusmaHiziRef.current) => {
  const words = wordsRef.current;
  if (words.length === 0 || index >= words.length) {
    setIsSpeaking(false);
    return;
  }

  // '?' işaretine kadar olan kısmı oku
  let speakUntilIndex = index;
  let textToSpeak = '';
  for (let i = index; i < words.length; i++) {
    textToSpeak += words[i] + ' ';
    speakUntilIndex = i + 1;
    if (words[i].includes('?')) {
      break;
    }
  }

  setIsSpeaking(true);
  setSpeakIndex(speakUntilIndex);
  speakIndexRef.current = speakUntilIndex;

  Speech.stop();
  Speech.speak(textToSpeak.trim(), {
    language: 'tr-TR',
    rate,
    onDone: () => {
      // '?' varsa dur, yoksa devam et
      if (textToSpeak.includes('?')) {
        setIsSpeaking(false);
      } else {
        speakFromIndex(speakUntilIndex, rate);
      }
    },
    onStopped: () => setIsSpeaking(false),
  });
};


  const speakText = () => {
    if (!text || text.trim() === '') {
      Vibration.vibrate([0, 250, 250, 250]);
      Speech.speak('Metin algılanamadı.', { language: 'tr-TR' });
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
    let newRate = konusmaHizi === 1.0 ? 1.25 : konusmaHizi === 1.25 ? 1.5 : 1.0;
    setKonusmaHizi(newRate);
    konusmaHiziRef.current = newRate;
    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => speakFromIndex(speakIndexRef.current, newRate), 50);
    }
  };

  const forward10s = () => {
    const words = wordsRef.current;
    if (words.length === 0) return;
    let newIndex = Math.min(speakIndexRef.current + 20, words.length - 1);
    setSpeakIndex(newIndex);
    speakIndexRef.current = newIndex;
    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => speakFromIndex(newIndex, konusmaHiziRef.current), 50);
    }
  };

  const rewind10s = () => {
    const words = wordsRef.current;
    if (words.length === 0) return;
    let newIndex = Math.max(speakIndexRef.current - 20, 0);
    setSpeakIndex(newIndex);
    speakIndexRef.current = newIndex;
    if (isSpeaking) {
      Speech.stop();
      setTimeout(() => speakFromIndex(newIndex, konusmaHiziRef.current), 50);
    }
  };

  return (
    <TouchableWithoutFeedback onPressIn={handleTouchStart} onPressOut={handleTouchEnd}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View style={styles.content}>
            <CustomButton onPress={pickImage} title="📁 Fotoğraf Yükle" />
            <CustomButton onPress={openCamera} title="📷 Fotoğraf Çek" />
            {image && (
              <Image
                source={{ uri: image.uri }}
                style={styles.image}
                accessible
                accessibilityLabel="Yüklenen fotoğraf"
              />
            )}
            {text !== '' && (
              <>
                <CustomButton onPress={speakText} title="🔊 Metni Seslendir" />
                <View style={styles.buttonRow}>
                  <CustomButton title="⏪ -10s" onPress={rewind10s} style={{ flex: 1, marginRight: 5 }} />
                  <CustomButton title="⏩ +10s" onPress={forward10s} style={{ flex: 1, marginLeft: 5 }} />
                </View>
                <View style={styles.buttonRow}>
                  <CustomButton
                    title={isSpeaking ? '⏸️ Duraklat' : '▶️ Devam Ettir'}
                    onPress={isSpeaking ? pauseSpeech : resumeSpeech}
                    style={{ flex: 1, marginRight: 5 }}
                  />
                  <CustomButton
                    title={`⏩ Hız: ${konusmaHizi.toFixed(2)}`}
                    onPress={toggleSpeechRate}
                    style={{ flex: 1, marginLeft: 5 }}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
  },
});

export default App;
