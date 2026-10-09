const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, isAbsolute } = require('path');

module.exports = {
  externals: [
    ({ request }, callback) => {
      if (request && !request.startsWith('.') && !isAbsolute(request)) {
        callback(null, `commonjs ${request}`);
      } else callback();
    },
  ],
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      mergeExternals: true,
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
