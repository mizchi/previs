import { puppeteer } from '../deps.ts';

export async function startBrowser(screenshotPath: string, onTakeScreenshot?: (url: string) => Promise<void>) {
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
    async _getRootElementSize() {
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
        await page.setViewport({
          width: 1024,
          height: 768,
          deviceScaleFactor: 2,
        })
        initialized = true;
      } else {
        await page.reload();
      }
      const size = await this._getRootElementSize();
      await page.waitForSelector("#root");
      await page.screenshot({
        path: screenshotPath,
        clip: {
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
        }
      });
      // await $`imgcat ${ssOutpath}`;
      await onTakeScreenshot?.(url);
      return screenshotPath;
    },
    close: () => browser.close(),
  }
}
