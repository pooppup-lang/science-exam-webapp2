/**
 * Application Logic for Science Exam System
 * Works standalone on Vercel & GitHub Pages using localStorage
 */

const STORAGE_KEYS = {
  TEACHERS: 'sci_exam_teachers',
  ROOMS: 'sci_exam_rooms',
  RESULTS: 'sci_exam_results',
  CURRENT_TEACHER: 'sci_exam_current_teacher'
};

const letters = ['A', 'B', 'C', 'D'];

// Application State
const state = {
  currentTeacher: null,
  currentRoom: null,
  currentStudent: null,
  currentExamQuestions: [],
  selectedRoomForResults: null
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

// Seed initial demo data if empty
function initDemoData() {
  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  if (teachers.length === 0) {
    teachers.push({
      id: 't-demo',
      fullName: 'ครูวิทยาศาสตร์ (Demo)',
      username: 'teacher',
      password: 'password123'
    });
    setStorage(STORAGE_KEYS.TEACHERS, teachers);
  }

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  if (rooms.length === 0) {
    rooms.push({
      id: 'room-demo-1',
      code: 'SCI-DEMO1',
      name: 'ทดสอบความรู้วิทยาศาสตร์พื้นฐาน (ตัวอย่าง)',
      classroom: 'ม.2/1',
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

// ==================== View Routing ====================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Clear errors on navigation
  document.querySelectorAll('.error').forEach(err => {
    err.textContent = '';
    err.classList.remove('active');
  });
}

function showError(elemId, msg) {
  const el = document.getElementById(elemId);
  if (el) {
    el.textContent = msg;
    el.classList.add('active');
  }
}

// ==================== Teacher Auth ====================
function registerTeacher() {
  const name = document.getElementById('registerName').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (!name || !username || !password) {
    showError('registerTeacherError', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
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

  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  if (teachers.some(t => t.username.toLowerCase() === username.toLowerCase())) {
    showError('registerTeacherError', 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น');
    return;
  }

  const newTeacher = {
    id: 't-' + Date.now(),
    fullName: name,
    username: username,
    password: password
  };

  teachers.push(newTeacher);
  setStorage(STORAGE_KEYS.TEACHERS, teachers);

  alert('สมัครบัญชีครูสำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านของคุณ');
  document.getElementById('teacherUsername').value = username;
  document.getElementById('teacherPassword').value = '';
  showView('teacherLoginView');
}

function teacherLogin() {
  const username = document.getElementById('teacherUsername').value.trim();
  const password = document.getElementById('teacherPassword').value;

  const teachers = getStorage(STORAGE_KEYS.TEACHERS, []);
  const teacher = teachers.find(
    t => t.username.toLowerCase() === username.toLowerCase() && t.password === password
  );

  if (!teacher) {
    showError('teacherLoginError', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return;
  }

  state.currentTeacher = teacher;
  sessionStorage.setItem(STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(teacher));

  document.getElementById('teacherInfo').textContent = `ครู: ${teacher.fullName}`;
  showView('teacherDashboardView');
  loadTeacherRooms();
}

function teacherLogout() {
  state.currentTeacher = null;
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TEACHER);
  showView('homeView');
}

// ==================== Teacher Dashboard ====================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SCI-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom() {
  const name = document.getElementById('newRoomName').value.trim();
  const classroom = document.getElementById('newRoomClass').value.trim();
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

  const easyPoolCount = (typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK.filter(q => q.difficulty === 'easy').length : 14);
  const mediumPoolCount = (typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK.filter(q => q.difficulty === 'medium').length : 14);
  const hardPoolCount = (typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK.filter(q => q.difficulty === 'hard').length : 14);

  if (easy > easyPoolCount || medium > mediumPoolCount || hard > hardPoolCount) {
    showError('teacherError', `จำนวนข้อเกินคลังข้อสอบที่มี (ง่ายมี ${easyPoolCount}, ปานกลางมี ${mediumPoolCount}, ยากมี ${hardPoolCount} ข้อ)`);
    return;
  }

  const roomCode = generateRoomCode();
  const newRoom = {
    id: 'room-' + Date.now(),
    code: roomCode,
    name: name,
    classroom: classroom,
    easy: easy,
    medium: medium,
    hard: hard,
    createdAt: new Date().toISOString(),
    active: true,
    teacherId: state.currentTeacher ? state.currentTeacher.id : 'unknown'
  };

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  rooms.unshift(newRoom);
  setStorage(STORAGE_KEYS.ROOMS, rooms);

  // Display Room Code Banner
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  document.getElementById('newRoomCode').innerHTML = `
    <div class="room-code-banner">
      <p style="font-weight: 600; color: #1e3a8a;">🎉 สร้างห้องสอบสำเร็จ!</p>
      <div class="room-code-val">${roomCode}</div>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">ส่งรหัสนี้ให้นักเรียนเข้าทำข้อสอบ หรือคัดลอกลิงก์ตรงด้านล่าง</p>
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button class="small" onclick="copyText('${roomCode}')">📋 คัดลอกรหัส</button>
        <button class="small outline" onclick="copyText('${shareUrl}')">🔗 คัดลอกลิงก์สอบ</button>
      </div>
    </div>
  `;

  // Reset form
  document.getElementById('newRoomName').value = '';
  document.getElementById('newRoomClass').value = '';

  loadTeacherRooms();
}

function loadTeacherRooms() {
  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const teacherRooms = state.currentTeacher
    ? rooms.filter(r => r.teacherId === state.currentTeacher.id || r.teacherId === 't-demo')
    : rooms;

  if (teacherRooms.length === 0) {
    document.getElementById('roomList').innerHTML =
      '<p style="padding: 16px; color: var(--text-muted); text-align: center;">ยังไม่มีห้องสอบที่สร้าง</p>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>ชื่อห้องสอบ</th>
          <th>ชั้นเรียน</th>
          <th>จำนวนข้อ</th>
          <th>รหัสห้อง</th>
          <th>สถานะ</th>
          <th>การจัดการ</th>
        </tr>
      </thead>
      <tbody>
  `;

  teacherRooms.forEach(room => {
    const totalQ = room.easy + room.medium + room.hard;
    html += `
      <tr>
        <td><strong>${escapeHtml(room.name)}</strong></td>
        <td>${escapeHtml(room.classroom)}</td>
        <td>
          <span style="font-size: 12px;">รวม ${totalQ} ข้อ (ง่าย ${room.easy} | กลาง ${room.medium} | ยาก ${room.hard})</span>
        </td>
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
            ${
              room.active
                ? `<button class="small danger" onclick="closeRoom('${room.id}')">ปิดห้อง</button>`
                : ''
            }
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
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    room.active = false;
    setStorage(STORAGE_KEYS.ROOMS, rooms);
    loadTeacherRooms();
  }
}

function showRoomResults(roomId) {
  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const room = rooms.find(r => r.id === roomId);
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

  // Scroll to results
  document.getElementById('roomResultsSection').scrollIntoView({ behavior: 'smooth' });
}

function exportResultsToCSV() {
  if (!state.selectedRoomForResults) return;
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

// ==================== Student Portal ====================
function checkRoomCode(customCode = null) {
  const code = (customCode || document.getElementById('roomCodeInput').value).trim().toUpperCase();
  if (!code) {
    showError('studentCodeError', 'กรุณากรอกรหัสห้องสอบ');
    return;
  }

  const rooms = getStorage(STORAGE_KEYS.ROOMS, []);
  const room = rooms.find(r => r.code === code);

  if (!room) {
    showError('studentCodeError', 'ไม่พบห้องสอบนี้ กรุณาตรวจสอบรหัสอีกครั้ง');
    return;
  }

  if (!room.active) {
    showError('studentCodeError', 'ห้องสอบนี้ถูกปิดแล้ว ไม่สามารถเข้าทำได้');
    return;
  }

  state.currentRoom = room;

  const total = room.easy + room.medium + room.hard;
  document.getElementById('roomSummary').innerHTML = `
    <div style="font-size: 14px; color: #1e40af; font-weight: 500;">ห้องสอบ</div>
    <div style="font-size: 20px; font-weight: 700; color: #1d4ed8; margin: 4px 0;">${escapeHtml(room.name)}</div>
    <p style="font-size: 14px; color: var(--text-muted); margin: 0;">
      ชั้น: ${escapeHtml(room.classroom)} | ข้อสอบทั้งหมด <strong>${total} ข้อ</strong>
      (ง่าย ${room.easy}, ปานกลาง ${room.medium}, ยาก ${room.hard})
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

  document.getElementById('studentInfo').textContent = `${name} (${classroom} เลขที่ ${number}) | ${state.currentRoom.name}`;

  // Generate random exam
  state.currentExamQuestions = getRandomQuestions(
    state.currentRoom.easy,
    state.currentRoom.medium,
    state.currentRoom.hard
  );

  renderExam();
  showView('studentExamView');
}

function renderExam() {
  let html = '';
  state.currentExamQuestions.forEach((q, index) => {
    const diffBadge =
      q.difficulty === 'easy'
        ? '<span class="q-difficulty q-diff-easy">ระดับง่าย</span>'
        : q.difficulty === 'medium'
        ? '<span class="q-difficulty q-diff-medium">ระดับปานกลาง</span>'
        : '<span class="q-difficulty q-diff-hard">ระดับยาก</span>';

    html += `
      <div class="question-item" id="q-card-${index}">
        <div class="q-header">
          <span style="font-size: 13px; font-weight: 600; color: var(--primary);">ข้อที่ ${index + 1} (${q.category})</span>
          ${diffBadge}
        </div>
        <div class="q-title">${escapeHtml(q.question)}</div>
        <div class="choices-list">
    `;

    q.choices.forEach((choice, cIdx) => {
      const letter = letters[cIdx];
      html += `
        <label class="choice-label" id="choice-${index}-${letter}">
          <input type="radio" name="ans-${index}" value="${letter}" onchange="selectChoice(${index}, '${letter}')">
          <span><strong>${letter}.</strong> ${escapeHtml(choice)}</span>
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

function selectChoice(qIndex, letter) {
  letters.forEach(l => {
    const label = document.getElementById(`choice-${qIndex}-${l}`);
    if (label) label.classList.remove('selected');
  });
  const selectedLabel = document.getElementById(`choice-${qIndex}-${letter}`);
  if (selectedLabel) selectedLabel.classList.add('selected');
}

function submitExam() {
  const userAnswers = [];
  let unanswered = false;

  state.currentExamQuestions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="ans-${idx}"]:checked`);
    if (!selected) {
      unanswered = true;
    } else {
      userAnswers.push({
        questionIndex: idx,
        selected: selected.value
      });
    }
  });

  if (unanswered) {
    showError('studentError', 'กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบ');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!confirm('ยืนยันที่จะส่งข้อสอบและตรวจคะแนน?')) return;

  // Calculate score
  let correctCount = 0;
  const reviewData = [];

  state.currentExamQuestions.forEach((q, idx) => {
    const userChoice = userAnswers[idx].selected;
    const isCorrect = userChoice === q.correctAnswer;
    if (isCorrect) correctCount++;

    reviewData.push({
      question: q,
      userChoice: userChoice,
      isCorrect: isCorrect
    });
  });

  const total = state.currentExamQuestions.length;
  const percentage = Math.round((correctCount / total) * 100);

  // Save result to storage
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

  // Show score & review
  displayResults(resultRecord, reviewData);
  showView('studentResultView');
}

function displayResults(result, reviewData) {
  document.getElementById('scoreDisplayCircle').textContent = `${result.score} / ${result.total}`;
  document.getElementById('scoreDisplayPct').textContent = `${result.percentage}% (${
    result.percentage >= 50 ? 'ผ่านเกณฑ์ ✅' : 'ไม่ผ่านเกณฑ์ ⚠️'
  })`;
  document.getElementById('scoreStudentDetails').textContent =
    `ผู้สอบ: ${result.studentName} (${result.studentClass} เลขที่ ${result.studentNumber}) | ห้องสอบ: ${state.currentRoom.name}`;

  let html = '';
  reviewData.forEach((item, idx) => {
    const q = item.question;
    const cardClass = item.isCorrect ? 'correct' : 'incorrect';

    html += `
      <div class="question-item ${cardClass}">
        <div class="q-header">
          <span style="font-weight: 600;">ข้อที่ ${idx + 1} (${q.category})</span>
          <span>${item.isCorrect ? '✅ ถูกต้อง (+1)' : '❌ ไม่ถูกต้อง (0)'}</span>
        </div>
        <div class="q-title">${escapeHtml(q.question)}</div>
        <div class="choices-list">
    `;

    q.choices.forEach((choice, cIdx) => {
      const letter = letters[cIdx];
      let choiceStyle = '';
      let badgeText = '';

      if (letter === q.correctAnswer) {
        choiceStyle = 'correct-answer';
        badgeText = ' (คำตอบที่ถูกต้อง)';
      } else if (letter === item.userChoice && !item.isCorrect) {
        choiceStyle = 'user-wrong';
        badgeText = ' (คำตอบของคุณ)';
      }

      html += `
        <div class="choice-label ${choiceStyle}">
          <span><strong>${letter}.</strong> ${escapeHtml(choice)}${badgeText}</span>
        </div>
      `;
    });

    html += `
        </div>
        <div class="explanation-box">
          💡 <strong>คำอธิบาย:</strong> ${escapeHtml(q.explanation)}
        </div>
      </div>
    `;
  });

  document.getElementById('resultAnswersReview').innerHTML = html;
}

function exitExam() {
  if (confirm('คุณต้องการออกจากห้องสอบใช่หรือไม่? คำตอบที่ทำไว้จะไม่ถูกบันทึก')) {
    showView('homeView');
  }
}

// ==================== Calculator Logic ====================
function toggleCalculator() {
  const calc = document.getElementById('calculatorBox');
  calc.classList.toggle('active');
}

function calcPress(val) {
  const display = document.getElementById('calcDisplay');

  if (val === 'C') {
    display.value = '0';
    return;
  }

  if (val === 'back') {
    display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0';
    return;
  }

  if (val === '=') {
    try {
      // Safe arithmetic parsing
      const sanitized = display.value.replace(/×/g, '*').replace(/÷/g, '/');
      if (!/^[0-9+\-*\/().\s]+$/.test(sanitized)) throw new Error();

      const res = Function(`"use strict"; return (${sanitized})`)();
      if (!Number.isFinite(res)) throw new Error();
      display.value = Number(res.toFixed(6)).toString();
    } catch (e) {
      display.value = 'Error';
    }
    return;
  }

  if (display.value === '0' || display.value === 'Error') {
    display.value = val;
  } else {
    display.value += val;
  }
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

// ==================== Init on Load ====================
window.addEventListener('DOMContentLoaded', () => {
  initDemoData();

  // Check URL parameters for direct room join (e.g. ?room=SCI-XXXXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    document.getElementById('roomCodeInput').value = roomParam.toUpperCase();
    checkRoomCode(roomParam);
  }

  // Restore teacher session if logged in
  const savedTeacher = sessionStorage.getItem(STORAGE_KEYS.CURRENT_TEACHER);
  if (savedTeacher) {
    state.currentTeacher = JSON.parse(savedTeacher);
  }
});
