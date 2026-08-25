import { z } from 'zod'

export const documentMetaSchema = z.object({
  doc_type: z.enum(['세금계산서', '계산서', '신용카드', '현금영수증', '기타']),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  vendor_name: z.string().optional(),
})

export type DocumentMeta = z.infer<typeof documentMetaSchema>

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
