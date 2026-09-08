import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // 油猴脚本是独立的浏览器脚本产物，有自身的风格与运行时约定
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'suat-course-table-ics.user.js'],
  },

  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    // 图标标记全部来自 src/ui/icons.ts 的静态常量表，不存在外部输入
    files: ['src/ui/AppIcon.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },

  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/component-api-style': ['error', ['script-setup']],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // 纯排版偏好，交给编辑器 / Prettier 处理，避免模板被强行拆散
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
)
