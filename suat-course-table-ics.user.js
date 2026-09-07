// ==UserScript==
// @name         深圳理工大学教务系统-课表导出ICS
// @namespace    suat-sz.edu.cn
// @version      1.0.1
// @description  在 jw.suat-sz.edu.cn 学生课表页(/student/for-std/course-table)点击悬浮按钮，将学期课表导出为 .ics 日历文件（每个星期生成独立日程，支持导入 Google/Outlook/手机日历）。
// @author       you
// @match        https://jw.suat-sz.edu.cn/student/for-std/course-table*
// @match        http://jw.suat-sz.edu.cn/student/for-std/course-table*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  if (window.__suatIcsLoaded) return;
  window.__suatIcsLoaded = true;

  /* ---------- ICS core (validated offline against real payloads) ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function buildWeekDateMap(semester) {
    const map = {};
    if (semester && Array.isArray(semester.dateWeekComparisons) && semester.dateWeekComparisons.length) {
      for (const c of semester.dateWeekComparisons) {
        if (c && c.week && c.weekdayNum && c.date_) map[c.week + '-' + c.weekdayNum] = c.date_;
      }
    }
    const startDate = semester && semester.startDate;
    const fn = (week, weekdayNum) => {
      const key = week + '-' + weekdayNum;
      if (map[key]) return map[key];
      if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        const base = new Date(startDate + 'T00:00:00');
        base.setDate(base.getDate() + (week - 1) * 7 + (weekdayNum - 1));
        return dateKey(base);
      }
      return null;
    };
    return fn;
  }
  function icsEscape(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
  }
  function normalizeTime(t) {
    if (t === null || t === undefined || t === '') return null;
    const s = String(t).trim();
    let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m) return pad2(+m[1]) + ':' + m[2] + ':' + (m[3] || '00');
    m = /^(\d{3,4})$/.exec(s); // '830' -> 08:30
    if (m) {
      let v = m[1];
      if (v.length === 3) v = '0' + v;
      return v.slice(0, 2) + ':' + v.slice(2) + ':00';
    }
    return null;
  }
  function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }
  // Beijing wall time (UTC+8, no DST) -> UTC instant string 'YYYYMMDDTHHMMSSZ'
  function cstToUtc(dateStr, hms) {
    const p = dateStr.split('-').map(Number);
    const t = hms.split(':').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2], t[0], t[1], t[2] || 0) - 8 * 3600 * 1000);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function unitTimeMap(timeTableLayout) {
    const m = {};
    const units = timeTableLayout && Array.isArray(timeTableLayout.courseUnitList) ? timeTableLayout.courseUnitList : [];
    for (const u of units) {
      m[String(u.indexNo)] = { start: normalizeTime(u.startTime), end: normalizeTime(u.endTime) };
    }
    return m;
  }

  // Returns [{date, start, end, uidKey}] for an activity.
  function expandActivity(semester, act, units) {
    const weekday = act.weekday; // 1 = Monday ... 7 = Sunday
    const weeks = Array.isArray(act.weekIndexes) ? act.weekIndexes : [];
    if (!weekday || !weeks.length) return [];
    const dateFn = buildWeekDateMap(semester);
    let start = normalizeTime(act.startTime);
    let end = normalizeTime(act.endTime);
    if ((!start || !end) && units && act.startUnit != null && act.endUnit != null) {
      const a = units[String(act.startUnit)];
      const b = units[String(act.endUnit)];
      if (!start && a) start = a.start;
      if (!end && b) end = b.end;
    }
    if (!start || !end) return [];
    const out = [];
    for (const w of weeks) {
      const d = dateFn(w, weekday);
      if (d) out.push({ d, start, end, w });
    }
    return out;
  }

  function buildIcsText(opts) {
    const semester = opts.semester || {};
    const activities = opts.activities || [];
    const semesterId = opts.semesterId != null ? opts.semesterId : semester.id;
    const semesterName = opts.semesterName || semester.nameZh || String(semesterId);
    const units = unitTimeMap(opts.vm && opts.vm.timeTableLayout);
    const L = [];
    L.push('BEGIN:VCALENDAR');
    L.push('VERSION:2.0');
    L.push('PRODID:-//SUAT CourseTable Export//CN//EN');
    L.push('CALSCALE:GREGORIAN');
    L.push('METHOD:PUBLISH');
    L.push('X-WR-CALNAME:' + icsEscape('课表 ' + semesterName));
    L.push('X-WR-TIMEZONE:Asia/Shanghai');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const seen = new Set();
    let count = 0;
    for (const act of activities) {
      const summary = (act.courseName || act.lessonName || '').trim();
      const teachers = Array.isArray(act.teachers) ? act.teachers.join(', ') : '';
      const courseType = (act.courseType && act.courseType.nameZh) || '';
      const locParts = [];
      if (act.campus) locParts.push('[' + act.campus + ']');
      if (act.building) locParts.push(act.building);
      if (act.room) locParts.push(act.room);
      const location = locParts.join(' ');
      const descParts = [];
      const add = (k, v) => { if (v !== null && v !== undefined && String(v).trim() !== '') descParts.push(k + ': ' + v); };
      add('课程', summary);
      add('课程代码/班号', act.lessonCode);
      add('课程类型', courseType);
      add('教师', teachers);
      add('周次', act.weeksStr);
      add('节次', act.startUnit != null && act.endUnit != null ? String(act.startUnit) + (String(act.endUnit) !== String(act.startUnit) ? '-' + act.endUnit : '') : null);
      add('学分', act.credits);
      if (act.experiment) add('类型', '实验');
      add('备注', act.lessonRemark);
      const description = descParts.map(icsEscape).join('\\n');
      const occs = expandActivity(semester, act, units);
      for (const o of occs) {
        const base = [semesterId, act.lessonId, act.weekday, act.startUnit, act.endUnit, o.w].join('|');
        let uid = djb2(base);
        let guard = 0;
        while (seen.has(uid) && guard++ < 10) uid = djb2(base + '#' + guard);
        seen.add(uid);
        L.push('BEGIN:VEVENT');
        L.push('UID:' + uid + '@suat-sz');
        L.push('DTSTAMP:' + stamp);
        L.push('DTSTART:' + cstToUtc(o.d, o.start));
        L.push('DTEND:' + cstToUtc(o.d, o.end));
        L.push('SUMMARY:' + icsEscape(summary));
        L.push('LOCATION:' + icsEscape(location));
        L.push('DESCRIPTION:' + description);
        L.push('TRANSP:OPAQUE');
        L.push('END:VEVENT');
        count++;
      }
    }
    L.push('END:VCALENDAR');
    return { text: L.join('\r\n') + '\r\n', count };
  }

  /* ---------- helpers ---------- */
  const CONTEXT = '/student/for-std/course-table';

  async function apiGet(url) {
    const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json, text/plain, */*' } });
    if (r.status === 401 || r.status === 302 || (r.redirected && /\/login/.test(r.url))) {
      throw new Error('未登录或会话已过期，请重新登录后重试。');
    }
    if (!r.ok) throw new Error('请求失败 HTTP ' + r.status);
    const ct = r.headers.get('content-type') || '';
    if (!/json/.test(ct)) throw new Error('返回内容不是 JSON，可能接口已变更。');
    return r.json();
  }

  function listSemesters() {
    // Prefer the server-rendered semester list (contains startDate + dateWeekComparisons).
    let arr = (typeof window.semesters !== 'undefined' && Array.isArray(window.semesters)) ? window.semesters : [];
    if (!arr.length) {
      arr = Array.from(document.querySelectorAll('#allSemesters option')).map(o => ({ id: +o.value, nameZh: o.textContent.trim() }));
    }
    return arr.filter(s => s && s.id != null);
  }

  function currentDefaultSemesterId() {
    const sel = document.getElementById('allSemesters');
    if (sel && sel.value) return +sel.value;
    const arr = listSemesters();
    return arr.length ? arr[arr.length - 1].id : null;
  }

  async function ensureSemesterInfo(sem) {
    if (sem && (sem.startDate || (sem.dateWeekComparisons && sem.dateWeekComparisons.length))) return sem;
    if (sem && sem.id != null) {
      try {
        const obj = await apiGet('/student/ws/semester/get/' + sem.id);
        return Object.assign({}, sem, obj || {});
      } catch (e) { /* keep original */ }
    }
    return sem;
  }

  function downloadIcs(filename, text) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 500);
  }

  /* ---------- UI ---------- */
  const STYLE_ID = 'suat-ics-export-style';
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      #suat-ics-fab{position:fixed;right:18px;bottom:70px;z-index:999999;padding:10px 14px;background:#2f6fed;color:#fff;border:none;border-radius:22px;font-size:14px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);}
      #suat-ics-fab:hover{background:#1f56c8;}
      #suat-ics-panel{position:fixed;right:18px;bottom:130px;z-index:999999;width:320px;background:#fff;border:1px solid #d9d9d9;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.2);font:14px/1.6 "Microsoft YaHei",sans-serif;color:#333;padding:14px 16px;display:none;}
      #suat-ics-panel h4{margin:0 0 10px;font-size:15px;}
      #suat-ics-panel label{display:block;margin:8px 0 4px;}
      #suat-ics-panel select,#suat-ics-panel input[type=checkbox]{vertical-align:middle;}
      #suat-ics-panel select{width:100%;padding:4px;}
      #suat-ics-panel .row-check{margin:8px 0;}
      #suat-ics-panel .btns{margin-top:12px;display:flex;gap:8px;}
      #suat-ics-panel button{padding:6px 14px;border-radius:6px;border:1px solid #c9c9c9;background:#f5f5f5;cursor:pointer;font-size:13px;}
      #suat-ics-panel button.primary{background:#2f6fed;color:#fff;border-color:#2f6fed;flex:1;}
      #suat-ics-panel .status{margin-top:10px;font-size:12px;color:#666;word-break:break-all;}
      #suat-ics-panel .status.err{color:#d33;}
    `;
    document.head.appendChild(st);
  }

  const fab = document.createElement('button');
  fab.id = 'suat-ics-fab';
  fab.type = 'button';
  fab.textContent = '📅 导出课表 ICS';
  fab.addEventListener('click', openPanel);
  (document.body || document.documentElement).appendChild(fab);

  let panel = null;
  function openPanel() {
    if (panel) { panel.style.display = 'block'; return; }
    panel = document.createElement('div');
    panel.id = 'suat-ics-panel';
    const sems = listSemesters();
    const defId = currentDefaultSemesterId();
    const options = sems.length
      ? sems.map(s => '<option value="' + s.id + '">' + icsEscape(s.nameZh || s.id) + '</option>').join('')
      : '<option value="">（未检测到学期）</option>';
    panel.innerHTML =
      '<h4>导出课表为 ICS 日历</h4>' +
      '<label for="suat-ics-sem">学期</label>' +
      '<select id="suat-ics-sem">' + options + '</select>' +
      '<div class="row-check"><label style="display:inline"><input type="checkbox" id="suat-ics-exp" checked> 含实验</label></div>' +
      '<div class="btns">' +
      '<button type="button" class="primary" id="suat-ics-gen">生成并下载</button>' +
      '<button type="button" id="suat-ics-close">关闭</button>' +
      '</div>' +
      '<div class="status" id="suat-ics-status"></div>';
    document.body.appendChild(panel);
    const semSel = panel.querySelector('#suat-ics-sem');
    if (defId && Array.from(semSel.options).some(o => +o.value === defId)) semSel.value = String(defId);
    panel.querySelector('#suat-ics-close').addEventListener('click', function () { panel.style.display = 'none'; });
    panel.querySelector('#suat-ics-gen').addEventListener('click', generate);
    panel.style.display = 'block';
  }

  function setStatus(html, isErr) {
    const el = panel && panel.querySelector('#suat-ics-status');
    if (!el) return;
    el.innerHTML = html;
    el.className = 'status' + (isErr ? ' err' : '');
  }

  async function generate() {
    if (!panel) return;
    const semSel = panel.querySelector('#suat-ics-sem');
    const expCb = panel.querySelector('#suat-ics-exp');
    const sid = semSel ? +semSel.value : null;
    if (!sid) { setStatus('无法确定学期。', true); return; }
    const genBtn = panel.querySelector('#suat-ics-gen');
    genBtn.disabled = true;
    setStatus('正在获取课表数据…');
    try {
      const hasExp = !expCb || expCb.checked;
      const url = CONTEXT + '/semester/' + sid + '/print-data?semesterId=' + sid + '&hasExperiment=' + (hasExp ? 'true' : 'false');
      const data = await apiGet(url);
      const vm = (data.studentTableVms && data.studentTableVms[0]) || null;
      const activities = vm ? vm.activities || [] : [];
      if (!vm || !activities.length) throw new Error('该学期没有可导出的课程安排。');
      let semester = (listSemesters().find(s => +s.id === +sid)) || { id: sid, nameZh: String(sid) };
      semester = await ensureSemesterInfo(semester);
      const res = buildIcsText({ semester, semesterId: sid, semesterName: semester.nameZh, activities, vm });
      if (!res.count) { setStatus('没有可导出的日程（请检查学期/含实验选项）。', true); return; }
      const now = new Date();
      const fname = '课表_' + String(semester.nameZh || sid).replace(/[\\/:*?"<>|]/g, '_') + '_' + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '.ics';
      downloadIcs(fname, res.text);
      setStatus('✅ 已生成 ' + res.count + ' 个日程并开始下载（' + fname + '）。<br>导入方式：Google 日历→导入；Outlook/苹果日历直接打开文件。');
    } catch (e) {
      setStatus('❌ ' + icsEscape(e && e.message ? e.message : e), true);
    } finally {
      genBtn.disabled = false;
    }
  }
})();
