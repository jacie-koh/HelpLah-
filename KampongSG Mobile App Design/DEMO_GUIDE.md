# KampongSG Demo Guide

## 🎯 Quick Start

1. Click **"Create Demo Accounts"** on the login screen
2. Wait for progress bar to complete (creates 9 accounts)
3. Sign in with any demo account using password: **demo123**

## 👥 Demo Accounts (All Roles)

### 🏥 Patients (3 accounts)
| Name | Email | Phone | Use Case |
|------|-------|-------|----------|
| Ah Huat | patient1@kampongsg.demo | +65 8123 4567 | Elderly patient |
| Mdm Wong | patient2@kampongsg.demo | +65 8234 5678 | Elderly patient |
| Uncle Kumar | patient3@kampongsg.demo | +65 8345 6789 | PWD patient |

### 👨‍⚕️ Primary Caregivers (3 accounts)
| Name | Email | Phone | Use Case |
|------|-------|-------|----------|
| Sarah Tan | primary1@kampongsg.demo | +65 9123 4567 | Family caregiver |
| Ahmad Rahman | primary2@kampongsg.demo | +65 9234 5678 | Family caregiver |
| Priya Menon | primary3@kampongsg.demo | +65 9345 6789 | Family caregiver |

### 🤝 Community Caregivers (3 accounts)
| Name | Email | Phone | Use Case |
|------|-------|-------|----------|
| Mei Ling | community1@kampongsg.demo | +65 8456 7890 | Volunteer caregiver |
| Rashid Ali | community2@kampongsg.demo | +65 8567 8901 | Volunteer caregiver |
| Siti Nurhaliza | community3@kampongsg.demo | +65 8678 9012 | Volunteer caregiver |

**Password for ALL accounts**: `demo123`

## 🌏 Singapore Language Dialects

The app supports 6 language options reflecting Singapore's multilingual society:

| Language | Code | Native Name |
|----------|------|-------------|
| English (Singlish) | en-sg | English (Singlish) |
| Mandarin Chinese | zh-sg | 华语 (Mandarin Chinese) |
| Hokkien | zh-min | 闽南语 (Hokkien) |
| Cantonese | zh-yue | 粤语 (Cantonese) |
| Malay | ms-sg | Bahasa Melayu (Malay) |
| Tamil | ta-sg | தமிழ் (Tamil) |

### How to Change Language
1. Go to **Settings** (gear icon)
2. Under **Language**, select your preferred dialect
3. Click **Save Settings**
4. All notifications and instructions will be in the selected language

## 🧪 Testing Scenarios

### Scenario 1: Patient Daily Routine
**Login as**: `patient1@kampongsg.com`

1. View today's tasks on dashboard
2. Click task circles to mark as complete
3. Click **Share Note** to record voice note
4. Click **Need Help** to send emergency alert
5. Check Settings to set home address

**Expected Results**:
- Tasks move to "Completed" section when marked done
- Voice recording alerts show up
- Help button sends notifications to all caregivers
- Location is tracked automatically

### Scenario 2: Primary Caregiver Task Management
**Login as**: `primary1@kampongsg.com`

1. View patient task completion status
2. Click **Add Task** button
3. Select quick templates or create custom task
4. Click **Take assessment** to complete burden assessment
5. Toggle **Away/Watching** status

**Expected Results**:
- New tasks appear in patient's view immediately
- Assessment score shows on dashboard
- Community caregivers notified when toggled to "Away"
- Overdue tasks trigger alerts

### Scenario 3: Community Caregiver Support
**Login as**: `community1@kampongsg.com`

1. Toggle **Availability** to ON
2. View patient status and location
3. See notification about primary caregiver being away
4. Click **I'll Take Over** button

**Expected Results**:
- Availability status updates for all users
- Patient information becomes visible
- All caregivers notified of takeover
- Can see patient tasks and activity

### Scenario 4: Multi-User Coordination
**Test with 3 browser tabs/windows**:

1. **Tab 1**: Login as `patient1@kampongsg.com`
2. **Tab 2**: Login as `primary1@kampongsg.com`
3. **Tab 3**: Login as `community1@kampongsg.com`

**Actions**:
- Primary creates tasks → Patient sees them immediately
- Primary toggles "Away" → Community gets notification
- Community toggles "Available" → All see status
- Patient clicks "Help" → All caregivers alerted

### Scenario 5: Burden Assessment Flow
**Login as**: `primary2@kampongsg.com`

1. Navigate to main dashboard
2. Click **Take assessment**
3. Answer all 12 questions honestly
4. View score and recommendations
5. Notice system delegating more tasks if score is high

**Score Interpretation**:
- **0-10**: Little or No Burden
- **11-20**: Mild to Moderate Burden
- **21-48**: High Burden (triggers automatic delegation)

## 📱 Mobile Testing

The app is mobile-first. Test on:
- **Desktop**: Responsive up to 4xl screens
- **Tablet**: Optimized for iPad size
- **Mobile**: Optimized for phone screens (375px+)

## 🔧 Developer Notes

### Creating Additional Demo Data

After creating demo accounts, you can:

1. **Add Tasks** (as primary caregiver):
   - Quick templates available
   - Custom tasks with video URLs
   - Time-based reminders

2. **Record Vitals** (not yet in UI, via API):
   ```javascript
   POST /vitals
   {
     "patientId": "user-id",
     "type": "Blood Pressure",
     "value": "120/80",
     "unit": "mmHg"
   }
   ```

3. **Create Voice Notes** (not yet in UI, via API):
   ```javascript
   POST /voice-notes
   {
     "patientId": "user-id",
     "transcription": "Feeling good today",
     "summary": "Patient reports positive mood"
   }
   ```

### Reset Demo Data

To reset all demo account data:
1. Delete all demo accounts from Supabase dashboard
2. Run "Create Demo Accounts" again
3. Fresh data for all 9 accounts

## 🎬 Demo Presentation Tips

1. **Start with Patient View**: Show simplicity and accessibility
2. **Switch to Primary Caregiver**: Demonstrate monitoring capabilities
3. **Show Community Support**: Toggle availability and takeover
4. **Highlight Automation**: Burden assessment triggering delegation
5. **Emphasize Language Support**: Singapore's multilingual needs

## 🐛 Known Limitations (Prototype)

- Voice recording is placeholder (shows alerts)
- Location tracking requires browser permission
- No actual push notifications (console logs)
- Video URLs are demo links
- Home detection is placeholder
- No real-time sync between users (requires page refresh)

## 🚀 Next Steps for Production

See README.md for full production considerations including:
- HIPAA compliance
- Real-time notifications
- SEA Lion LLM integration
- Actual video call support
- Healthcare system integration
