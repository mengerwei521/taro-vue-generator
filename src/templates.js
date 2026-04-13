/**
 * 模板系统 - 提供不同配置的页面和组件模板
 */

/**
 * 将短横线命名转换为大驼峰命名
 * @param {string} str - 短横线命名的字符串
 * @returns {string} 大驼峰命名的字符串
 */
function kebabToPascal(str) {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * 将短横线命名转换为小驼峰命名
 * @param {string} str - 短横线命名的字符串
 * @returns {string} 小驼峰命名的字符串
 */
function kebabToCamel(str) {
  const pascal = kebabToPascal(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * 获取页面 Vue 模板
 * @param {string} name - 页面名称（短横线命名）
 * @param {Object} options - 模板选项
 * @param {'vue2' | 'vue3'} options.vueVersion - Vue 版本
 * @param {'javascript' | 'typescript'} options.language - 脚本语言
 * @param {'scss' | 'less'} options.style - 样式预处理器
 * @param {string} routePath - 路由路径（如 pages/xxx/index 或 aa/pages/xxx/index）
 * @returns {string} 生成的模板内容
 */
function getPageVueTemplate(name, options, routePath = '') {
  const { vueVersion = 'vue3', language = 'javascript', style = 'scss' } = options;
  const pascalName = kebabToPascal(name);
  const camelName = kebabToCamel(name);
  const scriptExt = language === 'typescript' ? 'ts' : 'js';
  const styleLang = style === 'scss' ? 'scss' : 'less';
  const routeComment = routePath ? ` - 路由: ${routePath}` : '';

  if (vueVersion === 'vue3') {
    if (language === 'typescript') {
      return `<!-- ${pascalName} 页面${routeComment} -->
<template>
  <view class="${name}-page">
  
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'

// 页面配置
defineOptions({
  name: '${pascalName}'
})

// 响应式数据
const loading = ref<boolean>(false)

// 页面生命周期
onMounted(() => {
  console.log('${pascalName} 页面已加载')
})

// 方法定义
const handleClick = (): void => {
  console.log('点击了${pascalName}页面')
}
</script>

<style lang="${styleLang}">
.${name}-page {
}
</style>
`;
    } else {
      return `<!-- ${pascalName} 页面${routeComment} -->
<template>
  <view class="${name}-page">
 
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'

// 页面配置
defineOptions({
  name: '${pascalName}'
})

// 响应式数据
const loading = ref(false)

// 页面生命周期
onMounted(() => {
  console.log('${pascalName} 页面已加载')
})

// 方法定义
const handleClick = () => {
  console.log('点击了${pascalName}页面')
}
</script>

<style lang="${styleLang}">
.${name}-page {

}
</style>
`;
    }
  } else {
    // Vue 2
    if (language === 'typescript') {
      return `<!-- ${pascalName} 页面${routeComment} -->
<template>
  <view class="${name}-page">
  
  </view>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Taro from '@tarojs/taro'

@Component({
  name: '${pascalName}'
})
export default class ${pascalName} extends Vue {
  // 响应式数据
  private loading: boolean = false

  // 生命周期
  mounted(): void {
    console.log('${pascalName} 页面已加载')
  }

  // 方法定义
  private handleClick(): void {
    console.log('点击了${pascalName}页面')
  }
}
</script>

<style lang="${styleLang}">
.${name}-page {
  
}
</style>
`;
    } else {
      return `<!-- ${pascalName} 页面${routeComment} -->
<template>
  <view class="${name}-page">
  
  </view>
</template>

<script>
import Taro from '@tarojs/taro'

export default {
  name: '${pascalName}',
  
  // 响应式数据
  data() {
    return {
      loading: false
    }
  },

  // 生命周期
  mounted() {
    console.log('${pascalName} 页面已加载')
  },

  // 方法定义
  methods: {
    handleClick() {
      console.log('点击了${pascalName}页面')
    }
  }
}
</script>

<style lang="${styleLang}">
.${name}-page {
 
}
</style>
`;
    }
  }
}

/**
 * 获取组件 Vue 模板
 * @param {string} name - 组件名称（短横线命名）
 * @param {Object} options - 模板选项
 * @param {'vue2' | 'vue3'} options.vueVersion - Vue 版本
 * @param {'javascript' | 'typescript'} options.language - 脚本语言
 * @param {'scss' | 'less'} options.style - 样式预处理器
 * @param {string} routePath - 路由路径（如 pages/xxx/index 或 aa/pages/xxx/index）
 * @returns {string} 生成的模板内容
 */
function getComponentTemplate(name, options, routePath = '') {
  const { vueVersion = 'vue3', language = 'javascript', style = 'scss' } = options;
  const pascalName = kebabToPascal(name);
  const camelName = kebabToCamel(name);
  const scriptExt = language === 'typescript' ? 'ts' : 'js';
  const styleLang = style === 'scss' ? 'scss' : 'less';
  const routeComment = routePath ? ` - 路由: ${routePath}` : '';

  if (vueVersion === 'vue3') {
    if (language === 'typescript') {
      return `<!-- ${pascalName} 组件${routeComment} -->
<template>
  <view class="${name}-component">
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 组件配置
defineOptions({
  name: '${pascalName}'
})

// Props 定义
interface Props {
  title?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  disabled: false
})

// Emits 定义
interface Emits {
  (e: 'click', value: string): void
  (e: 'change', value: boolean): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const isVisible = ref<boolean>(true)

// 计算属性
const componentClass = computed<string>(() => {
  return props.disabled ? '${name}-component--disabled' : ''
})

// 方法定义
const handleClick = (): void => {
  if (!props.disabled) {
    emit('click', props.title)
  }
}
</script>

<style lang="${styleLang}" scoped>
.${name}-component {
}
</style>
`;
    } else {
      return `<!-- ${pascalName} 组件${routeComment} -->
<template>
  <view class="${name}-component">
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 组件配置
defineOptions({
  name: '${pascalName}'
})

// Props 定义
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// Emits 定义
const emit = defineEmits(['click', 'change'])

// 响应式数据
const isVisible = ref(true)

// 计算属性
const componentClass = computed(() => {
  return props.disabled ? '${name}-component--disabled' : ''
})

// 方法定义
const handleClick = () => {
  if (!props.disabled) {
    emit('click', props.title)
  }
}
</script>

<style lang="${styleLang}" scoped>
.${name}-component {
}
</style>
`;
    }
  } else {
    // Vue 2
    if (language === 'typescript') {
      return `<!-- ${pascalName} 组件${routeComment} -->
<template>
  <view class="${name}-component">
  </view>
</template>

<script lang="ts">
import { Component, Vue, Prop, Emit } from 'vue-property-decorator'

@Component({
  name: '${pascalName}'
})
export default class ${pascalName} extends Vue {
  // Props
  @Prop({ type: String, default: '' })
  private title!: string

  @Prop({ type: Boolean, default: false })
  private disabled!: boolean

  // 响应式数据
  private isVisible: boolean = true

  // 计算属性
  get componentClass(): string {
    return this.disabled ? '${name}-component--disabled' : ''
  }

  // 方法
  @Emit('click')
  private handleClick(): string {
    if (!this.disabled) {
      return this.title
    }
    return ''
  }
}
</script>

<style lang="${styleLang}" scoped>
.${name}-component {
}
</style>
`;
    } else {
      return `<!-- ${pascalName} 组件${routeComment} -->
<template>
  <view class="${name}-component">
  </view>
</template>

<script>
export default {
  name: '${pascalName}',
  
  // Props
  props: {
    title: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  // 响应式数据
  data() {
    return {
      isVisible: true
    }
  },

  // 计算属性
  computed: {
    componentClass() {
      return this.disabled ? '${name}-component--disabled' : ''
    }
  },

  // 方法
  methods: {
    handleClick() {
      if (!this.disabled) {
        this.$emit('click', this.title)
      }
    }
  }
}
</script>

<style lang="${styleLang}" scoped>
.${name}-component {
}
</style>
`;
    }
  }
}

/**
 * 获取页面配置文件内容
 * @param {string} name - 页面名称
 * @returns {string} 配置文件内容
 */
function getPageConfigTemplate(name) {
  const pascalName = kebabToPascal(name);
  return `export default definePageConfig({
  navigationBarTitleText: '${pascalName}'
})
`;
}

/**
 * 获取页面样式文件内容
 * @param {string} name - 页面名称
 * @param {'scss' | 'less'} style - 样式预处理器
 * @returns {string} 样式文件内容
 */
function getPageStyleTemplate(name, style) {
  // 返回空样式，因为主要样式在 vue 文件中
  return `// ${name} 页面额外样式
`;
}

module.exports = {
  getPageVueTemplate,
  getComponentTemplate,
  getPageConfigTemplate,
  getPageStyleTemplate,
  kebabToPascal,
  kebabToCamel
};