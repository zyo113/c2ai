#!/bin/bash
# 快速部署脚本 - 图片转矢量格式工具

set -e

echo "================================"
echo "图片转矢量格式工具 - 快速部署"
echo "================================"

# 检查 Node.js 版本
echo "1. 检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
if [[ "$NODE_VERSION" == "not installed" ]]; then
    echo "❌ Node.js 未安装"
    echo "请安装 Node.js >= 20.0.0: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 pnpm
echo "2. 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    echo "正在安装 pnpm..."
    npm install -g pnpm@9.0.0
fi

PNPM_VERSION=$(pnpm -v)
echo "✅ pnpm 版本: $PNPM_VERSION"

# 安装依赖
echo "3. 安装依赖..."
pnpm install
echo "✅ 依赖安装完成"

# 检查 Sharp
echo "4. 检查 Sharp..."
if node -e "require('sharp')" 2>/dev/null; then
    echo "✅ Sharp 正常"
else
    echo "⚠️ Sharp 可能有问题，尝试重新安装..."
    pnpm rebuild sharp
fi

# 构建项目（生产模式）
echo "5. 构建项目..."
pnpm build
echo "✅ 构建完成"

# 启动服务
echo "6. 启动服务..."
echo "================================"
echo "✅ 部署成功！"
echo ""
echo "开发模式: pnpm dev"
echo "生产模式: pnpm start"
echo ""
echo "访问地址: http://localhost:5000"
echo "================================"