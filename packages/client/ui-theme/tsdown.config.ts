import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  import.meta.dirname,
  ['lib/types/index.js'],
  {
    lib: {
      copy: [{
        from: 'src/styles/brand-font.css',
        to: 'lib/styles',
      }, {
        from: 'src/styles/fonts/*',
        to: 'lib/styles/fonts',
      }],
    },
  },
)
