import React from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore, TAB_H, C as STATIC_C } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../config/supabase';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import FaceVerificationScreen from '../screens/auth/FaceVerificationScreen';
import FaceOnboardingScreen from '../screens/auth/FaceOnboardingScreen';
import LanguagePickerScreen from '../screens/auth/LanguagePickerScreen';

// Trainee
import DashboardScreen from '../screens/trainee/DashboardScreen';
import CoursesScreen from '../screens/trainee/SessionsScreen';
import LearningPathScreen from '../screens/trainee/LearningPathScreen';
import VideoPlayerScreen from '../screens/trainee/VideoPlayerScreen';
import SessionEvaluationScreen from '../screens/trainee/SessionEvaluationScreen';
import QuizScreen from '../screens/trainee/QuizScreen';
import ResultsScreen from '../screens/trainee/ResultsScreen';
import CommsScreen from '../screens/trainee/CommsScreen';
import AttendanceCheckinScreen from '../screens/trainee/AttendanceCheckinScreen';
import CertificateScreen from '../screens/trainee/CertificateScreen';
import FlashcardsScreen from '../screens/trainee/FlashcardsScreen';
import MyCoursesScreen from '../screens/trainee/MyCoursesScreen';
import CourseDetailScreen from '../screens/trainee/CourseDetailScreen';
import DocumentViewerScreen from '../screens/trainee/DocumentViewerScreen';

// Trainer
import TrainerDashboard from '../screens/trainer/TrainerDashboard';
import ScheduleScreen from '../screens/trainer/ScheduleScreen';
import PerformanceScreen from '../screens/trainer/PerformanceScreen';
import QuizBuilderScreen from '../screens/trainer/QuizBuilderScreen';
import SessionPlannerScreen from '../screens/trainer/SessionPlannerScreen';
import SessionDetailsScreen from '../screens/trainer/SessionDetailsScreen';
import TrainerTraineesScreen from '../screens/trainer/TrainerTraineesScreen';
import TrainerTraineeProfileScreen from '../screens/trainer/TrainerTraineeProfileScreen';
import SettingsScreen from '../screens/trainer/SettingsScreen';
import LiveAttendanceScreen from '../screens/trainer/LiveAttendanceScreen';
import TrainerCoursesScreen from '../screens/trainer/TrainerCoursesScreen';
import CreateCourseScreen from '../screens/trainer/CreateCourseScreen';

// Supervisor
import SupervisorDashboard from '../screens/supervisor/SupervisorDashboard';
import ManageTrainersScreen from '../screens/supervisor/ManageTrainersScreen';
import ManageTraineesScreen from '../screens/supervisor/ManageTraineesScreen';
import ManageCoursesScreen from '../screens/supervisor/ManageCoursesScreen';
import ManageSessionsScreen from '../screens/supervisor/ManageSessionsScreen';
import EnrollmentScreen from '../screens/supervisor/EnrollmentScreen';
import BatchSessionScreen from '../screens/supervisor/BatchSessionScreen';
import HandoverScreen from '../screens/supervisor/HandoverScreen';
import ComplianceOverviewScreen from '../screens/supervisor/ComplianceOverviewScreen';
import CreateTrainerScreen from '../screens/supervisor/CreateTrainerScreen';
import CreateTraineeScreen from '../screens/supervisor/CreateTraineeScreen';

// Shared
import ProfileScreen from '../screens/shared/ProfileScreen';
import FaceCaptureScreen from '../screens/shared/FaceCaptureScreen';

// Hooks
import { useRealtimeSync } from '../hooks/useRealtimeSync';

// ── Navigators ─────────────────────────────────
const Root = createStackNavigator();
const Tab = createBottomTabNavigator();
const TneeC = createStackNavigator();
const TneeD = createStackNavigator();
const TneeCrs = createStackNavigator();
const TnerS = createStackNavigator();
const TnerD = createStackNavigator();
const TnerCrs = createStackNavigator();
const SupD = createStackNavigator();

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const getScreen = (C: any) => ({
    headerStyle: { backgroundColor: C.bg, elevation: 0, shadowOpacity: 0 },
    headerTintColor: C.t1,
    headerTitleStyle: { fontSize: 17, fontWeight: '700' as const },
});

