#!/bin/bash

# ============================================================
# 凤凰台现金管理系统 - 统一管理脚本
# ============================================================

# 配置项（所有地方统一使用）
APP_NAME="凤凰台现金管理系统"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$APP_DIR/app.py"
RUN_FILE="$APP_DIR/run.py"
PID_FILE="$APP_DIR/app.pid"
LOG_FILE="$APP_DIR/logs/app.log"
DATA_DIR="$APP_DIR/data"
LOG_DIR="$APP_DIR/logs"

# 端口配置（统一管理）
PORT=8080
HOST="0.0.0.0"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
}

# 检查Python是否安装
check_python() {
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 未安装，请先安装 Python3"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 获取占用端口的进程
get_port_process() {
    lsof -ti:$PORT 2>/dev/null
}

# 终止占用端口的进程
kill_port_process() {
    local pids=$(get_port_process)
    if [ -n "$pids" ]; then
        print_warning "终止占用端口 $PORT 的进程: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        return 0
    fi
    return 1
}

# 检查应用是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # 运行中
        else
            rm -f "$PID_FILE"
            return 1  # 未运行
        fi
    fi
    return 1  # 未运行
}

# 初始化环境
init_env() {
    print_header "初始化环境"
    
    # 创建必要的目录
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    print_success "创建数据目录: $DATA_DIR"
    print_success "创建日志目录: $LOG_DIR"
    
    # 检查 data.json 文件
    if [ ! -f "$DATA_DIR/data.json" ]; then
        echo '{"transactions": [], "balance": 0, "next_id": 1}' > "$DATA_DIR/data.json"
        print_success "创建数据文件: $DATA_DIR/data.json"
    else
        print_info "数据文件已存在: $DATA_DIR/data.json"
    fi
    
    # 检查依赖
    if [ ! -f "$APP_DIR/requirements.txt" ]; then
        print_warning "requirements.txt 不存在"
    else
        print_info "检查 Python 依赖..."
        if pip3 list | grep -q Flask; then
            print_success "Flask 已安装"
        else
            print_warning "Flask 未安装，尝试安装依赖..."
            pip3 install -r "$APP_DIR/requirements.txt"
        fi
    fi
    
    print_success "环境初始化完成"
    echo ""
}

# 启动应用
start_app() {
    print_header "启动 $APP_NAME"
    
    check_python
    
    # 检查是否已经运行
    if is_running; then
        print_warning "应用已经在运行中 (PID: $(cat $PID_FILE))"
        print_info "如需重启，请使用: ./manage.sh restart"
        return 1
    fi
    
    # 检查端口
    if check_port; then
        print_warning "端口 $PORT 已被占用"
        print_info "尝试终止占用端口的进程..."
        kill_port_process
    fi
    
    # 设置环境变量
    export PORT=$PORT
    export HOST=$HOST
    export FLASK_ENV=development
    
    print_info "启动服务..."
    print_info "端口: $PORT"
    print_info "地址: http://localhost:$PORT"
    print_info "后台: http://localhost:$PORT/admin"
    
    # 启动应用（后台运行）
    nohup python3 "$RUN_FILE" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # 等待启动
    sleep 2
    
    # 检查是否启动成功
    if is_running; then
        print_success "应用启动成功 (PID: $pid)"
        print_info "访问地址: http://localhost:$PORT"
        print_info "日志文件: $LOG_FILE"
        echo ""
        print_info "💡 提示: 使用 './manage.sh logs' 查看实时日志"
        print_info "💡 提示: 使用 './manage.sh stop' 停止服务"
    else
        print_error "应用启动失败"
        print_info "查看日志: tail -f $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

# 停止应用
stop_app() {
    print_header "停止 $APP_NAME"
    
    if ! is_running; then
        print_warning "应用未运行"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    print_info "停止应用 (PID: $pid)..."
    
    kill "$pid" 2>/dev/null
    sleep 1
    
    # 如果进程还在运行，强制终止
    if ps -p "$pid" > /dev/null 2>&1; then
        print_warning "正常停止失败，强制终止..."
        kill -9 "$pid" 2>/dev/null
        sleep 1
    fi
    
    rm -f "$PID_FILE"
    print_success "应用已停止"
}

# 重启应用
restart_app() {
    print_header "重启 $APP_NAME"
    
    stop_app
    sleep 2
    start_app
}

# 查看状态
status_app() {
    print_header "应用状态"
    
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_success "应用运行中"
        echo ""
        echo "  PID:     $pid"
        echo "  端口:    $PORT"
        echo "  前台:    http://localhost:$PORT"
        echo "  后台:    http://localhost:$PORT/admin"
        echo "  日志:    $LOG_FILE"
        echo "  数据:    $DATA_DIR/data.json"
        echo ""
        
        # 显示进程信息
        print_info "进程信息:"
        ps aux | grep "$pid" | grep -v grep | awk '{printf "  CPU: %s%%  MEM: %s%%  TIME: %s\n", $3, $4, $10}'
        
        # 检查端口
        if check_port; then
            print_success "端口 $PORT 监听正常"
        else
            print_warning "端口 $PORT 未监听"
        fi
    else
        print_warning "应用未运行"
        
        # 检查端口是否被其他进程占用
        if check_port; then
            print_warning "端口 $PORT 被其他进程占用"
            local pids=$(get_port_process)
            echo "  占用进程: $pids"
        fi
    fi
}

# 查看日志
view_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_warning "日志文件不存在: $LOG_FILE"
        return 1
    fi
    
    print_header "查看日志 (按 Ctrl+C 退出)"
    echo ""
    tail -f "$LOG_FILE"
}

