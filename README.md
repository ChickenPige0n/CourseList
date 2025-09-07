# 课程表 Web 应用

这是一个基于原 GDScript 代码重新实现的 Web 静态页面版本的课程表应用。

## 功能特性

### 核心功能
- ✅ 显示当天课程信息
- ✅ 前后一天课程切换（对应 GDScript 中的 `next_day()` 和 `prev_day()`）
- ✅ 本地存储课程数据（使用 localStorage 替代 GDScript 的文件系统）
- ✅ 课程数据编辑和导入
- ✅ 优雅的动画效果（对应 GDScript 中的 Tween 动画）

### 界面特性
- 🎨 现代化响应式设计
- 📱 移动端友好
- 🌈 渐变背景和毛玻璃效果
- ⚡ 流畅的页面切换动画
- 🎭 课程项目的滑入滑出效果

## 技术实现

### 代码结构对应关系

| GDScript 类/方法 | Web 版本实现 | 说明 |
|-----------------|------------|------|
| `CourseDisplay` | `CourseApp` 类 | 主应用类 |
| `Controller` | `CourseApp` 类的一部分 | 控制器逻辑合并到主类 |
| `load_data_from_file()` | `loadDataFromStorage()` | 从 localStorage 加载数据 |
| `load_data()` | `loadData()` | 解析和处理课程数据 |
| `next_day()` | `nextDay()` | 切换到下一天 |
| `prev_day()` | `prevDay()` | 切换到上一天 |
| `gen_list()` | `genList()` | 生成课程列表 |
| `toggle_settings()` | `toggleSettings()` | 切换设置界面 |
| `weekday_dict` | `weekdayDict` | 星期字典 |

### 数据存储
- **原版**: 使用 GDScript 的 `FileAccess` 保存到 `user://course_data.json`
- **Web版**: 使用浏览器的 `localStorage` API

### 动画系统
- **原版**: 使用 Godot 的 `Tween` 系统
- **Web版**: 使用 CSS3 动画和 JavaScript 控制

## 使用方法

### 1. 打开应用
直接在浏览器中打开 `index.html` 文件即可。

### 2. 添加课程数据

#### 方法一：手动输入
1. 点击右下角的"设置"按钮
2. 在文本框中粘贴 JSON 格式的课程数据
3. 点击"保存"按钮

#### 方法二：文件导入
1. 点击"导入文件"按钮
2. 选择包含课程数据的 JSON 文件
3. 系统会自动加载文件内容

#### 方法三：使用示例数据（调试用）
在浏览器控制台中执行：
```javascript
addExampleData()
```

### 3. 数据格式

课程数据应该遵循以下 JSON 格式：

```json
{
  "data": {
    "list": [
      {
        "lessonName": "课程名称",
        "teacherName": "教师姓名",
        "classRoomName": "教室位置",
        "startTime": 1694073600000,
        "endTime": 1694077200000
      }
    ]
  }
}
```

**字段说明：**
- `lessonName`: 课程名称
- `teacherName`: 授课教师
- `classRoomName`: 上课教室
- `startTime`: 开始时间（毫秒时间戳）
- `endTime`: 结束时间（毫秒时间戳）

### 4. 操作说明

- **◀ / ▶ 按钮**: 切换前一天/后一天的课程
- **设置按钮**: 进入数据编辑界面
- **保存**: 保存课程数据到本地存储
- **取消**: 取消编辑，恢复原数据
- **清空**: 清空编辑框内容
- **导入文件**: 从本地文件导入课程数据

## 开发特性

### 代码特点
- 📝 **易读性**: 清晰的类结构和注释
- 🔧 **易修改**: 模块化设计，便于扩展
- 🚀 **现代化**: 使用 ES6+ 语法
- 🎯 **类型友好**: 详细的 JSDoc 注释

### 浏览器兼容性
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### 文件结构
```
SUATCourseList/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── script.js       # 主要逻辑
└── README.md       # 说明文档
```

## 自定义修改

### 修改样式
编辑 `styles.css` 文件可以自定义：
- 配色方案
- 动画效果
- 布局样式
- 响应式断点

### 扩展功能
在 `script.js` 中可以轻松添加：
- 新的课程筛选条件
- 更多的动画效果
- 数据导出功能
- 课程提醒功能

### 数据源适配
如果你的课程数据格式不同，只需修改 `loadData()` 方法中的数据解析逻辑即可。

## 故障排除

### 常见问题

1. **课程不显示**
   - 检查数据格式是否正确
   - 确认时间戳格式（需要毫秒级时间戳）
   - 查看浏览器控制台是否有错误信息

2. **动画不流畅**
   - 检查是否启用了硬件加速
   - 尝试减少同时显示的课程数量

3. **数据丢失**
   - 检查浏览器是否禁用了 localStorage
   - 确认没有使用隐私模式

### 调试工具

在浏览器控制台中可以使用以下命令：
- `courseApp`: 访问应用实例
- `addExampleData()`: 添加示例数据
- `localStorage.getItem('courseData')`: 查看存储的数据

---

**开发者**: 仿照尤雨溪的编程风格实现 😊
