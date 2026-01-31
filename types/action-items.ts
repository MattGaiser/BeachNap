export interface ActionItem {
  messageId: string;
  content: string;
  extractedTask: string;
  assignee?: string;
  assigneeId?: string;
  createdAt: string;
  channelId: string;
  channelName?: string;
  authorUsername: string;
  authorId: string;
}

export interface ActionItemsResult {
  items: ActionItem[];
  timeRange: string;
  totalCount: number;
}
