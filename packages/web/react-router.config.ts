import type { Config } from '@react-router/dev/config';

export default {
  ssr: false,
  prerender: ({ getStaticPaths }) => {
    return getStaticPaths().filter((path) => path !== '/profile');
  },
  future: {},
} satisfies Config;
