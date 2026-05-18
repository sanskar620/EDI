import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
// expo-file-system legacy API removed — using base64 from camera directly
import * as Location from 'expo-location';
import faceAttendanceService from '../../services/faceAttendanceService';

interface Props {
  navigation: any;
  route: any;
}

export default function FaceCaptureScreen({ navigation, route }: Props) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user } = useAuthStore();
  
  const mode = route?.params?.mode || 'onboarding'; // 'onboarding' | 'attendance'
  const sessionId = route?.params?.sessionId;
  const onCapture = route?.params?.onCapture;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
      });
      
      setCapturedImage(photo.uri);
      setCapturedBase64(photo.base64 || null);
      
      if (onCapture) {
        // Callback mode - return the base64 to caller
        onCapture(photo.base64);
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBase64(null);
  };

  const uploadFaceImage = async () => {
    if (!capturedBase64 || !user?.id) return;
    
    setIsUploading(true);
    try {
      // Use base64 captured directly from camera (no deprecated FileSystem API)
      const base64 = capturedBase64;
      
      console.log('[FaceCapture] Uploading face image to AWS S3...');
      
      // Call the face attendance service to upload to S3
      const response = await faceAttendanceService.uploadFaceImage(base64);
      
      if (response.success && response.face_image_url) {
        // Update user's face_image_url in database
        const updated = await faceAttendanceService.updateUserFaceImage(user.id, response.face_image_url);
        
        if (updated) {
          Alert.alert(
            '✅ Success',
            'Your face has been registered successfully! You can now use face verification for attendance.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Warning', 'Face uploaded but profile update failed. Please try again.');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to upload face image.');
      }
    } catch (error: any) {
      console.error('[FaceCapture] Upload error:', error);
      Alert.alert('Error', 'Failed to upload face image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const markAttendanceWithFace = async () => {
    if (!capturedBase64 || !sessionId || !user?.id) return;
    
    setIsUploading(true);
    const startTime = Date.now();
    
    try {
      // Use base64 captured directly from camera (no deprecated FileSystem API)
      const base64 = capturedBase64;
      
      console.log('[FaceCapture] Starting fast face verification...');
      
      // Get current location with 3 second timeout (don't block on location)
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      try {
        const locationPromise = (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.Balanced, // Faster than High
              timeInterval: 2000,
            });
            return location.coords;
          }
          return null;
        })();
        
        // Wait max 3 seconds for location
        const coords = await Promise.race([
          locationPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
        ]);
        
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
          console.log('[FaceCapture] Location:', latitude, longitude);
        }
      } catch (locError) {
        console.log('[FaceCapture] Location skipped for speed');
      }
      
      // Call the optimized face verification (max 10-15 seconds)
      const response = await faceAttendanceService.verifyFaceAndMarkAttendance(
        sessionId,
        base64,
        latitude,
        longitude
      );
      
      console.log(`[FaceCapture] Total time: ${Date.now() - startTime}ms`);
      
      if (response.success && response.is_match) {
        Alert.alert(
          '✅ Attendance Marked!',
          `Face verified successfully!\n\nMatch: ${response.similarity.toFixed(1)}%`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          '❌ Verification Failed',
          response.message || `Face did not match.\n\nPlease ensure good lighting and try again.`,
          [{ text: 'Try Again', onPress: retakePhoto }]
        );
      }
    } catch (error: any) {
      console.error('[FaceCapture] Attendance error:', error);
      Alert.alert('Error', 'Face verification failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!permission) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <MaterialIcons name="camera-alt" size={64} color={C.tMuted} />
        <Text style={s.permissionText}>Camera permission is required</Text>
        <Text style={s.permissionSubtext}>
          We need access to your camera to capture your face for {mode === 'onboarding' ? 'registration' : 'attendance'}.
        </Text>
        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
          <Text style={s.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show captured image preview
  if (capturedImage) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={retakePhoto}>
            <MaterialIcons name="arrow-back" size={24} color={C.t1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Review Photo</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={s.previewContainer}>
          <Image source={{ uri: capturedImage }} style={s.previewImage} />
          
          <View style={s.faceGuideOverlay}>
            <View style={s.faceOvalPreview} />
          </View>
        </View>
        
        <View style={s.previewActions}>
          <TouchableOpacity style={s.retakeBtn} onPress={retakePhoto} disabled={isUploading}>
            <MaterialIcons name="refresh" size={24} color={C.t1} />
            <Text style={s.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[s.confirmBtn, isUploading && s.confirmBtnDisabled]} 
            onPress={mode === 'onboarding' ? uploadFaceImage : markAttendanceWithFace}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={24} color="#fff" />
                <Text style={s.confirmBtnText}>
                  {mode === 'onboarding' ? 'Upload' : 'Verify & Mark'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {mode === 'onboarding' ? 'Face Registration' : 'Face Verification'}
        </Text>
        <TouchableOpacity onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}>
          <MaterialIcons name="flip-camera-ios" size={24} color={C.t1} />
        </TouchableOpacity>
      </View>

      <View style={s.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={s.camera}
          facing={facing}
          enableTorch={false}
        >
          {/* Face guide overlay */}
          <View style={s.faceGuideOverlay}>
            <View style={s.faceOval} />
            <Text style={s.guideText}>Position your face within the oval</Text>
          </View>
        </CameraView>
      </View>

      <View style={s.instructions}>
        <Text style={s.instructionTitle}>Tips for a good photo:</Text>
        <View style={s.instructionRow}>
          <MaterialIcons name="wb-sunny" size={20} color={C.warning} />
          <Text style={s.instructionText}>Ensure good lighting</Text>
        </View>
        <View style={s.instructionRow}>
          <MaterialIcons name="face" size={20} color={C.primary} />
          <Text style={s.instructionText}>Look directly at the camera</Text>
        </View>
        <View style={s.instructionRow}>
          <MaterialIcons name="visibility-off" size={20} color={C.tMuted} />
          <Text style={s.instructionText}>Remove sunglasses or masks</Text>
        </View>
      </View>

      <View style={s.captureArea}>
        <TouchableOpacity 
          style={[s.captureBtn, isCapturing && s.captureBtnDisabled]} 
          onPress={takePicture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <View style={s.captureBtnInner} />
          )}
        </TouchableOpacity>
        <Text style={s.captureHint}>Tap to capture</Text>
      </View>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.bg,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.t1,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  faceGuideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
  },
  faceOvalPreview: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.8)',
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instructions: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.t1,
    marginBottom: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructionText: {
    fontSize: 13,
    color: C.tMuted,
  },
  captureArea: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 12,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.border,
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  captureHint: {
    fontSize: 13,
    color: C.tMuted,
  },
  // Preview styles
  previewContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  retakeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.t1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.success,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Permission styles
  permissionText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.t1,
    marginTop: 24,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: C.tMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
