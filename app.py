"""
凤凰台现金管理系统
版本: 2.0 (Docker 优化版)
"""
from flask import Flask, jsonify, request, abort, render_template, send_from_directory
from datetime import datetime
import json
import os
import logging
from logging.handlers import RotatingFileHandler
from werkzeug.exceptions import HTTPException
from config import get_config

# 初始化应用
app = Flask(__name__, static_folder='static', template_folder='templates')
config = get_config()
config.init_app()

# 配置应用
app.config.from_object(config)
DATA_FILE = config.DATA_FILE_PATH


# ==================== 日志配置 ====================
def setup_logging():
    """配置日志系统"""
    log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
    
    # 创建日志格式
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 文件处理器（带日志轮转）
    file_handler = RotatingFileHandler(
        config.LOG_FILE,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    
    # 配置 Flask 日志
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)
    
    app.logger.info(f"{config.APP_NAME} 启动成功")
    app.logger.info(f"数据文件: {DATA_FILE}")
    app.logger.info(f"日志级别: {config.LOG_LEVEL}")


setup_logging()


# ==================== 数据管理 ====================
def init_data_file():
    """初始化数据文件"""
    if not os.path.exists(DATA_FILE):
        default_data = {
            "transactions": [],
            "balance": 0,
            "categories": config.DEFAULT_CATEGORIES
        }
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
        app.logger.info(f"已创建新的数据文件: {DATA_FILE}")


def load_data():
    """读取数据"""
    try:
        init_data_file()
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        app.logger.error(f"JSON 解析错误: {e}")
        # 备份损坏的文件
        backup_file = f"{DATA_FILE}.error.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        os.rename(DATA_FILE, backup_file)
        app.logger.warning(f"已备份损坏文件到: {backup_file}")
        init_data_file()
        return load_data()
    except Exception as e:
        app.logger.error(f"读取数据失败: {e}")
        raise


def save_data(data):
    """保存数据（带备份）"""
    try:
        # 先保存到临时文件
        temp_file = f"{DATA_FILE}.tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 验证临时文件可以正常读取
        with open(temp_file, 'r', encoding='utf-8') as f:
            json.load(f)
        
        # 替换原文件
        if os.path.exists(DATA_FILE):
            os.replace(temp_file, DATA_FILE)
        else:
            os.rename(temp_file, DATA_FILE)
        
        app.logger.debug("数据保存成功")
    except Exception as e:
        app.logger.error(f"保存数据失败: {e}")
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise


# ==================== 错误处理 ====================
@app.errorhandler(Exception)
def handle_exception(e):
    """全局异常处理"""
    # 处理 HTTP 异常
    if isinstance(e, HTTPException):
        response = {
            "success": False,
            "error": e.name,
            "message": e.description,
            "status_code": e.code
        }
        return jsonify(response), e.code
    
    # 处理其他异常
    app.logger.error(f"未处理的异常: {str(e)}", exc_info=True)
    response = {
        "success": False,
        "error": "Internal Server Error",
        "message": "服务器内部错误，请稍后重试",
        "status_code": 500
    }
    return jsonify(response), 500


@app.errorhandler(404)
def not_found(e):
    """404 错误处理"""
    return jsonify({
        "success": False,
        "error": "Not Found",
        "message": "请求的资源不存在",
        "status_code": 404
    }), 404


@app.errorhandler(400)
def bad_request(e):
    """400 错误处理"""
    return jsonify({
        "success": False,
        "error": "Bad Request",
        "message": str(e.description) if e.description else "请求参数错误",
        "status_code": 400
    }), 400


