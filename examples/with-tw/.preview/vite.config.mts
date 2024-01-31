import config from '../vite.config.mts';
export default {
  ...config,
  define: {
    ...config.define,
    "import.meta.main": JSON.stringify(false),
  }
};
