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

export type ComponentFlag = 'tailwind' | 'in-source-test' | 'export-default' | 'preview-component';
