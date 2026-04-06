# CSV Pantry Import + Package Updates + Database Indexes

## Design Spec

### Overview

Bulk import pantry items from a CSV file. Stores referenced in the CSV are auto-created if they don't already exist. The feature lives in a new "Pantry" section in Settings, keeping it out of the way for everyday pantry use.

### CSV Format

```csv
Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,
```

**Columns (matched by position):**

| Column | Required | Max Length | Default |
|--------|----------|-----------|---------|
| Name | Yes | 200 | — |
| Notes | No | 500 | null |
| Default Store | No | 100 | null |
| Scope | No | — | `personal` |

**Parsing rules:**
- RFC 4180 compliant — quoted fields are supported (e.g., `"Boneless, skinless"` embeds a comma)
- **Encoding**: read as UTF-8 first. If the decoded text contains the Unicode replacement character (U+FFFD), re-read the file as Windows-1252 as a fallback. This handles both Excel "CSV UTF-8" and plain "CSV" exports.
- UTF-8 BOM (`\uFEFF`) is stripped if present (common in Excel exports)
- First row is always the header and is skipped
- Whitespace trimmed on all values
- Empty `Notes`, `Default Store`, and `Scope` are null/default
- Rows with fewer than 4 columns are padded with empty values (a row with just a name is valid)
- Rows with more than 4 columns — extra columns are silently ignored
- Scope accepts `personal` or `household` (case-insensitive); invalid values make the row invalid
- The frontend defaults blank/missing scope to `"personal"` before sending to the API
- Entirely empty rows (literal blank lines or all-whitespace/comma rows) are silently skipped
- Max 500 data rows per import

### Architecture: Frontend Parses, Backend Imports

The frontend handles file selection and CSV parsing. The backend handles all business logic (validation, duplicate detection, store resolution, item creation) in a single request.

### API

**`POST /api/v1/inventory/import`** — Returns `200 OK` always (the response body is a result report, not a creation confirmation).

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
- `Scope` (string, required) — `"personal"` or `"household"`. The backend rejects blank/missing scope (the frontend always fills it in).

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

All steps happen within a single transaction. The import uses a dedicated service method — it does not loop through the existing single-item `CreateInventoryItem` path.

The backend also enforces the 500-item limit, returning `400 Bad Request` if exceeded (defense-in-depth — the frontend checks first).

1. **Validate rows** — reject rows with empty/missing name, name exceeding 200 chars, notes exceeding 500 chars, default store name exceeding 100 chars, or invalid scope value. Count as `invalidRowsSkipped`.

2. **Partition by scope** — split into personal rows and household rows.

3. **Household check** — if there are household rows but the user has no `HouseholdId`, skip all household rows. Count as `householdItemsSkipped`.

4. **Fetch existing data** (2 queries):
   - All user's inventory items (personal + household) for duplicate detection
   - All user's stores (personal + household) for store matching

5. **Duplicate detection** — case-insensitive name match within the same scope, checked against both existing items AND earlier rows in the same CSV. An item named "Milk" in personal scope is not a duplicate of "Milk" in household scope. Count matches as `duplicatesSkipped`.

6. **Store resolution** — for each non-skipped row with a `DefaultStore` value:
   - Case-insensitive match against existing stores in the same scope
   - If no match, create the store in that scope (personal stores get `UserId`, household stores get `HouseholdId`)
   - Deduplicate within the CSV itself — if 10 rows reference "Costco" in personal scope, create one store
   - Stores are scoped to match the item's scope. A personal item referencing "Costco" and a household item referencing "Costco" may result in two separate stores if "Costco" doesn't already exist in both scopes. This is consistent with the existing UI, which scopes store dropdowns to the item's scope.

7. **Bulk create** — add all non-duplicate items with resolved store IDs.

8. **SaveChangesAsync** — single transaction commits all new stores and items together.

### Frontend: Settings UI

A new **"Pantry"** section appears in Settings after the Security section, as its own component file (following the `ProfileSection`/`SecuritySection` pattern).

**Layout: Compact card** (matches collapsed Profile/Security style). Single card with:
- Top row: "Import Items" sublabel + "Add pantry items in bulk from a CSV file" description
- Bottom row (separated by border): "Download Template" link | file picker | Import button

**Details:**
- "Download Template" link — generates and downloads a CSV file client-side
- File picker — styled file input with `accept=".csv"`, shows filename when selected
- Import button — disabled until a file is selected, shows spinner while importing

After import completes, the file selection resets and the inventory + store TanStack Query caches are invalidated (since new items and stores may have been created).

**Frontend validation (before API call):**
- File must parse as CSV with data rows
- Zero data rows → error toast: "No items found in CSV"
- More than 500 data rows → error toast: "CSV exceeds the 500 row limit"

### Toast Messaging

Up to 3 toasts can appear after import. The logic:

**Success toast (type: success, shown when at least one item was imported):**
- Only personal items imported → "Imported X items"
- Only household items imported → "Imported X items"
- Both scopes imported → "Imported X personal items and Y household items"

**Household skip toast (type: warning, shown when `householdItemsSkipped > 0`):**
- "Since you are not in a household, we could not import those items"

**Validation/duplicate skip toast (type: warning, shown when `duplicatesSkipped > 0` or `invalidRowsSkipped > 0`):**
- Both → "X duplicate and Y invalid items were skipped"
- Duplicates only → "X duplicate items were skipped"
- Invalid only → "X invalid items were skipped"

If zero items were imported and there are only skip toasts, no success toast is shown.

### Error Handling

- **Wrong file type** — `accept=".csv"` on file input restricts selection. If a non-parseable file gets through, frontend shows error toast.
- **Empty file** — frontend detects zero data rows, shows error toast, no API call.
- **Row limit exceeded** — frontend checks after parsing, shows error toast, no API call. Backend also rejects with 400 as defense-in-depth.
- **All rows skipped** — no success toast, only skip toast(s).
- **Network/server error** — standard `apiFetch` error handling. Transaction rolls back, no items created.

### Downloadable CSV Template

The template is generated client-side as a Blob download (no backend endpoint needed):

```csv
Name,Notes,Default Store,Scope
Milk,,Costco,personal
Chicken Breast,Boneless skinless,Costco,household
Paper Towels,,Target,personal
Ibuprofen,200mg,,
```

The last row demonstrates that a blank scope defaults to `personal`.

---

## Package Updates

### npm (Frontend)

Update all npm packages to latest **except eslint** (which stays at its current version). Run `npm outdated` to identify what needs updating, then `npm update` / manual `package.json` edits as needed. Verify with `npm run dev`, `npx tsc -b --noEmit`, `npx eslint src/`, and `npx vitest run`.

### NuGet (Backend)

Update all NuGet packages across all projects in `backend/`. Run `dotnet list package --outdated` to identify updates, then update via `dotnet add package`. Verify with `dotnet build` and `dotnet test` across all test projects.

---

## Database Index Review

Audit all tables and add indexes that benefit query patterns used by the application. Focus areas:

- Foreign key columns used in WHERE/JOIN clauses that aren't already indexed
- Columns used in filtering and ordering (e.g., `Name` for case-insensitive lookups)
- Composite indexes for common query patterns
- Review existing indexes for redundancy

Changes are implemented as EF Core model configuration in `CartDbContext` and require a new migration.

## Implementation Plan

_To be written after spec approval._
