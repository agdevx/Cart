// ABOUTME: Sort stores alphabetically by name using localeCompare
// ABOUTME: Used by StoreFilter and pantry stores view

interface Sortable {
  readonly name: string
}

export const sortStores = <T extends Sortable>(stores: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...stores].sort((a, b) => a.name.localeCompare(b.name))
