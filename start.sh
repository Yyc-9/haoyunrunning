#!/bin/bash

echo "🚀 启动 好運跑班 网站"
echo "=========================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本（/Users/yangyichen/Desktop/好运网站）"
    exit 1
fi

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装。请先安装Node.js：https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装。请检查Node.js安装。"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

# 清理之前的端口占用
echo "🔄 清理之前的进程..."
pkill -f "next.*dev" 2>/dev/null || true

# 启动开发服务器
echo "🌐 启动开发服务器..."
echo ""
echo "正在启动... 请稍候"
echo "成功启动后，请打开浏览器访问：http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo "=========================="
echo ""

npm run dev