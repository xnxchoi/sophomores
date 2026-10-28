export interface Message {
  [key: string]: string | MessageItem | Message;
}

export interface MessageItem {
  title?: string;
  body: string;
}
