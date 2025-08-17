// utils/normalizeDate.mjs (ESM)
export function normalizeDate(
  input,
  {
    pivot = 50,                        // 00–49 => 2000–2049, 50–99 => 1950–1999
    defaultYear = new Date().getFullYear(),
    preferFuture = false               // true: nếu chỉ D-M và đã qua -> nhảy sang năm kế tiếp
  } = {}
) {
  if (typeof input !== "string") {
    throw new TypeError("Input phải là string.");
  }

  const trimmed = input.trim();

  // Lấy tất cả nhóm số (hỗ trợ 'ngày 1 tháng 2 năm 2025', '1-2', '01/02/25', '1.2.2025', ...)
  const nums = trimmed.match(/\d{1,4}/g);
  if (!nums || nums.length < 2 || nums.length > 3) {
    throw new Error("Định dạng ngày không hợp lệ. Hỗ trợ: D-M, D-M-Y.");
  }

  const toInt = (s) => Number.parseInt(s, 10);

  let day, month, year, yRaw = null;

  if (nums.length === 2) {
    // Chỉ ngày & tháng -> dùng năm mặc định
    [day, month] = nums.map(toInt);
    year = defaultYear;
  } else {
    // Ba phần -> giả định D-M-Y (theo yêu cầu)
    [day, month, year] = nums.map(toInt);
    yRaw = nums[2]; // để biết có phải năm 2 chữ số không
  }

  if (![day, month, year].every(Number.isFinite)) {
    throw new Error("Ngày/tháng/năm phải là số.");
  }

  // Xử lý năm 2 chữ số với pivot
  if (yRaw && yRaw.length === 2) {
    year = year >= pivot ? 1900 + year : 2000 + year;
  }

  // Hàm kiểm tra năm nhuận & số ngày trong tháng
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysInMonth = (y, m) => {
    if (m === 2) return isLeap(y) ? 29 : 28;
    return [4, 6, 9, 11].includes(m) ? 30 : 31;
  };

  // Nếu chỉ có D-M và preferFuture bật: nếu ngày-tháng đã qua thì tăng năm
  if (nums.length === 2 && preferFuture) {
    const now = new Date();
    const todayY = now.getFullYear();
    // đảm bảo 29/02 hợp lệ ở năm default
    if (month === 2 && day === 29 && !isLeap(year)) {
      // tìm năm nhuận gần nhất >= defaultYear
      while (!isLeap(year)) year++;
    }
    let candidate = new Date(year, month - 1, day);
    const today = new Date(todayY, now.getMonth(), now.getDate());
    if (candidate < today) {
      year += 1;
      if (month === 2 && day === 29 && !isLeap(year)) {
        while (!isLeap(year)) year++;
      }
    }
  }

  // Kiểm tra phạm vi
  if (year < 1 || year > 9999) throw new Error("Năm không hợp lệ.");
  if (month < 1 || month > 12) throw new Error("Tháng không hợp lệ.");
  if (day < 1) throw new Error("Ngày không hợp lệ.");

  const dim = daysInMonth(year, month);
  if (day > dim) {
    throw new Error(`Ngày không hợp lệ: tháng ${month} năm ${year} chỉ có ${dim} ngày.`);
  }

  const pad2 = (n) => String(n).padStart(2, "0");
  const yyyy = String(year).padStart(4, "0");
  const mm = pad2(month);
  const dd = pad2(day);

  return `${yyyy}/${mm}/${dd}`;
}

/* ================= Ví dụ =================
normalizeDate("1-2");             // "YYYY/02/01" (YYYY = năm hiện tại)
normalizeDate("1/2", { preferFuture: true }); // nếu 1/2 năm nay đã qua -> sang năm sau
normalizeDate("01/02/25");        // "2025/02/01" (pivot 50)
normalizeDate("31.3.1999");       // "1999/03/31"
normalizeDate("ngày 5 tháng 9");  // "YYYY/09/05" (YYYY = năm hiện tại)
*/
