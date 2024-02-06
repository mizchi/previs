export type ChatContent =
  {
    type: "text",
    text: string
  } | {
    type: "image",
    image_url: {
      url: string
    }
  };
export type ChatMessage = {
  role: 'system' | 'user',
  content:
  | string
  | ChatContent[]
};
