# ============================================================
# 凤凰台现金管理系统 - Docker 镜像
# 
# 构建说明:
#   docker build -t xianjin:latest .
#   docker-compose build
# ============================================================

# 基础镜像: Python 3.11 精简版
# 选择 slim 版本以减小镜像体积，同时保留必要的系统库
FROM python:3.11-slim

# 设置工作目录
# 所有后续的命令都会在这个目录下执行
WORKDIR /app

# 设置环境变量
# PYTHONDONTWRITEBYTECODE: 防止 Python 生成 .pyc 字节码文件
# PYTHONUNBUFFERED: 确保 Python 输出立即刷新到终端（便于查看日志）
# TZ: 设置时区为上海（东八区）
# PORT: 应用监听端口
# HOST: 应用绑定地址（0.0.0.0 允许外部访问）
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai \
    PORT=8080 \
    HOST=0.0.0.0

# 安装系统依赖
# tzdata: 时区数据包，用于正确处理时间
# curl: HTTP 客户端，用于健康检查
# 安装完成后清理缓存以减小镜像体积
RUN apt-get update && apt-get install -y \
    tzdata \
    curl \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
# 先复制 requirements.txt，利用 Docker 层缓存机制
# 只有当依赖变化时才重新安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制应用程序文件
# app.py: Flask 主程序
# run.py: 启动脚本
# config.py: 配置文件
COPY app.py .
COPY run.py .
COPY config.py .

# 复制前端资源文件
# templates/: HTML 模板文件
# static/: 静态资源（CSS、JS、图片等）
COPY templates/ templates/
COPY static/ static/

# 创建必要的目录
# data/: 存储交易数据
# logs/: 存储应用日志
# 注意：不需要复制 data.json，因为：
# 1. Volume 挂载会覆盖容器内的 /app/data 目录
# 2. app.py 会在启动时自动检查并创建 data.json
RUN mkdir -p /app/data /app/logs

# 设置数据卷
# 这些目录的数据会持久化，不会随容器删除而丢失
VOLUME ["/app/data", "/app/logs"]

# 暴露端口
# 声明容器运行时监听的端口（需要在 docker-compose 中映射）
EXPOSE 8080

# 健康检查配置
# interval: 每30秒检查一次
# timeout: 检查超时时间10秒
# start-period: 容器启动后5秒开始检查
# retries: 连续失败3次后标记为不健康
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动应用
# 使用 run.py 启动，与本地开发环境保持一致
CMD ["python", "run.py"]
