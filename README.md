# 课程表 Web 应用

这是一个 Web 静态页面课程表应用。
推荐搭配[对应油猴脚本](https://greasyfork.org/zh-CN/scripts/569025-%E6%B7%B1%E5%9C%B3%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%E6%95%99%E5%8A%A1%E7%B3%BB%E7%BB%9F-%E8%AF%BE%E8%A1%A8%E5%AF%BC%E5%87%BAics)使用。
项目源码: <https://github.com/ChickenPige0n/CourseList>


## 导入课程数据

- **JSON**：`.json` / `.txt`（原有格式，见设置面板内的格式说明）。
- **ICS（推荐）**：`ics-parser.js` 支持把教务课表页导出的 `.ics` 文件/文本直接导入——
  - 设置面板 → 导入课程数据 → **选择文件** 选 `.ics`（或粘贴 ICS 文本后点「验证格式」/「保存数据」）；
  - 自动转换为本页 JSON 后即可编辑、保存、导出。
  - 字段映射：`SUMMARY`→课程名，`LOCATION`→教室（去掉校区前缀），`DESCRIPTION` 内「教师/周次/节次/学分」→详情与授课教师。
  - 兼容：教务脚本导出的 UTC(Z) 时间、本应用导出的浮动时间、`TZID=Asia/Shanghai`、`FREQ=WEEKLY` 重复日程（INTERVAL/BYDAY/COUNT/UNTIL）。

`2data.json` / `example_data.json` 为历史数据样本，仅供格式参考。
