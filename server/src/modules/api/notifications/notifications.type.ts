export type Notification = {
  id: number;
  text: string;
  type: 'warning' | 'info' | 'danger';
  gatewayId: number | null;
  isForAdminsOnly: boolean;
  acknowledged: boolean;
  createdAt: Date;
};