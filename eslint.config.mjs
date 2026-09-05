import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = defineConfig([
	...nextVitals,
	{
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			// Partial #298: 32 set-state-in-effect warnings remain after reduction from 42.
			// Keep as warn until follow-up addresses remaining violations, then restore to error.
			// All other Next 16 React Compiler rules restored to error in #299.
			'react-hooks/set-state-in-effect': 'warn',
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@supabase/supabase-js',
							message:
								'Use the DAL/dbAdapter only. Direct database imports are not allowed outside the DAL layer.',
						},
						{
							name: 'pg',
							message:
								'Use the DAL/dbAdapter only. Direct database imports are not allowed outside the DAL layer.',
						},
					],
				},
			],
		},
	},
	{
		files: [
			'src/lib/database/**/*.ts',
			'src/lib/db.ts',
			'src/lib/supabaseAdmin.ts',
			'src/lib/supabaseClient.ts',
			'src/app/api/**/*.ts',
			'scripts/**/*.js',
			'scripts/**/*.mjs',
			'scripts/**/*.ts',
			'e2e/**/*.ts',
			'__tests__/**/*.ts',
			'__tests__/**/*.tsx',
		],
		rules: {
			'no-restricted-imports': 'off',
		},
	},
	globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'node_modules/**', 'jest.setup.js']),
]);

export default eslintConfig;
