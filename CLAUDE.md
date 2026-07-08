# CLAUDE.md

本项目是一个 VSCode 扩展 **Taro Vue Generator**，为 Taro + Vue 项目提供右键菜单驱动的页面/组件代码生成工具。

## 架构

- `src/extension.js` — 主逻辑：命令注册、文件生成、页面路由自动注册到 app.config
- `src/templates.js` — 模板生成：页面/组件 × Vue2/Vue3 × JS/TS 共 8 套模板，外加配置/样式模板
- 纯 JS + JSDoc，无构建步骤，无运行时依赖（`dependencies: {}`）

## 生成规则（关键决策）

### 页面 vs 组件

| 文件 | 页面 | 组件 |
|---|---|---|
| `index.vue` | ✅ | ✅ |
| `index.config.js` | ✅ `definePageConfig`（Taro 认） | ✅ `export default { component: true }`（普通 export，非 `defineComponentConfig` 宏--Taro 不认那个宏） |
| `index.module.${style}` | ✅ | ✅ |

- 页面**必须**在 `pages` 目录下创建（[extension.js](src/extension.js) `isInPagesDirectory` 校验）
- 页面生成后会自动把路由写入 `app.config.js/ts`，支持主包和分包（`subPackages`），含同名页面禁建校验
- 组件可在任意目录生成，不写 app.config

### 样式：CSS Modules（非 scoped、非内联 `<style>`）

- `.vue` 文件**没有 `<style>` 块**（Taro 小程序不认 `scoped`）
- 样式放外部 `index.module.scss/less/sass`，在 `<script>` 里 `import styles from './index.module.xxx'`
- 模板里用 `:class="styles['类名']"`（不是 `$style`——`$style` 是 SFC 内联 `<style module>` 的写法，外部文件 import 用 `styles`）
- Vue 3 `<script setup>`：`styles` 顶层变量自动可用
- Vue 2 Options API：需在 `data()` 返回 `styles` 暴露给模板
- Vue 2 class 组件：需在类中声明 `styles = styles` 属性
- `sass`（缩进语法）的样式模板不用大括号，与 scss/less 分支处理

### 自定义模板（项目级覆盖）

目标 Taro 项目根目录的 `.vscode-taro-templates/{page,component}.vue` 会**优先于**内置模板生效（状态栏会提示"已使用自定义组件模板"）。占位符（空格容忍）：

| 占位符 | 说明 |
|---|---|
| `{{kebabName}}` | 短横线命名 |
| `{{PascalName}}` | 大驼峰命名 |
| `{{camelName}}` | 小驼峰命名 |
| `{{routePath}}` | 路由路径 |
| `{{styleExt}}` | 样式扩展名（scss/less/sass） |

> 自定义模板只影响 `.vue` 内容；配置和样式文件仍走内置模板。

## 配置项

`taroVue.template.{vueVersion,language,style}`：
- `vueVersion`: vue2 / vue3
- `language`: javascript / typescript
- `style`: scss / less / sass

## 构建与打包

```bash
# 生成 .vsix（项目无 LICENSE 文件，需 --skip-license）
npx @vscode/vsce package --skip-license
```

- 产物：`taro-vue-generator-${version}.vsix`
- 安装：`code --install-extension <file>.vsix`
- 改动源码后，需重新打包安装或用 F5 调试模式才生效
- `package.json` 缺 `repository` 字段，vsce 会警告但不影响打包

## 命名规范

输入名只能含小写字母、数字、短横线（如 `custom-button`），自动转大驼峰用于组件 `name`。
