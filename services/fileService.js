// services/fileService.js
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

// ✅ Import đủ 3 thứ bạn có ở utils/fileExtension.js
import { extAliasMap, knownExtensions, getFileExtension } from '../utils/fileExtension.js';

const CACHE_DIR    = './cache';
const FOLDERS_FILE = path.join(CACHE_DIR, 'folders.json');
const RESULT_FILE  = path.join(CACHE_DIR, 'result.json');

// =========================== PHẦN XỬ LÝ BỘ NHỚ CACHE ===========================
export async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return { byId: {} };
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

async function saveResult(results) {
  await writeJSON(RESULT_FILE, results);
}

// =========================== PHẦN HELPER CHUNG ===========================

// Regex bỏ dấu: ưu tiên \p{M}, fallback nếu runtime không hỗ trợ
let DIACRITICS_RE;
try {
  DIACRITICS_RE = new RegExp('\\p{M}+', 'gu');
} catch {
  DIACRITICS_RE = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff]+/g;
}
const ZERO_WIDTH_RE  = /[\u200B-\u200D\uFEFF]/g;
const SEPARATORS_RE  = /[_\s\-.–—·/\\|,;:(){}\[\]]+/g;

function removeDiacritics(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/đ/gi, 'd')
    .replace(DIACRITICS_RE, '');
}

function normalizeBase(str = '') {
  return removeDiacritics(str)
    .replace(ZERO_WIDTH_RE, '')
    .toLowerCase();
}

function normalizeLoose(str = '') {
  return normalizeBase(str)
    .replace(SEPARATORS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCompact(str = '') {
  return normalizeLoose(str).replace(/\s+/g, '');
}

function tokenize(str = '') {
  return normalizeLoose(str).split(' ').filter(Boolean);
}

export function makeMatcher(query) {
  const qLoose   = normalizeLoose(query);
  const qCompact = toCompact(query);
  const qTokens  = tokenize(query);

  return (s) => {
    const tLoose = normalizeLoose(s);
    if (!tLoose) return false;
    if (tLoose.includes(qLoose)) return true;
    if (toCompact(s).includes(qCompact)) return true;
    return qTokens.every(tok => tLoose.includes(tok));
  };
}

function isFile(item) {
  return item.type.toLowerCase() === 'file';
}

// ================== HELPER CHO findByType (fuzzy + alias) ==================

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // thay thế
          matrix[i][j - 1] + 1,     // chèn
          matrix[i - 1][j] + 1      // xóa
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

const extendedAliasMap = {
  ...extAliasMap,
  photo: extAliasMap['ảnh'],
  photos: extAliasMap['ảnh'],
  picture: extAliasMap['ảnh'],
  pictures: extAliasMap['ảnh'],
  image: extAliasMap['ảnh'],
  images: extAliasMap['ảnh'],

  video: extAliasMap['video'],
  videos: extAliasMap['video'],
  clip: extAliasMap['video'],
  movie: extAliasMap['video'],
  movies: extAliasMap['video'],

  audio: extAliasMap['âm thanh'],
  sound: extAliasMap['âm thanh'],
  music: extAliasMap['âm thanh'],
  song: extAliasMap['âm thanh'],

  document: [...(extAliasMap['word'] || []), ...(extAliasMap['pdf'] || [])],
  documents: [...(extAliasMap['word'] || []), ...(extAliasMap['pdf'] || [])],
  spreadsheet: extAliasMap['excel'],
  presentation: extAliasMap['powerpoint'],

  compress: extAliasMap['nén'],
  archive: extAliasMap['nén'],
  lib: extAliasMap['thư viện'],
  library: extAliasMap['thư viện'],
  program: extAliasMap['chương trình'],
  app: extAliasMap['chương trình']
};

// ✅ sửa dùng đúng removeDiacritics
function normalizeString(str = '') {
  return removeDiacritics(str.trim().toLowerCase());
}

function fuzzyFind(key, list) {
  let bestMatch = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const distance = levenshtein(key, item);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = item;
    }
  }
  return bestDistance <= 2 ? bestMatch : null;
}

