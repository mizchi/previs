/*
Universal testing library for Deno, Node.js, and the browser.

// foo.test.{js,mjs,ts}
import { test, eq } from './unitest.mjs';
test('1 === 1', () => {
  eq(1, 1);
});

$ deno test foo.test.ts
$ node --test foo.test.mjs

html

<script type="module">
  import './foo.test.js';
  await __tester__.run();
  console.log(__tester__.errors);
</script>
*/

/**
 * @__NO_SIDE_EFFECTS__
 */
function getEnv() {
  if (typeof Deno !== 'undefined') {
    return "deno";
  }
  if (import.meta.env && import.meta.env.VITEST_POOL_ID !== undefined) {
    return "vitest";
  }
  if (typeof process !== 'undefined' && process.env.NODE_TEST_CONTEXT) {
    return "node-test" /* Environment.NodeTest */;
  }
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  if (typeof globalThis !== 'undefined') {
    return 'es';
  }
  throw new Error('Unknown environment');
}

/**
 * @__NO_SIDE_EFFECTS__
 */
async function _init() {
  const env = getEnv();
  /**
   * @type {{
   *   env: string,
   *   test: (name: string, fn: () => void | Promise<void>) => void,
   *   run?: () => Promise<boolean>,
   *   errors: { name: string, error: Error }[]
   * }}
   */
  const tester = {
    env,
    test: () => {
      throw new Error('Tester not initialized');
    },
    run: undefined,
    errors: [],
  };

  // @ts-ignore globalThis
  globalThis.__tester__ = tester;

  switch (env) {
    case "deno": {
      tester.test = (name, fn) => {
        Deno.test(name, () => fn());
      }
      break;
    }
    case "vitest": {
      const specifier = 'vitest'
      const vitest = await import(specifier);
      tester.test = (name, fn) => {
        vitest.test(name, fn);
      }
      break;
    }
    case "node-test": {
      const specifier = 'node:test';
      const nodeTest = await import(specifier);
      tester.test = (name, fn) => {
        nodeTest.it(name, fn);
      }
      break;
    }
    case "es":
    case "browser": {
      if (globalThis.__tester__?.test) {
        return;
      }
      const tests = [];
      const errors = [];
      const test = (name, fn) => {
        tests.push({ fn, name });
      };
      const run = async () => {
        for (const test of tests) {
          try {
            await test.fn();
          } catch (error) {
            errors.push({ name: test.name, error });
          }
        }
        tests.length = 0;
        return errors.length === 0;
      };
      tester.test = test;
      tester.run = run;
      break;
    }
    default: {
      throw new Error(`Unknown environment ${env}`);
    }
  }
}
/**
 * @__PURE__
 */
await _init();

// --- public API ---

/**
 * @param name {string}
 * @param fn {() => void | Promise<void>}
 * @returns {void}
 * @__NO_SIDE_EFFECTS__
 */
export function test(name, fn) {
  globalThis.__tester__.test(name, fn);
}

/**
 * @param a {unknown}
 * @param b {unknown}
 * @param message {string}
 * @returns {void}
 * @__NO_SIDE_EFFECTS__
 */
export function eq(a, b, message = 'Assertion failed') {
  if (a !== b) {
    throw new Error(message);
  }
}
