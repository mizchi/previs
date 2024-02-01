export type ChatMessage = {
  role: 'system' | 'user',
  content: string | Array<{
    type: "text",
    text: string
  } | {
    type: "image",
    image_url: {
      url: string
    }
  }>
};

export type AskOptions = {
  image: boolean,
  messages: ChatMessage[],
  type?: string,
  key?: string,
  printRaw?: boolean,
  history?: boolean,
  "--": string[],
}
