# 课程表 Web 应用

这是一个基于原 GDScript 代码重新实现的 Web 静态页面版本的课程表应用。

纯在vibe, 哈哈

## 导入课程数据

- **JSON**：`.json` / `.txt`（原有格式，见设置面板内的格式说明）。
- **ICS（推荐）**：`ics-parser.js` 支持把教务课表页导出的 `.ics` 文件/文本直接导入——
  - 设置面板 → 导入课程数据 → **选择文件** 选 `.ics`（或粘贴 ICS 文本后点「验证格式」/「保存数据」）；
  - 自动转换为本页 JSON 后即可编辑、保存、导出。
  - 字段映射：`SUMMARY`→课程名，`LOCATION`→教室（去掉校区前缀），`DESCRIPTION` 内「教师/周次/节次/学分」→详情与授课教师。
  - 兼容：教务脚本导出的 UTC(Z) 时间、本应用导出的浮动时间、`TZID=Asia/Shanghai`、`FREQ=WEEKLY` 重复日程（INTERVAL/BYDAY/COUNT/UNTIL）。

`2data.json` / `example_data.json` 为历史数据样本，仅供格式参考。
