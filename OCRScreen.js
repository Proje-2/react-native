import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Text,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import * as Speech from 'expo-speech';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function OCRScreen({ route, navigation }) {
  const { imageUri } = route.params;

  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakIndex, setSpeakIndex] = useState(0);
  const [rate, setRate] = useState(1.0);

  const wordsRef = useRef([]);
  const speakIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const speak = (text) => {
    if (!mountedRef.current) return;
    Speech.stop();
    Speech.speak(text, { language: 'tr-TR', rate });
  };

  const recognizeText = async () => {
    setLoading(true);
    try {
      const base64 = await fetch(imageUri)
        .then(res => res.blob())
        .then(blob => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        }));

      const res = await fetch('https://backend-vhyh.onrender.com/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
      });

      const data = await res.json();
      if (data.text && data.text.trim().length > 0 && mountedRef.current) {
        setOcrText(data.text);
        wordsRef.current = data.text.split(/\s+/);
        speakIndexRef.current = 0;
        speak("Metin algılandı. Okuma başlıyor.");
        setTimeout(() => speakFromIndex(0), 1000);
      } else {
        speak("Metin algılanamadı.");
        Vibration.vibrate([0, 300, 300, 300]);
      }
    } catch (e) {
      console.error("OCR hata:", e);
      speak("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const speakFromIndex = (index) => {
    if (!mountedRef.current) return;

    const words = wordsRef.current;
    if (words.length === 0 || index >= words.length) return;

    const toSpeak = words.slice(index).join(' ');
    setIsSpeaking(true);
    setSpeakIndex(index);
    speakIndexRef.current = index;

    Speech.stop();
    Speech.speak(toSpeak, {
      language: 'tr-TR',
      rate,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  const pauseSpeech = () => {
    Speech.stop();
    setIsSpeaking(false);
    speak("Duraklatıldı.");
  };

  const resumeSpeech = () => {
    if (!isSpeaking && ocrText) {
      speak("Devam ediliyor.");
      speakFromIndex(speakIndexRef.current);
    }
  };

  const forward = () => {
    const newIndex = Math.min(speakIndexRef.current + 20, wordsRef.current.length - 1);
    speakIndexRef.current = newIndex;
    speakFromIndex(newIndex);
    speak("İleri sarıldı.");
  };

  const rewind = () => {
    const newIndex = Math.max(speakIndexRef.current - 20, 0);
    speakIndexRef.current = newIndex;
    speakFromIndex(newIndex);
    speak("Geri sarıldı.");
  };

  const toggleSpeed = () => {
    const newRate = rate === 1.0 ? 1.25 : rate === 1.25 ? 1.5 : 1.0;
    setRate(newRate);
    speak(`Hız ${newRate}`);
    if (isSpeaking) {
      speakFromIndex(speakIndexRef.current);
    }
  };

  const handleSwipe = ({ nativeEvent }) => {
    if (nativeEvent.translationX > 100) {
      Speech.stop();
      speak("Ana sayfaya dönülüyor.");
      navigation.navigate('Home');
    }
  };

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      Speech.stop();
      setOcrText('');
      wordsRef.current = [];
      speakIndexRef.current = 0;

      speak(
        "Fotoğraf yüklendi. Metin algılanıyor. Okuma birazdan başlayacak. " +
        "Sol üst dokunma ile hız ayarı, sağ üst ile durdur veya devam. " +
        "Sol alt dokunma geri, sağ alt dokunma ileri sarar. " +
        "Ana sayfaya dönmek için ekranı sağa kaydırın."
      );

      recognizeText();

      return () => {
        mountedRef.current = false;
        Speech.stop();
      };
    }, [imageUri])
  );

  return (
    <PanGestureHandler onGestureEvent={handleSwipe}>
      <View style={styles.container}>
        {loading && <ActivityIndicator size="large" color="blue" />}
        <View style={styles.touchArea}>
          <View style={styles.row}>
            <View
              style={styles.touchBox}
              onStartShouldSetResponder={() => {
                toggleSpeed();
                return true;
              }}
            >
              <Text style={styles.label}>⚙️ Hız: {rate.toFixed(2)}</Text>
            </View>
            <View
              style={styles.touchBox}
              onStartShouldSetResponder={() => {
                isSpeaking ? pauseSpeech() : resumeSpeech();
                return true;
              }}
            >
              <Text style={styles.label}>{isSpeaking ? '⏸ Durdur' : '▶️ Devam'}</Text>
            </View>
          </View>

          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} />
          </View>

          <View style={styles.row}>
            <View
              style={styles.touchBox}
              onStartShouldSetResponder={() => {
                rewind();
                return true;
              }}
            >
              <Text style={styles.label}>⏪ Geri</Text>
            </View>
            <View
              style={styles.touchBox}
              onStartShouldSetResponder={() => {
                forward();
                return true;
              }}
            >
              <Text style={styles.label}>⏩ İleri</Text>
            </View>
          </View>
        </View>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  touchArea: { flex: 1, justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  touchBox: {
    width: '50%',
    height: height * 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  image: {
    width: width * 0.9,
    height: height * 0.5,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
