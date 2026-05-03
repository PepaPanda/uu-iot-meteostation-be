export type User = {
  userId: number;
  userEmail: string;
  userPasswordHash?: string;
  userRole: 'guest'| 'operator'| 'supervisor'| 'administrator';
  userNickname: string;
  userCreatedAt: Date;
  userRegisteredAt: Date
  userUpdatedAt: Date;
};


export type Invitation = {
  inviteId: number;
  email: string;
  tokenHash: string;
  invitedBy: number;
  expiresAt: Date;
  fulfilledAt: Date | null;
};