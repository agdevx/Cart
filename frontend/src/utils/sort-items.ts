// ABOUTME: Sort inventory items alphabetically by name using localeCompare
// ABOUTME: Used by pantry items view and add-trip-items page

interface Sortable {
  readonly name: string
}

export const sortItems = <T extends Sortable>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))
