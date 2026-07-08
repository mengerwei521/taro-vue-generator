const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const templates = require('./templates');

/**
 * 检查路径是否在 pages 目录下（任意深度）
 * @param {string} targetPath - 目标路径
 * @returns {boolean} 是否在 pages 目录下
 */
function isInPagesDirectory(targetPath) {
  const parts = targetPath.split(path.sep);
  return parts.includes('pages');
}

/**
 * 查找项目根目录（包含 package.json 或 config 目录的上级）
 * @param {string} startPath - 开始搜索的路径
 * @returns {string|null} 项目根目录路径
 */
function findProjectRoot(startPath) {
  let currentPath = startPath;
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    // 检查是否有 package.json
    const packageJson = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJson)) {
      return currentPath;
    }

    // 检查是否有 config 目录（Taro 项目特征）
    const configDir = path.join(currentPath, 'config');
    if (fs.existsSync(configDir) && fs.statSync(configDir).isDirectory()) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
    depth++;
  }

  return null;
}

/**
 * 加载自定义模板文件
 * @param {string} projectRoot - 项目根目录
 * @param {'page' | 'component'} type - 模板类型
 * @returns {string|null} 模板内容，如果没有自定义模板则返回 null
 */
function loadCustomTemplate(projectRoot, type) {
  const templateDir = path.join(projectRoot, '.vscode-taro-templates');
  const templateFile = path.join(templateDir, `${type}.vue`);

  if (fs.existsSync(templateFile)) {
    try {
      return fs.readFileSync(templateFile, 'utf-8');
    } catch (error) {
      console.error(`读取自定义模板 ${templateFile} 失败:`, error.message);
    }
  }

  return null;
}

/**
 * 替换模板中的占位符
 * @param {string} template - 模板内容
 * @param {string} kebabName - 短横线命名
 * @param {string} pascalName - 大驼峰命名
 * @param {string} camelName - 小驼峰命名
 * @param {string} routePath - 路由路径（如 pages/xxx/index 或 aa/pages/xxx/index）
 * @param {string} styleExt - 样式文件扩展名（scss/less/sass）
 * @returns {string} 替换后的内容
 */
function replaceTemplatePlaceholders(template, kebabName, pascalName, camelName, routePath = '', styleExt = '') {
  return template
    .replace(/\{\{\s*kebabName\s*\}\}/g, kebabName)
    .replace(/\{\{\s*PascalName\s*\}\}/g, pascalName)
    .replace(/\{\{\s*camelName\s*\}\}/g, camelName)
    .replace(/\{\{\s*routePath\s*\}\}/g, routePath)
    .replace(/\{\{\s*styleExt\s*\}\}/g, styleExt);
}

/**
 * 查找项目根目录中的 app.config 文件
 * @param {string} startPath - 开始搜索的路径
 * @returns {string|null} app.config 文件路径
 */
function findAppConfig(startPath) {
  let currentPath = startPath;
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    const jsConfig = path.join(currentPath, 'src', 'app.config.js');
    if (fs.existsSync(jsConfig)) {
      return jsConfig;
    }

    const tsConfig = path.join(currentPath, 'src', 'app.config.ts');
    if (fs.existsSync(tsConfig)) {
      return tsConfig;
    }

    const jsApp = path.join(currentPath, 'src', 'app.js');
    if (fs.existsSync(jsApp)) {
      return jsApp;
    }

    const tsApp = path.join(currentPath, 'src', 'app.ts');
    if (fs.existsSync(tsApp)) {
      return tsApp;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
    depth++;
  }

  return null;
}

/**
 * 根据页面路由路径判断是否属于分包
 * @param {string} pagePath - 页面路由路径
 * @param {string} content - app.config 文件内容
 * @returns {{isSubpackage: boolean, subpackageRoot: string|null}} 分包信息
 */
