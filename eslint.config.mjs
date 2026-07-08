import apifyEslintConfig from '@apify/eslint-config';

const config = [
    ...apifyEslintConfig,
    {
        name: 'eslint-config-override',
        files: ['eslint.config.mjs'],
        rules: {
            'import-x/no-default-export': 'off',
            'import/no-default-export': 'off',
        },
    },
    {
        name: 'jumia-project-overrides',
        files: ['src/**/*.js', 'src/**/*.mjs'],
        rules: {
            'linebreak-style': 'off',
            camelcase: 'off',
            'no-nested-ternary': 'off',
        },
    },
];

export default config;
