# 🧪 ROLE-BASED FLOW - TESTING GUIDE

## Quick Test Scenarios for Each Role

### **Test 1: TRAINEE Login Flow**

**Test User:** EMP001 (Role: TRAINEE)
**Mobile:** +919822079201

**Steps:**
1. Open app
2. Enter Employee ID: `EMP001`
3. Enter Mobile: `+919822079201`
4. Tap "Get OTP"
5. Enter OTP (check console or use test OTP)
6. Complete Face Verification
7. **Expected Result:** Navigate to **TraineeTabs** with 4 tabs:
   - 🏠 Home (Dashboard)
   - 📚 Courses
   - 💬 Comms
   - 👤 Profile

**Verify:**
- ✅ Can view published sessions in Courses tab
- ✅ Can enroll in available sessions
- ✅ Can mark own attendance (with GPS check)
- ❌ Cannot see "Create Session" button
- ❌ Cannot access trainer/supervisor features

---

### **Test 2: TRAINER Login Flow**

**Test User:** EMP002 (Role: TRAINER)
**Mobile:** +919822079201

**Steps:**
1. Open app
2. Enter Employee ID: `EMP002`
3. Enter Mobile: `+919822079201`
4. Tap "Get OTP"
5. Enter OTP
6. Complete Face Verification
7. **Expected Result:** Navigate to **TrainerTabs** with 4 tabs:
   - 🏠 Home (Trainer Dashboard)
   - 📅 Schedule
   - 👥 Trainees
   - ⚙️ Settings

