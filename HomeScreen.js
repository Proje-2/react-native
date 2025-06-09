import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageUri, setCurrentImageUri] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const lastTap = useRef(null);
  const tapTimeout = useRef(null);
  const navigation = useNavigation();

  const welcomeText = `Hoş geldiniz. Kayıtlı fotoğraflar yüklendi. 
  Ekranın sağına dokununca ileri, soluna dokununca geri. 
  Çift tıklarsanız silersiniz. Uzun basarsanız okuma ekranı açılır. 
  Yeni fotoğraf yüklemek için ekranın sol altına dokunun. 
  Fotoğraf çekmek için sağ alt köşeye dokunun. 
  Bu bilgilendirmeyi tekrar duymak için ekranın üst kısmına dokunun.`;

  useEffect(() => {
    speak(welcomeText);
    loadImages();
  }, []);

  const speak = (text) => {
    Speech.stop();
    Speech.speak(text, { language: 'tr-TR', rate: 1.0 });
  };

  const loadImages = async () => {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    const imageFiles = files.filter((file) => file.endsWith('.jpg')).reverse();

    setImages(imageFiles);
    if (imageFiles.length > 0) {
      const uri = FileSystem.documentDirectory + imageFiles[0];
      setCurrentImageUri(uri);
      setCurrentIndex(0);
    }
  };

  const handleTapPosition = (event) => {
    const now = Date.now();
    const { locationY, locationX } = event.nativeEvent;

    // Çift tıklama
    if (lastTap.current && now - lastTap.current < 350) {
      clearTimeout(tapTimeout.current);
      if (!currentImageUri) return;

      if (deleteConfirm) {
        deleteCurrentImage();
        setDeleteConfirm(false);
      } else {
        setDeleteConfirm(true);
        speak("Silmek istiyor musunuz? Tekrar çift tıklarsanız silinir.");
        setTimeout(() => setDeleteConfirm(false), 5000);
      }

      lastTap.current = null;
      return;
    }

    lastTap.current = now;

    // Üst bilgi alanı
    if (locationY < 100) {
      speak(welcomeText);
      return;
    }

    // Eğer çift tıklama gelmezse geçiş yapsın (350ms sonra)
    tapTimeout.current = setTimeout(() => {
      if (images.length === 0) return;

      const isRight = locationX > width / 2;
      const nextIndex = isRight
        ? (currentIndex + 1) % images.length
        : (currentIndex - 1 + images.length) % images.length;

      setCurrentIndex(nextIndex);
      setCurrentImageUri(FileSystem.documentDirectory + images[nextIndex]);
      speak(`${nextIndex + 1}. fotoğraf gösteriliyor.`);
    }, 350);
  };

  const onLongPress = () => {
    if (!currentImageUri) return;
    speak("Okuma ekranı açılıyor.");
    navigation.navigate('OCR', { imageUri: currentImageUri });
  };

  const deleteCurrentImage = async () => {
    const filename = images[currentIndex];
    const filepath = FileSystem.documentDirectory + filename;

    try {
      await FileSystem.deleteAsync(filepath);
      speak("Fotoğraf silindi.");

      const updatedImages = images.filter((_, i) => i !== currentIndex);
      setImages(updatedImages);

      if (updatedImages.length > 0) {
        const newIndex = Math.min(currentIndex, updatedImages.length - 1);
        const newUri = FileSystem.documentDirectory + updatedImages[newIndex];
        setCurrentIndex(newIndex);
        setCurrentImageUri(newUri);
      } else {
        setCurrentIndex(0);
        setCurrentImageUri(null);
      }
    } catch (err) {
      console.error("Silme hatası:", err);
      speak("Fotoğraf silinemedi.");
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Galeriye erişim izni gerekli');
      return;
    }

    speak('Galeri açıldı. Lütfen bir fotoğraf seçin.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 1,
    });

    if (result.canceled) {
      speak('Ana sayfa açıldı.');
      return;
    }

    const asset = result.assets[0];
    const filename = `YKS-${Date.now()}.jpg`;
    const filepath = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(filepath, asset.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    speak('Fotoğraf yüklendi. Ana sayfa açılıyor.');
    navigation.navigate('OCR', { imageUri: filepath });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Kamera izni gerekli');
      return;
    }

    speak('Kamera açıldı. Lütfen bir fotoğraf çekin.');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 1,
    });

    if (result.canceled) {
      speak('Ana sayfa açıldı.');
      return;
    }

    const asset = result.assets[0];
    const filename = `YKS-${Date.now()}.jpg`;
    const filepath = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(filepath, asset.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    speak('Fotoğraf çekildi. Ana sayfa açılıyor.');
    navigation.navigate('OCR', { imageUri: filepath });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.info} onPress={() => speak(welcomeText)}>
        <Text style={styles.title}>📘 Bilgi</Text>
        <Text style={styles.text}>
          Ekranın sağına dokununca ileri, soluna dokununca geri. Çift tıklama ile silme, uzun basma ile okutma.
        </Text>
      </TouchableOpacity>

      <TouchableWithoutFeedback onPress={handleTapPosition} onLongPress={onLongPress}>
        <View style={styles.imageArea}>
          {currentImageUri ? (
            <Image source={{ uri: currentImageUri }} style={styles.image} />
          ) : (
            <Text>Henüz kayıtlı görsel yok</Text>
          )}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={pickFromGallery} style={styles.bottomButton}>
          <Text style={styles.buttonText}>📁 Galeriden yükle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={styles.bottomButton}>
          <Text style={styles.buttonText}>📷 Fotoğraf çek</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  info: { padding: 20, backgroundColor: '#e0e0e0' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  text: { fontSize: 14 },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    margin: 10,
  },
  image: {
    width: width * 0.8,
    height: height * 0.45,
    resizeMode: 'contain',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  bottomButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    width: width * 0.4,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
