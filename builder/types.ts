export type ViteSettings = {
  isViteProject: boolean;
  dir: string;
  configPath?: string;
};

export enum PreviewType {
  React = "react",
  Svelte = "svelte",
  Vue = "vue",
}

export type PrevisOption = {
  cwd: string;
  previewTargetPath: string;
  port: number;
  width: string;
  height: string;
  stylePath?: string | undefined;
  force?: boolean;
  volatile?: boolean;
  ignore?: boolean;
};

export type InitVitePreviewProjectOption = ViteSettings & {
  width: string;
  height: string;
  stylePath?: string;
  // forceRewrite?: boolean;
  // volatile?: boolean;
  // previewType: PreviewType;
};

export type CreateReactProjectOptions = {
  width: string;
  height: string;
  stylePath?: string;
  previewDir: string;
};

