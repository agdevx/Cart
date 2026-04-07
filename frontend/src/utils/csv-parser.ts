// ABOUTME: RFC 4180 compliant CSV parser with BOM handling and encoding fallback
// ABOUTME: Parses CSV text into rows of trimmed string arrays, skipping header and empty rows

const COLUMN_COUNT = 4

/**
 * Reads a File as text, trying UTF-8 first.
 * If the result contains the Unicode replacement character (U+FFFD), re-reads as Windows-1252.
 */
export const readFileWithEncodingFallback = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const text = reader.result as string

      if (text.includes('\uFFFD')) {
        const fallbackReader = new FileReader()

        fallbackReader.onload = () => {
          resolve(fallbackReader.result as string)
        }

        fallbackReader.onerror = () => reject(fallbackReader.error)
        fallbackReader.readAsText(file, 'windows-1252')
      } else {
        resolve(text)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * Parses CSV text into an array of string arrays.
 * Skips the header row and empty rows. Pads short rows, truncates long rows to COLUMN_COUNT.
 */
export const parseCsv = (text: string): string[][] => {
  const stripped = text.replace(/^\uFEFF/, '')
  const rows = parseRfc4180(stripped)

  if (rows.length === 0) {
    return []
  }

  //== Skip header row
  const dataRows = rows.slice(1)

  return dataRows
    .filter((row) => !isEmptyRow(row))
    .map((row) => {
      //== Pad short rows, truncate long rows
      const padded = [...row, ...Array(Math.max(0, COLUMN_COUNT - row.length)).fill('')]
      return padded.slice(0, COLUMN_COUNT).map((cell) => cell.trim())
    })
}

const isEmptyRow = (row: string[]): boolean => {
  return row.every((cell) => cell.trim() === '')
}

/**
 * RFC 4180 parser that handles quoted fields, embedded commas, embedded newlines, and escaped quotes.
 */
const parseRfc4180 = (text: string): string[][] => {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        current.push(field)
        field = ''
        i++
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else if (char === '\n') {
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else {
        field += char
        i++
      }
    }
  }

  //== Push last field/row
  if (field !== '' || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  return rows
}
