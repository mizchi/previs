import "npm:global-jsdom/register";

import type { ReactElement } from "react";
import { expect } from "https://deno.land/std@0.211.0/expect/expect.ts";
import { userEvent, testingRender, screen } from './deps.ts';

export { expect, userEvent, screen, testingRender };
export const render = (element: ReactElement) => {
  document.body.innerHTML = '<div id="root"></div>';
  testingRender(element, {
    container: document.getElementById('root')!,
  });
};

