import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		rules: {
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
			'@typescript-eslint/no-explicit-any': 'warn',
			// eslint-config-next 16 enables React Compiler rules. Keep them
			// off until the app is ready for that migration.
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/incompatible-library': 'off',
			'react-hooks/static-components': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/preserve-manual-memoization': 'off',
			'react-hooks/refs': 'off',
			'react-hooks/error-boundaries': 'off',
			'react-hooks/globals': 'off',
			'react-hooks/set-state-in-render': 'off',
			'react-hooks/unsupported-syntax': 'off',
			'react-hooks/config': 'off',
			'react-hooks/gating': 'off',
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
			'scripts/**/*.ts',
			'__tests__/**/*.ts',
			'__tests__/**/*.tsx',
		],
		rules: {
			'no-restricted-imports': 'off',
		},
	},
	globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
