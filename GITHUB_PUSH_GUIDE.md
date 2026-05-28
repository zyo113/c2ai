# GitHub 推送指南

## 方案1：手动推送代码到你的仓库

### 步骤：

1. **下载代码压缩包**
   - 访问：http://localhost:5000/image-to-vector-tool.tar.gz
   - 或从项目根目录下载

2. **解压并进入目录**
```bash
tar -xzf image-to-vector-tool.tar.gz
cd image-to-vector-tool
```

3. **初始化Git仓库**
```bash
git init
git add .
git commit -m "feat: 图片转矢量格式工具"
```

4. **推送到你的GitHub仓库**
```bash
# 添加远程仓库
git remote add origin https://github.com/zyo113/ptai.git

# 推送代码（需要GitHub认证）
git push -u origin main
```

**认证方式：**
- 使用GitHub个人访问令牌（Personal Access Token）
- 或使用SSH密钥认证

### GitHub Token认证步骤：

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 创建新Token，勾选 `repo` 权限
3. 使用Token推送：
```bash
git push https://<YOUR_TOKEN>@github.com/zyo113/ptai.git main
```

---

## 方案2：使用GitHub CLI（推荐）

如果你已安装GitHub CLI（gh）：

```bash
# 认证GitHub
gh auth login

# 初始化并推送
gh repo create zyo113/ptai --source=. --remote=origin --push
```

---

## 方案3：手动上传到GitHub

1. 在GitHub创建新仓库：https://github.com/zyo113/ptai
2. 下载压缩包解压
3. 使用GitHub网页界面"Add file"功能上传所有文件

---

## 项目结构

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx          # 前端页面
│   │   └── api/convert/      # 转换API
│   │   └── route.ts
│   ├── components/ui/        # UI组件库
│   └── types/                # 类型定义
├── scripts/                  # 构建脚本
├── public/                   # 静态资源
├── package.json              # 依赖配置
├── README.md                 # 使用说明
└── DESIGN.md                 # 设计规范
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

访问：http://localhost:5000