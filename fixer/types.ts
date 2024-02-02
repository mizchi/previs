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