# ==================== 健康检查 ====================
@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    try:
        # 检查数据文件是否可读
        data = load_data()
        
        return jsonify({
            "status": "healthy",
            "app_name": config.APP_NAME,
            "timestamp": datetime.now().isoformat(),
            "data_file": os.path.exists(DATA_FILE),
            "transactions_count": len(data.get('transactions', [])),
            "balance": data.get('balance', 0)
        }), 200
    except Exception as e:
        app.logger.error(f"健康检查失败: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503


@app.route('/api/info', methods=['GET'])
def api_info():
    """API 信息端点"""
    return jsonify({
        "app_name": config.APP_NAME,
        "version": "2.0",
        "endpoints": {
            "health": "/health",
            "index": "/",
            "admin": "/admin",
            "transactions": "/api/transactions",
            "categories": "/api/categories",
            "reports": "/api/reports/<period>"
        }
    })


# ==================== 页面路由 ====================
@app.route('/')
def index():
    """首页"""
    return render_template('index.html')


@app.route('/admin')
def admin_dashboard():
    """后台管理页面"""
    try:
        data = load_data()
        
        # 计算今日数据
        today = datetime.now().strftime('%Y-%m-%d')
        today_transactions = [
            t for t in data['transactions']
            if t.get('date') == today
        ]
        today_income = sum(t['amount'] for t in today_transactions if t.get('type') == 'income')
        today_expense = sum(t['amount'] for t in today_transactions if t.get('type') == 'expense')
        
        return render_template('admin.html',
                             balance=data.get('balance', 0),
                             today_income=today_income,
                             today_expense=today_expense)
    except Exception as e:
        app.logger.error(f"加载后台页面失败: {e}")
        abort(500, description="加载后台页面失败")


# ==================== 静态文件 ====================
@app.route('/static/<path:filename>')
def static_files(filename):
    """静态文件路由"""
    return send_from_directory(app.static_folder, filename)


# ==================== API 路由 ====================
@app.route('/api/transactions', methods=['GET', 'POST'])
def handle_transactions():
    """交易API - 获取和创建交易"""
    data = load_data()
    
    if request.method == 'GET':
        # 获取查询参数
        limit = request.args.get('limit', config.MAX_TRANSACTIONS_DISPLAY, type=int)
        period = request.args.get('period', None)
        date = request.args.get('date', None)
        
        transactions = data.get("transactions", [])
        
        # 根据查询参数过滤
        if period or date:
            transactions = filter_transactions_by_period(transactions, period, date)
        
        # 限制返回数量
        transactions = transactions[:limit]
        
        return jsonify({
            "success": True,
            "transactions": transactions,
            "balance": data.get("balance", 0),
            "total": len(data.get("transactions", []))
        })
    
    elif request.method == 'POST':
        try:
            transaction = request.get_json()
            
            # 验证必要字段
            required_fields = ['type', 'amount', 'category', 'date', 'time']
            for field in required_fields:
                if field not in transaction:
                    abort(400, description=f"缺少必要字段: {field}")
            
            # 验证交易类型
            if transaction['type'] not in ['income', 'expense']:
                abort(400, description="交易类型必须是 income 或 expense")
            
            # 生成唯一ID
            transaction['id'] = int(datetime.now().timestamp() * 1000)
            
            # 验证金额
            try:
                amount = float(transaction['amount'])
                if amount <= 0:
                    abort(400, description="金额必须大于0")
            except (ValueError, TypeError):
                abort(400, description="金额格式不正确")
            
            # 更新余额
            if transaction['type'] == 'income':
                data['balance'] = data.get('balance', 0) + amount
            else:
                data['balance'] = data.get('balance', 0) - amount
            
            # 添加交易记录
            data['transactions'].insert(0, transaction)
            
            # 保存数据
            save_data(data)
            
            app.logger.info(f"新增交易: {transaction['type']} ¥{amount} - {transaction.get('category')}")
            
            return jsonify({
                "success": True,
                "message": "交易添加成功",
                "balance": data['balance'],
                "transaction_id": transaction['id']
            }), 201
            
        except Exception as e:
            app.logger.error(f"添加交易失败: {e}")
            abort(500, description="添加交易失败")


@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """删除指定交易记录"""
    try:
        data = load_data()
        original_count = len(data.get('transactions', []))
        
        # 找到要删除的交易
        transaction_to_delete = None
        for t in data['transactions']:
            if t.get('id') == transaction_id:
                transaction_to_delete = t
                break
        
        if not transaction_to_delete:
            return jsonify({
                "success": False,
                "message": "未找到对应交易记录"
            }), 404
        
        # 删除记录
        data['transactions'] = [t for t in data['transactions'] if t.get('id') != transaction_id]
        
        # 重新计算余额
        data['balance'] = sum(
            t['amount'] if t['type'] == 'income' else -t['amount']
            for t in data['transactions']
        )
        
        save_data(data)
        
        app.logger.info(f"删除交易: ID={transaction_id}, {transaction_to_delete.get('type')} ¥{transaction_to_delete.get('amount')}")
        
        return jsonify({
            "success": True,
            "message": "记录已删除",
            "new_balance": data['balance']
        })
        
    except Exception as e:
        app.logger.error(f"删除交易失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """更新指定交易记录"""
    try:
        data = load_data()
        update_data = request.get_json()
        
        if not update_data:
            abort(400, description="缺少更新数据")
        
        # 找到要更新的交易
        transaction_to_update = None
        transaction_index = None
        
        for index, t in enumerate(data['transactions']):
            if t.get('id') == transaction_id:
                transaction_to_update = t
                transaction_index = index
                break
        
        if not transaction_to_update:
            return jsonify({
                "success": False,
                "message": "未找到对应交易记录"
            }), 404
        
        # 验证更新数据
        if 'type' in update_data and update_data['type'] not in ['income', 'expense']:
            abort(400, description="交易类型必须是 income 或 expense")
        
        if 'amount' in update_data:
            try:
                amount = float(update_data['amount'])
                if amount <= 0:
                    abort(400, description="金额必须大于0")
            except (ValueError, TypeError):
                abort(400, description="金额格式不正确")
        
        # 更新交易记录
        old_type = transaction_to_update.get('type')
        old_amount = transaction_to_update.get('amount', 0)
        
        # 更新字段
        if 'type' in update_data:
            transaction_to_update['type'] = update_data['type']
        if 'amount' in update_data:
            transaction_to_update['amount'] = float(update_data['amount'])
        if 'category' in update_data:
            transaction_to_update['category'] = update_data['category']
        if 'remark' in update_data:
            transaction_to_update['remark'] = update_data['remark']
        
        # 更新时间戳
        from datetime import datetime
        transaction_to_update['updated_at'] = datetime.now().isoformat()
        
        # 重新计算余额
        data['balance'] = sum(
            t['amount'] if t['type'] == 'income' else -t['amount']
            for t in data['transactions']
        )
        
        # 保存数据
        save_data(data)
        
        app.logger.info(f"更新交易: ID={transaction_id}, {transaction_to_update.get('type')} ¥{transaction_to_update.get('amount')}")
        
        return jsonify({
            "success": True,
            "message": "记录已更新",
            "transaction": transaction_to_update,
            "new_balance": data['balance']
        })
        
    except Exception as e:
        app.logger.error(f"更新交易失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """获取分类列表"""
    try:
        data = load_data()
        categories = data.get('categories', config.DEFAULT_CATEGORIES)
        return jsonify({
            "success": True,
            "categories": categories
        })
    except Exception as e:
        app.logger.error(f"获取分类失败: {e}")
        abort(500, description="获取分类失败")


@app.route('/api/reports/<period>', methods=['GET'])
def get_report(period):
    """获取统计报表"""
    try:
        data = load_data()
        transactions = data.get('transactions', [])
        
        if period not in ['day', 'week', 'month', 'year']:
            abort(400, description="无效的统计周期，支持: day, week, month, year")
        
        # 过滤交易
        filtered = filter_transactions_by_period(transactions, period)
        
        # 计算统计数据
        income = sum(t['amount'] for t in filtered if t.get('type') == 'income')
        expense = sum(t['amount'] for t in filtered if t.get('type') == 'expense')
        
        return jsonify({
            "success": True,
            "period": period,
            "transactions": filtered,
            "income": income,
            "expense": expense,
            "net": income - expense,
            "count": len(filtered)
        })
        
    except Exception as e:
        app.logger.error(f"获取报表失败: {e}")
        abort(500, description="获取报表失败")


@app.route('/data.json')
def get_json_data():
    """标准API端点返回JSON数据"""
    try:
        data = load_data()
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({
            "error": "文件未找到",
            "status": 404
        }), 404
    except json.JSONDecodeError:
        return jsonify({
            "error": "JSON格式错误",
            "status": 500
        }), 500


# ==================== 辅助函数 ====================
def filter_transactions_by_period(transactions, period=None, date=None):
    """根据周期过滤交易"""
    if not period and not date:
        return transactions
    
    now = datetime.now()
    
    if date:
        # 按具体日期过滤
        return [t for t in transactions if t.get('date') == date]
    
    if period == 'day':
        today = now.strftime('%Y-%m-%d')
        return [t for t in transactions if t.get('date') == today]
    elif period == 'week':
        # 最近7天
        return transactions[:min(len(transactions), 50)]
    elif period == 'month':
        # 当月
        current_month = now.strftime('%Y-%m')
        return [t for t in transactions if t.get('date', '').startswith(current_month)]
    elif period == 'year':
        # 当年
        current_year = now.strftime('%Y')
        return [t for t in transactions if t.get('date', '').startswith(current_year)]
    
    return transactions


# ==================== 启动应用 ====================
if __name__ == '__main__':
    # 从环境变量读取端口，默认8080
    port = int(os.getenv('PORT', config.PORT))
    
    app.logger.info("=" * 50)
    app.logger.info(f"启动 {config.APP_NAME}")
    app.logger.info(f"环境: {os.getenv('FLASK_ENV', 'development')}")
    app.logger.info(f"主机: {config.HOST}:{port}")
    app.logger.info("=" * 50)
    
    # 生产环境使用 gunicorn，这里仅用于开发
    app.run(
        host=config.HOST,
        port=port,
        debug=app.config.get('DEBUG', False)
    )
