# 图片转矢量格式工具

将 JPEG、JPG、PNG 格式的位图转换为 SVG 或 AI (Adobe Illustrator) 矢量格式。

## 功能特性

- ✅ 支持 JPEG、JPG、PNG 图片上传
- ✅ 输出 SVG 矢量格式（适合网页使用）
- ✅ 输出 AI 矢量格式（Adobe Illustrator 17.0 格式）
- ✅ 拖拽上传，实时预览
- ✅ 自动下载转换结果

## 本地部署指南

### 系统要求

- Node.js >= 20
- pnpm >= 9.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd <project-directory>
```

2. **安装依赖**
```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

3. **开发模式运行**
```bash
pnpm dev
```

访问 http://localhost:5000 即可使用。

### 生产环境部署

1. **构建项目**
```bash
pnpm build
```

2. **启动生产服务**
```bash
pnpm start
```

服务将运行在端口 5000。

### Docker 部署（可选）

创建 Dockerfile：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.0.0

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建项目
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 启动服务
CMD ["pnpm", "start"]
```

构建并运行：

```bash
docker build -t image-vectorizer .
docker run -p 5000:5000 image-vectorizer
```

### 环境变量配置

项目支持以下环境变量：

- `PORT` 或 `DEPLOY_RUN_PORT`: 服务端口（默认 5000）
- `COZE_WORKSPACE_PATH`: 工作目录路径

### 使用说明

1. 打开浏览器访问 http://localhost:5000
2. 上传 JPEG/JPG/PNG 图片（支持拖拽上传）
3. 选择输出格式：
   - **SVG**: 矢量图形格式，适合网页使用
   - **AI**: Adobe Illustrator 格式，适合专业设计软件
4. 点击"开始转换"
5. 转换完成后自动下载

## 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript
- **UI组件**: shadcn/ui + Tailwind CSS 4
- **图片处理**: Sharp
- **矢量化**: imagetracerjs

## 注意事项

- 图像越简单、对比度越高，转换效果越好
- 复杂照片转换后可能体积较大
- 建议先对图像进行预处理，提高对比度
- AI 格式文件可在 Adobe Illustrator 中打开和编辑

## 许可证

MIT