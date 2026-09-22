# 🔬 ระบบทำข้อสอบวิทยาศาสตร์ (Science Exam Web Application)

เว็บแอปพลิเคชันระบบทำข้อสอบและประเมินผลออนไลน์ วิชาวิทยาศาสตร์ รองรับทั้งมุมมองของ **ครูผู้สอน** (สร้างห้องสอบ, กำหนดสัดส่วนความยาก, ดูคะแนน, ส่งออก Excel) และ **นักเรียน** (เข้าห้องสอบด้วยรหัส, ทำข้อสอบ, ใช้เครื่องคิดเลข, ตรวจคะแนนพร้อมเฉลยละเอียด)

ออกแบบมาให้พร้อมสำหรับขึ้น **GitHub** และ Deploy บน **Vercel** ได้ทันทีโดยไม่ต้องติดตั้ง Backend หรือ Database เพิ่มเติม!

---

## ✨ คุณสมบัติเด่น (Features)

### 👨‍🏫 สำหรับครูผู้สอน
- **ระบบสมัครสมาชิกและเข้าสู่ระบบ**: จัดการข้อมูลห้องสอบแยกตามบัญชีครู
- **สร้างห้องสอบแบบกำหนดระดับความยาก**: กำหนดจำนวนข้อ ง่าย (Easy), ปานกลาง (Medium), ยาก (Hard) ได้ตามต้องการ
- **ออกรหัสห้องสอบอัตโนมัติ (Room Code)**: เช่น `SCI-9X4K2A` พร้อมปุ่มคัดลอกรหัสและคัดลอกลิงก์ตรงสำหรับส่งให้นักเรียน
- **แดชบอร์ดจัดการห้องสอบ**: ตรวจสอบสถานะห้องสอบ (เปิด/ปิด), ปิดห้องสอบเมื่อหมดเวลา
- **รายงานผลคะแนนนักเรียนแบบเรียลไทม์**: แสดงเวลาส่ง, ชื่อ, ชั้น, เลขที่, คะแนนดิบ และคิดเป็นเปอร์เซ็นต์
- **ส่งออกไฟล์คะแนน (Export CSV/Excel)**: รองรับภาษาไทยสมบูรณ์ด้วย UTF-8 BOM

### 📝 สำหรับนักเรียน
- **เข้าห้องสอบสะดวก**: กรอกรหัสห้อง หรือกดลิงก์ที่ครูส่งให้เพื่อเข้าสู่ห้องสอบได้ทันที
- **สุ่มโจทย์อัตโนมัติจากคลังข้อสอบ**: มีโจทย์วิชาฟิสิกส์ เคมี ชีววิทยา ดาราศาสตร์ ครบทุกระดับ
- **เครื่องคิดเลขวิทยาศาสตร์ในตัว (Built-in Calculator)**: สามารถเปิด/พับเก็บเครื่องคิดเลขเพื่อคำนวณเลขได้สะดวก
- **ระบบส่งข้อสอบและตรวจผลทันที**: คำนวณคะแนนและตัดเกรดผ่าน/ไม่ผ่าน
- **เฉลยละเอียดพร้อมคำอธิบาย**: ไฮไลต์สีเขียวข้อที่ตอบถูก สีแดงข้อที่ตอบผิด พร้อมแสดงเฉลยและวิธีคิด

---

## 🚀 ข้อมูลสำหรับทดสอบทันที (Demo Accounts)

- **บัญชีครูทดสอบ**:
  - ชื่อผู้ใช้: `teacher`
  - รหัสผ่าน: `password123`
- **รหัสห้องสอบตัวอย่าง**:
  - รหัส: `SCI-DEMO1`

---

## 📦 วิธีการนำขึ้น GitHub (How to Upload to GitHub)

### วิธีที่ 1: ผ่าน Git Command Line (แนะนำ)

1. เปิด Terminal หรือ PowerShell ในโฟลเดอร์นี้ (`wep_app_2`)
2. เริ่มต้น Git และบันทึกไฟล์:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of science exam web app"
   ```
3. สร้าง Repository ใหม่บน [GitHub.com](https://github.com/new) (ตั้งชื่อ เช่น `science-exam-app`)
4. เชื่อมต่อและ Push ขึ้น GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<USERNAME-ของคุณ>/<REPO-NAME>.git
   git push -u origin main
   ```

### วิธีที่ 2: อัปโหลดผ่านเว็บไซต์ GitHub โดยตรง
1. ไปที่ [GitHub.com](https://github.com) แล้วกด **New repository**
2. ตั้งชื่อ เช่น `science-exam-app` และกด **Create repository**
3. ที่หน้า Repository กดปุ่ม **uploading an existing file**
4. ลากไฟล์ทั้งหมดในโฟลเดอร์นี้ (`index.html`, `style.css`, `app.js`, `questions.js`, `vercel.json`, `README.md`) ไปวาง แล้วกด **Commit changes**

---

## 🌐 วิธีการ Deploy บน Vercel (How to Deploy to Vercel)

เมื่อนำโค้ดขึ้น GitHub เรียบร้อยแล้ว:

1. เข้าไปที่ [Vercel.com](https://vercel.com) แล้วเข้าสู่ระบบ (ล็อกอินด้วยบัญชี GitHub ได้เลย)
2. กดปุ่ม **"Add New..."** -> เลือก **"Project"**
3. มองหารายชื่อ Repository ของคุณ (เช่น `science-exam-app`) แล้วกดปุ่ม **"Import"**
4. ในหน้าตั้งค่า:
   - **Framework Preset**: เลือก `Other` (หรือปล่อยเป็น Default)
   - **Root Directory**: `./` (ปล่อยตามค่าเริ่มต้น)
5. กดปุ่ม **"Deploy"** 🚀
6. รอประมาณ 15-30 วินาที Vercel จะสร้าง URL เว็บไซต์จริงให้คุณ (เช่น `https://science-exam-app.vercel.app`) สามารถนำลิงก์ไปแชร์ให้นักเรียนและคุณครูใช้งานได้ทันที!

---

## 📂 โครงสร้างไฟล์ในโปรเจกต์ (Project Structure)

```
wep_app_2/
├── index.html        # โครงสร้างหน้าเว็บหลัก (SPA: Home, Login, Dashboard, Exam)
├── style.css         # สไตล์การแสดงผล Responsive, Glassmorphism, Badges
├── app.js            # ระบบจัดการ State, Auth, ตรวจข้อสอบ, คำนวณ, บันทึกผล
├── questions.js      # คลังข้อสอบวิทยาศาสตร์ (ง่าย, ปานกลาง, ยาก) พร้อมเฉลย
├── vercel.json       # ไฟล์คอนฟิกสำหรับ Deploy บน Vercel
├── Code.gs           # ซอร์สโค้ด Google Apps Script (เผื่อเชื่อมโยง Google Sheets)
├── .gitignore        # กำหนดไฟล์ที่ไม่ต้องการให้ Git ติดตาม
└── README.md         # เอกสารคู่มือการใช้งานและ Deploy
```

---

## 💡 สิทธิ์และการพัฒนาต่อยอด (Customization)
- หากต้องการเพิ่มข้อสอบ สามารถเปิดไฟล์ [questions.js](file:///c:/Users/pc/Documents/wep_app_2/questions.js) แล้วเพิ่มโจทย์ในตัวแปร `QUESTION_BANK` ได้อย่างง่ายดาย
- หากต้องการเชื่อมต่อข้อมูลไปยัง Google Sheets ให้ใช้ไฟล์ [Code.gs](file:///c:/Users/pc/Documents/wep_app_2/Code.gs) ใน Google Apps Script
