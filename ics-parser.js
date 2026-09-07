/**
 * ics-parser.js — ICS 日历解析器（供 SUAT课程表 导入 .ics 文件/文本使用）
 *
 * 兼容:
 *  - 教务课表「导出课表」Tampermonkey 脚本生成的 UTC 时间(Z 结尾)
 *  - 本应用自身导出的"本地浮动时间"ICS
 *  - 常见带 TZID=Asia/Shanghai 参数 / UTC 偏移的日程
 *  - FREQ=WEEKLY 的重复日程(支持 INTERVAL/BYDAY/COUNT/UNTIL)
 *
 * 暴露: window.IcsImport (浏览器) / module.exports (Node 测试)
 */
(function (global) {
    'use strict';

    var WD_NUM = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    var NUM_WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    function looksLikeIcs(text) {
        return !!text && /^\uFEFF?\s*BEGIN\s*:\s*VCALENDAR/i.test(text);
    }

    // RFC5545 折行展开
    function unfold(text) {
        var normalized = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var raw = normalized.split('\n');
        var out = [];
        for (var i = 0; i < raw.length; i++) {
            if (/^[ \t]/.test(raw[i]) && out.length) {
                out[out.length - 1] += raw[i].slice(1);
            } else if (raw[i].trim() !== '') {
                out.push(raw[i]);
            }
        }
        return out;
    }

    function unescapeText(s) {
        return String(s)
            .replace(/\\n/gi, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }

    function splitProp(line) {
        var idx = line.indexOf(':');
        if (idx < 0) return null;
        var head = line.slice(0, idx);
        var params = {};
        var parts = head.split(';');
        var key = parts.shift().trim().toUpperCase();
        for (var i = 0; i < parts.length; i++) {
            var eq = parts[i].indexOf('=');
            if (eq > 0) params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
        }
        return { key: key, params: params, value: line.slice(idx + 1) };
    }

    function parseDateTimeToken(raw, params) {
        var s = String(raw).trim();
        var isUtc = false;
        var offsetMin = 0;
        var m;
        if (/[zZ]$/.test(s)) { isUtc = true; s = s.slice(0, -1); }
        else if (/[+-]\d{4}$/.test(s)) {
            var om = /([+-])(\d{2})(\d{2})$/.exec(s);
            offsetMin = (om[1] === '+' ? 1 : -1) * (+om[2] * 60 + +om[3]);
            s = s.replace(/[+-]\d{4}$/, '');
        }
        var tzid = String(params['TZID'] || '').toUpperCase();
        var isCst = /^(ASIA\/SHANGHAI|ASIA\/CHONGQING|ASIA\/HARBIN|ASIA\/URUMQI|CHINA|CST|GMT\+8|UTC\+8|CN)$/.test(tzid) ||
            /^\+08:?00$/.test(String(params['TZID'] || ''));

        if (/^\d{8}$/.test(s)) {
            m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
            return { dateOnly: true, y: +m[1], mo: +m[2] - 1, d: +m[3] };
        }
        m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(s);
        if (!m) throw new Error('无法识别的时间: ' + raw);
        var y = +m[1], mo = +m[2] - 1, d = +m[3], h = +m[4], mi = +m[5], se = m[6] ? +m[6] : 0;
        if (isUtc || isCst) {
            var base = Date.UTC(y, mo, d, h, mi, se) - offsetMin * 60000;
            if (isCst && !isUtc) base -= 8 * 3600 * 1000; // TZID 亚洲上海 -> UTC+8
            return { dateOnly: false, instant: base };
        }
        // 浮动时间: 按运行环境本机时区
        return { dateOnly: false, instant: new Date(y, mo, d, h, mi, se).getTime() };
    }

    // 解析 VEVENT 正文(已去除嵌套组件如 VALARM 的行)
    function eventProps(keptLines) {
        var props = [];
        var map = {};
        for (var i = 0; i < keptLines.length; i++) {
            var p = splitProp(keptLines[i]);
            if (!p) continue;
            if (!map[p.key]) { map[p.key] = []; props.push(p); }
            map[p.key].push(p);
        }
        return map;
    }

    function getProp(map, key) {
        var arr = map[key];
        return arr && arr.length ? arr[0] : null;
    }

    function parseUntil(raw) {
        var tok = parseDateTimeToken(raw, {});
        return tok.dateOnly ? new Date(tok.y, tok.mo, tok.d, 23, 59, 59, 999).getTime() : tok.instant;
    }

    function buildEvent(map) {
        var startProp = getProp(map, 'DTSTART');
        if (!startProp) return null;
        var startTok = parseDateTimeToken(startProp.value, startProp.params);
        var startMs = startTok.dateOnly ? new Date(startTok.y, startTok.mo, startTok.d).getTime() : startTok.instant;

        var endProp = getProp(map, 'DTEND');
        var endMs;
        if (endProp) {
            var endTok = parseDateTimeToken(endProp.value, endProp.params);
            if (endTok.dateOnly) {
                endMs = new Date(endTok.y, endTok.mo, endTok.d).getTime();
                if (!startTok.dateOnly) endMs += 86399999; // 当天结束
            } else {
                endMs = endTok.instant;
            }
        } else if (startTok.dateOnly) {
            endMs = startMs + 86399999;
        } else {
            endMs = startMs + 3600 * 1000;
        }

        var summary = getProp(map, 'SUMMARY');
        var location = getProp(map, 'LOCATION');
        var description = getProp(map, 'DESCRIPTION');
        var uid = getProp(map, 'UID');
        var rrule = getProp(map, 'RRULE');

        return {
            summary: summary ? unescapeText(summary.value).trim() : '',
            location: location ? unescapeText(location.value).trim() : '',
            description: description ? unescapeText(description.value).trim() : '',
            uid: uid ? uid.value.trim() : '',
            start: startMs,
            end: endMs,
            allDay: !!startTok.dateOnly,
            rrule: rrule ? rrule.value : null
        };
    }

    function expandRecurrence(ev) {
        if (!ev.rrule) return [{ start: ev.start, end: ev.end }];

        var r = {};
        String(ev.rrule).split(';').forEach(function (part) {
            var eq = part.indexOf('=');
            if (eq > 0) r[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).toUpperCase();
        });
        if (r['FREQ'] !== 'WEEKLY') return [{ start: ev.start, end: ev.end }]; // 其它频率保留单次

        var byday = (r['BYDAY'] || '').split(',').filter(function (x) { return WD_NUM[x] !== undefined; });
        var count = r['COUNT'] ? parseInt(r['COUNT'], 10) : null;
        var until = r['UNTIL'] ? parseUntil(r['UNTIL']) : null;
        var interval = r['INTERVAL'] ? (parseInt(r['INTERVAL'], 10) || 1) : 1;

        var s = new Date(ev.start);
        var dur = ev.end - ev.start;
        var startDow = s.getDay();
        if (!byday.length) byday = [NUM_WD[startDow]];
        var dayIndex = NUM_WD.indexOf(byday[0]);

        // 以 DTSTART 当天为基准向前找本周的第一天(周日), 然后按天迭代
        var anchor = new Date(s);
        anchor.setDate(anchor.getDate() - startDow); // 所在周的周日
        var out = [];
        var guard = 0;
        var maxDays = 100000;
        var cur = new Date(anchor);
        cur.setDate(cur.getDate() - 6); // 从周一(周起点)之前开始, 覆盖周日
        // 更直接: 从 DTSTART 当天开始迭代
        cur = new Date(s);

        while (guard++ < maxDays) {
            var dow = cur.getDay();
            var diffDays = Math.round((cur.getTime() - s.getTime()) / 86400000);
            var weekIndex = Math.floor((diffDays + 100000) / 7) - Math.floor(100000 / 7); // 可靠取整
            // diffDays 与 weekIndex 关系: diffDays = weekIndex*7 + (dow-startDow)
            var inThisWeek = dow >= startDow ? diffDays - (dow - startDow) : diffDays - (dow - startDow + 7);
            var wk = inThisWeek / 7;
            if (wk % interval === 0 && wk >= 0) {
                var sameDowSet = new Set(byday.map(function (b) { return WD_NUM[b]; }));
                if (sameDowSet.has(dow)) {
                    var instStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(),
                        s.getHours(), s.getMinutes(), s.getSeconds(), 0).getTime();
                    var instEnd = instStart + dur;
                    var tooEarly = instStart < ev.start - 60000;
                    var tooLate = until != null && instStart > until;
                    if (!tooEarly && !tooLate) {
                        out.push({ start: instStart, end: instEnd });
                        if (count && out.length >= count) break;
                    }
                }
            }
            cur.setDate(cur.getDate() + 1);
            if (until != null && cur.getTime() > until) break;
        }
        return out.length ? out : [{ start: ev.start, end: ev.end }];
    }

    /**
     * 解析完整 ICS 文本
     * @returns {{events: Array, calendarName: string, warnings: string[]}}
     */
    function parse(text) {
        if (!looksLikeIcs(text)) throw new Error('内容不是有效的 ICS (缺少 BEGIN:VCALENDAR)');
        var lines = unfold(String(text).replace(/^\uFEFF/, ''));
        var events = [];
        var warnings = [];
        var calendarName = '';
        var i = 0;

        while (i < lines.length) {
            var m = /^(BEGIN|END)\s*:\s*([A-Z0-9-]+)/i.exec(lines[i]);
            if (!m) {
                if (/^X-WR-CALNAME\s*:/i.test(lines[i])) {
                    calendarName = lines[i].split(':').slice(1).join(':').trim();
                }
                i++;
                continue;
            }
            var kw = m[1].toUpperCase();
            var comp = m[2].toUpperCase();
            if (kw === 'END' || comp !== 'VEVENT') { i++; continue; }

            // 找到 VEVENT 开始, 收集正文直到配对的 END:VEVENT
            var body = [];
            var depth = 0;
            i++;
            var finished = false;
            while (i < lines.length) {
                var mm = /^(BEGIN|END)\s*:\s*([A-Z0-9-]+)/i.exec(lines[i]);
                if (mm) {
                    var k2 = mm[1].toUpperCase();
                    var c2 = mm[2].toUpperCase();
                    if (c2 === 'VEVENT' && k2 === 'END' && depth === 0) { finished = true; i++; break; }
                    if (c2 === 'VEVENT' && k2 === 'BEGIN') depth++; // 异常嵌套, 容错
                    else if (k2 === 'BEGIN') depth++;
                    else if (k2 === 'END' && depth > 0) depth--;
                    i++;
                    continue;
                }
                if (depth === 0) body.push(lines[i]);
                i++;
            }
            if (!finished) break;

            var map = eventProps(body);
            var ev = buildEvent(map);
            if (ev) {
                if (!ev.summary && !ev.start) continue;
                var occs = expandRecurrence(ev);
                for (var k = 0; k < occs.length; k++) {
                    events.push({
                        summary: ev.summary,
                        location: ev.location,
                        description: ev.description,
                        uid: ev.uid,
                        start: occs[k].start,
                        end: occs[k].end,
                        allDay: ev.allDay
                    });
                }
            }
        }

        if (!events.length) warnings.push('没有找到可导入的日程(VEVENT)');
        return { events: events, calendarName: calendarName, warnings: warnings };
    }

    /**
     * 解析并转换为课程表 JSON(epoch 毫秒)
     * @returns {{list: Array, calendarName: string, warnings: string[], json: string}}
     */
    function convertToCoursesJson(text) {
        var parsed = parse(text);
        var list = parsed.events.map(function (ev) {
            var desc = ev.description || '';
            var descLines = desc.split('\n');
            var teacher = '';
            for (var i = 0; i < descLines.length; i++) {
                var tm = /^\s*(?:授课教师|教师|老师|teacher)\s*[:：]\s*(.+)$/i.exec(descLines[i]);
                if (tm) { teacher = tm[1].trim(); break; }
            }
            // 去掉 "[校区] " 前缀, 保留建筑+教室
            var loc = String(ev.location || '').replace(/^\s*\[[^\]\n]{0,30}\]\s*/, '').trim();
            var item = {
                lessonName: ev.summary || '未知课程',
                teacherName: teacher || '未知教师',
                classRoomName: loc || '未知地点',
                startTime: ev.start,
                endTime: ev.end
            };
            if (desc) item.description = desc;
            return item;
        });
        return {
            list: list,
            calendarName: parsed.calendarName,
            warnings: parsed.warnings,
            json: JSON.stringify({ data: { list: list } }, null, 2)
        };
    }

    var api = {
        looksLikeIcs: looksLikeIcs,
        parse: parse,
        convertToCoursesJson: convertToCoursesJson
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    global.IcsImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
