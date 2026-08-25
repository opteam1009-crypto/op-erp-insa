export type Role = 'admin' | 'staff' | 'viewer'

export interface Employee {
  id: string
  employee_number: string
  name: string
  department_id: string | null
  position: string | null
  employment_type: '정규직' | '계약직' | '인턴' | '프리랜서'
  hire_date: string
  resignation_date: string | null
  status: '재직' | '휴직' | '퇴사'
  birth_date: string | null
  phone: string | null
  emergency_contact: string | null
  contract_review_date: string | null
  contract_announce_date: string | null
}

export interface DocumentRecord {
  id: string
  doc_type: '세금계산서' | '계산서' | '신용카드' | '현금영수증' | '기타'
  year: number
  month: number
  vendor_name: string | null
  file_path: string
  file_name: string
  file_size: number
  uploaded_by: string | null
  deleted_at: string | null
  created_at: string
}

export interface PayrollRecord {
  id: string
  employee_id: string
  period: string
  file_path: string
  file_name: string
  parsed_data: Record<string, string | number>[] | null
  parse_status: 'parsed' | 'fallback' | 'pending'
}
