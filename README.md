# Taro Vue Generator

为 Taro + Vue 项目提供右键菜单驱动的代码生成工具。

## 功能特性

- ✅ 在任意文件夹右键生成页面或组件-[注意页面只能在pages文件下生成，组件无所谓]
- ✅ 交互式输入名称（自动校验格式）
- ✅ 自动创建文件夹和文件结构
- ✅ 内置默认模板（Vue3 + JavaScript + SCSS）
- ✅ 支持模板切换（Vue2/Vue3 + TS/JS + SCSS/Less/Sass）
- ✅ 生成后自动打开新文件
- ✅ 自动将页面路由注册到 app.config.js/ts 中
- ✅ **支持自定义 .vue 模板**（项目级模板覆盖）
### 1.0.1版本解决问题

- ✅ **页面必须在 pages 目录下创建**（防止误操作）

### 1.0.2版本解决问题

- ✅ **支持当页面名相同时，禁止创建
- ✅ **成功通知定时3秒消失

## 安装

1. 将插件文件夹复制到 VSCode 的 extensions 目录
2. 重启 VSCode

或者使用 VSIX 安装：
```bash
code --install taro-vue-generator-1.0.3.vsix
```

## 使用方法

在资源管理器中右键点击文件夹，选择 **"Taro Vue Generator"** 子菜单：

### 快速生成（使用默认配置）

- **生成页面** - 使用默认配置快速生成页面
- **生成组件** - 使用默认配置快速生成组件

### 自定义配置生成

- **生成页面（自定义配置）** - 生成页面时可选择 Vue 版本、语言、样式预处理器
- **生成组件（自定义配置）** - 生成组件时可选择 Vue 版本、语言、样式预处理器

### 配置

- **配置默认选项** - 设置默认使用的 Vue 版本、语言和样式预处理器

### 生成步骤

1. 右键点击目标文件夹
2. 选择 "Taro Vue Generator" → 选择对应功能
3. （可选）选择配置选项
4. 输入页面/组件名称（如：home-module）
5. 自动生成文件并打开编辑器

## 页面生成规则

### 目录限制

**页面必须在 `pages` 目录下创建**。如果在非 pages 目录右键"生成页面"，会弹出错误提示。

这是为了防止在非页面目录误创建页面文件。

## 自定义模板

插件支持项目级别的自定义模板，允许你完全控制生成的 `.vue` 文件内容。

### 使用方法

1. 在项目根目录创建 `.vscode-taro-templates` 文件夹
2. 在文件夹中创建模板文件：
   - `page.vue` - 页面模板
   - `component.vue` - 组件模板

### 模板占位符

模板文件中可以使用以下占位符，生成时会自动替换：

| 占位符 | 说明 | 示例（输入 `user-profile`） |
|--------|------|---------------------------|
| `{{kebabName}}` | 短横线命名 | `user-profile` |
| `{{PascalName}}` | 大驼峰命名 | `UserProfile` |
| `{{camelName}}` | 小驼峰命名 | `userProfile` |
| `{{routePath}}` | 路由路径 | `pages/home/user-profile/index` 或 `pageModule/pages/home/user-profile/index` |
| `{{styleExt}}` | 样式文件扩展名 | `scss`、`less` 或 `sass` |

### 自定义页面模板示例

`.vscode-taro-templates/page.vue`:
```vue
<!--  - 路由: {{routePath}} -->
<template>
  <view :class="styles['{{kebabName}}-page']">
    <text>{{PascalName}} Page</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import styles from './index.module.{{styleExt}}'

defineOptions({
  name: '{{PascalName}}'
})

// 自定义逻辑
</script>
```

### 自定义组件模板示例

`.vscode-taro-templates/component.vue`:
```vue
<!--  - 路由: {{routePath}} -->
<template>
  <view :class="styles['{{kebabName}}-component']">
    <text>{{PascalName}}</text>
  </view>
</template>

<script setup>
import styles from './index.module.{{styleExt}}'

defineOptions({
  name: '{{PascalName}}'
})

const props = defineProps({
  title: String
})
</script>
```

### 注意事项

- 自定义模板只影响 `.vue` 文件内容
- `.config.js` 和样式文件（`.module.scss`/`.module.less`/`.module.sass`）仍使用内置模板
- 如果未创建自定义模板文件，插件会使用内置默认模板
- 使用自定义模板生成文件时会弹出提示："已使用自定义页面/组件模板"

## 样式说明（CSS Modules）

生成的样式文件采用 **CSS Modules** 命名（`index.module.scss/less/sass`），在 `.vue` 中作为对象引入，模板里用 `:class="styles['类名']"` 引用：

```vue
<script setup>
import styles from './index.module.scss'
</script>

<template>
  <view :class="styles['custom-button-component']"></view>
</template>
```

- Vue 3 `<script setup>`：`styles` 顶层变量自动可在模板中使用
- Vue 2（Options API）：需在 `data()` 返回 `styles` 暴露给模板
- Vue 2（class 组件）：需在类中声明 `styles = styles` 属性

## 命名规范

- 页面/组件名称只能包含小写字母、数字和短横线
- 推荐使用短横线命名法（如：home-module、custom-button）
- 生成的代码会自动转换为大驼峰命名用于组件名

## 示例

### 生成页面

在 `src/pages/home-module` 目录下右键选择"生成页面"，输入 `user-profile`：

```
src/pages/home-module/user-profile/
├── index.vue          # 页面主文件
├── index.config.js    # 页面配置
└── index.module.scss  # 样式文件
```

### 生成组件

在 `src/components` 目录下右键选择"生成组件"，输入 `custom-button`：

```
src/components/custom-button/
├── index.vue          # 组件主文件
├── index.config.js    # 组件配置
└── index.module.scss  # 样式文件
```

```vue
<template>
  <view :class="styles['my-component']">
    <text :class="styles['my-component__text']">MyComponent</text>
  </view>
</template>

<script lang="ts">
import { Component, Vue, Prop, Emit } from 'vue-property-decorator'
import styles from './index.module.scss'

@Component({
  name: 'MyComponent'
})
export default class MyComponent extends Vue {
  styles = styles

  @Prop({ type: String, default: '' })
  private title!: string

  private isVisible: boolean = true

  get componentClass(): string {
    return this.disabled ? 'my-component--disabled' : ''
  }

  @Emit('click')
  private handleClick(): string {
    if (!this.disabled) {
      return this.title
    }
    return ''
  }
}
</script>
```

## 开发

```bash
# 安装依赖
npm install

# 调试
# 按 F5 启动调试
```
## vsce package 打包成vsix
## 许可证

MIT