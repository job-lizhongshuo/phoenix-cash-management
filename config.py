"""
凤凰台现金管理系统 - 配置管理
"""
import os
from datetime import datetime

class Config:
    """基础配置"""
    # 应用配置
    APP_NAME = os.getenv('APP_NAME', '凤凰台现金管理系统')
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # 服务器配置
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 8080))
    
    # 数据存储配置
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.getenv('DATA_DIR', os.path.join(BASE_DIR, 'data'))
    DATA_FILE = os.getenv('DATA_FILE', 'data.json')
    # 数据文件应该在 data 目录下
    DATA_FILE_PATH = os.path.join(DATA_DIR, DATA_FILE)
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_DIR = os.getenv('LOG_DIR', os.path.join(BASE_DIR, 'logs'))
    LOG_FILE = os.path.join(LOG_DIR, 'app.log')
    
    # 业务配置
    MAX_TRANSACTIONS_DISPLAY = int(os.getenv('MAX_TRANSACTIONS_DISPLAY', 10000))  # 增加到10000
    DEFAULT_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "工资", "其他"]
    
    # 备份配置
    BACKUP_ENABLED = os.getenv('BACKUP_ENABLED', 'true').lower() == 'true'
    BACKUP_INTERVAL_HOURS = int(os.getenv('BACKUP_INTERVAL_HOURS', 24))
    BACKUP_DIR = os.path.join(DATA_DIR, 'backups')
    
    @classmethod
    def init_app(cls):
        """初始化应用配置"""
        # 创建必要的目录
        os.makedirs(cls.DATA_DIR, exist_ok=True)
        os.makedirs(cls.LOG_DIR, exist_ok=True)
        if cls.BACKUP_ENABLED:
            os.makedirs(cls.BACKUP_DIR, exist_ok=True)


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    FLASK_ENV = 'development'


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    FLASK_ENV = 'production'


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    DEBUG = True


# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config():
    """获取当前配置"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])

