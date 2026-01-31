// ABOUTME: User interface representing an authenticated user account
// ABOUTME: Contains authentication details and user profile information

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
