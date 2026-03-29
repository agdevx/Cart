// ABOUTME: Sort households alphabetically by name using localeCompare
// ABOUTME: Used by ScopeFilter, pantry views, and household page

interface Sortable {
  readonly name: string | null
}

export const sortHouseholds = <T extends Sortable>(households: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...households].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
