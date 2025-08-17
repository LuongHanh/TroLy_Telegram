// utils/fileExtension.js

// ====================== Danh sách định dạng phổ biến (mở rộng) ======================
export const knownExtensions = [
  // Văn phòng / Tài liệu
  'pdf', 'doc', 'docx', 'docm', 'dotx', 'dotm',
  'xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm',
  'ppt', 'pptx', 'pptm', 'potx', 'potm',
  'txt', 'rtf', 'odt', 'ods', 'odp', 'md', 'mdx',

  // Bảng dữ liệu / Data
  'csv', 'tsv', 'json', 'xml', 'parquet', 'feather',

  // Ảnh bitmap & vector
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'ico', 'apng', 'jfif', 'avif',
  // Ảnh RAW (máy ảnh)
  'cr2', 'cr3', 'nef', 'arw', 'dng', 'rw2', 'raf', 'orf', 'srw', 'pef', 'heic', 'heif',
  // Thiết kế / Đồ họa
  'psd', 'ai', 'eps', 'indd', 'xd', 'fig', 'sketch',

  // Video
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', '3g2', 'm4v', 'ts', 'm2ts', 'mts', 'ogv', 'mpeg', 'mpg',

  // Audio
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'oga', 'm4a', 'wma', 'opus', 'aiff', 'aif', 'aifc', 'amr', 'mid', 'midi', 'caf',

  // Code / Script / Dự án
  'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'py', 'js', 'jsx', 'ts', 'tsx', 'php', 'rb', 'go', 'rs',
  'swift', 'kt', 'm', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash', 'zsh',
  'bat', 'ps1', 'pl', 'lua', 'asm', 'vhd', 'vhdl', 'sv', 'svh', 'vue', 'svelte', 'ipynb',
  // Tên đặc biệt không có dấu chấm
  'dockerfile', 'makefile', 'procfile', 'cmakelists.txt',

  // Kỹ thuật máy tính / mạng / hệ thống
  'pkt', 'dll', 'so', 'dylib', 'exe', 'bin', 'hex', 'iso', 'img', 'dmg', 'apk', 'aab', 'xapk', 'ipa', 'jar', 'war', 'ear', 'msi',
  'deb', 'rpm', 'pkg', 'appimage',

  // Nén / Lưu trữ
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst',
  // đuôi ghép phổ biến
  'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'tgz', 'tbz2', 'txz', 'tzst',

  // CSDL / Dump / Email / Lịch
  'db', 'sqlite', 'sqlite3', 'db3', 'accdb', 'mdb', 'sql', 'dump', 'psql',
  'eml', 'msg', 'ics',

  // E-book
  'epub', 'mobi', 'azw3',

  // CAD / 3D
  'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'obj', 'fbx', 'glb', 'gltf', 'blend', 'stl',

  // GIS
  'shp', 'geojson', 'kml', 'kmz', 'gpx', 'mbtiles',

  // Font
  'ttf', 'otf', 'woff', 'woff2', 'eot',

  // Chứng chỉ / khóa
  'pem', 'cer', 'crt', 'p12', 'pfx', 'key',

  // Khác
  'log', 'cfg', 'conf', 'ini', 'toml', 'properties', 'env', 'dotenv',
  'db', 'sqlite', 'bak', 'tmp', 'lock', 'license'
];

