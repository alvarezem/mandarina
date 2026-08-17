import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, extOf, fileTypeError, hashFile } from './upload'

describe('upload', () => {
  it('acepta pdf/csv/xlsx como tipos soportados', () => {
    expect(ACCEPTED_TYPES).toEqual(['pdf', 'csv', 'xlsx'])
  })

  it('extOf devuelve la extensión en minúsculas', () => {
    expect(extOf('resumen.PDF')).toBe('pdf')
    expect(extOf('a.b.xlsx')).toBe('xlsx')
    expect(extOf('sin-ext')).toBe('sin-ext')
    expect(extOf('')).toBe('')
    expect(extOf(null)).toBe('')
  })

  describe('fileTypeError', () => {
    it('acepta CSV sin validar contenido', async () => {
      const file = new File(['a,b\n1,2'], 'resumen.csv', { type: 'text/csv' })
      expect(await fileTypeError(file)).toBeNull()
    })

    it('acepta PDF con magic bytes', async () => {
      const file = new File(
        [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])],
        'resumen.pdf',
        { type: 'application/pdf' },
      )
      expect(await fileTypeError(file)).toBeNull()
    })

    it('acepta XLSX con magic ZIP', async () => {
      const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])], 'plan.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      expect(await fileTypeError(file)).toBeNull()
    })

    it('rechaza una extensión no soportada', async () => {
      const file = new File(['x'], 'resumen.txt', { type: 'text/plain' })
      expect(await fileTypeError(file)).toBe('upload.err.type')
    })

    it('rechaza un archivo que supera el límite', async () => {
      const file = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], 'grande.pdf', {
        type: 'application/pdf',
      })
      expect(await fileTypeError(file)).toBe('upload.err.size')
    })

    it('rechaza un PDF sin magic bytes', async () => {
      const file = new File(['no es un pdf'], 'resumen.pdf', { type: 'application/pdf' })
      expect(await fileTypeError(file)).toBe('upload.err.type')
    })

    it('rechaza un XLSX sin magic ZIP', async () => {
      const file = new File(['html'], 'plan.xlsx')
      expect(await fileTypeError(file)).toBe('upload.err.type')
    })
  })

  describe('hashFile', () => {
    it('devuelve un hash hex de 64 caracteres determinístico', async () => {
      const a = new File(['contenido'], 'a.csv')
      const b = new File(['contenido'], 'b.csv')
      const other = new File(['otro'], 'c.csv')
      const ha = await hashFile(a)
      expect(ha).toMatch(/^[0-9a-f]{64}$/)
      expect(await hashFile(b)).toBe(ha)
      expect(await hashFile(other)).not.toBe(ha)
    })
  })
})
