export type ViteSettings = {
  preExists: boolean;
  viteBase: string;
  virtualRoot: string;
  configPath?: string;
};

export enum PreviewType {
  React = "react",
  Svelte = "svelte",
  Vue = "vue",
}

export type BuilderOption = {
  cwd: string;
  target: string;
  port: number;
  width?: string;
  height?: string;
  imports: string[]
};

export interface InitVitePreviewProjectOption extends ViteSettings {
  width?: string;
  height?: string;
  imports: string[];
};

export type CreateReactProjectOptions = {
  width?: string;
  height?: string;
  imports: string[];
  previewDir: string;
};
