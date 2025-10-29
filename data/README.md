# 数据目录

此目录用于存储应用的交易数据和备份。

## 文件说明

### `data.json`
主数据文件，存储所有交易记录。

**格式：**
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "expense|income",
      "amount": 100.00,
      "category": "分类名称",
      "note": "备注",
      "date": "2025-01-01",
      "time": "12:00"
    }
  ],
  "balance": 0,
  "next_id": 2
}
```

**注意：**
- `data.json` 包含个人数据，已被 `.gitignore` 排除
- 首次运行应用时会自动创建

### `data.example.json`
示例数据文件，展示数据格式。

### `backups/`
备份目录，由 `manage.sh backup` 命令创建。

## 初始化

首次使用时，应用会自动创建 `data.json`。

或者，你可以复制示例文件：
```bash
cp data/data.example.json data/data.json
```

## 备份

使用管理脚本创建备份：
```bash
./manage.sh backup
```

备份文件将保存在 `data/backups/` 目录中。

## 安全提示

⚠️ **重要：** 
- `data.json` 包含你的个人财务数据
- 请勿将其提交到公开的 Git 仓库
- 定期备份数据以防丢失

