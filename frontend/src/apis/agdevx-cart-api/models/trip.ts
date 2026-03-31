// ABOUTME: Trip interface representing a discrete shopping session
// ABOUTME: Tracks items to purchase, collaborators, and completion status

export interface Trip {
  id: string;
  name: string;
  householdId: string | null;
  isStarted: boolean;
  startedAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  tripDate: string | null;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string | null;
}
