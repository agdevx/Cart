// ABOUTME: Trip interface representing a discrete shopping session
// ABOUTME: Tracks items to purchase, collaborators, and completion status

export interface Trip {
  id: string;
  name: string;
  householdId: string | null;
  createdByUserId: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
