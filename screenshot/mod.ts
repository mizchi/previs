import { puppeteer } from '../deps.ts';

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;

const DEFAULT_DISPLAY_WIDTH = 500;
const DEFAULT_DISPLAY_HEIGHT = 500;

function getDeviceScaleFactor(scale: number | 'auto' | undefined, rootSize: { width: number, height: number }) {
  // return scale === 'auto' ? DEFAULT_WIDTH : scale;
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

export async function startBrowser(options: {
  screenshotPath: string,
  scale?: number | 'auto',
  width?: number,
  height?: number,
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
      const size = await this._getRootSize();
      await page.waitForSelector("#root");
      const deviceScaleFactor = getDeviceScaleFactor(options.scale, size);
      if (options.debug) {
        console.log('[ss:deviceScaleFactor]', deviceScaleFactor);
      }
      await page.setViewport({
        width: options.width ?? DEFAULT_WIDTH,
        height: options.height ?? DEFAULT_HEIGHT,
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
      await options.onScreenshot?.(url);
    },
    close: () => browser.close(),
  }
}