// ====================== Map mô tả → nhóm định dạng (mở rộng) ======================
export const extAliasMap = {
  // Văn phòng
  'tài liệu': ['pdf', 'doc', 'docx', 'docm', 'rtf', 'txt', 'odt', 'md', 'mdx'],
  'văn bản': ['txt', 'md', 'mdx', 'rtf'],
  'word': ['doc', 'docx', 'docm', 'dotx', 'dotm'],
  'excel': ['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm', 'csv', 'tsv', 'ods'],
  'bảng tính': ['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm', 'csv', 'tsv', 'ods'],
  'powerpoint': ['ppt', 'pptx', 'pptm', 'potx', 'potm', 'odp'],
  'trình chiếu': ['ppt', 'pptx', 'pptm', 'potx', 'potm', 'odp'],

  // Hình ảnh
  'ảnh': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'ico', 'apng', 'jfif', 'avif', 'heic', 'heif'],
  'hình': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'ico', 'apng', 'jfif', 'avif', 'heic', 'heif'],
  'hình ảnh': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'ico', 'apng', 'jfif', 'avif', 'heic', 'heif'],
  'ảnh raw': ['cr2', 'cr3', 'nef', 'arw', 'dng', 'rw2', 'raf', 'orf', 'srw', 'pef'],
  'vector': ['svg', 'ai', 'eps'],
  'thiết kế': ['psd', 'ai', 'indd', 'xd', 'fig', 'sketch'],

  // Video / Audio
  'video': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', '3g2', 'm4v', 'ts', 'm2ts', 'mts', 'ogv', 'mpeg', 'mpg'],
  'âm thanh': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'oga', 'm4a', 'wma', 'opus', 'aiff', 'aif', 'aifc', 'amr', 'mid', 'midi', 'caf'],

  // Mã nguồn / Script
  'mã nguồn': ['c', 'cpp', 'h', 'hpp', 'cs', 'java', 'py', 'js', 'jsx', 'ts', 'tsx', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'm', 'html', 'css', 'scss', 'less', 'vue', 'svelte', 'ipynb'],
  'script': ['sh', 'bash', 'zsh', 'bat', 'ps1', 'py', 'pl', 'rb', 'php', 'js', 'ts'],
  'json': ['json'],
  'html': ['html'],
  'css': ['css', 'scss', 'less'],

  // Cấu hình
  'cấu hình': ['ini', 'cfg', 'conf', 'yaml', 'yml', 'toml', 'properties', 'env', 'dotenv'],
  'config': ['ini', 'cfg', 'conf', 'yaml', 'yml', 'toml', 'properties', 'env', 'dotenv'],

  // Mạng / hệ thống / chương trình
  'packet tracer': ['pkt'],
  'thư viện': ['dll', 'so', 'dylib'],
  'chương trình': ['exe', 'apk', 'aab', 'xapk', 'ipa', 'msi', 'deb', 'rpm', 'pkg', 'appimage', 'jar', 'war', 'ear'],
  'disk image': ['iso', 'img', 'dmg'],

  // Nén / Lưu trữ
  'nén': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'tgz', 'tbz2', 'txz', 'tzst'],

  // CSDL / Email / Lịch / E-book
  'cơ sở dữ liệu': ['db', 'sqlite', 'sqlite3', 'db3', 'accdb', 'mdb', 'sql', 'dump', 'psql'],
  'email': ['eml', 'msg'],
  'lịch': ['ics'],
  'ebook': ['epub', 'mobi', 'azw3', 'pdf'],

  // CAD / 3D / GIS / Font
  'cad': ['dwg', 'dxf', 'step', 'stp', 'iges', 'igs'],
  '3d': ['obj', 'fbx', 'glb', 'gltf', 'blend', 'stl'],
  'gis': ['shp', 'geojson', 'kml', 'kmz', 'gpx', 'mbtiles'],
  'font': ['ttf', 'otf', 'woff', 'woff2', 'eot'],

  // Chứng chỉ
  'chứng chỉ': ['pem', 'cer', 'crt', 'p12', 'pfx', 'key'],

  // Giữ nguyên các key tiếng Anh/VN đã có
  'pdf': ['pdf'],
  'excel spreadsheet': ['xls', 'xlsx', 'xlsm', 'xlsb'],
  'powerpoint presentation': ['ppt', 'pptx', 'pptm']
};

// ====================== Tiện ích lấy extension (hỗ trợ đuôi ghép & dotfiles) ======================
export function getFileExtension(filename) {
  if (!filename) return '';
  const lower = String(filename).trim().toLowerCase();

  // 1) Tên đặc biệt không có dấu chấm (coi như "extension" riêng)
  const specialNames = ['dockerfile', 'makefile', 'procfile', 'cmakelists.txt', 'license'];
  if (specialNames.includes(lower)) return lower;

  // 2) Dotfiles: .env, .env.local, .gitignore, ...
  if (/^\.env(\.|$)/.test(lower)) return 'env';
  if (lower === '.gitignore' || lower === 'gitignore') return 'gitignore';

  // 3) Multi-part (đuôi ghép)
  const multiExts = ['tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst'];
  for (const ext of multiExts) {
    if (lower.endsWith('.' + ext)) return ext;
  }

  // 4) Bóc đuôi thường
  const m = lower.match(/\.([0-9a-zA-Z]+)$/);
  return m ? m[1].toLowerCase() : '';
}
