import { puppeteer, type Page } from '../deps.ts';
import { pxToNumber } from "../utils.ts";

const DEFAULT_WIDTH = 500;
// const DEFAULT_HEIGHT = 500;

async function waitUntillExecuted(page: Page) {
  await page.waitForSelector("#root");
  const result = await page.evaluate(() => {
    return new Promise<{ ok: true } | { ok: false, error: string | undefined }>((resolve, reject) => {
      const interval = setInterval(() => {
        // @ts-ignore globalThis
        const err = globalThis.__error__;
        if (err instanceof Error) {
          const serializedError = err.stack;
          clearInterval(interval);
          resolve({ ok: false, error: serializedError });
          return;
        }
        const root = document.querySelector("#root");
        if (root?.innerHTML !== "") {
          clearInterval(interval);
          return resolve({
            ok: true
          });
        }
      }, 100);
    });
  });
  return result;
}

export async function startBrowser(options: {
  screenshotPath: string,
  scale?: number | 'auto',
  width?: string,
  height?: string,
  displayWidth?: number,
  displayHeight?: number,
  debug?: boolean,
  onScreenshot?: (url: string) => Promise<void>
}) {
  // take screenshot
  const browser = await puppeteer.launch({
    // defaultViewport: {
    //   width: 800,
    //   height: 600,
    // }
  });
  const page = await browser.newPage();
  let initialized = false;
  let closed = false;
  return {
    async _getRootSize() {
      const el = await page.$("#root");
      const box = await el!.boundingBox();
      return {
        width: box?.width!,
        height: box?.height!,
      }
    },
    async screenshot(url: string) {
      if (!initialized) {
        await page.goto(url);
        initialized = true;
      } else {
        await page.reload();
      }
      const result = await waitUntillExecuted(page);
      if (!result.ok) {
        console.error('[previs:browser:error]', result.error);
      }
      const size = await this._getRootSize();
      const explicitDisplaySize = !!options.width || !!options.height;
      if (explicitDisplaySize) {
        const width = options.height ? pxToNumber(options.height) : size.width;
        const height = options.height ? pxToNumber(options.height) : size.height;
        await page.setViewport({
          width: Math.floor(width),
          height: Math.floor(height),
          deviceScaleFactor: options.scale === 'auto'
            ? undefined
            : options.scale
              ? Number(options.scale)
              : undefined
        });
        await page.screenshot({
          path: options.screenshotPath,
        });
      } else {
        const deviceScaleFactor = getDeviceScaleFactor(options.scale, size);
        // if (options.debug) {
        //   console.log('[ss:deviceScaleFactor]', deviceScaleFactor);
        // }
        const width = options.width ? pxToNumber(options.width) : size.width;
        const height = options.height ? pxToNumber(options.height) : size.height;
        // console.log('[ss:viewport]', width, height, deviceScaleFactor);
        await page.setViewport({
          width: Math.floor(width),
          height: Math.floor(height),
          deviceScaleFactor,
        });
        await page.screenshot({
          path: options.screenshotPath,
          clip: {
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
          }
        });
      }
      await options.onScreenshot?.(url);
    },
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      await browser.close();
    },
  }
}

function getDeviceScaleFactor(scale: number | 'auto' | undefined, rootSize: { width: number, height: number }) {
  const isAutoScale = scale === 'auto' || !scale;
  // 0 is a special case, it means the element is not visible
  if (rootSize.width === 0) {
    return 1;
  }
  const deviceScaleFactor = isAutoScale
    ? DEFAULT_WIDTH / rootSize.width
    : scale as number;
  return Math.floor(100 * deviceScaleFactor) / 100;
}

