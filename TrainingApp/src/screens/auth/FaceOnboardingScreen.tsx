/**
 * FaceOnboardingScreen - First-time face registration
 * 
 * Shown to users who haven't registered their face yet.
 * Required before accessing the main dashboard.
 * OPTIMIZED: Fast upload with 5-10 second completion target.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import faceAttendanceService from '../../services/faceAttendanceService';

interface Props {
  navigation: any;
  route: any;
}

export default function FaceOnboardingScreen({ navigation, route }: Props) {
  const { C } = useThemeStore();
  const s = getStyles(C);
  const { user, updateProfile, completeFaceOnboarding } = useAuthStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'intro' | 'camera' | 'preview'>('intro');
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted && step === 'camera') {
      requestPermission();
    }
  }, [step]);

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
      setCapturedBase64(photo.base64);
      setStep('preview');
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
    setStep('camera');
  };

  const uploadFaceImage = async () => {
    if (!capturedBase64 || !user?.id) return;
    
    setIsUploading(true);
    const startTime = Date.now();
    
    try {
      console.log('[FaceOnboarding] Starting fast face upload...');
      
      // Upload face image (optimized service with timeout)
      const response = await faceAttendanceService.uploadFaceImage(capturedBase64);
      
      console.log(`[FaceOnboarding] Upload completed in ${Date.now() - startTime}ms`);
      
      if (response.success && response.face_image_url) {
        // Also update AsyncStorage for persistence
        const userJson = await AsyncStorage.getItem('current_user');
        if (userJson) {
          const updatedUser = JSON.parse(userJson);
          updatedUser.profile_photo_url = response.face_image_url;
          await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
        }
        
        Alert.alert(
          '✅ Face Registered!',
          'Your face has been registered successfully. You can now use face verification for attendance.',
          [{ 
            text: 'Continue', 
            onPress: () => {
              // Update local auth state to trigger navigation to dashboard
              completeFaceOnboarding(response.face_image_url!);
            }
          }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to register face. Please try again.');
      }
    } catch (error: any) {
      console.error('[FaceOnboarding] Upload error:', error);
      Alert.alert('Error', 'Failed to register face. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ═══════════════════════════════════════════
  // INTRO STEP
  // ═══════════════════════════════════════════
  if (step === 'intro') {
    return (
      <View style={s.container}>
        <View style={s.introContent}>
          <View style={s.iconCircle}>
            <MaterialIcons name="face" size={80} color={C.primary} />
          </View>
          
          <Text style={s.welcomeTitle}>Welcome, {user?.full_name?.split(' ')[0] || 'User'}!</Text>
          <Text style={s.welcomeSubtitle}>Face Registration Required</Text>
          
          <Text style={s.description}>
            Before you start, we need to capture your face photo for secure attendance verification.
          </Text>
          
          <View style={s.benefitsList}>
            <View style={s.benefitRow}>
              <MaterialIcons name="verified-user" size={24} color={C.success} />
              <Text style={s.benefitText}>Quick & secure attendance</Text>
            </View>
            <View style={s.benefitRow}>
              <MaterialIcons name="face-retouching-natural" size={24} color={C.primary} />
              <Text style={s.benefitText}>AI-powered face recognition</Text>
            </View>
            <View style={s.benefitRow}>
              <MaterialIcons name="timer" size={24} color={C.warning} />
              <Text style={s.benefitText}>Mark attendance in seconds</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={s.startButton}
            onPress={() => setStep('camera')}
          >
            <MaterialIcons name="camera-alt" size={24} color="#fff" />
            <Text style={s.startButtonText}>Start Face Registration</Text>
          </TouchableOpacity>
          
          <Text style={s.privacyNote}>
            Your face data is securely stored and only used for attendance verification.
          </Text>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // CAMERA PERMISSION CHECK
  // ═══════════════════════════════════════════
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
          We need access to your camera to capture your face for registration.
        </Text>
        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
          <Text style={s.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={s.backBtn}
          onPress={() => setStep('intro')}
        >
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // PREVIEW STEP
  // ═══════════════════════════════════════════
  if (step === 'preview' && capturedImage) {
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
        
        <View style={s.previewInstructions}>
          <Text style={s.previewTitle}>Does this look good?</Text>
          <Text style={s.previewSubtext}>
            Make sure your face is clearly visible and well-lit.
          </Text>
        </View>
        
        <View style={s.previewActions}>
          <TouchableOpacity style={s.retakeBtn} onPress={retakePhoto} disabled={isUploading}>
            <MaterialIcons name="refresh" size={24} color={C.t1} />
            <Text style={s.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[s.confirmBtn, isUploading && s.confirmBtnDisabled]} 
            onPress={uploadFaceImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.confirmBtnText}>Uploading...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check" size={24} color="#fff" />
                <Text style={s.confirmBtnText}>Confirm</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // CAMERA STEP
  // ═══════════════════════════════════════════
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStep('intro')}>
          <MaterialIcons name="arrow-back" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Face Registration</Text>
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
          <Text style={s.instructionText}>Ensure good, even lighting</Text>
        </View>
        <View style={s.instructionRow}>
          <MaterialIcons name="face" size={20} color={C.primary} />
          <Text style={s.instructionText}>Look directly at the camera</Text>
        </View>
        <View style={s.instructionRow}>
          <MaterialIcons name="visibility-off" size={20} color={C.tMuted} />
          <Text style={s.instructionText}>Remove glasses, masks, or hats</Text>
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
  // Intro styles
  introContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.t1,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: C.tMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  benefitsList: {
    marginTop: 32,
    gap: 16,
    width: '100%',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  benefitText: {
    fontSize: 15,
    color: C.t1,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  privacyNote: {
    fontSize: 12,
    color: C.tMuted,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  // Header
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
  // Camera
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
  // Instructions
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
  // Capture
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
  // Preview
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
  previewInstructions: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.t1,
  },
  previewSubtext: {
    fontSize: 14,
    color: C.tMuted,
    marginTop: 4,
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
  // Permission
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
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: C.tMuted,
  },
});