function checkSubpackageByPagePath(pagePath, content) {
  // 1. 找到 subPackages 键的位置
  const subPackagesKeyIndex = content.search(/subPackages\s*:/);
  if (subPackagesKeyIndex === -1) {
    return { isSubpackage: false, subpackageRoot: null };
  }

  // 2. 从 subPackages 键之后开始，找到数组的起始 '['
  let start = content.indexOf('[', subPackagesKeyIndex);
  if (start === -1) {
    return { isSubpackage: false, subpackageRoot: null };
  }

  // 3. 匹配方括号，找到数组结束位置
  let count = 1;
  let pos = start + 1;
  while (count > 0 && pos < content.length) {
    const char = content[pos];
    if (char === '[') count++;
    if (char === ']') count--;
    pos++;
  }
  const end = pos - 1; // 数组结束的 ']' 位置
  const subPackagesContent = content.substring(start + 1, end);

  // 4. 提取所有 root 值
  const rootRegex = /root\s*:\s*["']([^"']+)["']/g;
  const roots = [];
  let rootMatch;
  while ((rootMatch = rootRegex.exec(subPackagesContent)) !== null) {
    roots.push(rootMatch[1].replace(/\\/g, '/'));
  }

  // 5. 判断页面路径是否属于某个分包
  for (const root of roots) {
    // 规范化 root：确保不以 / 结尾，以便加 '/' 拼接
    const normalizedRoot = root.replace(/\/+$/, '');
    if (pagePath.startsWith(normalizedRoot + '/') || pagePath === normalizedRoot) {
      return { isSubpackage: true, subpackageRoot: normalizedRoot };
    }
  }

  return { isSubpackage: false, subpackageRoot: null };
}

/**
 * 检查页面名称是否已经在 app.config 中存在（主包或分包）
 * @param {string} appConfigPath - app.config 文件路径
 * @param {string} pageName - 要检查的页面名称（短横线命名，如 demo-page）
 * @returns {{exists: boolean, location: string|null}} 是否存在及位置信息
 */
function checkPageNameExists(appConfigPath, pageName) {
  try {
    const content = fs.readFileSync(appConfigPath, 'utf-8');

    // 1. 先找到 subPackages 的位置，区分主包和分包的 pages 数组
    const subPackagesIndex = content.search(/subPackages\s*:/);

    // 2. 检查主包 pages 数组（在 subPackages 之前）
    const mainPagesEnd = subPackagesIndex === -1 ? content.length : subPackagesIndex;
    const mainPagesSection = content.substring(0, mainPagesEnd);
    const mainPagesMatch = mainPagesSection.match(/pages\s*:\s*\[([\s\S]*?)\]/);

    if (mainPagesMatch) {
      const paths = extractPathsFromPages(mainPagesMatch[1]);
      const foundPath = findPathByPageName(paths, pageName);
      if (foundPath) {
        return { exists: true, location: '主包' };
      }
    }

    // 3. 检查分包 pages 数组（在 subPackages 数组内部）
    if (subPackagesIndex !== -1) {
      const result = checkSubpackagePages(content, subPackagesIndex, pageName);
      if (result) {
        return result;
      }
    }

    return { exists: false, location: null };
  } catch (error) {
    console.error('检查页面名称失败:', error.message);
    return { exists: false, location: null };
  }
}

/**
 * 从 pages 数组内容中提取所有路径
 * @param {string} pagesContent - pages 数组的内容
 * @returns {string[]} 路径数组
 */