/* ============================== CÁC HÀM CHO BOT TELE =========================== */
// =========================== HÀM TÌM KIẾM THEO THỜI GIAN ===========================
export async function findByTime(searchTime) {
  const cache = await readJSON(FOLDERS_FILE);;
  const files = Object.entries(cache.byId || {})
  .filter(([id, item]) => isFile(item))
  .map(([id, item]) => ({ id, ...item }));

  const now   = dayjs();
  const qRaw  = (searchTime ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  const q     = normalizeLoose(qRaw); // KHÔNG DẤU để regex ổn định
  // --- Helpers ---
  const unitViToEn = (u) => {
    const x = normalizeLoose(u);
    if (x === 'ngay')  return 'day';
    if (x === 'tuan')  return 'week';
    if (x === 'thang') return 'month';
    if (x === 'nam')   return 'year';
    return null;
  };

  const vnNumber = (s) => {
    const map = { 'mot':1,'hai':2,'ba':3,'bon':4,'tu':4,'nam':5,'sau':6,'bay':7,'tam':8,'chin':9,'muoi':10 };
    if (!s) return NaN;
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return n;
    return map[normalizeLoose(s)] ?? NaN;
  };

  const parseDateFlexible = (s) => {
    if (!s) return null;
    const cand = [
      'DD/MM/YYYY','D/M/YYYY','DD-MM-YYYY','D-M-YYYY',
      'YYYY-MM-DD','YYYY/M/D','YYYY/M/DD','YYYY/MM/DD',
      'DD/MM/YY','D/M/YY','DD-MM-YY','D-M-YY'
    ];
    for (const f of cand) {
      const d = dayjs(s, f, true);
      if (d.isValid()) return d;
    }
    return null;
  };

  const parseMonthYearFlexible = (s) => {
    const low = normalizeLoose(s);
    let m = low.match(/thang\s*(\d{1,2})(?:\s*nam\s*)?(\d{4})/);
    if (!m) m = low.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const month = parseInt(m[1],10);
      const year  = parseInt(m[2],10);
      if (month >= 1 && month <= 12) {
        return dayjs(`${year}-${String(month).padStart(2,'0')}-01`, 'YYYY-MM-DD', true);
      }
    }
    return null;
  };

  const getQuarterRange = (qStr, yStr) => {
    const s = normalizeLoose(qStr); // vd: "q1", "quy 3", "quy iii"
    let qNum = null;

    const mNum = s.match(/^(?:q|quy)\s*(\d)$/);
    if (mNum) qNum = parseInt(mNum[1],10);

    if (!qNum) {
      const mRom = s.match(/^(?:quy\s*)?(i{1,3}|iv)$/); // i, ii, iii, iv
      if (mRom) qNum = ({ i:1, ii:2, iii:3, iv:4 })[mRom[1]];
    }
    if (!qNum || qNum < 1 || qNum > 4) return null;

    const year = yStr ? parseInt(yStr,10) : now.year();
    const startMonth = (qNum - 1) * 3 + 1;
    const start = dayjs(`${year}-${String(startMonth).padStart(2,'0')}-01`, 'YYYY-MM-DD', true).startOf('month');
    const end   = start.add(3, 'month').subtract(1, 'millisecond');
    return { start, end };
  };

  const filterRange = (start, end) => {
    const s = start ? dayjs(start) : null;
    const e = end   ? dayjs(end)   : null;
    const results = files.filter(f => {
      const t = dayjs(f.modifiedTime);
      if (s && t.isBefore(s)) return false;
      if (e && t.isAfter(e))  return false;
      return true;
    });
    return results;
  };

  function resolveSingleAnchor(fragment, nowRef) {
    const s = normalizeLoose(fragment);

    if (s.includes('hom nay')) return { start: nowRef.startOf('day'), end: nowRef.endOf('day'), point: nowRef };
    if (s.includes('hom qua')) { const d = nowRef.subtract(1,'day'); return { start: d.startOf('day'), end: d.endOf('day'), point: d }; }
    if (s.includes('hom kia')) { const d = nowRef.subtract(2,'day'); return { start: d.startOf('day'), end: d.endOf('day'), point: d }; }

    if (s.includes('tuan nay')) return { start: nowRef.startOf('week'), end: nowRef.endOf('week'), point: nowRef };
    if (s.includes('tuan truoc')) { const d = nowRef.subtract(1,'week'); return { start: d.startOf('week'), end: d.endOf('week'), point: d }; }

    if (s.includes('thang nay')) return { start: nowRef.startOf('month'), end: nowRef.endOf('month'), point: nowRef };
    if (s.includes('thang truoc')) { const d = nowRef.subtract(1,'month'); return { start: d.startOf('month'), end: d.endOf('month'), point: d }; }

    if (s.includes('nam nay')) return { start: nowRef.startOf('year'), end: nowRef.endOf('year'), point: nowRef };
    if (s.includes('nam truoc')) { const d = nowRef.subtract(1,'year'); return { start: d.startOf('year'), end: d.endOf('year'), point: d }; }

    let mm = s.match(/(\d+|\w+)\s*(ngay|tuan|thang|nam)\s*(?:gan day|qua|gan nhat)/);
    if (mm) {
      const n = vnNumber(mm[1]); const unit = unitViToEn(mm[2]);
      if (!Number.isNaN(n) && unit) {
        const start = nowRef.subtract(n, unit).startOf(unit);
        return { start, end: nowRef, point: nowRef };
      }
    }

    mm = s.match(/(\d+|\w+)\s*(ngay|tuan|thang|nam)\s*truoc/);
    if (mm) {
      const n = vnNumber(mm[1]); const unit = unitViToEn(mm[2]);
      if (!Number.isNaN(n) && unit) {
        const d = nowRef.subtract(n, unit);
        return { start: d.startOf(unit), end: d.endOf(unit), point: d };
      }
    }

    mm = s.match(/(\d+)\s*(?:gio|h)\b/);
    if (mm) { const hours = parseInt(mm[1],10); return { start: nowRef.subtract(hours,'hour'), end: nowRef, point: nowRef }; }
    mm = s.match(/(\d+)\s*(?:phut|p)\b/);
    if (mm) { const mins  = parseInt(mm[1],10); return { start: nowRef.subtract(mins,'minute'), end: nowRef, point: nowRef }; }

    const dMY2 = parseMonthYearFlexible(s);
    if (dMY2) return { start: dMY2.startOf('month'), end: dMY2.endOf('month'), point: dMY2 };

    const dD2 = parseDateFlexible(s);
    if (dD2) return { start: dD2.startOf('day'), end: dD2.endOf('day'), point: dD2 };

    const qm = s.match(/\b(q\d|quy\s*(?:i{1,3}|iv|\d))\s*(\d{4})?\b/);
    if (qm) { const rng = getQuarterRange(qm[1], qm[2]); if (rng) return rng; }

    const y = s.match(/(?:nam\s*)?(\d{4})$/);
    if (y) { const year = parseInt(y[1],10); const start = dayjs(`${year}-01-01`, 'YYYY-MM-DD', true).startOf('year'); return { start, end: start.endOf('year'), point: start }; }

    return null;
  }
  // --- End helpers ---

  // 1) "mới nhất" / "top N mới nhất" (match trên q đã normalize)
  let m = q.match(/(?:top\s*)?(\d+|\w+)?\s*(?:file\s*)?moi\s*(?:cap\s*nhat\s*)?nhat/);
  if (m) {
    let take = 1;
    if (m[1]) { const n = vnNumber(m[1]); if (!Number.isNaN(n) && n > 0) take = n; }
    const sorted = [...files].sort((a,b)=> dayjs(b.modifiedTime).valueOf() - dayjs(a.modifiedTime).valueOf());
    const results = sorted.slice(0, take);
    if (results.length) await saveResult(results);
    return results;
  }

  // 2) "từ ... đến ..."
  m = q.match(/tu\s+(.+?)\s+(?:den|toi|->|—|-)\s+(.+)/);
  if (m) {
    const leftRange  = resolveSingleAnchor(m[1], now);
    const rightRange = resolveSingleAnchor(m[2], now);
    const start = (leftRange?.start ?? leftRange?.point ?? now);
    const end   = (rightRange?.end  ?? rightRange?.point  ?? now);
    const results = filterRange(start, end);
    if (results.length) await saveResult(results);
    return results;
  }

  // 3) "trước ngày X" / "sau ngày Y"
  m = q.match(/truoc\s+ngay\s+(.+)/);
  if (m) {
    const d = parseDateFlexible(m[1]);
    const end = d ? d.startOf('day').subtract(1,'millisecond') : now;
    const results = filterRange(null, end);
    if (results.length) await saveResult(results);
    return results;
  }
  m = q.match(/sau\s+ngay\s+(.+)/);
  if (m) {
    const d = parseDateFlexible(m[1]);
    const start = d ? d.endOf('day').add(1,'millisecond') : now.startOf('day');
    const results = filterRange(start, null);
    if (results.length) await saveResult(results);
    return results;
  }

  // 4) "24h qua", "45 phút qua"
  m = q.match(/(\d+)\s*(?:gio|h)\s*(?:qua|gan day|gan nhat)?/);
  if (m) { const hours = parseInt(m[1],10); const start = now.subtract(hours, 'hour'); const results = filterRange(start, now); if (results.length) await saveResult(results); return results; }
  m = q.match(/(\d+)\s*(?:phut|p)\s*(?:qua|gan day|gan nhat)?/);
  if (m) { const mins  = parseInt(m[1],10); const start = now.subtract(mins , 'minute'); const results = filterRange(start, now); if (results.length) await saveResult(results); return results; }

  // 5) "x ngày/tuần/tháng/năm gần đây/qua/gần nhất"
  m = q.match(/(\d+|\w+)\s*(ngay|tuan|thang|nam)\s*(?:gan day|gan nhat|qua)/);
  if (m) {
    const n = vnNumber(m[1]); const unit = unitViToEn(m[2]);
    if (!Number.isNaN(n) && unit) {
      const start = now.subtract(n, unit).startOf(unit);
      const results = filterRange(start, now);
      if (results.length) await saveResult(results);
      return results;
    }
  }

  // 6) "x ngày/tuần/tháng/năm trước" (đúng mốc đó)
  m = q.match(/(\d+|\w+)\s*(ngay|tuan|thang|nam)\s*truoc/);
  if (m) {
    const n = vnNumber(m[1]); const unit = unitViToEn(m[2]);
    if (!Number.isNaN(n) && unit) {
      const point = now.subtract(n, unit);
      const start = point.startOf(unit);
      const end   = point.endOf(unit);
      const results = filterRange(start, end);
      if (results.length) await saveResult(results);
      return results;
    }
  }

  // 7) Từ khóa cố định
  if (q.includes('hom nay'))  { const results = filterRange(now.startOf('day'),   now.endOf('day'));   if (results.length) await saveResult(results); return results; }
  if (q.includes('hom qua'))  { const d = now.subtract(1,'day'); const results = filterRange(d.startOf('day'), d.endOf('day')); if (results.length) await saveResult(results); return results; }
  if (q.includes('hom kia'))  { const d = now.subtract(2,'day'); const results = filterRange(d.startOf('day'), d.endOf('day')); if (results.length) await saveResult(results); return results; }

  if (q.includes('tuan nay')) { const results = filterRange(now.startOf('week'),  now.endOf('week'));  if (results.length) await saveResult(results); return results; }
  m = q.match(/(\d+|\w+)\s*tuan\s*truoc/);
  if (m) {
    const n = vnNumber(m[1]); const d = now.subtract(n,'week');
    const results = filterRange(d.startOf('week'), d.endOf('week')); if (results.length) await saveResult(results);
    return results;
  }
  if (q.includes('tuan truoc')) {
    const d = now.subtract(1,'week');
    const results = filterRange(d.startOf('week'), d.endOf('week')); if (results.length) await saveResult(results);
    return results;
  }

  if (q.includes('thang nay')) { const results = filterRange(now.startOf('month'), now.endOf('month')); if (results.length) await saveResult(results); return results; }
  m = q.match(/(\d+|\w+)\s*thang\s*truoc/);
  if (m) {
    const n = vnNumber(m[1]); const d = now.subtract(n,'month');
    const results = filterRange(d.startOf('month'), d.endOf('month')); if (results.length) await saveResult(results);
    return results;
  }
  if (q.includes('thang truoc')) {
    const d = now.subtract(1,'month');
    const results = filterRange(d.startOf('month'), d.endOf('month')); if (results.length) await saveResult(results);
    return results;
  }

  if (q.includes('nam nay')) { const results = filterRange(now.startOf('year'),  now.endOf('year'));  if (results.length) await saveResult(results); return results; }
  m = q.match(/(\d+|\w+)\s*nam\s*truoc/);
  if (m) {
    const n = vnNumber(m[1]); const d = now.subtract(n,'year');
    const results = filterRange(d.startOf('year'), d.endOf('year')); if (results.length) await saveResult(results);
    return results;
  }
  if (q.includes('nam truoc')) {
    const d = now.subtract(1,'year');
    const results = filterRange(d.startOf('year'), d.endOf('year')); if (results.length) await saveResult(results);
    return results;
  }

  // 8) Tháng/năm cụ thể, ngày cụ thể, quý, năm
  let dMY = parseMonthYearFlexible(q);
  if (dMY) { const results = filterRange(dMY.startOf('month'), dMY.endOf('month')); if (results.length) await saveResult(results); return results; }

  let dD = parseDateFlexible(q.replace(/^ngay\s+/, ''));
  if (dD) { const results = filterRange(dD.startOf('day'), dD.endOf('day')); if (results.length) await saveResult(results); return results; }

  m = q.match(/\b(q\d|quy\s*(?:i{1,3}|iv|\d))\s*(\d{4})?\b/);
  if (m) {
    const rng = getQuarterRange(m[1], m[2]);
    if (rng) { const results = filterRange(rng.start, rng.end); if (results.length) await saveResult(results); return results; }
  }

  m = q.match(/(?:nam\s*)?(\d{4})$/);
  if (m) {
    const year = parseInt(m[1],10);
    if (year >= 1970 && year <= 9999) {
      const start = dayjs(`${year}-01-01`, 'YYYY-MM-DD', true).startOf('year');
      const end   = start.endOf('year');
      const results = filterRange(start, end); if (results.length) await saveResult(results);
      return results;
    }
  }

  // 9) "gần đây" mặc định 7 ngày
  if (/\bgan day\b|\bgan nhat\b|\bvua qua\b/.test(q)) {
    const start = now.subtract(7, 'day').startOf('day');
    const results = filterRange(start, now);
    if (results.length) await saveResult(results);
        return results;
  }

  // 10) Không match
  return [];
}

