/**
 * Google Apps Script Backend (Code.gs)
 * สำหรับใช้งานคู่กับ Google Sheets (คลังข้อสอบ, ห้องสอบ, คะแนน)
 * หรือ Deploy เป็น Web App
 */

const SHEET_TEACHERS = 'Teachers';
const SHEET_ROOMS = 'Rooms';
const SHEET_QUESTIONS = 'Questions';
const SHEET_RESULTS = 'Results';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบทำข้อสอบวิทยาศาสตร์')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_TEACHERS) {
      sheet.appendRow(['id', 'fullName', 'username', 'passwordHash', 'createdAt']);
    } else if (name === SHEET_ROOMS) {
      sheet.appendRow(['id', 'code', 'name', 'classroom', 'easy', 'medium', 'hard', 'active', 'createdAt', 'teacherId']);
    } else if (name === SHEET_RESULTS) {
      sheet.appendRow(['id', 'roomId', 'studentName', 'studentClass', 'studentNumber', 'score', 'total', 'percentage', 'submittedAt']);
    }
  }
  return sheet;
}

function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let txtHash = '';
  for (let j = 0; j < rawHash.length; j++) {
    let hashVal = rawHash[j];
    if (hashVal < 0) hashVal += 256;
    let byteString = hashVal.toString(16);
    if (byteString.length == 1) byteString = '0' + byteString;
    txtHash += byteString;
  }
  return txtHash;
}

function registerTeacher(fullName, username, password) {
  const sheet = getOrCreateSheet(SHEET_TEACHERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().toLowerCase() === username.toLowerCase()) {
      throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }
  }
  const id = 't-' + Utilities.getUuid();
  sheet.appendRow([id, fullName, username, hashPassword(password), new Date().toISOString()]);
  return 'สมัครสมาชิกสำเร็จเรียบร้อยแล้ว';
}

function teacherLogin(username, password) {
  const sheet = getOrCreateSheet(SHEET_TEACHERS);
  const data = sheet.getDataRange().getValues();
  const hash = hashPassword(password);
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().toLowerCase() === username.toLowerCase() && data[i][3] === hash) {
      return {
        token: data[i][0],
        fullName: data[i][1],
        username: data[i][2]
      };
    }
  }
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}

function createRoom(teacherToken, name, classroom, easy, medium, hard) {
  const sheet = getOrCreateSheet(SHEET_ROOMS);
  const id = 'r-' + Utilities.getUuid();
  const code = 'SCI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    id: id,
    code: code,
    accessCode: code,
    name: name,
    classroom: classroom,
    easy: Number(easy) || 0,
    medium: Number(medium) || 0,
    hard: Number(hard) || 0
  };
  sheet.appendRow([id, code, name, classroom, room.easy, room.medium, room.hard, true, new Date().toISOString(), teacherToken]);
  return room;
}

function getRooms(teacherToken) {
  const sheet = getOrCreateSheet(SHEET_ROOMS);
  const data = sheet.getDataRange().getValues();
  const rooms = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === teacherToken && data[i][7] === true) {
      rooms.push({
        id: data[i][0],
        code: data[i][1],
        name: data[i][2],
        classroom: data[i][3],
        easy: data[i][4],
        medium: data[i][5],
        hard: data[i][6]
      });
    }
  }
  return rooms;
}

function closeRoom(teacherToken, roomId) {
  const sheet = getOrCreateSheet(SHEET_ROOMS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roomId) {
      sheet.getRange(i + 1, 8).setValue(false);
      return true;
    }
  }
  return false;
}

function validateRoomCode(code) {
  const sheet = getOrCreateSheet(SHEET_ROOMS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toUpperCase() === code.toUpperCase() && data[i][7] === true) {
      return {
        id: data[i][0],
        code: data[i][1],
        name: data[i][2],
        classroom: data[i][3],
        easy: data[i][4],
        medium: data[i][5],
        hard: data[i][6]
      };
    }
  }
  throw new Error('ไม่พบห้องสอบนี้ หรือห้องสอบถูกปิดไปแล้ว');
}

function recordResult(roomId, studentName, studentClass, studentNumber, score, total, percentage) {
  const sheet = getOrCreateSheet(SHEET_RESULTS);
  const id = 'res-' + Utilities.getUuid();
  sheet.appendRow([id, roomId, studentName, studentClass, studentNumber, score, total, percentage, new Date().toISOString()]);
  return { success: true, id: id };
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    let result = null;
    if (action === 'submitScore') {
      result = recordResult(
        postData.roomId,
        postData.studentName,
        postData.studentClass,
        postData.studentNumber,
        postData.score,
        postData.total,
        postData.percentage
      );
    } else if (action === 'validateRoom') {
      result = validateRoomCode(postData.roomCode);
    } else {
      throw new Error('ไม่รู้จักคำสั่ง ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