import DownloadsScreen from '../screens/trainee/DownloadsScreen';

// ── Trainee Stacks ─────────────────────────────
const TraineeDashboardStack = () => {
    const { C } = useThemeStore();
    return (
        <TneeD.Navigator screenOptions={getScreen(C)}>
            <TneeD.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <TneeD.Screen name="AttendanceCheckin" component={AttendanceCheckinScreen} options={{ headerShown: false }} />
            <TneeD.Screen name="FaceCapture" component={FaceCaptureScreen} options={{ headerShown: false }} />
            <TneeD.Screen name="Certificates" component={CertificateScreen} options={{ headerShown: false }} />
            <TneeD.Screen name="Flashcards" component={FlashcardsScreen} options={{ headerShown: false }} />
            <TneeD.Screen name="Downloads" component={DownloadsScreen} options={{ headerShown: false }} />
        </TneeD.Navigator>
    );
};

const TraineeSessionsStack = () => {
    const { C } = useThemeStore();
    return (
        <TneeC.Navigator screenOptions={getScreen(C)}>
            <TneeC.Screen name="Sessions" component={CoursesScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="LearningPath" component={LearningPathScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="Quiz" component={QuizScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
            <TneeC.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="SessionEvaluation" component={SessionEvaluationScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="AttendanceCheckin" component={AttendanceCheckinScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="FaceCapture" component={FaceCaptureScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="Flashcards" component={FlashcardsScreen} options={{ headerShown: false }} />
            <TneeC.Screen name="Certificates" component={CertificateScreen} options={{ headerShown: false }} />
        </TneeC.Navigator>
    );
};

const TraineeCoursesStack = () => {
    const { C } = useThemeStore();
    return (
        <TneeCrs.Navigator screenOptions={getScreen(C)}>
            <TneeCrs.Screen name="MyCourses" component={MyCoursesScreen} options={{ headerShown: false }} />
            <TneeCrs.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
            <TneeCrs.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
        </TneeCrs.Navigator>
    );
};

const TneeP = createStackNavigator();
const TraineeProfileStack = () => {
    const { C } = useThemeStore();
    return (
        <TneeP.Navigator screenOptions={getScreen(C)}>
            <TneeP.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
            <TneeP.Screen name="Certificates" component={CertificateScreen} options={{ headerShown: false }} />
            <TneeP.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
        </TneeP.Navigator>
    );
};

// ── Trainer Stacks ─────────────────────────────
const TrainerSchedule = () => {
    const { C } = useThemeStore();
    return (
        <TnerS.Navigator screenOptions={getScreen(C)}>
            <TnerS.Screen name="Schedule" component={ScheduleScreen} options={{ headerShown: false }} />
            <TnerS.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ headerShown: false }} />
            <TnerS.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ headerShown: false }} />
            <TnerS.Screen name="QuizBuilder" component={QuizBuilderScreen} options={{ headerShown: false }} />
            <TnerS.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
            <TnerS.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
        </TnerS.Navigator>
    );
};

const TrainerDashboardStack = () => {
    const { C } = useThemeStore();
    return (
        <TnerD.Navigator screenOptions={getScreen(C)}>
            <TnerD.Screen name="TrainerHome" component={TrainerDashboard} options={{ headerShown: false }} />
            <TnerD.Screen name="Performance" component={PerformanceScreen} options={{ headerShown: false }} />
            <TnerD.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ headerShown: false }} />
            <TnerD.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ headerShown: false }} />
            <TnerD.Screen name="CommsScreen" component={CommsScreen} options={{ headerShown: false }} />
            <TnerD.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
            <TnerD.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
        </TnerD.Navigator>
    );
};

const TrainerCoursesStack = () => {
    const { C } = useThemeStore();
    return (
        <TnerCrs.Navigator screenOptions={getScreen(C)}>
            <TnerCrs.Screen name="TrainerCoursesList" component={TrainerCoursesScreen} options={{ headerShown: false }} />
            <TnerCrs.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
            <TnerCrs.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ headerShown: false }} />
            <TnerCrs.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ headerShown: false }} />
            <TnerCrs.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
            <TnerCrs.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ headerShown: false }} />
        </TnerCrs.Navigator>
    );
};

