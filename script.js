/**
 * SUAT课程表应用
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
            
            // 设置面板
            settingsPanel: document.getElementById('settingsPanel'),
            settingsOverlay: document.getElementById('settingsOverlay'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            importFileBtn: document.getElementById('importFileBtn'),
            pasteDataBtn: document.getElementById('pasteDataBtn'),
            clearDataBtn: document.getElementById('clearDataBtn'),
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
        this.elements.clearDataBtn.addEventListener('click', () => this.clearData());
        const exportAllIcsBtn = document.getElementById('exportAllIcsBtn');
        if (exportAllIcsBtn) {
            exportAllIcsBtn.addEventListener('click', () => this.exportAllCoursesAsIcs());
        }
        // 课程详情弹窗事件
        this.elements.closeModalBtn.addEventListener('click', () => this.closeCourseModal());
        this.elements.modalOverlay.addEventListener('click', () => this.closeCourseModal());
            this.exportIcsBtn = document.getElementById('exportIcsBtn');
            if (this.exportIcsBtn) {
                this.exportIcsBtn.addEventListener('click', () => this.exportCurrentCourseAsIcs());
            }
        
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
        
    }
    
    createCourseElement(course, index) {
        const courseItem = document.createElement('div');
        courseItem.className = 'course-item';
        
        // Add course status class
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
                    <i data-icon="user" class="detail-icon"></i>
                    <span>${course.teacherName || '未知教师'}</span>
                </div>
                <div class="course-detail-item">
                    <i data-icon="map-pin" class="detail-icon"></i>
                    <span>${course.classRoomName || '未知地点'}</span>
                </div>
            </div>
        `;
        
        // Add click event to show details
        courseItem.addEventListener('click', () => this.showCourseDetail(course));
        
        // Set animation delay
        courseItem.style.animationDelay = `${index * 0.1}s`;
        
        // Initialize icons in the course element
        setTimeout(() => initializeIcons(), 0);
        
        return courseItem;
    }
    
    showEmptyState() {
        this.elements.courseList.innerHTML = `
            <div class="empty-state">
                <i data-icon="calendar-x" class="empty-icon"></i>
                <div class="empty-title">${this.isToday(this.selectedDate) ? '今天没有课程' : '这天没有课程'}</div>
                <div class="empty-description">
                    ${this.courses.length === 0 ? '点击设置按钮添加课程数据' : '享受你的自由时光吧！'}
                </div>
            </div>
        `;
        // Initialize icons
        setTimeout(() => initializeIcons(), 0);
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
            const parsedData = JSON.parse(jsonString);
            console.log('开始解析课程数据...');
            
            // Handle different data formats
            let courseList = [];
            if (parsedData.data) {
                if (Array.isArray(parsedData.data)) {
                    // Format: {data: [...]}
                    courseList = parsedData.data;
                } else if (parsedData.data.list && Array.isArray(parsedData.data.list)) {
                    // Format: {data: {list: [...]}}
                    courseList = parsedData.data.list;
                } else {
                    throw new Error('数据格式错误: data 应为数组或包含 list 数组的对象');
                }
            } else if (Array.isArray(parsedData)) {
                // Format: [...]
                courseList = parsedData;
            } else {
                throw new Error('数据格式错误: 根对象应为数组或包含 data 属性的对象');
            }

            console.log(`找到 ${courseList.length} 门课程，开始验证...`);

            // Validate and map courses
            this.courses = courseList
                .filter(item => item) // Filter out null or undefined items
                .map(item => {
                    // Validate required fields
                    if (!item.lessonName || !item.teacherName || !item.classRoomName) {
                        console.warn('课程数据缺少必要字段:', item);
                    }
                    
                    // Validate timestamps
                    const startTime = new Date(item.startTime);
                    const endTime = new Date(item.endTime);
                    
                    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                        throw new Error(`课程 "${item.lessonName}" 的时间戳无效`);
                    }
                    
                    return {
                        ...item,
                        startTime: startTime,
                        endTime: endTime
                    };
                });

            console.log(`验证完成，成功加载 ${this.courses.length} 门课程`);
            
            if (this.courses.length === 0) {
                console.warn('加载的课程列表为空');
            }
            
            console.log('正在渲染UI...');
            this.renderWeekView();
            this.renderCourses();
        } catch (error) {
            console.error('解析课程数据失败:', error);
            this.showNotification('数据格式错误: ' + error.message, 'error');
            this.courses = []; // 清空课程列表
            this.renderCourses(); // 重新渲染空状态
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
            console.log('开始保存数据...');
            
            // Step 1: 验证JSON格式
            let parsedData;
            try {
                parsedData = JSON.parse(content);
                console.log('JSON 格式验证成功');
            } catch (parseError) {
                throw new Error('JSON 格式错误: ' + parseError.message);
            }
            
            // Step 2: 验证数据结构
            let courseList = [];
            if (parsedData.data) {
                if (Array.isArray(parsedData.data)) {
                    courseList = parsedData.data;
                } else if (parsedData.data.list && Array.isArray(parsedData.data.list)) {
                    courseList = parsedData.data.list;
                } else {
                    throw new Error('数据结构错误: data 应为数组或包含 list 数组的对象');
                }
            } else if (Array.isArray(parsedData)) {
                courseList = parsedData;
            } else {
                throw new Error('数据结构错误: 根对象应为数组或包含 data 属性的对象');
            }
            
            // Step 3: 验证课程数据
            if (courseList.length === 0) {
                throw new Error('课程列表为空');
            }
            
            console.log(`找到 ${courseList.length} 门课程，验证数据...`);
            
            courseList.forEach((item, index) => {
                if (!item || typeof item !== 'object') {
                    throw new Error(`第 ${index + 1} 项课程数据无效`);
                }
                const requiredFields = ['lessonName', 'teacherName', 'classRoomName', 'startTime', 'endTime'];
                requiredFields.forEach(field => {
                    if (!(field in item)) {
                        throw new Error(`课程 ${index + 1} 缺少必要字段: ${field}`);
                    }
                });
                
                // 验证时间戳
                const startTime = new Date(item.startTime);
                const endTime = new Date(item.endTime);
                if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                    throw new Error(`课程 ${index + 1} 的时间戳无效`);
                }
            });
            
            console.log('数据验证完成，保存到 localStorage...');
            
            // Step 4: 保存到localStorage
            localStorage.setItem('smartCourseData', content);
            const saved = localStorage.getItem('smartCourseData');
            if (saved === content) {
                console.log('✓ 数据已成功保存到 localStorage');
            } else {
                throw new Error('localStorage 保存失败 - 数据不匹配');
            }
            
            // Step 5: 清空现有课程并重新加载数据
            console.log('清空现有课程数据，重新加载...');
            this.courses = []; // 先清空
            this.loadCourseData(content);
            
            // 验证数据是否成功加载
            if (this.courses.length > 0) {
                console.log(`✓ 成功覆盖数据: ${this.courses.length} 门课程`);
            } else {
                console.warn('⚠ 警告: 加载后课程列表为空');
            }
            
            // Step 6: 关闭加载状态和设置面板
            this.hideLoading();
            this.closeSettings();
            this.showNotification(`课程数据已保存并覆盖 (${this.courses.length} 门课程)`, 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('✗ 保存失败:', error);
            this.showNotification('保存失败: ' + error.message, 'error');
        }
    }

    clearData() {
        localStorage.removeItem('smartCourseData');
        this.courses = [];
        this.renderWeekView();
        this.renderCourses();
        this.closeSettings();
        this.showNotification('课程数据已清除', 'success');
    }
    
    formatJSON(jsonString) {
        try {
            const obj = JSON.parse(jsonString);
            return JSON.stringify(obj, null, 2);
        } catch {
            return jsonString;
        }
    }
    
    // 存储当前选中的课程用于导出
    currentSelectedCourse = null;
    
    // Course details modal
    showCourseDetail(course) {
        this.currentSelectedCourse = course;
        this.elements.modalTitle.textContent = course.lessonName || '课程详情';
        
        const startTime = this.formatTime(course.startTime);
        const endTime = this.formatTime(course.endTime);
        const date = this.formatDate(course.startTime);
        
        this.elements.modalBody.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div class="detail-row">
                    <div class="detail-label">
                        <i data-icon="calendar" class="detail-icon-inline"></i>
                        <strong>日期时间</strong>
                    </div>
                    <div class="detail-content">
                        ${date}<br>
                        ${startTime} - ${endTime}
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">
                        <i data-icon="user" class="detail-icon-inline"></i>
                        <strong>授课教师</strong>
                    </div>
                    <div class="detail-content">
                        ${course.teacherName || '未知'}
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">
                        <i data-icon="map-pin" class="detail-icon-inline"></i>
                        <strong>上课地点</strong>
                    </div>
                    <div class="detail-content">
                        ${course.classRoomName || '未知'}
                    </div>
                </div>
                ${course.description ? `
                <div class="detail-row">
                    <div class="detail-label">
                        <i data-icon="file-text" class="detail-icon-inline"></i>
                        <strong>课程描述</strong>
                    </div>
                    <div class="detail-content">
                        ${course.description}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        this.elements.courseModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Initialize icons
        setTimeout(() => initializeIcons(), 0);
    }
    
    closeCourseModal() {
        this.elements.courseModal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentSelectedCourse = null;
    }
    
    // ICS导出功能
    generateIcsContent(course) {
        // 生成唯一ID
        const courseId = `${course.lessonName}-${course.startTime}@suat-courselist`;
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // 格式化时间为ICS格式 (本地时间，无时区标记)
        const formatIcsTime = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            // 使用本地时间格式，不加Z
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        };
        
        const startTime = formatIcsTime(course.startTime);
        const endTime = formatIcsTime(course.endTime);
        
        // 处理描述文本，转义特殊字符
        const escapeIcsText = (text) => {
            if (!text) return '';
            return text
                .replace(/\\/g, '\\\\')
                .replace(/,/g, '\\,')
                .replace(/;/g, '\\;')
                .replace(/\n/g, '\\n');
        };
        
        const summary = escapeIcsText(course.lessonName);
        const location = escapeIcsText(course.classRoomName);
        const description = escapeIcsText(`授课教师: ${course.teacherName}${course.description ? '\n' + course.description : ''}`);
        
        // 构建ICS文件内容
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SUAT Course List//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:SUAT课程表
X-WR-TIMEZONE:Asia/Shanghai
BEGIN:VEVENT
UID:${courseId}
DTSTART:${startTime}
DTEND:${endTime}
DTSTAMP:${timestamp}
CREATED:${timestamp}
DESCRIPTION:${description}
LOCATION:${location}
SUMMARY:${summary}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
        
        return icsContent;
    }
    
    // 导出当前显示的课程为ICS
    exportCurrentCourseAsIcs() {
        if (!this.currentSelectedCourse) {
            this.showNotification('没有选中的课程', 'warning');
            return;
        }
        
        const course = this.currentSelectedCourse;
        const icsContent = this.generateIcsContent(course);
        
        // 创建Blob对象
        const blob = new Blob([icsContent], { type: 'text/calendar; charset=utf-8' });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        // 文件名：课程名-日期.ics
        const dateStr = this.formatDate(course.startTime).replace(/\s/g, '-');
        link.download = `${course.lessonName}-${dateStr}.ics`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        URL.revokeObjectURL(link.href);
        
        this.showNotification(`已导出课程: ${course.lessonName}`, 'success');
        this.closeCourseModal();
    }
    
    // 导出所有课程为ICS日历
    exportAllCoursesAsIcs() {
        if (this.courses.length === 0) {
            this.showNotification('没有课程数据可导出', 'warning');
            return;
        }
        
        // 生成唯一ID
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // 格式化时间为ICS格式 (本地时间，无时区标记)
        const formatIcsTime = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            // 使用本地时间格式，不加Z
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        };
        
        // 处理转义
        const escapeIcsText = (text) => {
            if (!text) return '';
            return text
                .replace(/\\/g, '\\\\')
                .replace(/,/g, '\\,')
                .replace(/;/g, '\\;')
                .replace(/\n/g, '\\n');
        };
        
        // 构建ICS文件内容
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SUAT Course List//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:SUAT课程表
X-WR-TIMEZONE:Asia/Shanghai
`;
        
        // 添加所有课程事件
        this.courses.forEach(course => {
            const startTime = formatIcsTime(course.startTime);
            const endTime = formatIcsTime(course.endTime);
            const courseId = `${course.lessonName}-${course.startTime}@suat-courselist`;
            const summary = escapeIcsText(course.lessonName);
            const location = escapeIcsText(course.classRoomName);
            const description = escapeIcsText(`授课教师: ${course.teacherName}${course.description ? '\n' + course.description : ''}`);
            
            icsContent += `BEGIN:VEVENT
UID:${courseId}
DTSTART:${startTime}
DTEND:${endTime}
DTSTAMP:${timestamp}
CREATED:${timestamp}
DESCRIPTION:${description}
LOCATION:${location}
SUMMARY:${summary}
STATUS:CONFIRMED
END:VEVENT
`;
        });
        
        icsContent += 'END:VCALENDAR';
        
        // 创建Blob对象
        const blob = new Blob([icsContent], { type: 'text/calendar; charset=utf-8' });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        // 文件名
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `SUAT课程表-${dateStr}.ics`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        URL.revokeObjectURL(link.href);
        
        this.showNotification(`已导出 ${this.courses.length} 门课程`, 'success');
    }
    
    
    // Notification system
    showNotification(message, type = 'success') {
        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        this.elements.notification.className = `notification ${type}`;
        this.elements.notification.querySelector('.notification-icon').innerHTML = `<i data-icon="${iconMap[type] || iconMap.info}"></i>`;
        this.elements.notification.querySelector('.notification-text').textContent = message;
        
        this.elements.notification.classList.add('show');
        
        // Initialize icons
        setTimeout(() => initializeIcons(), 0);
        
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
        
        // 重新渲染课程列表以适应新尺寸
        //this.renderCourses();
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
    
    console.log('🎓 SUAT课程表已启动！');
    console.log('💡 使用 addExampleData() 添加示例数据');
    console.log('⌨️  快捷键: T-回到今天, Ctrl+←/→-切换周, ESC-关闭弹窗');
});