// =========================== TÌM THEO TỪ KHÓA / MÔ TẢ / THƯ MỤC CHA ===========================
export async function findByKeyword(keyword) {
  const cache = await readJSON(FOLDERS_FILE);
  const files = Object.entries(cache.byId || {})
    .filter(([id, item]) => isFile(item))
    .map(([id, item]) => ({ id, ...item }));

  const match = makeMatcher(keyword);
  const results = files.filter(item => match(item.name));
  if (results.length) await saveResult(results);
  return results; // mảng các object có {id, name, path, ...}
}

export async function findByDescription(description) {
  const cache = await readJSON(FOLDERS_FILE);;
  const files = Object.entries(cache.byId || {})
  .filter(([id, item]) => isFile(item))
  .map(([id, item]) => ({ id, ...item }));

  const match = makeMatcher(description);
  const results = files.filter(item =>
    match(item.path) || match(item.name)
  );
  if (results.length) await saveResult(results);
  return results;
}

export async function findByParentName(parentName, userId) {
  const cache = await readJSON(FOLDERS_FILE);
  const byId = cache.byId || {};
  const match = makeMatcher(parentName);
  const results = Object.entries(byId)
    .filter(([, item]) => isFile(item))
    .filter(([, item]) => {
      const parent = byId[item.parentId];
      return parent?.name && match(parent.name); // vẫn lọc được khi mất cha
    })
    .map(([id, item]) => ({ id, ...item })); // ⬅️ id lấy từ key

  if (results.length) await saveResult(results);
  return results;
}