**Verify:**
- ✅ Can create new training sessions
- ✅ Can upload materials
- ✅ Can mark attendance for trainees
- ✅ Can create quiz questions
- ✅ See only own sessions (not other trainers')
- ❌ Cannot bulk enroll trainees (supervisor only)

---

### **Test 3: SUPERVISOR Login Flow**

**Test User:** EMP003 (Role: SUPERVISOR)
**Mobile:** +919822079201

**Steps:**
1. Open app
2. Enter Employee ID: `EMP003`
3. Enter Mobile: `+919822079201`
4. Tap "Get OTP"
5. Enter OTP
6. Complete Face Verification
7. **Expected Result:** Navigate to **SupervisorTabs** with 3 tabs:
   - 🛡️ Home (Supervisor Dashboard)
   - ✅ Compliance
   - 👤 Profile

**Verify:**
- ✅ Can view ALL sessions (all trainers)
- ✅ Can bulk enroll trainees into sessions
- ✅ Can reassign sessions to different trainers
- ✅ Can view organization-wide statistics
- ✅ Runtime role check protects supervisor screens

---

### **Test 4: Session Persistence**

**Steps:**
1. Login as any role (e.g., TRAINER)
2. Navigate around the app
3. **Force close the app** (swipe away from recent apps)
4. **Reopen the app**
5. **Expected Result:**
   - ✅ No login screen shown
   - ✅ Automatically navigate to last dashboard (TrainerTabs)
   - ✅ User data is preserved
   - ✅ Role is remembered

**Verify:**
- ✅ No need to re-enter credentials
- ✅ Same dashboard shown as before
- ✅ User profile still accessible

---

### **Test 5: Access Control (Runtime Role Checks)**

**Test:** Try to access restricted screens

**Scenario A: Trainee tries to create session**
1. Login as TRAINEE (EMP001)
2. Navigate to TraineeTabs
3. **Expected:** No "Create Session" button visible
4. **Navigation Isolation:** Cannot access SessionPlannerScreen at all

**Scenario B: Trainer tries to bulk enroll**
1. Login as TRAINER (EMP002)
2. Navigate to TrainerTabs
3. **Expected:** No "Batch Session" button visible
4. **Navigation Isolation:** Cannot access BatchSessionScreen

**Scenario C: Force navigation to protected screen** (Manual deep link test)
1. Login as TRAINEE
2. Manually navigate to `SessionPlannerScreen` (if possible via deep link)
3. **Expected:** Alert shown: "Access Denied - Only trainers can create sessions"
4. **Action:** Automatically navigated back

---

### **Test 6: Logout Flow**

**Steps:**
1. Login as any role
2. Navigate to Profile tab
3. Tap "Logout" button
4. **Expected Result:**
   - ✅ Navigate to Login screen
   - ✅ Auth state cleared from AsyncStorage
   - ✅ User data cleared
   - ✅ isAuthenticated = false

**Verify:**
- ✅ After logout, reopening app shows Login screen
- ✅ Cannot navigate to Main screen without login

---

## 🐛 **Common Issues & Debugging**

### **Issue: Stuck on Login Screen After OTP**
**Possible Cause:** OTP verification failed
**Debug:**
```
- Check console for OTP value
- Verify OTP service is returning correct response
- Check authStore.verifyOTP() response
```

### **Issue: Wrong Dashboard Shown**
**Possible Cause:** Role not set correctly in database
**Debug:**
```sql
-- Check user role in Supabase
SELECT employee_id, full_name, role FROM users WHERE employee_id = 'EMP001';

-- Check HR_MASTER role
SELECT employee_id, role FROM hr_master_data WHERE employee_id = 'EMP001';
```

### **Issue: App Shows Loading Screen Forever**
**Possible Cause:** loadStoredAuth() failed
**Debug:**
```
- Check AsyncStorage for 'current_user' key
- Check authService.getCurrentUser() response
- Check console for errors during initialization
```

### **Issue: Session Not Persisting**
**Possible Cause:** AsyncStorage not saving user data
**Debug:**
```
- Check authService.login() saves to AsyncStorage
- Verify 'current_user' key exists in AsyncStorage
- Check loadStoredAuth() in App.tsx is called
```

---

## 📊 **Expected Console Output**

### **Successful Login Flow:**
```
[LOG] Verifying identity for EMP001
[LOG] OTP sent successfully
[LOG] OTP verified successfully
[LOG] Login successful
[LOG] User role: TRAINER
[LOG] Navigating to Main screen with role: TRAINER
[LOG] MainRouter received role: TRAINER
[LOG] Routing to TrainerTabs
```

### **Session Restoration:**
```
[LOG] App initializing...
[LOG] Loading stored auth state
[LOG] Found stored user: { id: 2, role: 'TRAINER', ... }
[LOG] Auth state restored successfully
[LOG] isAuthenticated: true
[LOG] Showing Main screen with role: TRAINER
```

### **Access Denied (Runtime Check):**
```
[LOG] User role: TRAINEE
[WARN] Access check failed: User is not TRAINER
[ALERT] Access Denied - Only trainers can create sessions
[NAV] Navigating back to previous screen
```

---

## ✅ **Test Completion Checklist**

### **Authentication**
- [ ] Trainee login works
- [ ] Trainer login works
- [ ] Supervisor login works
- [ ] Invalid credentials show error
- [ ] OTP verification works

### **Navigation**
- [ ] Trainee sees TraineeTabs
- [ ] Trainer sees TrainerTabs
- [ ] Supervisor sees SupervisorTabs
- [ ] Login screen hidden when authenticated
- [ ] Main screen shown when authenticated

### **Session Persistence**
- [ ] Login persists after app restart
- [ ] User role remembered
- [ ] No re-login needed
- [ ] Logout clears session

### **Access Control**
- [ ] Trainee cannot create sessions
- [ ] Trainer cannot bulk enroll
- [ ] Runtime role checks work
- [ ] Alert shown for unauthorized access

### **Edge Cases**
- [ ] No role in database → error shown
- [ ] Invalid role → default to trainee with warning
- [ ] Network error → proper error message
- [ ] AsyncStorage error → graceful fallback

---

## 🚀 **Quick Start Testing Script**

```bash
# 1. Start the app
cd TrainingApp
npm start

# 2. Scan QR code on physical device or emulator

# 3. Test each role in order:
# - EMP001 (TRAINEE)
# - EMP002 (TRAINER)
# - EMP003 (SUPERVISOR)

# 4. For each role, verify:
# - Correct dashboard shown
# - Correct tabs visible
# - Correct features accessible

# 5. Test session persistence:
# - Force close app
# - Reopen
# - Verify auto-login to same dashboard

# 6. Test logout:
# - Tap logout in profile
# - Verify navigation to login screen
```

---

## 📸 **Expected Screenshots**

### **Trainee Dashboard:**
- Tabs: Home | Courses | Comms | Profile
- Features: Upcoming sessions, enroll button, attendance check-in

### **Trainer Dashboard:**
- Tabs: Home | Schedule | Trainees | Settings
- Features: Create session, mark attendance, quiz builder

### **Supervisor Dashboard:**
- Tabs: Home | Compliance | Profile
- Features: Organization stats, bulk enroll, handover sessions

---

**Testing Complete!** ✅

All role-based flows should work correctly. If any test fails, check the debug steps above.
