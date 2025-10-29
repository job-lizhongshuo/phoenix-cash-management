#!/usr/bin/env python3
"""
简单的启动脚本 - 用于调试
"""
import os
os.environ['FLASK_ENV'] = 'development'

from app import app

if __name__ == '__main__':
    # 使用8080端口，避免与macOS AirPlay冲突
    PORT = 8080
    
    print("=" * 60)
    print("🏮 凤凰台现金管理系统 v2.0")
    print("=" * 60)
    print(f"✅ 启动服务...")
    print(f"📍 访问地址: http://localhost:{PORT}")
    print(f"📍 后台管理: http://localhost:{PORT}/admin")
    print(f"🔧 健康检查: http://localhost:{PORT}/health")
    print(f"💡 按 Ctrl+C 停止服务")
    print("=" * 60)
    print()
    
    try:
        app.run(
            host='0.0.0.0',
            port=PORT,
            debug=False,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except Exception as e:
        print(f"\n❌ 启动失败: {e}")
