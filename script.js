/**
 * 智能课程表应用
 * 现代化的 Web 课程管理系统
 */
class SmartCourseApp {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.courses = [];
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        
        this.weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        this.months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.bindEvents();
        this.loadCoursesFromStorage();
        this.renderWeekView();
        this.renderCurrentDate();
        this.renderCourses();
        this.startTimeIndicator();
        this.showFormatExample();
    }
    
    initElements() {
        this.elements = {
            // 导航栏
            prevWeekBtn: document.getElementById('prevWeekBtn'),
            nextWeekBtn: document.getElementById('nextWeekBtn'),
            datePicker: document.getElementById('datePicker'),
            currentDate: document.getElementById('currentDate'),
            todayBtn: document.getElementById('todayBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // 周视图
            weekDays: document.getElementById('weekDays'),
            
            // 课程列表
            courseList: document.getElementById('courseList'),
            timeIndicator: document.getElementById('timeIndicator'),
            
            // 设置面板
            settingsPanel: document.getElementById('settingsPanel'),
            settingsOverlay: document.getElementById('settingsOverlay'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            importFileBtn: document.getElementById('importFileBtn'),
            pasteDataBtn: document.getElementById('pasteDataBtn'),
            fileInput: document.getElementById('fileInput'),
            editorSection: document.getElementById('editorSection'),
            dataEdit: document.getElementById('dataEdit'),
            validateBtn: document.getElementById('validateBtn'),
            saveBtn: document.getElementById('saveBtn'),
            formatExample: document.getElementById('formatExample'),
            
            // 课程详情弹窗
            courseModal: document.getElementById('courseModal'),
            modalOverlay: document.getElementById('modalOverlay'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            modalTitle: document.getElementById('modalTitle'),
            modalBody: document.getElementById('modalBody'),
            
            // 通用
            loadingIndicator: document.getElementById('loadingIndicator'),
            notification: document.getElementById('notification')
        };
    }
    
    bindEvents() {
        // 导航事件
        this.elements.prevWeekBtn.addEventListener('click', () => this.navigateWeek(-1));
        this.elements.nextWeekBtn.addEventListener('click', () => this.navigateWeek(1));
        this.elements.todayBtn.addEventListener('click', () => this.goToToday());
        this.elements.currentDate.addEventListener('click', () => this.openDatePicker());
        this.elements.datePicker.addEventListener('change', (e) => this.onDateChange(e));
        
        // 设置面板事件
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.elements.settingsOverlay.addEventListener('click', () => this.closeSettings());
        this.elements.importFileBtn.addEventListener('click', () => this.triggerFileInput());
        this.elements.pasteDataBtn.addEventListener('click', () => this.showEditor());
        this.elements.fileInput.addEventListener('change', (e) => this.onFileSelected(e));
        this.elements.validateBtn.addEventListener('click', () => this.validateData());
        this.elements.saveBtn.addEventListener('click', () => this.saveData());
        
        // 课程详情弹窗事件
        this.elements.closeModalBtn.addEventListener('click', () => this.closeCourseModal());
        this.elements.modalOverlay.addEventListener('click', () => this.closeCourseModal());
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // 点击日期选择器外部关闭
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.date-picker-container')) {
                this.elements.datePicker.style.opacity = '0';
                this.elements.datePicker.style.pointerEvents = 'none';
            }
        });
        
        // 移动端触摸事件
        this.setupTouchEvents();
        
        // 移动端特殊处理
        this.setupMobileOptimizations();
    }
    
    // 日期操作方法
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    formatDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = this.weekdays[date.getDay()];
        return `${month}月${day}日 星期${weekday}`;
    }
    
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    isToday(date) {
        return this.isSameDay(date, new Date());
    }
    
    // 导航方法
    navigateWeek(direction) {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + direction * 7);
        this.renderWeekView();
        
        // 如果当前选中的日期不在新的周内，选中新周的第一天
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        if (this.selectedDate < this.currentWeekStart || this.selectedDate > weekEnd) {
            this.selectedDate = new Date(this.currentWeekStart);
            this.renderCurrentDate();
            this.renderCourses();
        }
    }
    
    goToToday() {
        const today = new Date();
        this.selectedDate = new Date(today);
        this.currentWeekStart = this.getWeekStart(today);
        this.renderWeekView();
        this.renderCurrentDate();
        this.renderCourses();
        this.showNotification('已跳转到今天', 'success');
    }
    
    openDatePicker() {
        this.elements.datePicker.style.opacity = '1';
        this.elements.datePicker.style.pointerEvents = 'auto';
        
        // 设置日期选择器的值
        const dateString = this.selectedDate.toISOString().split('T')[0];
        this.elements.datePicker.value = dateString;
        this.elements.datePicker.focus();
        this.elements.datePicker.showPicker();
    }
    
    onDateChange(e) {
        const newDate = new Date(e.target.value);
        this.selectedDate = newDate;
        this.currentWeekStart = this.getWeekStart(newDate);
        this.renderWeekView();
        this.renderCurrentDate();
        this.renderCourses();
        this.elements.datePicker.style.opacity = '0';
        this.elements.datePicker.style.pointerEvents = 'none';
    }
    
    // 渲染方法
    renderCurrentDate() {
        this.elements.currentDate.textContent = this.formatDate(this.selectedDate);
    }
    
    renderWeekView() {
        this.elements.weekDays.innerHTML = '';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'week-day';
            
            if (this.isSameDay(date, this.selectedDate)) {
                dayElement.classList.add('active');
            }
            
            if (this.isToday(date)) {
                dayElement.classList.add('today');
            }
            
            dayElement.innerHTML = `
                <div class="week-day-name">${this.weekdays[date.getDay()]}</div>
                <div class="week-day-date">${date.getDate()}</div>
            `;
            
            dayElement.addEventListener('click', () => {
                this.selectedDate = new Date(date);
                this.renderWeekView();
                this.renderCurrentDate();
                this.renderCourses();
            });
            
            this.elements.weekDays.appendChild(dayElement);
        }
    }
    
    renderCourses() {
        const selectedCourses = this.getCoursesForDate(this.selectedDate);
        this.elements.courseList.innerHTML = '';
        
        if (selectedCourses.length === 0) {
            this.showEmptyState();
            return;
        }
        
        selectedCourses.forEach((course, index) => {
            const courseElement = this.createCourseElement(course, index);
            this.elements.courseList.appendChild(courseElement);
        });
        
        this.updateTimeIndicator();
    }
    
    createCourseElement(course, index) {
        const courseItem = document.createElement('div');
        courseItem.className = 'course-item';
        
        // 添加课程状态类
        const now = new Date();
        const startTime = new Date(course.startTime);
        const endTime = new Date(course.endTime);
        
        if (this.isToday(startTime)) {
            if (now >= startTime && now <= endTime) {
                courseItem.classList.add('current');
            } else if (now < startTime) {
                courseItem.classList.add('upcoming');
            }
        }
        
        const startTimeStr = this.formatTime(startTime);
        const endTimeStr = this.formatTime(endTime);
        
        courseItem.innerHTML = `
            <div class="course-header">
                <div class="course-title">${course.lessonName || '未知课程'}</div>
                <div class="course-time">${startTimeStr} - ${endTimeStr}</div>
            </div>
            <div class="course-details">
                <div class="course-detail-item">
                    <span class="detail-icon">👨‍🏫</span>
                    <span>${course.teacherName || '未知教师'}</span>
                </div>
                <div class="course-detail-item">
                    <span class="detail-icon">📍</span>
                    <span>${course.classRoomName || '未知地点'}</span>
                </div>
            </div>
        `;
        
        // 添加点击事件显示详情
        courseItem.addEventListener('click', () => this.showCourseDetail(course));
        
        // 设置动画延迟
        courseItem.style.animationDelay = `${index * 0.1}s`;
        
        return courseItem;
    }
    
    showEmptyState() {
        this.elements.courseList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-title">${this.isToday(this.selectedDate) ? '今天没有课程' : '这天没有课程'}</div>
                <div class="empty-description">
                    ${this.courses.length === 0 ? '点击设置按钮添加课程数据' : '享受你的自由时光吧！'}
                </div>
            </div>
        `;
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    // 数据处理方法
    loadCoursesFromStorage() {
        try {
            const storedData = localStorage.getItem('smartCourseData');
            if (storedData) {
                this.loadCourseData(storedData);
            }
        } catch (error) {
            console.error('加载课程数据失败:', error);
            this.showNotification('加载课程数据失败', 'error');
        }
    }
    
    loadCourseData(jsonString) {
        try {
            let data = JSON.parse(jsonString);
            
            // 兼容不同的数据格式
            if (data && data.data && data.data.list) {
                data = data.data.list;
            } else if (data && Array.isArray(data.list)) {
                data = data.list;
            } else if (Array.isArray(data)) {
                // data 已经是数组
            } else {
                throw new Error('不支持的数据格式');
            }
            
            this.courses = data.map(course => ({
                ...course,
                startTime: new Date(course.startTime),
                endTime: new Date(course.endTime)
            }));
            
            this.renderCourses();
            this.showNotification(`成功加载 ${this.courses.length} 门课程`, 'success');
            
        } catch (error) {
            console.error('解析课程数据失败:', error);
            this.showNotification('数据格式错误，请检查JSON格式', 'error');
        }
    }
    
    getCoursesForDate(date) {
        return this.courses
            .filter(course => this.isSameDay(course.startTime, date))
            .sort((a, b) => a.startTime - b.startTime);
    }
    
    // 设置面板方法
    openSettings() {
        this.elements.settingsPanel.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeSettings() {
        this.elements.settingsPanel.classList.remove('show');
        this.elements.editorSection.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    showEditor() {
        this.elements.editorSection.style.display = 'block';
        const storedData = localStorage.getItem('smartCourseData');
        if (storedData) {
            this.elements.dataEdit.value = this.formatJSON(storedData);
        }
    }
    
    triggerFileInput() {
        this.elements.fileInput.click();
    }
    
    onFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        this.showLoading();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.hideLoading();
            const content = e.target.result;
            this.elements.dataEdit.value = this.formatJSON(content);
            this.showEditor();
        };
        
        reader.onerror = () => {
            this.hideLoading();
            this.showNotification('文件读取失败', 'error');
        };
        
        reader.readAsText(file);
        e.target.value = ''; // 清空input，允许重复选择同一文件
    }
    
    validateData() {
        const content = this.elements.dataEdit.value.trim();
        if (!content) {
            this.showNotification('请输入数据', 'warning');
            return;
        }
        
        try {
            const data = JSON.parse(content);
            this.showNotification('JSON格式验证通过', 'success');
            
            // 简单的数据结构验证
            let courses = data;
            if (data.data && data.data.list) {
                courses = data.data.list;
            } else if (Array.isArray(data.list)) {
                courses = data.list;
            }
            
            if (Array.isArray(courses) && courses.length > 0) {
                this.showNotification(`发现 ${courses.length} 门课程`, 'success');
            }
            
        } catch (error) {
            this.showNotification('JSON格式错误: ' + error.message, 'error');
        }
    }
    
    saveData() {
        const content = this.elements.dataEdit.value.trim();
        if (!content) {
            this.showNotification('请输入数据', 'warning');
            return;
        }
        
        try {
            this.showLoading();
            
            // 验证并保存数据
            JSON.parse(content); // 验证JSON格式
            localStorage.setItem('smartCourseData', content);
            
            // 重新加载数据
            this.loadCourseData(content);
            
            this.hideLoading();
            this.closeSettings();
            this.showNotification('课程数据保存成功', 'success');
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('保存失败: ' + error.message, 'error');
        }
    }
    
    formatJSON(jsonString) {
        try {
            const obj = JSON.parse(jsonString);
            return JSON.stringify(obj, null, 2);
        } catch {
            return jsonString;
        }
    }
    
    // 课程详情弹窗
    showCourseDetail(course) {
        this.elements.modalTitle.textContent = course.lessonName || '课程详情';
        
        const startTime = this.formatTime(course.startTime);
        const endTime = this.formatTime(course.endTime);
        const date = this.formatDate(course.startTime);
        
        this.elements.modalBody.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div>
                    <strong>📅 日期时间</strong><br>
                    ${date}<br>
                    ${startTime} - ${endTime}
                </div>
                <div>
                    <strong>👨‍🏫 授课教师</strong><br>
                    ${course.teacherName || '未知'}
                </div>
                <div>
                    <strong>📍 上课地点</strong><br>
                    ${course.classRoomName || '未知'}
                </div>
                ${course.description ? `
                <div>
                    <strong>📝 课程描述</strong><br>
                    ${course.description}
                </div>
                ` : ''}
            </div>
        `;
        
        this.elements.courseModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeCourseModal() {
        this.elements.courseModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // 时间指示器
    startTimeIndicator() {
        this.updateTimeIndicator();
        setInterval(() => this.updateTimeIndicator(), 60000); // 每分钟更新一次
    }
    
    updateTimeIndicator() {
        if (!this.isToday(this.selectedDate)) {
            this.elements.timeIndicator.classList.remove('show');
            return;
        }
        
        const now = new Date();
        const todayCourses = this.getCoursesForDate(this.selectedDate);
        
        if (todayCourses.length === 0) {
            this.elements.timeIndicator.classList.remove('show');
            return;
        }
        
        // 找到当前时间在课程表中的位置
        const firstCourse = todayCourses[0];
        const lastCourse = todayCourses[todayCourses.length - 1];
        
        if (now < firstCourse.startTime || now > lastCourse.endTime) {
            this.elements.timeIndicator.classList.remove('show');
            return;
        }
        
        // 计算指示器位置
        const totalMinutes = (lastCourse.endTime - firstCourse.startTime) / (1000 * 60);
        const currentMinutes = (now - firstCourse.startTime) / (1000 * 60);
        const percentage = (currentMinutes / totalMinutes) * 100;
        
        this.elements.timeIndicator.style.top = `${percentage}%`;
        this.elements.timeIndicator.classList.add('show');
    }
    
    // 通知系统
    showNotification(message, type = 'success') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        this.elements.notification.className = `notification ${type}`;
        this.elements.notification.querySelector('.notification-icon').textContent = icons[type] || icons.info;
        this.elements.notification.querySelector('.notification-text').textContent = message;
        
        this.elements.notification.classList.add('show');
        
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }
    
    // 加载指示器
    showLoading() {
        this.elements.loadingIndicator.classList.add('show');
    }
    
    hideLoading() {
        this.elements.loadingIndicator.classList.remove('show');
    }
    
    // 格式示例
    showFormatExample() {
        const example = {
            "data": {
                "list": [
                    {
                        "lessonName": "高等数学",
                        "teacherName": "张教授",
                        "classRoomName": "教学楼A101",
                        "startTime": 1725667200000,
                        "endTime": 1725674400000,
                        "description": "课程描述（可选）"
                    }
                ]
            }
        };
        
        this.elements.formatExample.textContent = JSON.stringify(example, null, 2);
    }
    
    // 键盘快捷键
    onKeyDown(e) {
        // ESC 关闭弹窗
        if (e.key === 'Escape') {
            if (this.elements.settingsPanel.classList.contains('show')) {
                this.closeSettings();
            } else if (this.elements.courseModal.classList.contains('show')) {
                this.closeCourseModal();
            }
        }
        
        // 左右箭头切换周
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigateWeek(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateWeek(1);
            }
        }
        
        // T 键跳转到今天
        if (e.key === 't' || e.key === 'T') {
            if (!e.target.matches('input, textarea')) {
                this.goToToday();
            }
        }
    }
    
    // 移动端触摸事件设置
    setupTouchEvents() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        // 周视图滑动切换
        this.elements.weekDays.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        this.elements.weekDays.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleWeekSwipe();
        }, { passive: true });
        
        // 课程列表滑动切换日期
        this.elements.courseList.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        this.elements.courseList.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleDateSwipe();
        }, { passive: true });
        
        const handleWeekSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;
            
            // 确保是水平滑动
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // 向右滑动 - 上一周
                    this.navigateWeek(-1);
                } else {
                    // 向左滑动 - 下一周
                    this.navigateWeek(1);
                }
            }
        };
        
        const handleDateSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 80;
            
            // 确保是水平滑动且不是在滚动
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // 向右滑动 - 前一天
                    this.navigateDate(-1);
                } else {
                    // 向左滑动 - 后一天
                    this.navigateDate(1);
                }
            }
        };
        
        this.handleWeekSwipe = handleWeekSwipe;
        this.handleDateSwipe = handleDateSwipe;
    }
    
    // 移动端优化设置
    setupMobileOptimizations() {
        // 检测是否为移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            // 移动端特殊处理
            document.body.classList.add('mobile-device');
            
            // 防止双击缩放
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            
            // 优化滚动
            document.addEventListener('touchmove', (e) => {
                // 允许在特定元素内滚动
                const allowScrollElements = [
                    this.elements.courseList,
                    this.elements.dataEdit,
                    this.elements.settingsBody
                ];
                
                if (!allowScrollElements.some(el => el && el.contains(e.target))) {
                    // 阻止页面整体滚动
                    if (e.touches.length === 1) {
                        e.preventDefault();
                    }
                }
            }, { passive: false });
            
            // 移动端日期选择器优化
            this.optimizeMobileDatePicker();
        }
        
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 500);
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }
    
    // 导航日期（用于滑动切换）
    navigateDate(direction) {
        const newDate = new Date(this.selectedDate);
        newDate.setDate(newDate.getDate() + direction);
        
        this.selectedDate = newDate;
        this.currentWeekStart = this.getWeekStart(newDate);
        this.renderWeekView();
        this.renderCurrentDate();
        this.renderCourses();
        
        // 移动端反馈
        if (this.isMobile) {
            navigator.vibrate && navigator.vibrate(50);
        }
    }
    
    // 移动端日期选择器优化
    optimizeMobileDatePicker() {
        // 创建更大的触摸区域
        this.elements.currentDate.style.minHeight = '44px';
        this.elements.currentDate.style.display = 'flex';
        this.elements.currentDate.style.alignItems = 'center';
        this.elements.currentDate.style.justifyContent = 'center';
        
        // 优化日期选择器显示
        this.elements.datePicker.addEventListener('focus', () => {
            this.elements.datePicker.style.position = 'fixed';
            this.elements.datePicker.style.top = '50%';
            this.elements.datePicker.style.left = '50%';
            this.elements.datePicker.style.transform = 'translate(-50%, -50%)';
            this.elements.datePicker.style.zIndex = '9999';
        });
    }
    
    // 处理屏幕方向变化
    handleOrientationChange() {
        // 重新计算布局
        this.renderWeekView();
        this.renderCourses();
        
        // 关闭可能打开的弹窗
        if (this.elements.settingsPanel.classList.contains('show')) {
            this.closeSettings();
        }
    }
    
    // 处理窗口大小变化
    handleResize() {
        // 更新时间指示器位置
        this.updateTimeIndicator();
        
        // 重新渲染课程列表以适应新尺寸
        this.renderCourses();
    }
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 工具函数：生成示例数据
function generateExampleData() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const courses = [
        {
            lessonName: "高等数学",
            teacherName: "张教授",
            classRoomName: "教学楼A101",
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0).getTime(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 40).getTime(),
            description: "微积分基础知识"
        },
        {
            lessonName: "英语听说",
            teacherName: "李老师",
            classRoomName: "语音室B201",
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).getTime(),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 40).getTime(),
            description: "英语口语练习"
        },
        {
            lessonName: "计算机程序设计",
            teacherName: "王教授", 
            classRoomName: "机房C301",
            startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0).getTime(),
            endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 40).getTime(),
            description: "Python编程基础"
        }
    ];
    
    return {
        data: {
            list: courses
        }
    };
}

// 应用入口
document.addEventListener('DOMContentLoaded', () => {
    window.courseApp = new SmartCourseApp();
    
    // 调试工具
    window.addExampleData = function() {
        const exampleData = generateExampleData();
        const jsonString = JSON.stringify(exampleData, null, 2);
        
        localStorage.setItem('smartCourseData', jsonString);
        window.courseApp.loadCourseData(jsonString);
        window.courseApp.showNotification('示例数据已添加', 'success');
    };
    
    console.log('🎓 智能课程表已启动！');
    console.log('💡 使用 addExampleData() 添加示例数据');
    console.log('⌨️  快捷键: T-回到今天, Ctrl+←/→-切换周, ESC-关闭弹窗');
});
