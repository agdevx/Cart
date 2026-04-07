// ABOUTME: Tests for the CSV parser utility
// ABOUTME: Validates RFC 4180 parsing, BOM handling, encoding fallback, and edge cases

import { describe, expect, it } from 'vitest'

import { parseCsv } from '../csv-parser'

/*
 * readFileWithEncodingFallback is not unit-tested here because it depends on
 * the browser FileReader API. It should be verified via manual testing with
 * Excel-exported CSVs in both "CSV UTF-8" and plain "CSV" formats.
 */

describe('parseCsv', () => {
  it('should parse simple CSV rows', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk,,Costco,personal\nBread,Whole wheat,Target,household'
    const rows = parseCsv(csv)
    expect(rows).toEqual([
      ['Milk', '', 'Costco', 'personal'],
      ['Bread', 'Whole wheat', 'Target', 'household'],
    ])
  })

  it('should skip the header row', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk,,,'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('should handle quoted fields with commas', () => {
    const csv = 'Name,Notes,Store,Scope\n"Chicken, Boneless",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Chicken, Boneless')
  })

  it('should handle escaped double quotes', () => {
    const csv = 'Name,Notes,Store,Scope\n"Item ""A""",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Item "A"')
  })

  it('should handle CRLF line endings', () => {
    const csv = 'Name,Notes,Store,Scope\r\nMilk,,,personal\r\nBread,,,household'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('should strip BOM', () => {
    const csv = '\uFEFFName,Notes,Store,Scope\nMilk,,,personal'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('Milk')
  })

  it('should skip entirely empty rows', () => {
    const csv = 'Name,Notes,Store,Scope\n\nMilk,,,personal\n  \n,,,\nBread,,,personal'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('should pad rows with fewer than 4 columns', () => {
    const csv = 'Name,Notes,Store,Scope\nMilk'
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual(['Milk', '', '', ''])
  })

  it('should ignore extra columns beyond 4', () => {
    const csv = 'Name,Notes,Store,Scope,Extra\nMilk,,,personal,ignored'
    const rows = parseCsv(csv)
    expect(rows[0]).toHaveLength(4)
  })

  it('should trim whitespace from values', () => {
    const csv = 'Name,Notes,Store,Scope\n  Milk , some notes , Costco , personal '
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual(['Milk', 'some notes', 'Costco', 'personal'])
  })

  it('should handle quoted fields with newlines', () => {
    const csv = 'Name,Notes,Store,Scope\n"Multi\nLine",notes,Store,personal'
    const rows = parseCsv(csv)
    expect(rows[0][0]).toBe('Multi\nLine')
  })
})