// ── Supervisor Stack (single stack with all screens) ──
const SupervisorMainStack = () => {
    const { C } = useThemeStore();
    return (
        <SupD.Navigator screenOptions={getScreen(C)}>
            <SupD.Screen name="SupervisorHome" component={SupervisorDashboard} options={{ headerShown: false }} />
            <SupD.Screen name="ManageTrainers" component={ManageTrainersScreen} options={{ headerShown: false }} />
            <SupD.Screen name="ManageTrainees" component={ManageTraineesScreen} options={{ headerShown: false }} />
            <SupD.Screen name="ManageCourses" component={ManageCoursesScreen} options={{ headerShown: false }} />
            <SupD.Screen name="ManageSessions" component={ManageSessionsScreen} options={{ headerShown: false }} />
            <SupD.Screen name="Enrollment" component={EnrollmentScreen} options={{ headerShown: false }} />
            <SupD.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ headerShown: false }} />
            <SupD.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ headerShown: false }} />
            <SupD.Screen name="BatchSession" component={BatchSessionScreen} options={{ headerShown: false }} />
            <SupD.Screen name="Handover" component={HandoverScreen} options={{ headerShown: false }} />
            <SupD.Screen name="ComplianceOverview" component={ComplianceOverviewScreen} options={{ headerShown: false }} />
            <SupD.Screen name="CreateTrainer" component={CreateTrainerScreen} options={{ headerShown: false }} />
            <SupD.Screen name="CreateTrainee" component={CreateTraineeScreen} options={{ headerShown: false }} />
            <SupD.Screen name="CourseDetail" component={CourseDetailScreen} options={{ headerShown: false }} />
            <SupD.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ headerShown: false }} />
        </SupD.Navigator>
    );
};

// ── Bottom Tabs ─────────────────────────────────
const TraineeTabs = () => {
    const { C } = useThemeStore();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { height: TAB_H, backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: 1, elevation: 0 },
                tabBarActiveTintColor: C.primary,
                tabBarInactiveTintColor: C.tMuted,
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
            }}
        >
            <Tab.Screen name="HomeTab" component={TraineeDashboardStack} options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} /> }} />
            <Tab.Screen name="SessionsTab" component={TraineeSessionsStack} options={{ title: 'Sessions', tabBarIcon: ({ color }) => <MaterialIcons name="event" size={24} color={color} /> }} />
            <Tab.Screen name="CoursesTab" component={TraineeCoursesStack} options={{ title: 'Courses', tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={24} color={color} /> }} />
            <Tab.Screen name="CommsTab" component={CommsScreen} options={{ title: 'Alerts', tabBarIcon: ({ color }) => <MaterialIcons name="notifications" size={24} color={color} /> }} />
            <Tab.Screen name="ProfileTab" component={TraineeProfileStack} options={{ title: 'Profile', tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} /> }} />
        </Tab.Navigator>
    );
};

const TrainerTabs = () => {
  const { C } = useThemeStore();
  return (
    <Tab.Navigator
        screenOptions={{
        headerShown: false,
        tabBarStyle: { height:TAB_H, backgroundColor:C.bg, borderTopColor:C.border, borderTopWidth:1, elevation:0 },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.tMuted,
        tabBarLabelStyle: { fontSize:10, fontWeight:'700', letterSpacing:0.6, textTransform:'uppercase', marginBottom:4 },
        }}
    >
        <Tab.Screen name="DashboardTab" component={TrainerDashboardStack} options={{ title:'Home',     tabBarIcon:({color})=><MaterialIcons name="home"           size={24} color={color}/> }} />
        <Tab.Screen name="ScheduleTab"  component={TrainerSchedule}       options={{ title:'Sessions', tabBarIcon:({color})=><MaterialIcons name="event"           size={24} color={color}/> }} />
        <Tab.Screen name="CoursesTab"   component={TrainerCoursesStack}   options={{ title:'Courses',  tabBarIcon:({color})=><MaterialIcons name="menu-book"       size={24} color={color}/> }} />
        <Tab.Screen name="TraineesTab"  component={TrainerTraineesScreen} options={{ title:'Trainees', tabBarIcon:({color})=><MaterialIcons name="groups"         size={24} color={color}/> }} />
        <Tab.Screen name="SettingsTab"  component={SettingsScreen}        options={{ title:'Settings', tabBarIcon:({color})=><MaterialIcons name="settings"       size={24} color={color}/> }} />
    </Tab.Navigator>
  );
};

