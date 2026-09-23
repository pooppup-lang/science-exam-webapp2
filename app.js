/**
 * Application Logic for Science Exam System (Vercel & GitHub Ready)
 * Features:
 * - Separated Portals: Student Guest Portal vs Teacher Admin Portal
 * - Sticky Countdown Timer with Auto-Submit
 * - Anti-Cheat Tab-Switch Detection with Automatic Reset
 * - Question and Choice (ก, ข, ค, ง) Randomization
 * - Teacher Data Isolation (Each teacher only sees their own data)
 * - 4-Digit PIN & Security Question Recovery
 * - High School Subject Separation (Physics, Chemistry, Biology)
 * - Custom Question Creator for Teachers
 */

const STORAGE_KEYS = {
  TEACHERS: 'sci_exam_teachers',
  ROOMS: 'sci_exam_rooms',
  RESULTS: 'sci_exam_results',
  CURRENT_TEACHER: 'sci_exam_current_teacher'
};

const thaiLetters = ['ก', 'ข', 'ค', 'ง'];

// Application State
const state = {
  currentTeacher: null,
  currentRoom: null,
  currentStudent: null,
  currentExamQuestions: [], // Shuffled questions with shuffled choices
  selectedRoomForResults: null,
  examActive: false,
  timerInterval: null,
  remainingSeconds: 0,
  isResetting: false
};

// ==================== Storage Helper ====================
function getStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Storage read error:', e);
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

// Initial demo account & room if storage is completely empty
function initDemoData() {
  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  if (teachers.length === 0) {
    teachers.push({
      id: 't-demo',
      fullName: 'ครูวิทยาศาสตร์ (Demo)',
      username: 'teacher',
      password: 'password123',
      pin: '1234',
      secQuestion: 'pet',
      secAnswer: 'ด่าง',
      createdAt: new Date().toISOString()
    });
    setStorage(STORAGE_KEYS.TEACHERS, teachers);
  }

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  if (rooms.length === 0) {
    rooms.push({
      id: 'room-demo-1',
      code: 'SCI-DEMO1',
      name: 'ทดสอบความรู้วิทยาศาสตร์พื้นฐาน ม.2',
      grade: 'ม.2',
      subject: 'all',
      classroom: 'ม.2/1',
      timeLimit: 15,
      easy: 3,
      medium: 2,
      hard: 1,
      createdAt: new Date().toISOString(),
      active: true,
      teacherId: 't-demo'
    });
    setStorage(STORAGE_KEYS.ROOMS, rooms);
  }
}

// ==================== Navigation & Portal Control ====================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Clear errors
  document.querySelectorAll('.error').forEach(err => {
    err.textContent = '';
    err.classList.remove('active');
  });

  updatePortalSwitcherBtn(viewId);
}

function updatePortalSwitcherBtn(currentViewId) {
  const btn = document.getElementById('portalSwitcherBtn');
  if (!btn) return;

  const adminViews = ['teacherLoginView', 'registerTeacherView', 'teacherForgotView', 'teacherDashboardView'];
  if (adminViews.includes(currentViewId)) {
    btn.textContent = '🎓 หน้าเข้าสอบ (Student)';
    btn.onclick = showStudentPortal;
  } else {
    btn.textContent = state.currentTeacher ? '👨‍🏫 แดชบอร์ดครู (Admin)' : '🔒 เข้าสู่ระบบครู (Admin)';
    btn.onclick = togglePortal;
  }
}

function showStudentPortal() {
  stopExamTimer();
  state.examActive = false;
  showView('studentHomeView');
}

function togglePortal() {
  if (state.currentTeacher) {
    const infoEl = document.getElementById('teacherInfo');
    if (infoEl) infoEl.textContent = `ครู: ${state.currentTeacher.fullName}`;
    showView('teacherDashboardView');
    loadTeacherRooms();
    loadCustomQuestions();
    updatePoolCountDisplay();
  } else {
    showView('teacherLoginView');
  }
}

function showError(elemId, msg) {
  const el = document.getElementById(elemId);
  if (el) {
    el.textContent = msg;
    el.classList.add('active');
  }
}

