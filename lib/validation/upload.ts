/**
 * Shared file-upload limits for every Storage-backed upload route
 * (증빙 업로드 and 급여대장 업로드 both use these).
 */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
