# 🏮 凤凰台现金管理系统

一个简洁、现代化的个人现金管理系统，支持收支记录、数据统计和趋势分析。

## ✨ 功能特性

- 💰 **收支管理**: 快速记录收入和支出
- 📊 **数据统计**: 实时查看今日收支、净收支
- 📈 **趋势分析**: 可视化展示日/周/月消费趋势
- 🎨 **现代UI**: 清新的蓝紫配色，响应式设计
- 🔒 **数据安全**: 本地JSON存储，自动备份
- 🐳 **Docker支持**: 一键部署，轻松上手

## 🚀 快速开始

### 方式一：使用统一管理脚本（推荐）

```bash
# 1. 初始化环境
./manage.sh init

# 2. 启动应用
./manage.sh start

# 3. 访问系统
# 前台: http://localhost:8080
# 后台: http://localhost:8080/admin
```

### 方式二：使用 Docker

```bash
# 1. 构建并启动
docker-compose up -d

# 2. 查看日志
docker-compose logs -f

# 3. 停止服务
docker-compose down
```

### 方式三：直接运行

```bash
# 1. 安装依赖
pip3 install -r requirements.txt

# 2. 运行应用
python3 run.py
```

## 📋 管理脚本命令

`manage.sh` 是统一的管理脚本，整合了所有常用功能：

```bash
./manage.sh start      # 启动应用
./manage.sh stop       # 停止应用
./manage.sh restart    # 重启应用
./manage.sh status     # 查看运行状态
./manage.sh logs       # 查看实时日志
./manage.sh clean      # 清理日志
./manage.sh backup     # 备份数据
./manage.sh init       # 初始化环境
./manage.sh config     # 显示配置信息
./manage.sh help       # 显示帮助信息
```

### 使用示例

```bash
# 首次使用，初始化环境
./manage.sh init

# 启动应用
./manage.sh start

# 查看运行状态
./manage.sh status

# 查看实时日志（Ctrl+C 退出）
./manage.sh logs

# 备份数据（自动保留最近10个备份）
./manage.sh backup

# 重启应用（修改代码后）
./manage.sh restart

# 停止应用
./manage.sh stop
```

## ⚙️ 配置说明

### 统一端口配置

端口配置在以下文件中保持一致（默认: **8080**）：

1. **manage.sh** (第11行)
   ```bash
   PORT=8080
   ```

2. **config.py** (第11行)
   ```python
   PORT = int(os.getenv('PORT', 8080))
   ```

3. **run.py** (第6行)
   ```python
   DEFAULT_PORT = os.getenv('PORT', '8080')
   ```

4. **Dockerfile** (第31行)
   ```dockerfile
   EXPOSE 8080
   ```

5. **docker-compose.yml** (第7行)
   ```yaml
   ports:
     - "8080:8080"
   ```

### 修改端口

如需修改端口，只需修改 `manage.sh` 中的 `PORT` 变量，其他地方会自动使用环境变量：

```bash
# 在 manage.sh 中修改
PORT=3000  # 改为你想要的端口

# 或者通过环境变量
PORT=3000 ./manage.sh start
```

## 📁 项目结构

```
xianjin/
├── manage.sh              # 统一管理脚本 ⭐
├── app.py                 # Flask 主程序
├── run.py                 # 启动脚本
├── config.py              # 配置文件
├── requirements.txt       # Python 依赖
├── Dockerfile             # Docker 镜像
├── docker-compose.yml     # Docker Compose 配置
├── templates/             # HTML 模板
│   ├── index.html        # 前台页面
│   └── admin.html        # 后台页面
├── static/               # 静态资源（如需要）
├── data/                 # 数据目录
│   ├── data.json        # 交易数据
│   └── backups/         # 数据备份
└── logs/                # 日志目录
    └── app.log          # 应用日志
```

## 🎨 界面预览

### 前台页面
- 📊 今日数据展示（收入、支出、净收支）
- ➕ 快速记账按钮（收入/支出）
- 📈 消费趋势分析（日/周/月）
- 📋 最近交易记录

### 后台页面
- 📊 数据概览（总余额、总收入、总支出等）
- 🔍 高级筛选（日期范围、类型、分类）
- 📄 分页展示交易记录
- 📈 分类消费趋势图（多线图）
- 📥 数据导出（CSV/JSON）

## 🔧 技术栈

- **后端**: Flask (Python)
- **前端**: HTML5 + CSS3 + JavaScript
- **图表**: ECharts
- **日期**: Day.js
- **存储**: JSON 文件
- **容器**: Docker + Docker Compose

## 🛡️ 数据安全

- ✅ 本地存储，数据完全受控
- ✅ 自动备份机制（保留最近10个备份）
- ✅ 手动备份命令: `./manage.sh backup`
- ✅ 数据文件: `data/data.json`
- ✅ 备份目录: `data/backups/`

## 📝 开发说明

### 环境要求

- Python 3.9+
- Flask 2.0+
- Docker (可选)

### 本地开发

```bash
# 1. 克隆项目
git clone <your-repo>
cd xianjin

# 2. 安装依赖
pip3 install -r requirements.txt

# 3. 启动开发服务器
./manage.sh start

# 4. 查看日志
./manage.sh logs
```

### 修改端口

所有端口配置统一管理，修改 `manage.sh` 即可：

```bash
# 在 manage.sh 第11行修改
PORT=3000  # 改为你想要的端口
```

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f xianjin-app

# 停止服务
docker-compose down
```

## 🐛 故障排查

### 端口被占用

```bash
# 使用管理脚本会自动处理
./manage.sh start  # 会自动终止占用端口的进程

# 或手动终止
lsof -ti:8080 | xargs kill -9
```

### 应用无法启动

```bash
# 查看日志
./manage.sh logs

# 或直接查看日志文件
tail -f logs/app.log
```

### 数据丢失

```bash
# 恢复备份
cp data/backups/data_backup_20251029_120000.json data/data.json

# 重启应用
./manage.sh restart
```

## 📄 许可证

MIT License

## 👨‍💻 作者

凤凰台现金管理系统

## 🙏 致谢

感谢所有开源项目的贡献者！

---

**⚡ 快速开始**: `./manage.sh init && ./manage.sh start`

**🌐 访问地址**: http://localhost:8080

**💡 获取帮助**: `./manage.sh help`
