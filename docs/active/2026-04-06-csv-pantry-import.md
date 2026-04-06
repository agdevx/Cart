# CSV Pantry Import

## Design Spec

### Overview

Bulk import pantry items from a CSV file. Stores referenced in the CSV are auto-created if they don't already exist. The feature lives in a new "Pantry" section in Settings, keeping it out of the way for everyday pantry use.

### CSV Format

```csv
Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,personal
```

**Columns (matched by position):**

| Column | Required | Max Length | Default |
|--------|----------|-----------|---------|
| Name | Yes | 200 | — |
| Notes | No | 500 | null |
| Default Store | No | 100 | null |
| Scope | No | — | `personal` |

**Parsing rules:**
- First row is always the header and is skipped
- Whitespace trimmed on all values
- Empty `Notes`, `Default Store`, and `Scope` are null/default
- Rows with fewer than 4 columns are padded with empty values (a row with just a name is valid — notes, store, and scope all get defaults)
- Scope accepts `personal` or `household` (case-insensitive); invalid values make the row invalid
- The frontend defaults blank/missing scope to `"personal"` before sending to the API
- Entirely empty rows are silently skipped (not counted as invalid)
- Max 500 data rows per import

### Architecture: Frontend Parses, Backend Imports

The frontend handles file selection and CSV parsing. The backend handles all business logic (validation, duplicate detection, store resolution, item creation) in a single request.

### API

**`POST /api/v1/inventory/import`**

Request body:
```json
[
  { "name": "Milk", "notes": null, "defaultStore": "Costco", "scope": "personal" },
  { "name": "Chicken Breast", "notes": "Boneless skinless", "defaultStore": "Costco", "scope": "household" }
]
```

Request DTO per item:
- `Name` (string, required, max 200)
- `Notes` (string?, max 500)
- `DefaultStore` (string?, max 100) — store name, not ID
- `Scope` (string, required) — `"personal"` or `"household"`

Response body:
```json
{
  "personalItemsImported": 10,
  "householdItemsImported": 5,
  "duplicatesSkipped": 2,
  "householdItemsSkipped": 3,
  "invalidRowsSkipped": 1
}
```

### Backend Processing Logic

All steps happen within a single transaction:

1. **Validate rows** — reject rows with empty/missing name, name exceeding 200 chars, notes exceeding 500 chars, default store name exceeding 100 chars, or invalid scope value. Count as `invalidRowsSkipped`.

2. **Partition by scope** — split into personal rows and household rows.

3. **Household check** — if there are household rows but the user has no `HouseholdId`, skip all household rows. Count as `householdItemsSkipped`.

4. **Fetch existing data** (2 queries):
   - All user's inventory items (personal + household) for duplicate detection
   - All user's stores (personal + household) for store matching

5. **Duplicate detection** — case-insensitive name match within the same scope. An item named "Milk" in personal scope is not a duplicate of "Milk" in household scope. Count matches as `duplicatesSkipped`.

6. **Store resolution** — for each non-skipped row with a `DefaultStore` value:
   - Case-insensitive match against existing stores in the same scope
   - If no match, create the store in that scope (personal stores get `UserId`, household stores get `HouseholdId`)
   - Deduplicate within the CSV itself — if 10 rows reference "Costco" in personal scope, create one store

7. **Bulk create** — add all non-duplicate items with resolved store IDs.

8. **SaveChangesAsync** — single transaction commits all new stores and items together.

### Frontend: Settings UI

A new **"Pantry"** section appears in Settings after the Security section.

**Contents:**
- Section header: "Pantry" (matches existing Profile/Security header style)
- "Import Items from CSV" label with description: "Add pantry items in bulk from a CSV file"
- "Download Template" link — downloads a CSV file with the header row and example data rows
- File picker button — native file input with `accept=".csv"`
- Import button — disabled until a file is selected, shows spinner while importing

After import completes, the file selection resets.

**Frontend validation (before API call):**
- File must parse as CSV with data rows
- Zero data rows → error toast: "No items found in CSV"
- More than 500 data rows → error toast: "CSV exceeds the 500 row limit"

### Toast Messaging

Up to 3 toasts can appear after import. The logic:

**Success toast (shown when at least one item was imported):**
- Only personal items imported → "Imported X items"
- Only household items imported → "Imported X items"
- Both scopes imported → "Imported X personal items and Y household items"

**Household skip toast (shown when `householdItemsSkipped > 0`):**
- "Since you are not in a household, we could not import those items"

**Validation/duplicate skip toast (shown when `duplicatesSkipped > 0` or `invalidRowsSkipped > 0`):**
- Both → "X duplicate and Y invalid items were skipped"
- Duplicates only → "X duplicate items were skipped"
- Invalid only → "X invalid items were skipped"

If zero items were imported and there are only skip toasts, no success toast is shown.

### Error Handling

- **Wrong file type** — `accept=".csv"` on file input restricts selection. If a non-parseable file gets through, frontend shows error toast.
- **Empty file** — frontend detects zero data rows, shows error toast, no API call.
- **Row limit exceeded** — frontend checks after parsing, shows error toast, no API call.
- **All rows skipped** — no success toast, only skip toast(s).
- **Network/server error** — standard `apiFetch` error handling. Transaction rolls back, no items created.

### Downloadable CSV Template

The template is generated client-side as a Blob download (no backend endpoint needed):

```csv
Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,personal
```

## Implementation Plan

_To be written after spec approval._