function extractPathsFromPages(pagesContent) {
  const paths = [];
  const pathRegex = /['"]([^'"]+)['"]/g;
  let match;
  while ((match = pathRegex.exec(pagesContent)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/**
 * 在路径数组中查找匹配页面名称的路径
 * @param {string[]} paths - 路径数组
 * @param {string} pageName - 页面名称
 * @returns {string|null} 匹配的路径或 null
 */
function findPathByPageName(paths, pageName) {
  for (const pagePath of paths) {
    const pathParts = pagePath.split('/');
    if (pathParts.length >= 2) {
      const parentDir = pathParts[pathParts.length - 2];
      if (parentDir === pageName) {
        return pagePath;
      }
    }
  }
  return null;
}

/**
 * 检查分包中的 pages 数组
 * @param {string} content - app.config 文件内容
 * @param {number} subPackagesIndex - subPackages 关键字的位置
 * @param {string} pageName - 页面名称
 * @returns {{exists: boolean, location: string|null}|null} 结果或 null
 */
function checkSubpackagePages(content, subPackagesIndex, pageName) {
  // 找到 subPackages 数组的起始 '['
  let arrayStart = content.indexOf('[', subPackagesIndex);
  if (arrayStart === -1) return null;

  // 匹配方括号，找到数组结束位置
  let count = 1;
  let pos = arrayStart + 1;
  while (count > 0 && pos < content.length) {
    const char = content[pos];
    if (char === '[') count++;
    if (char === ']') count--;
    pos++;
  }
  const arrayEnd = pos - 1;
  const subPackagesContent = content.substring(arrayStart + 1, arrayEnd);

  // 提取所有 root 值及其位置
  const rootRegex = /root\s*:\s*["']([^"']+)["']/g;
  const roots = [];
  let rootMatch;
  while ((rootMatch = rootRegex.exec(subPackagesContent)) !== null) {
    roots.push({
      name: rootMatch[1].replace(/\\/g, '/'),
      index: rootMatch.index
    });
  }

  // 对每个分包，检查其 pages 数组
  for (let i = 0; i < roots.length; i++) {
    const currentRoot = roots[i];
    const nextRootIndex = i + 1 < roots.length ? roots[i + 1].index : subPackagesContent.length;

    // 在当前分包对象范围内查找 pages 数组
    const subpackageSection = subPackagesContent.substring(currentRoot.index, nextRootIndex);
    const pagesMatch = subpackageSection.match(/pages\s*:\s*\[([\s\S]*?)\]/);

    if (pagesMatch) {
      const paths = extractPathsFromPages(pagesMatch[1]);
      const foundPath = findPathByPageName(paths, pageName);
      if (foundPath) {
        return { exists: true, location: `分包 "${currentRoot.name}"` };
      }
    }
  }

  return null;
}

/**
 * 将页面路径添加到 app.config 文件中（支持分包）
 * @param {string} appConfigPath - app.config 文件路径
 * @param {string} pagePath - 要添加的页面路径（完整路径，如 pagesModule/pages/meng/index）
 * @returns {{success: boolean, message: string}} 是否成功添加
 */
function addPageToAppConfig(appConfigPath, pagePath) {
  try {
    let content = fs.readFileSync(appConfigPath, 'utf-8');

    const normalizedPath = pagePath.replace(/\\/g, '/');

    // 根据页面路由路径判断是否属于分包
    const { isSubpackage, subpackageRoot } = checkSubpackageByPagePath(normalizedPath, content);

    if (isSubpackage && subpackageRoot) {
      // 分包页面：去掉 root 前缀，只保留相对路径
      // 例如：pagesModule/pages/meng/index -> pages/meng/index
      const relativePath = normalizedPath.substring(subpackageRoot.length);
      // 去掉开头的 /
      const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

      // 检查路径是否已存在
      if (content.includes(`'${cleanPath}'`) || content.includes(`"${cleanPath}"`)) {
        return { success: false, message: '页面路径已存在' };
      }

      // 找到 subPackages 键的位置
      const subPackagesKeyIndex = content.search(/subPackages\s*:/);
      if (subPackagesKeyIndex === -1) {
        return { success: false, message: '未找到 subPackages 配置' };
      }

      // 找到 subPackages 数组的起始 '['
      let arrayStart = content.indexOf('[', subPackagesKeyIndex);
      if (arrayStart === -1) {
        return { success: false, message: 'subPackages 数组格式错误' };
      }

      // 匹配方括号，找到数组结束位置
      let bracketCount = 1;
      let pos = arrayStart + 1;
      while (bracketCount > 0 && pos < content.length) {
        const char = content[pos];
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        pos++;
      }
      const arrayEnd = pos - 1;
      const subPackagesContent = content.substring(arrayStart + 1, arrayEnd);
      const fullMatch = content.substring(arrayStart, arrayEnd + 1);

      // 找到包含指定 root 的分包对象
      const escapedRoot = subpackageRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rootPattern = new RegExp('root\\s*:\\s*["\']' + escapedRoot + '["\']', 's');
      const rootMatch = subPackagesContent.match(rootPattern);

      if (rootMatch && rootMatch.index !== undefined) {
        const rootIndex = rootMatch.index;

        // 从 root 位置向前找到 {，向后找到匹配的 }
        let braceCount = 0;
        let startIndex = rootIndex;
        let endIndex = rootIndex;

        // 向前找 {
        while (startIndex >= 0) {
          if (subPackagesContent[startIndex] === '}') braceCount++;
          if (subPackagesContent[startIndex] === '{') {
            if (braceCount === 0) break;
            braceCount--;
          }
          startIndex--;
        }

        // 向后找 }
        braceCount = 0;
        while (endIndex < subPackagesContent.length) {
          if (subPackagesContent[endIndex] === '{') braceCount++;
          if (subPackagesContent[endIndex] === '}') {
            if (braceCount === 0) break;
            braceCount--;
          }
          endIndex++;
        }

        const fullPackage = subPackagesContent.substring(startIndex, endIndex + 1);

        // 检查是否有 pages 数组
        const pagesInPackageRegex = /pages\s*:\s*\[([^\]]*)\]/;
        const pagesMatch = fullPackage.match(pagesInPackageRegex);

        let newPackage;
        if (pagesMatch) {
          // 有 pages 数组，添加新页面
          const pagesContent = pagesMatch[1].trim();
          const lastComma = pagesContent.length > 0 && !pagesContent.endsWith(',') ? ',' : '';
          const newPagesContent = pagesContent
            ? `${pagesContent}${lastComma}\n        '${cleanPath}'`
            : `'${cleanPath}'`;

          newPackage = fullPackage.replace(
            /pages\s*:\s*\[[^\]]*\]/,
            `pages: [${newPagesContent}\n      ]`
          );
        } else {
          // 没有 pages 数组，添加一个
          newPackage = fullPackage.replace(
            /\}$/,
            `,\n      pages: ['${cleanPath}']\n    }`
          );
        }

        const newSubPackagesContent = subPackagesContent.substring(0, startIndex) + newPackage + subPackagesContent.substring(endIndex + 1);
        content = content.replace(fullMatch, `[${newSubPackagesContent}]`);
        fs.writeFileSync(appConfigPath, content, 'utf-8');
        return { success: true, message: `页面路由已添加到分包 "${subpackageRoot}"` };
      }

      return { success: false, message: '未找到对应的分包配置' };
    }

    // 主包页面：添加到主 pages 数组
    // 检查路径是否已存在
    if (content.includes(`'${normalizedPath}'`) || content.includes(`"${normalizedPath}"`)) {
      return { success: false, message: '页面路径已存在' };
    }

    // 匹配主 pages 数组（在 subPackages 之前的 pages）
    const mainPagesRegex = /pages\s*:\s*\[([\s\S]*?)\](?=\s*,\s*(?:subPackages|window|entryPagePath))/;
    const mainPagesMatch = content.match(mainPagesRegex);

    if (mainPagesMatch) {
      const pagesContent = mainPagesMatch[1].trim();
      const lastComma = pagesContent.length > 0 && !pagesContent.endsWith(',') ? ',' : '';
      const newPagesContent = pagesContent
        ? `${pagesContent}${lastComma}\n    '${normalizedPath}'`
        : `'${normalizedPath}'`;

      content = content.replace(mainPagesRegex, `pages: [${newPagesContent}\n  ]`);
      fs.writeFileSync(appConfigPath, content, 'utf-8');
      return { success: true, message: '页面路由已添加到主包' };
    }

    const defineConfigRegex = /export\s+default\s+defineAppConfig\s*\(\s*\{([\s\S]*?)\}\s*\)/;
    const defineMatch = content.match(defineConfigRegex);

    if (defineMatch) {
      const configContent = defineMatch[1].trim();
      const newConfig = configContent
        ? `${configContent},\n  pages: ['${normalizedPath}']`
        : `pages: ['${normalizedPath}']`;

      content = content.replace(defineConfigRegex, `export default defineAppConfig({${newConfig}\n})`);
      fs.writeFileSync(appConfigPath, content, 'utf-8');
      return { success: true, message: '页面路由已添加到 app.config' };
    }

    return { success: false, message: '无法解析 app.config 文件格式' };
  } catch (/** @type {any} */ error) {
    return { success: false, message: `更新 app.config 失败: ${error.message}` };
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Taro Vue Generator 插件已激活');

  let generatePageCommand = vscode.commands.registerCommand('taroVue.generatePage', async (uri) => {
    await handleGenerate(uri, 'page', false);
  });

  let generateComponentCommand = vscode.commands.registerCommand('taroVue.generateComponent', async (uri) => {
    await handleGenerate(uri, 'component', false);
  });

  let generatePageCustomCommand = vscode.commands.registerCommand('taroVue.generatePageCustom', async (uri) => {
    await handleGenerate(uri, 'page', true);
  });

  let generateComponentCustomCommand = vscode.commands.registerCommand('taroVue.generateComponentCustom', async (uri) => {
    await handleGenerate(uri, 'component', true);
  });

  let selectTemplateCommand = vscode.commands.registerCommand('taroVue.selectTemplate', async () => {
    await handleSelectTemplate();
  });

  context.subscriptions.push(
    generatePageCommand,
    generateComponentCommand,
    generatePageCustomCommand,
    generateComponentCustomCommand,
    selectTemplateCommand
  );
}

/**
 * 处理生成逻辑
 * @param {vscode.Uri} uri - 右键点击的目录 URI
 * @param {'page' | 'component'} type - 生成类型
 * @param {boolean} isCustom - 是否使用自定义配置
 */
async function handleGenerate(uri, type, isCustom = false) {
  const targetPath = uri.fsPath;
  const config = vscode.workspace.getConfiguration('taroVue.template');

  // 需求1: 页面必须在 pages 目录下
  if (type === 'page' && !isInPagesDirectory(targetPath)) {
    vscode.window.showErrorMessage('页面必须在 pages 目录下创建！请右键点击 pages 目录或其子目录来生成页面。');
    return;
  }

  let vueVersion = config.get('vueVersion', 'vue3');
  let language = config.get('language', 'javascript');
  let style = config.get('style', 'scss');

  if (isCustom) {
    const selectedVueVersion = await vscode.window.showQuickPick(
      [
        { label: 'Vue 3', value: 'vue3' },
        { label: 'Vue 2', value: 'vue2' }
      ],
      { placeHolder: '选择 Vue 版本' }
    );
    if (!selectedVueVersion) return;
    vueVersion = selectedVueVersion.value;

    const selectedLanguage = await vscode.window.showQuickPick(
      [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' }
      ],
      { placeHolder: '选择脚本语言' }
    );
    if (!selectedLanguage) return;
    language = selectedLanguage.value;

    const selectedStyle = await vscode.window.showQuickPick(
      [
        { label: 'SCSS', value: 'scss' },
        { label: 'Less', value: 'less' },
        { label: 'Sass', value: 'sass' }
      ],
      { placeHolder: '选择样式预处理器' }
    );
    if (!selectedStyle) return;
    style = selectedStyle.value;
  }

  const name = await vscode.window.showInputBox({
    prompt: `请输入${type === 'page' ? '页面' : '组件'}名称`,
    placeHolder: type === 'page' ? '例如: home-module' : '例如: custom-button',
    validateInput: (value) => {
      if (!value) {
        return '名称不能为空';
      }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
        return '名称只能包含小写字母、数字和短横线（如: my-component）';
      }
      return null;
    }
  });

  if (!name) {
    return;
  }

  // 对于页面类型，在创建文件之前检查页面名称是否已存在
  if (type === 'page') {
    const appConfigPath = findAppConfig(targetPath);
    if (appConfigPath) {
      const { exists, location } = checkPageNameExists(appConfigPath, name);
      if (exists) {
        vscode.window.showWarningMessage(`页面名称 "${name}" 已存在于 ${location} 中，请使用其他名称。`);
        return;
      }
    }
  }

  const componentDir = path.join(targetPath, name);
  try {
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
  } catch (/** @type {any} */ error) {
    vscode.window.showErrorMessage(`创建目录失败: ${error.message}`);
    return;
  }

  const filesToCreate = [];

  // 需求2: 支持自定义 .vue 模板
  const projectRoot = findProjectRoot(targetPath);
  const pascalName = templates.kebabToPascal(name);
  const camelName = templates.kebabToCamel(name);

  // 计算路由路径
  const appConfigPath = findAppConfig(targetPath);
  let routePath = '';
  if (appConfigPath) {
    const srcPath = path.dirname(appConfigPath);
    const relativePath = path.relative(srcPath, componentDir);
    routePath = relativePath.replace(/\\/g, '/') + '/index';
  }

  if (type === 'page') {
    // 尝试加载自定义页面模板
    let vueTemplate = null;
    if (projectRoot) {
      const customTemplate = loadCustomTemplate(projectRoot, 'page');
      if (customTemplate) {
        vueTemplate = replaceTemplatePlaceholders(customTemplate, name, pascalName, camelName, routePath, style);
        vscode.window.setStatusBarMessage('已使用自定义页面模板', 3000);
      }
    }

    // 如果没有自定义模板，使用内置模板
    if (!vueTemplate) {
      vueTemplate = templates.getPageVueTemplate(name, { vueVersion, language, style }, routePath);
    }

    const configTemplate = templates.getPageConfigTemplate(name);
    const styleTemplate = templates.getPageStyleTemplate(name, style);

    filesToCreate.push(
      { path: path.join(componentDir, 'index.vue'), content: vueTemplate },
      { path: path.join(componentDir, 'index.config.js'), content: configTemplate },
      { path: path.join(componentDir, `index.module.${style}`), content: styleTemplate }
    );
  } else {
    // 尝试加载自定义组件模板
    let vueTemplate = null;
    if (projectRoot) {
      const customTemplate = loadCustomTemplate(projectRoot, 'component');
      if (customTemplate) {
        vueTemplate = replaceTemplatePlaceholders(customTemplate, name, pascalName, camelName, routePath, style);
        vscode.window.setStatusBarMessage('已使用自定义组件模板', 3000);
      }
    }

    // 如果没有自定义模板，使用内置模板
    if (!vueTemplate) {
      vueTemplate = templates.getComponentTemplate(name, { vueVersion, language, style }, routePath);
    }

    const configTemplate = templates.getComponentConfigTemplate(name);
    const styleTemplate = templates.getComponentStyleTemplate(name, style);

    filesToCreate.push(
      { path: path.join(componentDir, 'index.vue'), content: vueTemplate },
      { path: path.join(componentDir, 'index.config.js'), content: configTemplate },
      { path: path.join(componentDir, `index.module.${style}`), content: styleTemplate }
    );
  }

  for (const file of filesToCreate) {
    try {
      fs.writeFileSync(file.path, file.content, 'utf-8');
    } catch (error) {
      vscode.window.showErrorMessage(`创建文件 ${path.basename(file.path)} 失败: ${error.message}`);
      return;
    }
  }

  if (type === 'page') {
    const appConfigPath = findAppConfig(targetPath);
    if (appConfigPath) {
      const srcPath = path.dirname(appConfigPath);
      const relativePath = path.relative(srcPath, componentDir);
      // 页面路由需要加上 /index
      const pageRoute = relativePath.replace(/\\/g, '/') + '/index';

      const result = addPageToAppConfig(appConfigPath, pageRoute);
      if (result.success) {
        vscode.window.setStatusBarMessage(result.message, 3000);
        const appConfigDoc = await vscode.workspace.openTextDocument(appConfigPath);
        await vscode.window.showTextDocument(appConfigDoc);
      } else if (result.message !== '页面路径已存在') {
        vscode.window.setStatusBarMessage(result.message, 3000);
      }
    } else {
      vscode.window.showWarningMessage('未找到 app.config 文件，请确保在 Taro 项目中生成页面');
    }
  }

  const mainFile = path.join(componentDir, 'index.vue');
  const document = await vscode.workspace.openTextDocument(mainFile);
  await vscode.window.showTextDocument(document);

  vscode.window.setStatusBarMessage(
    `${type === 'page' ? '页面' : '组件'} "${name}" 已成功创建在 ${targetPath}`,
    3000
  );
}

/**
 * 处理模板选择
 */
async function handleSelectTemplate() {
  const config = vscode.workspace.getConfiguration('taroVue.template');

  const vueVersion = await vscode.window.showQuickPick(
    [
      { label: 'Vue 3', value: 'vue3' },
      { label: 'Vue 2', value: 'vue2' }
    ],
    { placeHolder: '选择 Vue 版本' }
  );

  if (!vueVersion) return;

  const language = await vscode.window.showQuickPick(
    [
      { label: 'JavaScript', value: 'javascript' },
      { label: 'TypeScript', value: 'typescript' }
    ],
    { placeHolder: '选择脚本语言' }
  );

  if (!language) return;

  const style = await vscode.window.showQuickPick(
    [
      { label: 'SCSS', value: 'scss' },
      { label: 'Less', value: 'less' },
      { label: 'Sass', value: 'sass' }
    ],
    { placeHolder: '选择样式预处理器' }
  );

  if (!style) return;

  await config.update('vueVersion', vueVersion.value, vscode.ConfigurationTarget.Global);
  await config.update('language', language.value, vscode.ConfigurationTarget.Global);
  await config.update('style', style.value, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(
    `模板配置已更新: ${vueVersion.label} + ${language.label} + ${style.label}`
  );
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};