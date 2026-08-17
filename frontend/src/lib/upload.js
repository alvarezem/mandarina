export const ACCEPTED_TYPES = ['pdf', 'csv', 'xlsx']
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function extOf(name) {
  return (
    String(name ?? '')
      .split('.')
      .pop()
      ?.toLowerCase() ?? ''
  )
}

async function startsWithMagic(file, magic) {
  const buf = new Uint8Array(await file.slice(0, magic.length).arrayBuffer())
  return magic.every((byte, i) => buf[i] === byte)
}

export async function fileTypeError(file) {
  const ext = extOf(file.name)
  if (!ACCEPTED_TYPES.includes(ext)) return 'upload.err.type'
  if (file.size > MAX_UPLOAD_BYTES) return 'upload.err.size'
  if (ext === 'pdf' && !(await startsWithMagic(file, [0x25, 0x50, 0x44, 0x46]))) {
    return 'upload.err.type'
  }
  if (ext === 'xlsx' && !(await startsWithMagic(file, [0x50, 0x4b, 0x03, 0x04]))) {
    return 'upload.err.type'
  }
  return null
}

export async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