import PushNotificationsScreen from '../screens/supervisor/PushNotificationsScreen';

const SupervisorTabs = () => {
    const { C } = useThemeStore();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { height: TAB_H, backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: 1, elevation: 0 },
                tabBarActiveTintColor: C.primary,
                tabBarInactiveTintColor: C.tMuted,
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
            }}
        >
            <Tab.Screen name="SupervisorDashTab" component={SupervisorMainStack}
                options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons name="shield" size={24} color={color} /> }} />
            <Tab.Screen name="SupervisorPushTab" component={PushNotificationsScreen}
                options={{ title: 'Alerts', tabBarIcon: ({ color }) => <MaterialIcons name="notifications" size={24} color={color} /> }} />
            <Tab.Screen name="SupervisorProfileTab" component={ProfileScreen}
                options={{ title: 'Profile', tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} /> }} />
        </Tab.Navigator>
    );
};

// ── Root ────────────────────────────────────────
export default function AppNavigator() {
    const { C, isDark } = useThemeStore();
    const { user, isAuthenticated, needsFaceOnboarding } = useAuthStore();
    
    // Check if user needs face onboarding
    const requiresFaceOnboarding = isAuthenticated && user && !user.profile_photo_url;
    
    console.log('[AppNavigator] isAuthenticated:', isAuthenticated, 'user:', user?.employee_id, 'needsFace:', requiresFaceOnboarding);
    
    return (
        <NavigationContainer>
            <Root.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    // Auth Screens - shown when user is NOT logged in
                    <>
                        <Root.Screen name="Login" component={LoginScreen} />
                        <Root.Screen name="Register" component={RegisterScreen} />
                        <Root.Screen name="Otp" component={OtpScreen} />
                        <Root.Screen name="FaceVerification" component={FaceVerificationScreen} />
                        <Root.Screen name="LanguagePicker" component={LanguagePickerScreen} />
                    </>
                ) : requiresFaceOnboarding ? (
                    // Face Onboarding - shown when user is logged in but has no face registered
                    <Root.Screen 
                        name="FaceOnboarding" 
                        component={FaceOnboardingScreen}
                    />
                ) : (
                    // Authenticated with face - Route to role-specific dashboard
                    <Root.Screen 
                        name="Main" 
                        component={MainRouter} 
                        initialParams={{ role: user?.role }} 
                    />
                )}
            </Root.Navigator>
        </NavigationContainer>
    );
}

function MainRouter({ route }: any) {
    const { user } = useAuthStore();
    
    // Connect WebSocket for real-time data sync
    useRealtimeSync();
    
    // Get role from route params or fallback to stored user
    const role = route?.params?.role || user?.role;
    
    if (!role) {
        // No role found - logout and force re-login
        Alert.alert('Session Error', 'User role not found. Please login again.');
        useAuthStore.getState().logout();
        return null;
    }
    
    // Route based on role using enum values (support both string and enum)
    const roleUpper = typeof role === 'string' ? role.toUpperCase() : role;
    
    if (roleUpper === 'SUPERVISOR' || roleUpper === UserRole.SUPERVISOR) {
        return <SupervisorTabs />;
    }
    if (roleUpper === 'TRAINER' || roleUpper === UserRole.TRAINER) {
        return <TrainerTabs />;
    }
    if (roleUpper === 'TRAINEE' || roleUpper === UserRole.TRAINEE) {
        return <TraineeTabs />;
    }
    
    // Unknown role - default to trainee with warning
    console.warn(`Unknown role: ${role}, defaulting to Trainee dashboard`);
    return <TraineeTabs />;
}