# 清理日志
clean_logs() {
    print_header "清理日志"
    
    if [ -f "$LOG_FILE" ]; then
        echo "" > "$LOG_FILE"
        print_success "日志已清理: $LOG_FILE"
    else
        print_info "日志文件不存在"
    fi
}

# 备份数据
backup_data() {
    print_header "备份数据"
    
    local backup_dir="$DATA_DIR/backups"
    mkdir -p "$backup_dir"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/data_backup_$timestamp.json"
    
    if [ -f "$DATA_DIR/data.json" ]; then
        cp "$DATA_DIR/data.json" "$backup_file"
        print_success "数据已备份: $backup_file"
        
        # 保留最近10个备份
        local backup_count=$(ls -1 "$backup_dir" | wc -l)
        if [ $backup_count -gt 10 ]; then
            print_info "清理旧备份..."
            ls -1t "$backup_dir" | tail -n +11 | xargs -I {} rm "$backup_dir/{}"
            print_success "已清理旧备份，保留最近10个"
        fi
    else
        print_warning "数据文件不存在，无法备份"
    fi
}

# 显示配置信息
show_config() {
    print_header "配置信息"
    echo ""
    echo "  应用名称:  $APP_NAME"
    echo "  应用目录:  $APP_DIR"
    echo "  主程序:    $RUN_FILE"
    echo "  端口:      $PORT"
    echo "  主机:      $HOST"
    echo "  数据目录:  $DATA_DIR"
    echo "  日志目录:  $LOG_DIR"
    echo "  PID 文件:  $PID_FILE"
    echo ""
}

# 显示帮助信息
show_help() {
    print_header "$APP_NAME - 管理脚本"
    echo ""
    echo "用法: ./manage.sh [命令]"
    echo ""
    echo "命令列表:"
    echo "  start      启动应用"
    echo "  stop       停止应用"
    echo "  restart    重启应用"
    echo "  status     查看运行状态"
    echo "  logs       查看实时日志"
    echo "  clean      清理日志"
    echo "  backup     备份数据"
    echo "  init       初始化环境"
    echo "  config     显示配置信息"
    echo "  help       显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./manage.sh start      # 启动应用"
    echo "  ./manage.sh status     # 查看状态"
    echo "  ./manage.sh logs       # 查看日志"
    echo "  ./manage.sh restart    # 重启应用"
    echo ""
}

# 主函数
main() {
    case "$1" in
        start)
            start_app
            ;;
        stop)
            stop_app
            ;;
        restart)
            restart_app
            ;;
        status)
            status_app
            ;;
        logs)
            view_logs
            ;;
        clean)
            clean_logs
            ;;
        backup)
            backup_data
            ;;
        init)
            init_env
            ;;
        config)
            show_config
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            if [ -z "$1" ]; then
                show_help
            else
                print_error "未知命令: $1"
                echo ""
                show_help
            fi
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"

