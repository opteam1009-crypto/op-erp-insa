import { describe, it, expect } from 'vitest'
import { contentDisposition } from './content-disposition'

describe('contentDisposition', () => {
  it('shows pdfs and images inline and downloads everything else', () => {
    expect(contentDisposition('a.pdf', 'application/pdf').startsWith('inline;')).toBe(true)
    expect(contentDisposition('a.png', 'image/png').startsWith('inline;')).toBe(true)
    expect(contentDisposition('a.hwp', 'application/octet-stream').startsWith('attachment;')).toBe(true)
    expect(contentDisposition('a.xlsx', 'application/vnd.ms-excel').startsWith('attachment;')).toBe(true)
  })

  it('keeps a Korean name in filename* and an ASCII fallback in filename', () => {
    const header = contentDisposition('연장근무 신청서.hwp', 'application/octet-stream')
    // 한글 넷 + 공백 + 한글 셋. 글자 수만큼 _가 남아 길이가 어긋나지 않는다.
    expect(header).toContain('filename="____ ___.hwp"')
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('연장근무 신청서.hwp')}`)
  })

  it('strips characters that would break the header', () => {
    const header = contentDisposition('say "hi"\\now.pdf', 'application/pdf')
    expect(header).toContain('filename="say _hi__now.pdf"')
    expect(header).toContain(`filename*=UTF-8''say%20%22hi%22%5Cnow.pdf`)
  })

  it('never emits an empty fallback name', () => {
    expect(contentDisposition('한글', 'application/pdf')).toContain('filename="__"')
    expect(contentDisposition('', 'application/pdf')).toContain('filename="file"')
  })
})
