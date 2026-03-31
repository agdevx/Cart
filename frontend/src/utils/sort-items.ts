// ABOUTME: Sort items alphabetically by a string field using localeCompare
// ABOUTME: Used by pantry items view, add-trip-items page, and trip detail/active pages

interface Sortable {
  readonly name: string
}

export function sortItems<T extends Sortable>(items: ReadonlyArray<T>): ReadonlyArray<T>
export function sortItems<T, K extends keyof T>(items: ReadonlyArray<T>, key: K & (T[K] extends string ? K : never)): ReadonlyArray<T>
export function sortItems<T>(items: ReadonlyArray<T>, key?: keyof T): ReadonlyArray<T> {
  const k = key ?? ('name' as keyof T)
  return [...items].sort((a, b) => String(a[k]).localeCompare(String(b[k])))
}
