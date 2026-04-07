// ABOUTME: Pantry section in Settings for CSV import of inventory items
// ABOUTME: Compact card layout with template download, file picker, and import button

import { useRef, useState } from 'react'

import { FileText } from 'lucide-react'
import { toast } from 'sonner'

import type { ImportInventoryResult } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'
import { useImportInventoryMutation } from '@/apis/agdevx-cart-api/inventory/import-inventory.mutation'
import { Spinner } from '@/shared/spinner'
import { parseCsv, readFileWithEncodingFallback } from '@/utils/csv-parser'

const CSV_TEMPLATE = `Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,`

const MAX_ROWS = 500

const showResultToasts = (result: ImportInventoryResult) => {
  const { personalItemsImported, householdItemsImported, duplicatesSkipped, householdItemsSkipped, invalidRowsSkipped } = result
  const totalImported = personalItemsImported + householdItemsImported

  //== Success toast
  if (totalImported > 0) {
    if (personalItemsImported > 0 && householdItemsImported > 0) {
      toast.success(`Imported ${personalItemsImported} personal items and ${householdItemsImported} household items`)
    } else {
      toast.success(`Imported ${totalImported} items`)
    }
  }

  //== Household skip toast
  if (householdItemsSkipped > 0) {
    toast.warning('Since you are not in a household, we could not import those items')
  }

  //== Validation/duplicate skip toast
  if (duplicatesSkipped > 0 && invalidRowsSkipped > 0) {
    toast.warning(`${duplicatesSkipped} duplicate and ${invalidRowsSkipped} invalid items were skipped`)
  } else if (duplicatesSkipped > 0) {
    toast.warning(`${duplicatesSkipped} duplicate items were skipped`)
  } else if (invalidRowsSkipped > 0) {
    toast.warning(`${invalidRowsSkipped} invalid items were skipped`)
  }
}

export const PantrySection = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportInventoryMutation()

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pantry-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      const text = await readFileWithEncodingFallback(selectedFile)
      const rows = parseCsv(text)

      if (rows.length === 0) {
        toast.error('No items found in CSV')
        return
      }

      if (rows.length > MAX_ROWS) {
        toast.error('CSV exceeds the 500 row limit')
        return
      }

      const items = rows.map(([name, notes, defaultStore, scope]) => ({
        name,
        notes: notes || null,
        defaultStore: defaultStore || null,
        scope: scope.toLowerCase() || 'personal',
      }))

      importMutation.mutate(items, {
        onSuccess: (result) => {
          showResultToasts(result)
          setSelectedFile(null)

          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        },
        onError: () => {
          toast.error('Import failed. Please try again.')
        },
      })
    } catch {
      toast.error('Could not read the file')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Pantry</span>
      </div>

      <div className="rounded-xl bg-surface overflow-hidden">
        <div className="px-4 py-3">
          <div className="text-xs text-text-tertiary">Import Items</div>
          <div className="text-sm text-navy-soft mt-0.5">Add pantry items in bulk from a CSV file</div>
        </div>

        <div className="border-t border-bg px-4 py-3">
          <div className="flex gap-2 items-center min-w-0">
            <button
              onClick={handleDownloadTemplate}
              className="text-xs font-semibold text-teal hover:text-teal-light transition-colors whitespace-nowrap flex-shrink-0"
            >
              Download Template
            </button>

            <span className="text-bg-warm flex-shrink-0">|</span>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-xs cursor-pointer flex items-center gap-1.5 ${
                selectedFile
                  ? 'border-teal/30 bg-teal/[0.04] text-navy-soft'
                  : 'border-navy/10 bg-surface text-text-tertiary'
              }`}
            >
              {selectedFile && <FileText className="w-3 h-3 text-teal flex-shrink-0" />}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button
            onClick={() => void handleImport()}
            disabled={!selectedFile || importMutation.isPending}
            aria-label="Import"
            className="mt-2.5 w-full flex items-center justify-center py-2 bg-teal text-white rounded-lg text-xs font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
          >
            {importMutation.isPending ? <Spinner /> : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