// =========================== TÌM THEO LOẠI FILE (ĐUÔI) ===========================
export async function findByType(type) {
  const cache = await readJSON(FOLDERS_FILE);
  const files = Object.entries(cache.byId || {})
  .filter(([id, item]) => isFile(item))
  .map(([id, item]) => ({ id, ...item }));
  if (!files.length) return [];

  const normalizedType = normalizeString(type);
  let extensions = extendedAliasMap[normalizedType]; // 1) alias mở rộng
  if (!extensions) { // 2) fuzzy key trong alias map
    const fuzzyKey = fuzzyFind(normalizedType, Object.keys(extendedAliasMap));
    if (fuzzyKey) extensions = extendedAliasMap[fuzzyKey];
  }

  if (!extensions) { // 3) nhập trực tiếp đuôi (pdf/xlsx/...)
    if (knownExtensions.includes(normalizedType)) {
      extensions = [normalizedType];
    } else {
      const fuzzyExt = fuzzyFind(normalizedType, knownExtensions);
      if (fuzzyExt) extensions = [fuzzyExt];
    }
  }
  
  if (!extensions && normalizedType.startsWith('.')) { // 4) kiểu ".pdf"
    const ext = normalizedType.slice(1);
    if (knownExtensions.includes(ext)) {
      extensions = [ext];
    } else {
      const fuzzyExt = fuzzyFind(ext, knownExtensions);
      if (fuzzyExt) extensions = [fuzzyExt];
    }
  }

  if (!extensions) { // 5) nếu vẫn không có → rỗng
    return [];
  }
  
  const results = files.filter(item => {  // 6) lọc file theo extensions
    const ext = getFileExtension(item.name || '');
    return extensions.includes(ext);
  });

  if (results.length) await saveResult(results);
  return results;
}

// =========================== API CHO WEB ADMIN ===========================
// ========================== NẰM TRONG CONTROLLER =========================