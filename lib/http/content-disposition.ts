/**
 * 파일 내려주기 응답의 Content-Disposition.
 *
 * 한글 파일명은 filename*(RFC 5987)에 UTF-8로 넣고, 그걸 못 읽는 옛 클라이언트를
 * 위해 filename에는 ASCII로 바꾼 이름을 함께 둔다. 따옴표·역슬래시는 헤더 문법을
 * 깨므로 뺀다.
 *
 * PDF와 이미지는 inline이라 새 탭에서 바로 보이고, hwp·docx·xlsx는 브라우저가
 * 못 그리므로 attachment로 내려받게 한다.
 */
export function contentDisposition(fileName: string, contentType: string): string {
  const inline = contentType === 'application/pdf' || contentType.startsWith('image/')
  const type = inline ? 'inline' : 'attachment'

  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'file'

  // encodeURIComponent는 ' ( ) ! * 를 남기는데, RFC 5987의 attr-char에는 ' 와 * 가
  // 없다. 넷 다 %XX로 바꾼다 — 남은 것을 더 인코딩하는 건 무해하다.
  const encoded = encodeURIComponent(fileName).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`
}