// ==================== Teacher Auth with PIN & Security Question ====================
function registerTeacher() {
  const name = document.getElementById('registerName').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const pin = document.getElementById('registerPin').value.trim();
  const secQuestion = document.getElementById('registerSecQuestion').value;
  const secAnswer = document.getElementById('registerSecAnswer').value.trim();

  if (!name || !username || !password || !pin || !secAnswer) {
    showError('registerTeacherError', 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
    return;
  }

  if (password.length < 6) {
    showError('registerTeacherError', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    return;
  }

  if (password !== confirmPassword) {
    showError('registerTeacherError', 'รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    return;
  }

  if (!/^\d{4}$/.test(pin)) {
    showError('registerTeacherError', 'PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น (เช่น 1234)');
    return;
  }

  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  if (teachers.some(t => t.username.toLowerCase() === username.toLowerCase())) {
    showError('registerTeacherError', 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น');
    return;
  }

  const newTeacher = {
    id: 't-' + Date.now(),
    fullName: name,
    username: username,
    password: password,
    pin: pin,
    secQuestion: secQuestion,
    secAnswer: secAnswer.toLowerCase(),
    createdAt: new Date().toISOString()
  };

  teachers.push(newTeacher);
  setStorage(STORAGE_KEYS.TEACHERS, teachers);

  alert('สมัครบัญชีครูสำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านของคุณ');
  document.getElementById('teacherUsername').value = username;
  document.getElementById('teacherPassword').value = '';
  showView('teacherLoginView');
}

function loginDemoTeacher() {
  let teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  let demo = teachers.find(t => t.username && t.username.toLowerCase() === 'teacher');
  if (!demo) {
    demo = {
      id: 't-demo',
      fullName: 'ครูวิทยาศาสตร์ (Demo)',
      username: 'teacher',
      password: 'password123',
      pin: '1234',
      secQuestion: 'pet',
      secAnswer: 'ด่าง',
      createdAt: new Date().toISOString()
    };
    teachers.push(demo);
    setStorage(STORAGE_KEYS.TEACHERS, teachers);
  }

  // Ensure demo room exists
  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  if (rooms.length === 0 || !rooms.some(r => r.teacherId === demo.id)) {
    rooms.unshift({
      id: 'room-demo-1',
      code: 'SCI-DEMO1',
      name: 'ทดสอบความรู้วิทยาศาสตร์พื้นฐาน ม.2',
      grade: 'ม.2',
      subject: 'all',
      classroom: 'ม.2/1',
      timeLimit: 15,
      easy: 3,
      medium: 2,
      hard: 1,
      createdAt: new Date().toISOString(),
      active: true,
      teacherId: demo.id
    });
    setStorage(STORAGE_KEYS.ROOMS, rooms);
  }

  const uInput = document.getElementById('teacherUsername');
  const pInput = document.getElementById('teacherPassword');
  if (uInput) uInput.value = demo.username;
  if (pInput) pInput.value = demo.password;

  state.currentTeacher = demo;
  sessionStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(demo));

  const infoEl = document.getElementById('teacherInfo');
  if (infoEl) infoEl.textContent = `ครู: ${demo.fullName}`;

  showView('teacherDashboardView');
  loadTeacherRooms();
  loadCustomQuestions();
  updatePoolCountDisplay();
}

function teacherLogin() {
  const username = (document.getElementById('teacherUsername').value || '').trim();
  const password = document.getElementById('teacherPassword').value || '';

  // If both fields are empty, automatically log into demo admin
  if (!username && !password) {
    loginDemoTeacher();
    return;
  }

  if (!username || !password) {
    showError('teacherLoginError', 'กรุณากรอกทั้งชื่อผู้ใช้และรหัสผ่าน หรือคลิกปุ่ม "🚀 เข้าใช้งานทันที" ด้านบน');
    return;
  }

  let teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  let teacher = teachers.find(
    t => t.username && t.username.toLowerCase() === username.toLowerCase() && t.password === password
  );

  // Fallback: If user types demo credentials even if storage was cleared
  if (!teacher && username.toLowerCase() === 'teacher' && password === 'password123') {
    loginDemoTeacher();
    return;
  }

  if (!teacher) {
    showError('teacherLoginError', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชีสามารถกด "✨ สมัครบัญชีครูใหม่" ด้านล่าง)');
    return;
  }

  state.currentTeacher = teacher;
  sessionStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(teacher));

  const infoEl = document.getElementById('teacherInfo');
  if (infoEl) infoEl.textContent = `ครู: ${teacher.fullName}`;

  showView('teacherDashboardView');
  loadTeacherRooms();
  loadCustomQuestions();
  updatePoolCountDisplay();
}

function teacherLogout() {
  state.currentTeacher = null;
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER);
  showStudentPortal();
}

// Forgot Password / PIN Recovery
function recoverAccount() {
  const username = document.getElementById('forgotUsername').value.trim();
  const secQuestion = document.getElementById('forgotSecQuestion').value;
  const secAnswer = document.getElementById('forgotSecAnswer').value.trim().toLowerCase();
  const newPassword = document.getElementById('forgotNewPassword').value;

  if (!username || !secAnswer || !newPassword) {
    showError('forgotError', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
    return;
  }

  if (newPassword.length < 6) {
    showError('forgotError', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    return;
  }

  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  const teacher = teachers.find(t => t.username.toLowerCase() === username.toLowerCase());

  if (!teacher) {
    showError('forgotError', 'ไม่พบบัญชีผู้ใช้นี้ในระบบ');
    return;
  }

  if (teacher.secQuestion !== secQuestion || teacher.secAnswer !== secAnswer) {
    showError('forgotError', 'คำถามหรือคำตอบกันลืมไม่ถูกต้อง');
    return;
  }

  // Update password
  teacher.password = newPassword;
  setStorage(STORAGE_KEYS.TEACHERS, teachers);

  const successBox = document.getElementById('forgotSuccess');
  successBox.style.display = 'block';
  successBox.textContent = `รีเซ็ตรหัสผ่านสำเร็จเรียบร้อย! (PIN ของคุณคือ: ${teacher.pin}) สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที`;

  document.getElementById('teacherUsername').value = username;
  document.getElementById('teacherPassword').value = newPassword;

  setTimeout(() => {
    showView('teacherLoginView');
    successBox.style.display = 'none';
  }, 2500);
}

// ==================== Dashboard Tabs ====================
function switchTeacherTab(tabName) {
  const tabRooms = document.getElementById('teacherTabRooms');
  const tabCustomQ = document.getElementById('teacherTabCustomQ');
  const btnRooms = document.getElementById('tabRoomsBtn');
  const btnCustomQ = document.getElementById('tabCustomQBtn');

  if (tabName === 'rooms') {
    tabRooms.style.display = 'block';
    tabCustomQ.style.display = 'none';
    btnRooms.classList.add('active');
    btnCustomQ.classList.remove('active');
    loadTeacherRooms();
    updatePoolCountDisplay();
  } else {
    tabRooms.style.display = 'none';
    tabCustomQ.style.display = 'block';
    btnRooms.classList.remove('active');
    btnCustomQ.classList.add('active');
    loadCustomQuestions();
  }
}

// ==================== Custom Questions Creator ====================
function getTeacherCustomQuestions() {
  if (!state.currentTeacher) return [];
  const key = `sci_exam_custom_${state.currentTeacher.id}`;
  return getStorage(key, []);
}

function saveCustomQuestion() {
  if (!state.currentTeacher) return;

  const grade = document.getElementById('customQGrade').value;
  const subject = document.getElementById('customQSubject').value;
  const difficulty = document.getElementById('customQDiff').value;
  const question = document.getElementById('customQText').value.trim();
  const c1 = document.getElementById('customChoice1').value.trim();
  const c2 = document.getElementById('customChoice2').value.trim();
  const c3 = document.getElementById('customChoice3').value.trim();
  const c4 = document.getElementById('customChoice4').value.trim();
  const answer = document.getElementById('customQAnswer').value;
  const explanation = document.getElementById('customQExplanation').value.trim();

  if (!question || !c1 || !c2 || !c3 || !c4) {
    showError('customQError', 'กรุณากรอกคำถามและตัวเลือก ก, ข, ค, ง ให้ครบทุกช่อง');
    return;
  }

  const customQList = getTeacherCustomQuestions();
  const newQ = {
    id: `custom-${Date.now()}`,
    grade: grade,
    subject: subject,
    category: `${subject} (${grade}) [ข้อสอบของฉัน]`,
    difficulty: difficulty,
    question: question,
    choices: [c1, c2, c3, c4],
    correctAnswer: answer,
    explanation: explanation || `คำตอบที่ถูกต้องคือข้อ ${thaiLetters[answer.charCodeAt(0) - 65]}`,
    custom: true
  };

  customQList.unshift(newQ);
  const key = `sci_exam_custom_${state.currentTeacher.id}`;
  setStorage(key, customQList);

  // Clear inputs
  document.getElementById('customQText').value = '';
  document.getElementById('customChoice1').value = '';
  document.getElementById('customChoice2').value = '';
  document.getElementById('customChoice3').value = '';
  document.getElementById('customChoice4').value = '';
  document.getElementById('customQExplanation').value = '';

  const succ = document.getElementById('customQSuccess');
  succ.textContent = '🎉 บันทึกข้อสอบลงคลังส่วนตัวของคุณเรียบร้อยแล้ว!';
  succ.style.display = 'block';
  setTimeout(() => succ.style.display = 'none', 3000);

  loadCustomQuestions();
  updatePoolCountDisplay();
}

function loadCustomQuestions() {
  const customQList = getTeacherCustomQuestions();
  document.getElementById('customQCount').textContent = customQList.length;

  const tableContainer = document.getElementById('customQTable');
  if (customQList.length === 0) {
    tableContainer.innerHTML = '<p style="padding: 16px; color: var(--text-muted); text-align: center;">ยังไม่มีข้อสอบที่คุณสร้างเอง</p>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>ระดับชั้น/วิชา</th>
          <th>ระดับ</th>
          <th>คำถาม</th>
          <th>การจัดการ</th>
        </tr>
      </thead>
      <tbody>
  `;

  customQList.forEach(q => {
    html += `
      <tr>
        <td><strong>${q.grade}</strong> | ${escapeHtml(q.subject)}</td>
        <td>
          <span class="q-difficulty q-diff-${q.difficulty}">
            ${q.difficulty === 'easy' ? 'ง่าย' : q.difficulty === 'medium' ? 'ปานกลาง' : 'ยาก'}
          </span>
        </td>
        <td>${escapeHtml(q.question)}</td>
        <td>
          <button class="small danger" onclick="deleteCustomQuestion('${q.id}')">ลบ</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tableContainer.innerHTML = html;
}

function deleteCustomQuestion(qId) {
  if (!confirm('ต้องการลบข้อสอบนี้ใช่หรือไม่?')) return;
  const customQList = getTeacherCustomQuestions().filter(q => q.id !== qId);
  const key = `sci_exam_custom_${state.currentTeacher.id}`;
  setStorage(key, customQList);
  loadCustomQuestions();
  updatePoolCountDisplay();
}

// ==================== Dynamic Pool Counter ====================
function updatePoolCountDisplay() {
  const grade = document.getElementById('newRoomGrade') ? document.getElementById('newRoomGrade').value : 'all';
  const subject = document.getElementById('newRoomSubject') ? document.getElementById('newRoomSubject').value : 'all';
  const customQ = getTeacherCustomQuestions();

  let pool = [...(typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK : []), ...customQ];

  if (grade && grade !== 'all') {
    pool = pool.filter(q => q.grade === grade);
  }
  if (subject && subject !== 'all') {
    pool = pool.filter(q => q.subject === subject || (q.category && q.category.includes(subject)));
  }

  const easyCount = pool.filter(q => q.difficulty === 'easy').length;
  const medCount = pool.filter(q => q.difficulty === 'medium').length;
  const hardCount = pool.filter(q => q.difficulty === 'hard').length;

  document.getElementById('availEasy').textContent = easyCount;
  document.getElementById('availMed').textContent = medCount;
  document.getElementById('availHard').textContent = hardCount;

  // Update input max limits
  document.getElementById('easyCount').max = easyCount;
  document.getElementById('mediumCount').max = medCount;
  document.getElementById('hardCount').max = hardCount;
}

// ==================== Room Management ====================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SCI-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom() {
  if (!state.currentTeacher) return;

  const name = document.getElementById('newRoomName').value.trim();
  const classroom = document.getElementById('newRoomClass').value.trim();
  const grade = document.getElementById('newRoomGrade').value;
  const subject = document.getElementById('newRoomSubject').value;
  const timeLimit = parseInt(document.getElementById('newRoomTimeLimit').value) || 0;
  const easy = parseInt(document.getElementById('easyCount').value) || 0;
  const medium = parseInt(document.getElementById('mediumCount').value) || 0;
  const hard = parseInt(document.getElementById('hardCount').value) || 0;

  if (!name || !classroom) {
    showError('teacherError', 'กรุณากรอกชื่อห้องสอบและระดับชั้น/ห้องเรียน');
    return;
  }

  if (easy + medium + hard <= 0) {
    showError('teacherError', 'จำนวนข้อสอบรวมต้องมากกว่า 0 ข้อ');
    return;
  }

  const customQ = getTeacherCustomQuestions();
  let pool = [...(typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK : []), ...customQ];

  if (grade && grade !== 'all') {
    pool = pool.filter(q => q.grade === grade);
  }
  if (subject && subject !== 'all') {
    pool = pool.filter(q => q.subject === subject || (q.category && q.category.includes(subject)));
  }

  const easyPool = pool.filter(q => q.difficulty === 'easy').length;
  const medPool = pool.filter(q => q.difficulty === 'medium').length;
  const hardPool = pool.filter(q => q.difficulty === 'hard').length;

  if (easy > easyPool || medium > medPool || hard > hardPool) {
    showError('teacherError', `จำนวนข้อเกินคลังที่มีสำหรับชั้นและวิชานี้ (ง่ายมี ${easyPool}, กลางมี ${medPool}, ยากมี ${hardPool} ข้อ)`);
    return;
  }

  const roomCode = generateRoomCode();
  const newRoom = {
    id: 'room-' + Date.now(),
    code: roomCode,
    name: name,
    classroom: classroom,
    grade: grade,
    subject: subject,
    timeLimit: timeLimit,
    easy: easy,
    medium: medium,
    hard: hard,
    createdAt: new Date().toISOString(),
    active: true,
    teacherId: state.currentTeacher.id
  };

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  rooms.unshift(newRoom);
  setStorage(STORAGE_KEYS.ROOMS, rooms);

  // Display Room Code Banner
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  document.getElementById('newRoomCode').innerHTML = `
    <div class="room-code-banner">
      <p style="font-weight: 700; color: #1e3a8a; margin: 0;">🎉 สร้างห้องสอบสำเร็จเรียบร้อย!</p>
      <div class="room-code-val">${roomCode}</div>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">
        ระดับ: <strong>${grade === 'all' ? 'ทุกระดับชั้น' : grade}</strong> | 
        วิชา: <strong>${subject === 'all' ? 'ทุกหมวดวิชา' : subject}</strong> | 
        เวลา: <strong>${timeLimit > 0 ? timeLimit + ' นาที' : 'ไม่จำกัดเวลา'}</strong>
      </p>
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button class="small" onclick="copyText('${roomCode}')">📋 คัดลอกรหัส</button>
        <button class="small outline" onclick="copyText('${shareUrl}')">🔗 คัดลอกลิงก์สอบ</button>
      </div>
    </div>
  `;

  document.getElementById('newRoomName').value = '';
  document.getElementById('newRoomClass').value = '';
  loadTeacherRooms();
}

// STRICT TEACHER ISOLATION: Only display rooms of currentTeacher
function loadTeacherRooms() {
  if (!state.currentTeacher) return;

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const teacherRooms = rooms.filter(r => r.teacherId === state.currentTeacher.id);

  if (teacherRooms.length === 0) {
    document.getElementById('roomList').innerHTML =
      '<p style="padding: 16px; color: var(--text-muted); text-align: center;">ยังไม่มีห้องสอบที่คุณสร้าง</p>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>ชื่อห้องสอบ</th>
          <th>ระดับ/วิชา</th>
          <th>จำนวนข้อ</th>
          <th>เวลา</th>
          <th>รหัสห้อง</th>
          <th>สถานะ</th>
          <th>การจัดการ</th>
        </tr>
      </thead>
      <tbody>
  `;

  teacherRooms.forEach(room => {
    const totalQ = room.easy + room.medium + room.hard;
    const timeText = room.timeLimit > 0 ? `${room.timeLimit} นาที` : 'ไม่จำกัด';
    const subjText = room.subject === 'all' ? 'ทุกวิชา' : room.subject;
    const gradeText = room.grade === 'all' ? 'ม.1-6' : room.grade;

    html += `
      <tr>
        <td><strong>${escapeHtml(room.name)}</strong></td>
        <td><span style="font-size: 13px;">${gradeText} (${subjText})</span></td>
        <td>
          <span style="font-size: 12px;">รวม ${totalQ} ข้อ (ง ${room.easy}|ก ${room.medium}|ย ${room.hard})</span>
        </td>
        <td><span style="font-size: 12px; font-weight: 600;">⏱️ ${timeText}</span></td>
        <td><strong style="color: var(--primary); letter-spacing: 1px;">${room.code}</strong></td>
        <td>
          <span style="padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; ${
            room.active ? 'background: #dcfce7; color: #15803d;' : 'background: #f1f5f9; color: #64748b;'
          }">
            ${room.active ? 'เปิดอยู่' : 'ปิดแล้ว'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="small outline" onclick="showRoomResults('${room.id}')">📊 คะแนน</button>
            ${room.active ? `<button class="small danger" onclick="closeRoom('${room.id}')">ปิดห้อง</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  document.getElementById('roomList').innerHTML = html;
}

function closeRoom(roomId) {
  if (!confirm('ต้องการปิดห้องสอบนี้ใช่หรือไม่? นักเรียนจะไม่สามารถเข้าทำข้อสอบเพิ่มได้')) return;

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const room = rooms.find(r => r.id === roomId && r.teacherId === state.currentTeacher.id);
  if (room) {
    room.active = false;
    setStorage(STORAGE_KEYS.ROOMS, rooms);
    loadTeacherRooms();
  }
}

// STRICT TEACHER ISOLATION: Only display results for rooms belonging to currentTeacher
function showRoomResults(roomId) {
  if (!state.currentTeacher) return;

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const room = rooms.find(r => r.id === roomId && r.teacherId === state.currentTeacher.id);
  if (!room) return;

  state.selectedRoomForResults = room;
  const allResults = getStorage(STORAGE_KEYS.RESULTS, []);
  const results = allResults.filter(r => r.roomId === roomId);

  document.getElementById('roomResultsSection').style.display = 'block';
  document.getElementById('roomResultTitle').textContent = `📊 ผลคะแนน: ${room.name} (${room.code})`;

  if (results.length === 0) {
    document.getElementById('roomResultsTable').innerHTML =
      '<p style="padding: 20px; text-align: center; color: var(--text-muted);">ยังไม่มีนักเรียนส่งคำตอบในห้องนี้</p>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>เวลาส่ง</th>
          <th>ชื่อ-นามสกุล</th>
          <th>ชั้น/ห้อง</th>
          <th>เลขที่</th>
          <th>คะแนนที่ได้</th>
          <th>คิดเป็น %</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.forEach(res => {
    const formattedDate = new Date(res.submittedAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
    html += `
      <tr>
        <td>${formattedDate} น.</td>
        <td><strong>${escapeHtml(res.studentName)}</strong></td>
        <td>${escapeHtml(res.studentClass)}</td>
        <td>${escapeHtml(res.studentNumber)}</td>
        <td><strong style="color: var(--primary);">${res.score}</strong> / ${res.total}</td>
        <td>
          <span style="font-weight: 700; ${res.percentage >= 50 ? 'color: var(--success);' : 'color: var(--danger);'}">
            ${res.percentage}%
          </span>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  document.getElementById('roomResultsTable').innerHTML = html;
  document.getElementById('roomResultsSection').scrollIntoView({ behavior: 'smooth' });
}

function exportResultsToCSV() {
  if (!state.selectedRoomForResults || state.selectedRoomForResults.teacherId !== state.currentTeacher.id) return;

  const room = state.selectedRoomForResults;
  const allResults = getStorage(STORAGE_KEYS.RESULTS, []);
  const results = allResults.filter(r => r.roomId === room.id);

  if (results.length === 0) {
    alert('ไม่มีข้อมูลคะแนนสำหรับส่งออก');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
  csvContent += 'เวลาส่ง,ชื่อ-นามสกุล,ชั้น/ห้อง,เลขที่,คะแนนดิบ,คะแนนเต็ม,ร้อยละ\r\n';

  results.forEach(r => {
    const time = new Date(r.submittedAt).toLocaleString('th-TH');
    csvContent += `"${time}","${r.studentName}","${r.studentClass}","${r.studentNumber}",${r.score},${r.total},${r.percentage}%\r\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `คะแนน_${room.code}_${room.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== Student Portal & Exam ====================
function checkRoomCode(customCode = null) {
  const code = (customCode || document.getElementById('roomCodeInput').value).trim().toUpperCase();
  if (!code) {
    showError('studentHomeError', 'กรุณากรอกรหัสห้องสอบ');
    return;
  }

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const room = rooms.find(r => r.code === code);

  if (!room) {
    showError('studentHomeError', 'ไม่พบห้องสอบนี้ กรุณาตรวจสอบรหัสอีกครั้ง');
    return;
  }

  if (!room.active) {
    showError('studentHomeError', 'ห้องสอบนี้ถูกปิดแล้ว ไม่สามารถเข้าทำได้');
    return;
  }

  state.currentRoom = room;

  const total = room.easy + room.medium + room.hard;
  const timeText = room.timeLimit > 0 ? `${room.timeLimit} นาที` : 'ไม่จำกัดเวลา';
  const subjText = room.subject === 'all' ? 'ทุกหมวดวิชา' : room.subject;
  const gradeText = room.grade === 'all' ? 'ม.1 - ม.6' : room.grade;

  document.getElementById('roomSummary').innerHTML = `
    <div style="font-size: 13px; color: #1e40af; font-weight: 600;">ห้องสอบ</div>
    <div style="font-size: 22px; font-weight: 800; color: #1d4ed8; margin: 4px 0;">${escapeHtml(room.name)}</div>
    <p style="font-size: 14px; color: var(--text-muted); margin: 0;">
      ระดับ: <strong>${gradeText}</strong> | วิชา: <strong>${subjText}</strong> | 
      ข้อสอบทั้งหมด <strong>${total} ข้อ</strong> | ⏱️ เวลา: <strong>${timeText}</strong>
    </p>
  `;

  document.getElementById('studentClass').value = room.classroom;
  showView('studentProfileView');
}

function startExam() {
  const name = document.getElementById('studentName').value.trim();
  const classroom = document.getElementById('studentClass').value.trim();
  const number = document.getElementById('studentNumber').value.trim();

  if (!name || !classroom || !number) {
    showError('profileError', 'กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  state.currentStudent = {
    name: name,
    classroom: classroom,
    number: number
  };

  document.getElementById('studentStickyInfo').textContent = `👤 ${name} (${classroom} เลขที่ ${number})`;
  document.getElementById('roomStickyInfo').textContent = `${state.currentRoom.code}`;

  setupAndRenderExam();
  showView('studentExamView');

  // Start Timer & Anti-Cheat
  startExamTimer(state.currentRoom.timeLimit);
  state.examActive = true;
}

// Generate Questions with Choice Shuffling (ก, ข, ค, ง)
function setupAndRenderExam() {
  // Get teacher's custom questions if any
  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const currentRoomData = rooms.find(r => r.id === state.currentRoom.id);
  let customQ = [];
  if (currentRoomData && currentRoomData.teacherId) {
    customQ = getStorage(`sci_exam_custom_${currentRoomData.teacherId}`, []);
  }

  const rawQuestions = getRandomQuestions(
    state.currentRoom.easy,
    state.currentRoom.medium,
    state.currentRoom.hard,
    state.currentRoom.grade,
    state.currentRoom.subject,
    customQ
  );

  // Fisher-Yates shuffle for choices & assign Thai letters
  state.currentExamQuestions = rawQuestions.map((q, qIdx) => {
    // Map choices into objects with their correctness
    const choiceObjects = q.choices.map((text, idx) => {
      const origLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'
      return {
        text: text,
        isCorrect: origLetter === q.correctAnswer
      };
    });

    // Shuffle the 4 choices
    const shuffledChoices = [...choiceObjects];
    for (let i = shuffledChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledChoices[i], shuffledChoices[j]] = [shuffledChoices[j], shuffledChoices[i]];
    }

    return {
      originalQuestion: q,
      shuffledChoices: shuffledChoices,
      selectedChoiceIndex: null
    };
  });

  renderExamUI();
}

function renderExamUI() {
  let html = '';
  state.currentExamQuestions.forEach((item, qIdx) => {
    const q = item.originalQuestion;

    html += `
      <div class="question-item" id="q-card-${qIdx}">
        <div class="q-header">
          <span style="font-size: 16px; font-weight: 700; color: var(--primary);">ข้อที่ ${qIdx + 1}</span>
        </div>
        <div class="q-title">${escapeHtml(q.question)}</div>
        <div class="choices-list">
    `;

    item.shuffledChoices.forEach((choice, cIdx) => {
      const thaiLetter = thaiLetters[cIdx];
      const isSelected = item.selectedChoiceIndex === cIdx;
      html += `
        <label class="choice-label ${isSelected ? 'selected' : ''}" id="choice-${qIdx}-${cIdx}">
          <input type="radio" name="ans-${qIdx}" value="${cIdx}" ${isSelected ? 'checked' : ''} onchange="selectChoice(${qIdx}, ${cIdx})">
          <span class="choice-letter">${thaiLetter}.</span>
          <span>${escapeHtml(choice.text)}</span>
        </label>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  document.getElementById('examContent').innerHTML = html;
}

function selectChoice(qIndex, choiceIndex) {
  state.currentExamQuestions[qIndex].selectedChoiceIndex = choiceIndex;
  thaiLetters.forEach((_, cIdx) => {
    const label = document.getElementById(`choice-${qIndex}-${cIdx}`);
    if (label) label.classList.remove('selected');
  });
  const selectedLabel = document.getElementById(`choice-${qIndex}-${choiceIndex}`);
  if (selectedLabel) selectedLabel.classList.add('selected');
}

// ==================== Sticky Timer Logic ====================
function startExamTimer(minutes) {
  stopExamTimer();
  const digits = document.getElementById('timerDigits');
  const badge = document.getElementById('examTimerBadge');

  if (!minutes || minutes <= 0) {
    digits.textContent = 'ไม่จำกัดเวลา';
    badge.classList.remove('urgent');
    return;
  }

  state.remainingSeconds = minutes * 60;
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.remainingSeconds--;
    updateTimerDisplay();

    if (state.remainingSeconds <= 120) {
      badge.classList.add('urgent');
    }

    if (state.remainingSeconds <= 0) {
      stopExamTimer();
      alert('⏰ หมดเวลาทำข้อสอบแล้ว! ระบบจะส่งคำตอบของคุณโดยอัตโนมัติ');
      submitExam(true); // Auto force submit
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(state.remainingSeconds / 60);
  const s = state.remainingSeconds % 60;
  const digits = document.getElementById('timerDigits');
  if (digits) {
    digits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

function stopExamTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ==================== Anti-Cheat: Screen / Tab Switch Detection ====================
function restartCurrentExam() {
  if (state.isResetting) return;
  state.isResetting = true;

  // Re-generate fresh shuffled questions & choices
  setupAndRenderExam();

  // Reset timer
  if (state.currentRoom && state.currentRoom.timeLimit > 0) {
    startExamTimer(state.currentRoom.timeLimit);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    state.isResetting = false;
  }, 1000);
}

function setupAntiCheatListeners() {
  const handleCheat = () => {
    if (!state.examActive || state.isResetting) return;

    // Trigger immediate reset
    alert('⚠️ ตรวจพบการสลับหน้าจอหรือย่อหน้าต่างข้อสอบ!\n\nตามกฎความซื่อสัตย์ในการสอบ ระบบได้ทำการรีเซ็ตข้อสอบ และสลับข้อสอบใหม่ทั้งหมด คุณต้องเริ่มทำใหม่ตั้งแต่ต้น');
    restartCurrentExam();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.examActive) {
      handleCheat();
    }
  });

  window.addEventListener('blur', () => {
    if (state.examActive) {
      handleCheat();
    }
  });
}

// ==================== Submit Exam & Results ====================
function submitExam(force = false) {
  if (!force) {
    const unanswered = state.currentExamQuestions.some(item => item.selectedChoiceIndex === null);
    if (unanswered) {
      showError('studentError', 'กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!confirm('ยืนยันที่จะส่งข้อสอบและตรวจคะแนน?')) return;
  }

  // Deactivate exam mode
  state.examActive = false;
  stopExamTimer();

  let correctCount = 0;
  const reviewData = [];

  state.currentExamQuestions.forEach(item => {
    const selectedIdx = item.selectedChoiceIndex;
    const isAnswered = selectedIdx !== null;
    const isCorrect = isAnswered && item.shuffledChoices[selectedIdx].isCorrect;

    if (isCorrect) correctCount++;

    reviewData.push({
      originalQuestion: item.originalQuestion,
      shuffledChoices: item.shuffledChoices,
      selectedChoiceIndex: selectedIdx,
      isCorrect: isCorrect
    });
  });

  const total = state.currentExamQuestions.length;
  const percentage = Math.round((correctCount / total) * 100);

  const resultRecord = {
    id: 'res-' + Date.now(),
    roomId: state.currentRoom.id,
    studentName: state.currentStudent.name,
    studentClass: state.currentStudent.classroom,
    studentNumber: state.currentStudent.number,
    score: correctCount,
    total: total,
    percentage: percentage,
    submittedAt: new Date().toISOString()
  };

  const allResults = getStorage(STORAGE_KEYS.RESULTS, []);
  allResults.unshift(resultRecord);
  setStorage(STORAGE_KEYS.RESULTS, allResults);

  displayResults(resultRecord, reviewData);
  showView('studentResultView');
}

function displayResults(result, reviewData) {
  // Requirement: ไม่ต้องเฉลยทันที (Withhold answers & explanations from students upon submission)
  // Teachers retain full score & answer review visibility in the Teacher Admin Dashboard
  const circle = document.getElementById('scoreDisplayCircle');
  if (circle) circle.textContent = '✓';

  const pct = document.getElementById('scoreDisplayPct');
  if (pct) pct.textContent = 'ระบบบันทึกการส่งคำตอบเรียบร้อยแล้ว';

  const details = document.getElementById('scoreStudentDetails');
  if (details) {
    const formattedTime = new Date(result.submittedAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
    details.textContent = `ผู้สอบ: ${result.studentName} (${result.studentClass} เลขที่ ${result.studentNumber}) | ห้องสอบ: ${state.currentRoom.name} (${state.currentRoom.code}) | เวลาส่ง: ${formattedTime} น.`;
  }

  // Ensure answer keys and explanations remain hidden from students
  const reviewContainer = document.getElementById('resultAnswersReview');
  if (reviewContainer) {
    reviewContainer.innerHTML = '';
    reviewContainer.style.display = 'none';
  }
}

function exitExam() {
  if (confirm('คุณต้องการออกจากห้องสอบใช่หรือไม่? การสอบนี้จะถูกยกเลิก')) {
    state.examActive = false;
    stopExamTimer();
    showStudentPortal();
  }
}

// ==================== Scientific Calculator Logic ====================
let calcIsDeg = true; // true = DEG, false = RAD
// ==================== Exact Math & Root / Fraction Simplification ====================
function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function toFraction(val, maxDenom = 2000) {
  if (Math.abs(val) < 1e-12) return { num: 0, den: 1 };
  const sign = val < 0 ? -1 : 1;
  val = Math.abs(val);

  if (Math.abs(val - Math.round(val)) < 1e-9) {
    return { num: sign * Math.round(val), den: 1 };
  }

  let m00 = 0, m01 = 1, m10 = 1, m11 = 0;
  let x = val;
  for (let iter = 0; iter < 25; iter++) {
    const a = Math.floor(x);
    let t = m00 + a * m01; m00 = m01; m01 = t;
    t = m10 + a * m11; m10 = m11; m11 = t;

    if (m11 > maxDenom) break;
    if (Math.abs(val - m01 / m11) < 1e-8) {
      return { num: sign * m01, den: m11 };
    }
    const rem = x - a;
    if (rem < 1e-12) break;
    x = 1 / rem;
  }
  return { num: sign * m01, den: m11 };
}

function simplifySquareRoot(N) {
  if (N <= 0 || !Number.isInteger(N)) return { outside: 1, inside: N };
  let outside = 1;
  let inside = N;
  let d = 2;
  while (d * d <= inside) {
    if (inside % (d * d) === 0) {
      outside *= d;
      inside = Math.floor(inside / (d * d));
    } else {
      d++;
    }
  }
  return { outside, inside };
}

function formatExactValue(val) {
  if (!Number.isFinite(val)) return 'Error';
  if (Math.abs(val) < 1e-12) return '0';

  const signStr = val < 0 ? '-' : '';
  const absVal = Math.abs(val);

  // If already a clean integer
  if (Math.abs(absVal - Math.round(absVal)) < 1e-9) {
    return signStr + Math.round(absVal).toString();
  }

  // 1. Check if square value is rational (handles pure roots like √8 = 2√2, √12 = 2√3, and roots with fractions like √3/2, √2/2, 2√5/3)
  const sq = absVal * absVal;
  const sqFrac = toFraction(sq, 2000);
  const sqDiff = Math.abs(sq - sqFrac.num / sqFrac.den);

  if (sqDiff < 1e-7 && sqFrac.num > 0 && sqFrac.den > 0 && sqFrac.den <= 1000) {
    const prod = sqFrac.num * sqFrac.den;
    const { outside, inside } = simplifySquareRoot(prod);

    // Only accept if simplified root inside is reasonable (<= 500)
    if (inside <= 500) {
      const g = gcd(outside, sqFrac.den);
      const numCoeff = outside / g;
      const denCoeff = sqFrac.den / g;

      if (inside === 1) {
        // Pure fraction
        if (denCoeff === 1) return signStr + numCoeff.toString();
        return `${signStr}${numCoeff}/${denCoeff}`;
      } else {
        // Contains square root (ติดรูท)
        const rootStr = numCoeff === 1 ? `√${inside}` : `${numCoeff}√${inside}`;
        if (denCoeff === 1) return `${signStr}${rootStr}`;
        return `${signStr}${rootStr}/${denCoeff}`;
      }
    }
  }

  // 2. If not caught by square, check clean direct fraction (den <= 500)
  const frac = toFraction(absVal, 500);
  if (Math.abs(absVal - frac.num / frac.den) < 1e-8 && frac.den <= 500) {
    if (frac.den === 1) return signStr + frac.num.toString();
    return `${signStr}${frac.num}/${frac.den}`;
  }

  // 3. Fallback: clean decimal representation
  return parseFloat(val.toFixed(8)).toString();
}

// ==================== Scientific Calculator State & Logic ====================
let calcIsDeg = true; // true = DEG, false = RAD
let calcJustEvaluated = false;
let calcResultState = {
  rawNumeric: null,
  exactForm: '',
  decimalForm: '',
  showingExact: true,
  lastFormula: ''
};

function toggleCalculator() {
  const calc = document.getElementById('calculatorBox');
  if (calc) calc.classList.toggle('active');
}

function calcToggleDegRad() {
  calcIsDeg = !calcIsDeg;
  const btn = document.getElementById('degRadBtn');
  if (btn) {
    if (calcIsDeg) {
      btn.textContent = 'DEG';
      btn.classList.remove('rad-mode');
    } else {
      btn.textContent = 'RAD';
      btn.classList.add('rad-mode');
    }
  }
}

function calcToggleSD() {
  if (calcResultState.rawNumeric === null) return;
  const display = document.getElementById('calcDisplay');
  const formula = document.getElementById('calcFormula');
  if (!display) return;

  calcResultState.showingExact = !calcResultState.showingExact;

  if (calcResultState.showingExact) {
    display.value = calcResultState.exactForm;
    if (formula && calcResultState.exactForm !== calcResultState.decimalForm) {
      formula.textContent = `${calcResultState.lastFormula} (≈ ${calcResultState.decimalForm})`;
    }
  } else {
    display.value = calcResultState.decimalForm;
    if (formula && calcResultState.exactForm !== calcResultState.decimalForm) {
      formula.textContent = `${calcResultState.lastFormula} [${calcResultState.exactForm}]`;
    }
  }
}

function calcPress(val) {
  const display = document.getElementById('calcDisplay');
  const formula = document.getElementById('calcFormula');
  if (!display) return;

  if (val === 'C') {
    display.value = '0';
    if (formula) formula.textContent = '';
    calcJustEvaluated = false;
    calcResultState.rawNumeric = null;
    return;
  }

  if (val === 'back') {
    if (display.value === 'Error') {
      display.value = '0';
      calcJustEvaluated = false;
      calcResultState.rawNumeric = null;
      return;
    }
    const multiFuncs = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('];
    let removed = false;
    for (const f of multiFuncs) {
      if (display.value.endsWith(f)) {
        display.value = display.value.slice(0, -f.length);
        removed = true;
        break;
      }
    }
    if (!removed) {
      display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0';
    }
    if (display.value === '' || display.value === '-') {
      display.value = '0';
    }
    calcJustEvaluated = false;
    calcResultState.rawNumeric = null;
    return;
  }

  if (val === 'toggleSign') {
    if (display.value === '0' || display.value === 'Error') return;
    if (display.value.startsWith('-(') && display.value.endsWith(')')) {
      display.value = display.value.slice(2, -1);
    } else if (display.value.startsWith('-')) {
      display.value = display.value.slice(1);
    } else if (/^[0-9.]+$/.test(display.value)) {
      display.value = '-' + display.value;
    } else {
      display.value = '-(' + display.value + ')';
    }
    calcJustEvaluated = false;
    calcResultState.rawNumeric = null;
    return;
  }

  if (val === 'inv') {
    if (display.value === '0' || display.value === 'Error') return;
    display.value = '1/(' + display.value + ')';
    calcJustEvaluated = false;
    calcResultState.rawNumeric = null;
    return;
  }

  if (val === '=') {
    calcEvaluate();
    return;
  }

  // After evaluation: if operator pressed, continue calculating; if number/function pressed, start fresh
  if (calcJustEvaluated) {
    if (['+', '-', '*', '/', '^', '%'].includes(val)) {
      calcJustEvaluated = false;
    } else {
      display.value = '0';
      calcJustEvaluated = false;
      calcResultState.rawNumeric = null;
    }
  }

  if (val === '^2') {
    if (display.value !== 'Error') {
      display.value += '^2';
    }
    return;
  }

  if (val === '%') {
    if (display.value !== 'Error') {
      display.value += '/100';
    }
    return;
  }

  if (display.value === '0' || display.value === 'Error') {
    if (['+', '*', '/', '^', '%', ')'].includes(val)) {
      display.value = '0' + val;
    } else if (val === '.') {
      display.value = '0.';
    } else {
      display.value = val;
    }
  } else {
    display.value += val;
  }
}

function calcEvaluate() {
  const display = document.getElementById('calcDisplay');
  const formula = document.getElementById('calcFormula');
  if (!display) return;

  const rawInput = display.value;
  if (!rawInput || rawInput === 'Error') return;

  try {
    let expr = rawInput
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    // Balance unclosed parentheses
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      expr += ')'.repeat(openCount - closeCount);
    }

    // Replace mathematical symbols & constants
    expr = expr.replace(/π/g, '(__PI__)');
    expr = expr.replace(/e/g, '(__E__)');
    expr = expr.replace(/\^/g, '**');

    // Handle square roots: both √(x) and √number or 2√2
    expr = expr.replace(/√\(/g, '__sqrt__(');
    expr = expr.replace(/√([0-9.]+)/g, '__sqrt__($1)');

    // Replace function names
    expr = expr.replace(/\bsin\(/g, '__sin__(');
    expr = expr.replace(/\bcos\(/g, '__cos__(');
    expr = expr.replace(/\btan\(/g, '__tan__(');
    expr = expr.replace(/\bln\(/g, '__ln__(');
    expr = expr.replace(/\blog\(/g, '__log__(');

    // Handle implicit multiplication: e.g. 2( -> 2*(, )2 -> )*2, )( -> )*(, 2√3 -> 2*√3
    expr = expr.replace(/(\d)(\()/g, '$1*$2');
    expr = expr.replace(/(\))(\d)/g, '$1*$2');
    expr = expr.replace(/(\))(\()/g, '$1*$2');
    expr = expr.replace(/(\d)(__PI__|__E__|__sin__|__cos__|__tan__|__log__|__ln__|__sqrt__)/g, '$1*$2');
    expr = expr.replace(/(__PI__|__E__)(\d|\()/g, '$1*$2');

    // Safe execution sandbox
    const degToRad = deg => (deg * Math.PI) / 180;
    const __PI__ = Math.PI;
    const __E__ = Math.E;

    const __sin__ = x => {
      const rad = calcIsDeg ? degToRad(x) : x;
      const res = Math.sin(rad);
      return Math.abs(res) < 1e-14 ? 0 : res;
    };

    const __cos__ = x => {
      const rad = calcIsDeg ? degToRad(x) : x;
      const res = Math.cos(rad);
      return Math.abs(res) < 1e-14 ? 0 : res;
    };

    const __tan__ = x => {
      if (calcIsDeg) {
        const norm = ((x % 180) + 180) % 180;
        if (Math.abs(norm - 90) < 1e-10) throw new Error('Undefined');
      }
      const rad = calcIsDeg ? degToRad(x) : x;
      const res = Math.tan(rad);
      return Math.abs(res) < 1e-14 ? 0 : res;
    };

    const __log__ = x => {
      if (x <= 0) throw new Error('Invalid');
      return Math.log10(x);
    };

    const __ln__ = x => {
      if (x <= 0) throw new Error('Invalid');
      return Math.log(x);
    };

    const __sqrt__ = x => {
      if (x < 0) throw new Error('Invalid');
      return Math.sqrt(x);
    };

    const evalFn = new Function(
      '__PI__', '__E__', '__sin__', '__cos__', '__tan__', '__log__', '__ln__', '__sqrt__',
      `"use strict"; return (${expr});`
    );

    const result = evalFn(__PI__, __E__, __sin__, __cos__, __tan__, __log__, __ln__, __sqrt__);

    if (!Number.isFinite(result)) {
      display.value = 'Error';
      calcResultState.rawNumeric = null;
    } else {
      const exact = formatExactValue(result);
      const decimal = parseFloat(result.toFixed(8)).toString();

      calcResultState.rawNumeric = result;
      calcResultState.exactForm = exact;
      calcResultState.decimalForm = decimal;
      calcResultState.showingExact = true;
      calcResultState.lastFormula = `${rawInput} =`;

      display.value = exact;

      if (formula) {
        if (exact !== decimal) {
          formula.textContent = `${rawInput} = (≈ ${decimal})`;
        } else {
          formula.textContent = `${rawInput} =`;
        }
      }
    }
  } catch (err) {
    display.value = 'Error';
    calcResultState.rawNumeric = null;
  }

  calcJustEvaluated = true;
}

// ==================== Utility ====================
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`คัดลอกเรียบร้อย: ${text}`);
  }).catch(() => {
    prompt('คัดลอกข้อความด้านล่าง:', text);
  });
}

// ==================== Initialization ====================
window.addEventListener('DOMContentLoaded', () => {
  initDemoData();
  setupAntiCheatListeners();

  // Restore teacher session if logged in
  const savedTeacher = sessionStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER);
  if (savedTeacher) {
    try {
      state.currentTeacher = JSON.parse(savedTeacher);
    } catch (e) {}
  }

  // Check URL parameters for direct room join (e.g. ?room=SCI-XXXXXX) or admin link (?admin=1)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const adminParam = urlParams.get('admin');

  if (adminParam === '1' || window.location.hash === '#admin') {
    togglePortal();
  } else if (roomParam) {
    document.getElementById('roomCodeInput').value = roomParam.toUpperCase();
    checkRoomCode(roomParam);
  } else {
    showStudentPortal();
  }
});
