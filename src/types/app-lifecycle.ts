export type AppCloseStatus = {
  requested: boolean;
  runningCampaigns: number;
  queuedCampaigns: number;
  scheduledCampaigns: number;
  trayAvailable: boolean;
};
export type AppCloseAction = 'tray' | 'quit' | 'cancel';
