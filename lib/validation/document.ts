import { z } from 'zod'
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './upload'

export const documentMetaSchema = z.object({
  doc_type: z.enum(['세금계산서', '계산서', '신용카드', '현금영수증', '기타']),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  vendor_name: z.string().optional(),
  transaction_type: z.enum(['매출', '매입']),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  franchise_store_id: z.string().uuid().nullable(),
})

export type DocumentMeta = z.infer<typeof documentMetaSchema>

// Re-exported from lib/validation/upload.ts so existing importers keep working while
// the payroll upload route shares the exact same limits.
export { MAX_FILE_SIZE_BYTES }
export const ALLOWED_MIME_TYPES = ALLOWED_UPLOAD_MIME_TYPES
