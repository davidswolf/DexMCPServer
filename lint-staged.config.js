export default {
  'src/**/*.ts': [
    'eslint --fix',
    'prettier --write',
  ],
  'test/**/*.ts': [
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
};
