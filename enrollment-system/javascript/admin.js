// ═══════════════════════════════════════════════════════════════
//  Admin Dashboard — admin.js
//  JJKings Academy of Biringan Enrollment System
// ═══════════════════════════════════════════════════════════════

'use strict';

// ─── State ────────────────────────────────────────────────────
let allStudents        = [];      // All student records from DB (excl. system admins)
let enrollmentFilter   = 'all';   // 'all' | 'pending' | 'under-review' | 'rejected'
let studentLevelFilter = 'all';   // 'all' | 'junior' | 'senior'
let currentReviewId    = null;    // DB id of student currently in review modal

// ─── SweetAlert2 Mixin ────────────────────────────────────────
const Swal = window.Swal.mixin({
    customClass: {
        popup:         'rounded-2xl shadow-2xl border border-slate-100',
        title:         'text-xl font-bold text-slate-800',
        htmlContainer: 'text-slate-500 text-sm leading-relaxed mt-1',
        confirmButton: 'bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        cancelButton:  'bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl hover:bg-slate-300 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        denyButton:    'bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
    },
    buttonsStyling: false,
});

// ─── Utility Helpers ──────────────────────────────────────────
/** Return value or fallback when null/undefined/empty */
const v = (val, fallback = 'N/A') =>
    (val !== null && val !== undefined && val !== '') ? val : fallback;

/** Format a date string to a human-readable PH locale date */
function fmtDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/** Generate animated skeleton table rows */
function skeletonRows(cols, count = 5) {
    const widths = ['w-28', 'w-36', 'w-24', 'w-20', 'w-16'];
    return Array.from({ length: count }, (_, r) => `
        <tr class="border-b border-slate-100 animate-pulse">
            ${Array.from({ length: cols }, (_, c) => `
                <td class="px-4 py-3.5">
                    <div class="h-3.5 bg-slate-200 rounded-full ${widths[(r + c) % widths.length]}"></div>
                </td>`).join('')}
        </tr>`).join('');
}

/** Render a coloured status pill */
function statusBadge(status) {
    const styles = {
        approved:       'bg-green-100 text-green-700 border-green-200',
        pending:        'bg-yellow-100 text-yellow-700 border-yellow-200',
        rejected:       'bg-red-100 text-red-600 border-red-200',
        'under-review': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const labels = {
        approved: 'Approved', pending: 'Pending',
        rejected: 'Rejected', 'under-review': 'Under Review',
    };
    const cls = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}">${labels[status] || status}</span>`;
}

/** Render a single label–value row inside a section card */
function infoRow(label, value) {
    const display = v(value);
    return `
        <div class="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
            <span class="text-[11px] font-semibold text-slate-400 sm:min-w-[160px] uppercase tracking-wide pt-px flex-shrink-0">${label}</span>
            <span class="text-sm text-slate-800">${display}</span>
        </div>`;
}

/** Render a titled card wrapping a list of infoRows */
function sectionCard(icon, title, rows) {
    return `
        <div class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                <i class="${icon} text-blue-500 text-xs"></i>
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">${title}</span>
            </div>
            <div class="px-4 divide-y divide-slate-50">${rows}</div>
        </div>`;
}

/** Compute a sensible default class section from level/strand/gradeLevel */
function getDefaultSection(student) {
    const level      = (student.level      || '').toLowerCase();
    const strand     = (student.strand     || 'XX').toUpperCase().replace(/\s+/g, '').slice(0, 4);
    const gradeLevel = student.grade_level || '7';

    if (level.includes('senior') && level.includes('12')) return `SHS12-${strand}-A`;
    if (level.includes('senior') && level.includes('11')) return `SHS11-${strand}-A`;
    if (level.includes('senior'))                         return `SHS-${strand}-A`;
    if (level.includes('junior'))                         return `JHS-${gradeLevel}-A`;
    return 'SEC-A';
}

// ─── Data Loading ─────────────────────────────────────────────
async function loadAllStudents() {
    document.getElementById('enrollmentsTableBody').innerHTML = skeletonRows(7);
    document.getElementById('studentsTableBody').innerHTML    = skeletonRows(7);

    try {
        const res  = await fetch('php/api.php?action=students');
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            // Strip out hard-coded admin email accounts
            allStudents = json.data.filter(s =>
                s.email !== 'admin@university.local' && s.email !== 'admin@biringan.edu'
            );
            updateStats();
            renderCharts();
            renderEnrollmentsTable();
            renderStudentsTable();
        } else {
            showTableError('enrollmentsTableBody', 7, 'Failed to load enrollment data.');
            showTableError('studentsTableBody',    7, 'Failed to load student data.');
        }
    } catch {
        showTableError('enrollmentsTableBody', 7, 'Network error. Please refresh the page.');
        showTableError('studentsTableBody',    7, 'Network error. Please refresh the page.');
    }
}

function showTableError(tbodyId, cols, msg) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" class="px-4 py-10 text-center text-slate-400 text-sm">${msg}</td></tr>`;
}

// ─── Charts Engine ─────────────────────────────────────────

const chartInstances = {}; // track chart instances for cleanup

function isDarkMode() {
    return document.documentElement.classList.contains('admin-dark');
}

function chartTheme() {
    const dark = isDarkMode();
    return {
        textColor:   dark ? '#8b949e' : '#64748b',
        gridColor:   dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        tooltipBg:   dark ? '#1c2128' : '#1e293b',
        tooltipText: '#f8fafc',
    };
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function renderCharts() {
    if (typeof Chart === 'undefined') return; // Chart.js not loaded yet
    renderTrendChart();
    renderStrandChart();
    renderStatusChart();
}

/* ─────────────────────────────────────────
   Chart 1 — Monthly Enrollment Trend (line)
   Shows how many applications arrived each month
   over the past 6 months.
───────────────────────────────────────── */
function renderTrendChart() {
    destroyChart('trend');
    const t = chartTheme();

    // Build last-6-months buckets
    const now    = new Date();
    const labels = [];
    const counts = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }));
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.push(allStudents.filter(s => {
            if (!s.created_at) return false;
            return s.created_at.startsWith(monthStr);
        }).length);
    }

    const ctx = document.getElementById('chartTrend');
    if (!ctx) return;

    chartInstances.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Applications',
                data: counts,
                fill: true,
                backgroundColor: 'rgba(59,130,246,0.08)',
                borderColor: '#3b82f6',
                borderWidth: 2.5,
                pointBackgroundColor: '#3b82f6',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} application${ctx.parsed.y !== 1 ? 's' : ''}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 } },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 }, stepSize: 1, precision: 0 },
                },
            },
        },
    });
}

/* ─────────────────────────────────────────
   Chart 2 — Strand / Level Distribution (donut)
   Shows how enrolled students are spread across
   JHS, STEM, ABM, HUMSS, TVL-HE, TVL-ICT, TVL-IA.
───────────────────────────────────────── */
function renderStrandChart() {
    destroyChart('strand');
    const t = chartTheme();

    const approved = allStudents.filter(s => s.status === 'approved');

    // Bucket by level/strand label
    const buckets = {
        'JHS':      0,
        'STEM':     0,
        'ABM':      0,
        'HUMSS':    0,
        'TVL-HE':   0,
        'TVL-ICT':  0,
        'TVL-IA':   0,
        'Other':    0,
    };

    approved.forEach(s => {
        const level  = (s.level  || '').toLowerCase();
        const strand = (s.strand || '').toLowerCase();

        if (level.includes('junior')) {
            buckets['JHS']++;
        } else if (strand.includes('stem')) {
            buckets['STEM']++;
        } else if (strand.includes('abm')) {
            buckets['ABM']++;
        } else if (strand.includes('humss')) {
            buckets['HUMSS']++;
        } else if (strand.includes('he') || strand.includes('home')) {
            buckets['TVL-HE']++;
        } else if (strand.includes('ict') || strand.includes('tech')) {
            buckets['TVL-ICT']++;
        } else if (strand.includes('ia') || strand.includes('industrial')) {
            buckets['TVL-IA']++;
        } else {
            buckets['Other']++;
        }
    });

    const labels = Object.keys(buckets).filter(k => buckets[k] > 0);
    const data   = labels.map(k => buckets[k]);

    const palette = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
        '#ef4444', '#06b6d4', '#f97316', '#64748b',
    ];

    const ctx = document.getElementById('chartStrand');
    if (!ctx) return;

    chartInstances.strand = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderColor: isDarkMode() ? '#161b22' : '#ffffff',
                borderWidth: 3,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: t.textColor,
                        font: { size: 10 },
                        padding: 10,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    },
                },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} student${ctx.parsed !== 1 ? 's' : ''}`,
                    },
                },
            },
        },
    });
}

/* ─────────────────────────────────────────
   Chart 3 — Status Breakdown (grouped bar)
   Shows Approved / Pending / Under Review / Rejected
   counts split by JHS vs SHS.
───────────────────────────────────────── */
function renderStatusChart() {
    destroyChart('status');
    const t = chartTheme();

    const statuses = ['approved', 'pending', 'under-review', 'rejected'];
    const labels   = ['Approved', 'Pending', 'Under Review', 'Rejected'];

    function countBy(levelFilter, status) {
        return allStudents.filter(s => {
            const lv = (s.level || '').toLowerCase();
            const matchLevel = levelFilter === 'jhs'
                ? lv.includes('junior')
                : lv.includes('senior') || (!lv.includes('junior') && s.strand);
            return matchLevel && s.status === status;
        }).length;
    }

    const jhsData = statuses.map(st => countBy('jhs', st));
    const shsData = statuses.map(st => countBy('shs', st));

    const barColors = {
        approved:      { bg: 'rgba(16,185,129,0.75)',  border: '#10b981' },
        pending:       { bg: 'rgba(245,158,11,0.75)',  border: '#f59e0b' },
        'under-review':{ bg: 'rgba(59,130,246,0.75)',  border: '#3b82f6' },
        rejected:      { bg: 'rgba(239,68,68,0.75)',   border: '#ef4444' },
    };

    const ctx = document.getElementById('chartStatus');
    if (!ctx) return;

    chartInstances.status = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Junior High',
                    data: jhsData,
                    backgroundColor: statuses.map(s => barColors[s].bg),
                    borderColor:     statuses.map(s => barColors[s].border),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Senior High',
                    data: shsData,
                    backgroundColor: statuses.map(s => barColors[s].bg.replace('0.75', '0.4')),
                    borderColor:     statuses.map(s => barColors[s].border),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                    borderDash: [4, 2],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: t.textColor,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        padding: 12,
                    },
                },
                tooltip: {
                    backgroundColor: t.tooltipBg,
                    titleColor: t.tooltipText,
                    bodyColor: t.tooltipText,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: t.textColor, font: { size: 11 } },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: t.gridColor },
                    ticks: { color: t.textColor, font: { size: 11 }, precision: 0, stepSize: 1 },
                },
            },
        },
    });
}

// ─── Stats Cards ──────────────────────────────────────────────
function updateStats() {
    const total    = allStudents.length;
    const enrolled = allStudents.filter(s => s.status === 'approved').length;
    const pending  = allStudents.filter(s => s.status === 'pending' || s.status === 'under-review').length;
    const rejected = allStudents.filter(s => s.status === 'rejected').length;
    const pendingOnly = allStudents.filter(s => s.status === 'pending').length;

    document.getElementById('statTotalStudents').textContent = total;
    document.getElementById('statEnrolled').textContent      = enrolled;
    document.getElementById('statPending').textContent       = pending;
    document.getElementById('statRejected').textContent      = rejected;

    const badge = document.getElementById('pendingBadge');
    if (pendingOnly > 0) {
        badge.textContent = pendingOnly;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ─── Enrollment Applications Tab ──────────────────────────────
const enrollFilterDefaultClasses = {
    all:            'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
    pending:        'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    'under-review': 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    rejected:       'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
};

function setEnrollmentFilter(status, btn) {
    enrollmentFilter = status;
    document.querySelectorAll('.enroll-filter').forEach(b => {
        const key = b.dataset.filter || 'all';
        b.className = `enroll-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${enrollFilterDefaultClasses[key] || enrollFilterDefaultClasses.all}`;
    });
    btn.className = 'enroll-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition bg-slate-800 text-white border-slate-700';
    renderEnrollmentsTable();
}

function renderEnrollmentsTable() {
    const query = (document.getElementById('searchEnrollments').value || '').toLowerCase().trim();

    // Only show non-approved students in this tab
    let rows = allStudents.filter(s => s.status !== 'approved');

    if (enrollmentFilter !== 'all') {
        rows = rows.filter(s => s.status === enrollmentFilter);
    }

    if (query) {
        rows = rows.filter(s => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase();
            return name.includes(query)
                || (s.email  || '').toLowerCase().includes(query)
                || (s.level  || '').toLowerCase().includes(query)
                || (s.strand || '').toLowerCase().includes(query);
        });
    }

    const tbody = document.getElementById('enrollmentsTableBody');

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No applications found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(s => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 font-medium text-slate-800">${v(s.first_name)} ${v(s.last_name)}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">${v(s.email)}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">${v(s.level)}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">${v(s.strand)}</td>
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">${fmtDate(s.created_at)}</td>
            <td class="px-4 py-3">${statusBadge(s.status)}</td>
            <td class="px-4 py-3">
                <button onclick="openEnrollmentReviewModal(${s.id})"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold rounded-lg transition">
                    <i class="fas fa-search text-[10px]"></i> Review
                </button>
            </td>
        </tr>`).join('');
}

// ─── Enrolled Students Tab ────────────────────────────────────
const studentFilterDefaultClasses = {
    all:    'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
    junior: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
    senior: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
};

function setStudentFilter(level, btn) {
    studentLevelFilter = level;
    document.querySelectorAll('.student-filter').forEach(b => {
        const key = b.dataset.filter || 'all';
        b.className = `student-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${studentFilterDefaultClasses[key] || studentFilterDefaultClasses.all}`;
    });
    btn.className = 'student-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition bg-slate-800 text-white border-slate-700';
    renderStudentsTable();
}

function renderStudentsTable() {
    const query = (document.getElementById('searchStudents').value || '').toLowerCase().trim();

    let rows = allStudents.filter(s => s.status === 'approved');

    if (studentLevelFilter === 'junior') {
        rows = rows.filter(s => (s.level || '').toLowerCase().includes('junior'));
    } else if (studentLevelFilter === 'senior') {
        rows = rows.filter(s => (s.level || '').toLowerCase().includes('senior'));
    }

    if (query) {
        rows = rows.filter(s => {
            const name = `${s.first_name} ${s.last_name}`.toLowerCase();
            return name.includes(query)
                || (s.student_id   || '').toLowerCase().includes(query)
                || (s.email        || '').toLowerCase().includes(query)
                || (s.class_section|| '').toLowerCase().includes(query)
                || (s.strand       || '').toLowerCase().includes(query);
        });
    }

    const tbody = document.getElementById('studentsTableBody');

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-slate-400 text-sm">No enrolled students found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(s => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">${v(s.student_id)}</td>
            <td class="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">${v(s.first_name)} ${v(s.last_name)}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">${v(s.email)}</td>
            <td class="px-4 py-3 text-xs">
                <span class="block font-medium text-slate-700">${v(s.level)}</span>
                ${s.strand ? `<span class="text-slate-400">${s.strand}</span>` : ''}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">${v(s.class_section)}</td>
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">${fmtDate(s.approved_at || s.created_at)}</td>
            <td class="px-4 py-3">
                <button onclick="openProfileDrawer(${s.id})"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition">
                    <i class="fas fa-user text-[10px]"></i> View
                </button>
            </td>
        </tr>`).join('');
}

// ─── Enrollment Review Modal ──────────────────────────────────
function openEnrollmentReviewModal(studentId) {
    currentReviewId = studentId;

    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('reviewStudentDetails').innerHTML = skeletonRows(1, 10);
    document.getElementById('reviewModalSubtitle').textContent = 'Loading applicant data…';

    const student = allStudents.find(s => s.id == studentId);
    if (student) {
        populateReviewModal(student);
    } else {
        fetch(`php/api.php?action=getStudent&id=${studentId}`)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) populateReviewModal(json.data);
                else document.getElementById('reviewStudentDetails').innerHTML =
                    `<p class="text-center text-slate-400 py-10">Failed to load student data.</p>`;
            })
            .catch(() => {
                document.getElementById('reviewStudentDetails').innerHTML =
                    `<p class="text-center text-slate-400 py-10">Network error. Please try again.</p>`;
            });
    }
}

function populateReviewModal(s) {
    document.getElementById('reviewModalSubtitle').textContent =
        `Reviewing: ${s.first_name} ${s.last_name}  ·  Applied ${fmtDate(s.created_at)}`;

    const fatherName = s.father_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.father_first_name)} ${v(s.father_middle_name, '')} ${v(s.father_last_name)}`.trim();

    const motherName = s.mother_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.mother_first_name)} ${v(s.mother_middle_name, '')} ${v(s.mother_last_name)}`.trim();

    document.getElementById('reviewStudentDetails').innerHTML = `
        <div class="flex flex-wrap gap-2 mb-1">
            ${statusBadge(s.status)}
            ${s.level ? `<span class="text-xs bg-slate-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.level}</span>` : ''}
            ${s.strand ? `<span class="text-xs bg-indigo-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.strand}</span>` : ''}
        </div>

        ${sectionCard('fas fa-user-circle', 'Personal Information', `
            ${infoRow('Full Name', `${v(s.first_name)} ${v(s.middle_name,'')} ${v(s.last_name)}${s.suffix ? ' '+s.suffix : ''}`)}
            ${infoRow('Date of Birth', fmtDate(s.dob))}
            ${infoRow('Gender', s.gender)}
            ${infoRow('Civil Status', s.civil_status)}
            ${infoRow('Nationality', s.nationality)}
            ${infoRow('Religion', s.religion)}
            ${infoRow('Dialect / Language', s.dialect)}
            ${infoRow('Place of Birth', s.place_of_birth)}
        `)}

        ${sectionCard('fas fa-map-marker-alt', 'Contact & Address', `
            ${infoRow('Email', s.email)}
            ${infoRow('Phone', s.phone)}
            ${infoRow('Landline', s.landline)}
            ${infoRow('Address', s.address)}
            ${infoRow('Region', s.region)}
            ${infoRow('Province', s.province)}
            ${infoRow('City / Municipality', s.city)}
            ${infoRow('Barangay', s.barangay)}
            ${infoRow('Zip Code', s.zip_code)}
        `)}

        ${sectionCard('fas fa-school', 'Educational Background', `
            ${infoRow('LRN (Learner Reference No.)', s.lrn)}
            ${infoRow('Elementary School', s.elementary_school)}
            ${infoRow('Elementary Graduation Year', s.elementary_year_graduated)}
            ${s.high_school                 ? infoRow('High School', s.high_school) : ''}
            ${s.high_school_year_graduated  ? infoRow('HS Graduation Year', s.high_school_year_graduated) : ''}
            ${s.grade10_section             ? infoRow('Grade 10 Section', s.grade10_section) : ''}
            ${infoRow('Public School Graduate', s.public_school_graduate)}
        `)}

        ${sectionCard('fas fa-graduation-cap', 'Enrollment Details', `
            ${infoRow('Level', s.level)}
            ${infoRow('Grade Level', s.grade_level)}
            ${infoRow('Strand', s.strand)}
            ${infoRow('Voucher Eligibility', s.voucher_eligibility)}
            ${infoRow('Data Privacy Agreed', s.data_privacy_agreed ? 'Yes' : 'No')}
        `)}

        ${sectionCard('fas fa-user-friends', "Father's Information", `
            ${infoRow('Name', fatherName)}
            ${!s.father_deceased ? infoRow('Phone', s.father_phone) : ''}
            ${!s.father_deceased ? infoRow('Occupation', s.father_occupation) : ''}
            ${!s.father_deceased ? infoRow('Address', s.father_address) : ''}
        `)}

        ${sectionCard('fas fa-heart', "Mother's Information", `
            ${infoRow('Name', motherName)}
            ${!s.mother_deceased ? infoRow('Phone', s.mother_phone) : ''}
            ${!s.mother_deceased ? infoRow('Occupation', s.mother_occupation) : ''}
            ${!s.mother_deceased ? infoRow('Address', s.mother_address) : ''}
        `)}

        ${sectionCard('fas fa-shield-alt', "Guardian's Information", `
            ${infoRow('Name', `${v(s.guardian_first_name)} ${v(s.guardian_middle_name,'')} ${v(s.guardian_last_name)}`.trim())}
            ${infoRow('Phone', s.guardian_phone)}
            ${infoRow('Occupation', s.guardian_occupation)}
            ${infoRow('Address', s.guardian_address)}
        `)}
    `;

    // Auto-fill action fields
    document.getElementById('reviewSection').value = getDefaultSection(s);
    document.getElementById('reviewEmail').value   = s.email || '';
    ['verifyPublicSchool', 'verifyLRN', 'verifyPreviousSchool'].forEach(id => {
        document.getElementById(id).checked = false;
    });
    document.getElementById('adminNotes').value = '';

    // Hide approve/reject for already-decided students
    const isDecided = s.status === 'approved' || s.status === 'rejected';
    document.getElementById('approveBtn').style.display    = isDecided ? 'none' : '';
    document.getElementById('underReviewBtn').style.display = (s.status === 'under-review') ? 'none' : (isDecided ? 'none' : '');
    document.getElementById('rejectBtn').style.display     = isDecided ? 'none' : '';
}

function closeEnrollmentReviewModal() {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentReviewId = null;
}

// ─── Approve ──────────────────────────────────────────────────
async function approveEnrollment() {
    if (!currentReviewId) return;

    const sectionVal = document.getElementById('reviewSection').value.trim();
    const emailVal   = document.getElementById('reviewEmail').value.trim();

    if (!sectionVal || !emailVal) {
        Swal.fire({ icon: 'warning', title: 'Required Fields', text: 'Please assign a section and verify the portal email before approving.' });
        return;
    }

    const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: 'Approve Enrollment?',
        html: `This will create a student portal account with section <strong>${sectionVal}</strong>.`,
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        cancelButtonText: 'Cancel',
    });
    if (!isConfirmed) return;

    Swal.fire({ title: 'Processing…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res    = await fetch('php/api.php?action=updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentReviewId, status: 'approved', email: emailVal, section: sectionVal }),
        });
        const result = await res.json();

        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Enrollment Approved!',
                html: `
                    <div class="text-left bg-slate-50 rounded-xl p-4 mt-2 space-y-2 text-sm border border-slate-200">
                        <div class="flex justify-between gap-4">
                            <span class="text-slate-500 flex-shrink-0">Student ID</span>
                            <span class="font-mono font-bold text-slate-800">${result.studentId}</span>
                        </div>
                        <div class="flex justify-between gap-4">
                            <span class="text-slate-500 flex-shrink-0">Portal Email</span>
                            <span class="font-medium text-slate-800">${result.email || emailVal}</span>
                        </div>
                        <div class="flex justify-between gap-4">
                            <span class="text-slate-500 flex-shrink-0">Section</span>
                            <span class="font-mono font-bold text-slate-800">${result.section}</span>
                        </div>
                        <div class="flex justify-between gap-4 items-center">
                            <span class="text-slate-500 flex-shrink-0">Default Password</span>
                            <span class="font-mono bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">password123</span>
                        </div>
                    </div>
                    <p class="text-xs text-slate-400 mt-3">Advise the student to change their password on first login.</p>`,
                confirmButtonText: 'Done',
            });
            closeEnrollmentReviewModal();
            await loadAllStudents();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Failed to approve enrollment.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please check your connection and try again.' });
    }
}

// ─── Reject ───────────────────────────────────────────────────
async function rejectEnrollment() {
    if (!currentReviewId) return;

    const { isConfirmed, value: reason } = await Swal.fire({
        icon: 'warning',
        title: 'Reject Enrollment',
        input: 'textarea',
        inputLabel: 'Reason for rejection (required)',
        inputPlaceholder: 'Please provide a clear reason…',
        showCancelButton: true,
        confirmButtonText: 'Confirm Rejection',
        cancelButtonText: 'Cancel',
        inputValidator: val => (!val || !val.trim()) ? 'Please provide a rejection reason.' : null,
        customClass: {
            confirmButton: 'bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
            cancelButton:  'bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl hover:bg-slate-300 transition font-semibold text-sm border-none outline-none mx-1 cursor-pointer',
        },
    });
    if (!isConfirmed) return;

    Swal.fire({ title: 'Processing…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res    = await fetch('php/api.php?action=updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentReviewId, status: 'rejected', reason }),
        });
        const result = await res.json();

        if (result.success) {
            await Swal.fire({ icon: 'info', title: 'Application Rejected', text: 'The enrollment has been rejected and the record updated.' });
            closeEnrollmentReviewModal();
            await loadAllStudents();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Failed to reject enrollment.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please check your connection and try again.' });
    }
}

// ─── Mark Under Review ────────────────────────────────────────
async function setUnderReview() {
    if (!currentReviewId) return;

    Swal.fire({ title: 'Updating status…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res    = await fetch('php/api.php?action=updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentReviewId, status: 'under-review' }),
        });
        const result = await res.json();

        if (result.success) {
            await Swal.fire({ icon: 'success', title: 'Marked as Under Review', text: 'The application status has been updated.' });
            closeEnrollmentReviewModal();
            await loadAllStudents();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Failed to update status.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please check your connection and try again.' });
    }
}

// ─── Student Profile Drawer ───────────────────────────────────
function openProfileDrawer(studentId) {
    const overlay = document.getElementById('profileDrawerOverlay');
    const drawer  = document.getElementById('profileDrawer');

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        drawer.classList.remove('translate-x-full');
    });

    document.getElementById('drawerStudentName').textContent = 'Loading…';
    document.getElementById('drawerStudentId').textContent   = '—';
    document.getElementById('drawerContent').innerHTML = `
        <div class="space-y-4 animate-pulse">
            ${[1, 2, 3, 4].map(() => `
                <div class="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div class="h-3 bg-slate-200 rounded-full w-1/3 mb-4"></div>
                    ${[1, 2, 3].map(() => `<div class="h-3 bg-slate-100 rounded-full w-full"></div>`).join('')}
                </div>`).join('')}
        </div>`;

    const student = allStudents.find(s => s.id == studentId);
    if (student) {
        populateProfileDrawer(student);
    } else {
        fetch(`php/api.php?action=getStudent&id=${studentId}`)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) populateProfileDrawer(json.data);
                else document.getElementById('drawerContent').innerHTML =
                    `<p class="text-center text-slate-400 py-12">Failed to load student data.</p>`;
            })
            .catch(() => {
                document.getElementById('drawerContent').innerHTML =
                    `<p class="text-center text-slate-400 py-12">Network error. Please try again.</p>`;
            });
    }
}

function closeProfileDrawer() {
    const overlay = document.getElementById('profileDrawerOverlay');
    const drawer  = document.getElementById('profileDrawer');
    drawer.classList.add('translate-x-full');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

function populateProfileDrawer(s) {
    document.getElementById('drawerStudentName').textContent =
        `${s.first_name}${s.middle_name ? ' ' + s.middle_name.charAt(0) + '.' : ''} ${s.last_name}${s.suffix ? ' ' + s.suffix : ''}`;
    document.getElementById('drawerStudentId').textContent =
        s.student_id ? `ID: ${s.student_id}` : 'Student ID Pending';

    const fatherName = s.father_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.father_first_name)} ${v(s.father_middle_name,'')} ${v(s.father_last_name)}`.trim();

    const motherName = s.mother_deceased
        ? '<em class="text-slate-400">Deceased</em>'
        : `${v(s.mother_first_name)} ${v(s.mother_middle_name,'')} ${v(s.mother_last_name)}`.trim();

    document.getElementById('drawerContent').innerHTML = `
        <!-- Status & Badges -->
        <div class="flex flex-wrap gap-2">
            ${statusBadge(s.status)}
            ${s.class_section ? `<span class="text-xs font-mono bg-blue-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.class_section}</span>` : ''}
            ${s.level  ? `<span class="text-xs bg-slate-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.level}</span>` : ''}
            ${s.strand ? `<span class="text-xs bg-indigo-600 text-white px-2.5 py-0.5 rounded-md shadow-sm font-semibold border border-transparent">${s.strand}</span>` : ''}
        </div>

        ${sectionCard('fas fa-user', 'Personal Information', `
            ${infoRow('Full Name', `${v(s.first_name)} ${v(s.middle_name,'')} ${v(s.last_name)}${s.suffix ? ' '+s.suffix : ''}`)}
            ${infoRow('Date of Birth', fmtDate(s.dob))}
            ${infoRow('Gender', s.gender)}
            ${infoRow('Civil Status', s.civil_status)}
            ${infoRow('Nationality', s.nationality)}
            ${infoRow('Religion', s.religion)}
            ${infoRow('Dialect', s.dialect)}
            ${infoRow('Place of Birth', s.place_of_birth)}
        `)}

        ${sectionCard('fas fa-map-marker-alt', 'Contact & Address', `
            ${infoRow('Email', s.email)}
            ${infoRow('Phone', s.phone)}
            ${infoRow('Landline', s.landline)}
            ${infoRow('Address', s.address)}
            ${infoRow('Region', s.region)}
            ${infoRow('Province', s.province)}
            ${infoRow('City / Municipality', s.city)}
            ${infoRow('Barangay', s.barangay)}
            ${infoRow('Zip Code', s.zip_code)}
        `)}

        ${sectionCard('fas fa-school', 'Educational Background', `
            ${infoRow('LRN', s.lrn)}
            ${infoRow('Elementary School', s.elementary_school)}
            ${infoRow('Elementary Grad Year', s.elementary_year_graduated)}
            ${infoRow('High School', s.high_school)}
            ${infoRow('HS Grad Year', s.high_school_year_graduated)}
            ${infoRow('Grade 10 Section', s.grade10_section)}
            ${infoRow('Senior High School', s.senior_high_school)}
            ${infoRow('Public School Graduate', s.public_school_graduate)}
        `)}

        ${sectionCard('fas fa-graduation-cap', 'Enrollment Information', `
            ${infoRow('Level', s.level)}
            ${infoRow('Grade Level', s.grade_level)}
            ${infoRow('Strand', s.strand)}
            ${infoRow('Section', s.class_section)}
            ${infoRow('Student ID', s.student_id)}
            ${infoRow('Voucher Eligibility', s.voucher_eligibility)}
            ${infoRow('Applied On', fmtDate(s.created_at))}
            ${infoRow('Approved On', fmtDate(s.approved_at))}
        `)}

        ${sectionCard('fas fa-user-friends', 'Parents & Guardian', `
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 pb-1">Father</p>
            ${infoRow('Name', fatherName)}
            ${!s.father_deceased ? infoRow('Phone', s.father_phone) : ''}
            ${!s.father_deceased ? infoRow('Occupation', s.father_occupation) : ''}
            ${!s.father_deceased ? infoRow('Address', s.father_address) : ''}
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 pb-1">Mother</p>
            ${infoRow('Name', motherName)}
            ${!s.mother_deceased ? infoRow('Phone', s.mother_phone) : ''}
            ${!s.mother_deceased ? infoRow('Occupation', s.mother_occupation) : ''}
            ${!s.mother_deceased ? infoRow('Address', s.mother_address) : ''}
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 pb-1">Guardian</p>
            ${infoRow('Name', `${v(s.guardian_first_name)} ${v(s.guardian_middle_name,'')} ${v(s.guardian_last_name)}`.trim())}
            ${infoRow('Phone', s.guardian_phone)}
            ${infoRow('Occupation', s.guardian_occupation)}
            ${infoRow('Address', s.guardian_address)}
        `)}
    `;
}

// ─── Curriculum Tab ───────────────────────────────────────────
let allSubjects = [];

async function loadAllSubjects() {
    try {
        const response = await fetch('php/api.php?action=getSubjects');
        const result = await response.json();
        if (result.success) {
            allSubjects = result.data || [];
            renderCurriculumSubjects();
        } else {
            console.error('Failed to load subjects:', result.message);
        }
    } catch (err) {
        console.error('Error fetching subjects:', err);
    }
}


function renderCurriculumSubjects() {
    const levelSelect = document.getElementById('curriculumLevelSelect');
    const grid        = document.getElementById('curriculumGrid');
    if (!levelSelect || !grid) return;

    const selectedLevel = levelSelect.value;
    const subjects = allSubjects.filter(s => s.level_strand === selectedLevel);
    
    if (!subjects.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-8">No subjects found for this track.</div>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => `
        <div class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition duration-200 relative group">
            <div class="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button onclick="editSubject(${sub.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="deleteSubject(${sub.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
            <div class="mb-3 pr-16">
                <span class="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100 uppercase">${sub.code}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-sm mb-1.5 pr-2">${sub.name}</h4>
            <p class="text-xs text-slate-500 leading-relaxed">${v(sub.description, '')}</p>
        </div>`).join('');
}

// ─── Subject Management (CRUD) ───────────────────────────────────

function openSubjectModal() {
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectId').value = '';
    const levelStrand = document.getElementById('curriculumLevelSelect').value;
    document.getElementById('subjectLevelStrand').value = levelStrand;
    
    document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-book mr-2 text-blue-500"></i>Add Subject';
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function editSubject(id) {
    const subject = allSubjects.find(s => s.id == id);
    if (!subject) return;

    document.getElementById('subjectId').value = subject.id;
    document.getElementById('subjectLevelStrand').value = subject.level_strand;
    document.getElementById('subjectCode').value = subject.code;
    document.getElementById('subjectName').value = subject.name;
    document.getElementById('subjectDescription').value = subject.description;

    document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-edit mr-2 text-blue-500"></i>Edit Subject';
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSubjectModal() {
    const modal = document.getElementById('subjectModal');
    const content = document.getElementById('subjectModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveSubject(e) {
    e.preventDefault();
    
    const id = document.getElementById('subjectId').value;
    const isEdit = !!id;
    const action = isEdit ? 'updateSubject' : 'addSubject';
    
    const payload = {
        action: action,
        level_strand: document.getElementById('subjectLevelStrand').value,
        code: document.getElementById('subjectCode').value.trim(),
        name: document.getElementById('subjectName').value.trim(),
        description: document.getElementById('subjectDescription').value.trim()
    };
    if (isEdit) payload.id = id;

    hideSubjectModal();
    
    try {
        const response = await fetch('php/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            Swal.fire({
                title: 'Saved!',
                text: 'The subject has been ' + (isEdit ? 'updated' : 'added') + ' successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            await loadAllSubjects();
        } else {
            Swal.fire('Error', result.message || 'Failed to save subject', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Network error occurred.', 'error');
    }
}

function deleteSubject(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This subject will be permanently deleted.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch('php/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteSubject', id: id })
                });
                const res = await response.json();
                
                if (res.success) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Subject has been deleted.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    await loadAllSubjects();
                } else {
                    Swal.fire('Error', res.message || 'Failed to delete subject', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Network error occurred.', 'error');
            }
        }
    });
}


// ─── Sections Management ──────────────────────────────────────
let allSections = [];
let sectionLevelFilter = 'junior';

async function loadAllSections() {
    try {
        const res = await fetch('php/api.php?action=getSections');
        const json = await res.json();
        if (json.success) {
            allSections = json.data || [];
            if(document.getElementById('sectionsTab') && !document.getElementById('sectionsTab').classList.contains('hidden')) {
                renderSectionsTab();
            }
        }
    } catch (e) {
        console.error("Failed to load sections", e);
    }
}

function updateSectionStrandVisibility() {
    const level = document.getElementById('sectionLevelSelect').value;
    const strandSelect = document.getElementById('sectionStrandSelect');
    if (level === 'senior') {
        strandSelect.classList.remove('hidden');
    } else {
        strandSelect.classList.add('hidden');
    }
    updateSectionGradeOptions();
}

function updateSectionGradeOptions() {
    const level = document.getElementById('sectionLevelSelect').value;
    const gradeSelect = document.getElementById('sectionGradeSelect');
    gradeSelect.innerHTML = '';
    if (level === 'junior') {
        ['7', '8', '9', '10'].forEach(g => {
            gradeSelect.innerHTML += `<option value="${g}">Grade ${g}</option>`;
        });
    } else {
        ['11', '12'].forEach(g => {
            gradeSelect.innerHTML += `<option value="${g}">Grade ${g}</option>`;
        });
    }
}

function renderSectionsTab() {
    const level = document.getElementById('sectionLevelSelect').value;
    const grade = document.getElementById('sectionGradeSelect').value;
    const strand = level === 'senior' ? document.getElementById('sectionStrandSelect').value : null;

    // Filter sections
    let filteredSections = allSections.filter(s => s.level === level && s.grade_level === grade);
    if (strand) filteredSections = filteredSections.filter(s => s.strand === strand);

    // Render Section Cards
    const grid = document.getElementById('sectionsGrid');
    if (!filteredSections.length) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No sections found. Click "Add Section" to create one.</div>`;
    } else {
        grid.innerHTML = filteredSections.map(sec => `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col cursor-pointer transition hover:border-blue-300 hover:shadow-md" onclick="selectSectionForAssign(${sec.id})">
                <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center group">
                    <div>
                        <h5 class="font-bold text-slate-800 text-base">${sec.name}</h5>
                        <p class="text-xs text-slate-500 mt-0.5">${level === 'senior' ? strand + ' • ' : ''}Grade ${grade}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${sec.student_count >= sec.max_students ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                            ${sec.student_count} / ${sec.max_students}
                        </span>
                        <button onclick="event.stopPropagation(); openScheduleModal(${sec.id}, '${sec.name}', '${level}', '${strand || ''}')" class="text-blue-500 hover:text-blue-700 transition opacity-0 group-hover:opacity-100" title="Manage Schedule">
                            <i class="fas fa-calendar-alt text-sm"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteSection(${sec.id})" class="text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100" title="Delete Section">
                            <i class="fas fa-trash-alt text-sm"></i>
                        </button>
                    </div>
                </div>
                <div class="p-3 bg-white flex-1 max-h-48 overflow-y-auto space-y-1">
                    ${sec.students && sec.students.length > 0 
                        ? sec.students.map(st => `
                            <div class="flex justify-between items-center text-xs py-1.5 px-2 hover:bg-slate-50 rounded group/item">
                                <span class="font-medium text-slate-700 truncate mr-2" title="${st.first_name} ${st.last_name}">${st.first_name} ${st.last_name}</span>
                                <button onclick="event.stopPropagation(); unassignStudent(${st.id})" class="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition" title="Remove from section">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('') 
                        : '<div class="text-xs text-slate-400 text-center py-4">No students assigned</div>'
                    }
                </div>
            </div>
        `).join('');
    }

    // Populate Target Section Dropdown
    const targetSelect = document.getElementById('assignTargetSection');
    targetSelect.innerHTML = `<option value="">-- Select Target Section --</option>` + 
        filteredSections.map(sec => {
            const secCode = `${sec.level}-${sec.grade_level}-${sec.strand || ''}-${sec.name}`;
            return `<option value="${secCode}">${sec.name} (${sec.student_count}/${sec.max_students})</option>`;
        }).join('');

    document.getElementById('sectionAssignTools').classList.remove('hidden');

    // Render Unassigned Students
    renderUnassignedStudents(level, grade, strand);
}

function renderUnassignedStudents(level, grade, strand) {
    const list = document.getElementById('unassignedStudentsList');
    
    // Find students matching level/grade/strand who don't have a section yet
    let unassigned = allStudents.filter(s => 
        s.status === 'approved' && 
        (!s.class_section || s.class_section.trim() === '') &&
        (s.level || '').toLowerCase().includes(level.toLowerCase())
    );

    if (level === 'senior' && strand) {
        unassigned = unassigned.filter(s => (s.strand || '').toLowerCase() === strand.toLowerCase());
    }

    if (!unassigned.length) {
        list.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">All students in this group are assigned.</div>`;
        return;
    }

    list.innerHTML = unassigned.map(st => `
        <div class="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center hover:border-blue-300 transition shadow-sm">
            <div class="overflow-hidden pr-2">
                <p class="text-sm font-semibold text-slate-800 truncate" title="${st.first_name} ${st.last_name}">${st.first_name} ${st.last_name}</p>
                <p class="text-xs text-slate-500 truncate mt-0.5">${st.email}</p>
            </div>
            <button onclick="assignStudentToSelectedSection(${st.id})" class="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-sm" title="Assign">
                <i class="fas fa-arrow-left text-xs"></i>
            </button>
        </div>
    `).join('');
}

function selectSectionForAssign(sectionId) {
    const sec = allSections.find(s => s.id == sectionId);
    if (!sec) return;
    const secCode = `${sec.level}-${sec.grade_level}-${sec.strand || ''}-${sec.name}`;
    const targetSelect = document.getElementById('assignTargetSection');
    targetSelect.value = secCode;
    
    // Highlight the selection
    targetSelect.classList.add('ring-2', 'ring-blue-500');
    setTimeout(() => targetSelect.classList.remove('ring-2', 'ring-blue-500'), 500);
}

async function assignStudentToSelectedSection(studentId) {
    const targetSelect = document.getElementById('assignTargetSection');
    const sectionCode = targetSelect.value;
    
    if (!sectionCode) {
        Swal.fire({ icon: 'warning', title: 'No Section Selected', text: 'Please select a target section from the dropdown or click on a section card.' });
        return;
    }

    try {
        const res = await fetch('php/api.php?action=assignSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, sectionCode })
        });
        const json = await res.json();
        if (json.success) {
            await Promise.all([loadAllSections(), loadAllStudents()]);
            Swal.fire({ icon: 'success', title: 'Assigned', text: 'Student assigned successfully.', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire('Error', json.message || 'Failed to assign student', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function unassignStudent(studentId) {
    try {
        const res = await fetch('php/api.php?action=assignSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, sectionCode: null }) // null means unassign
        });
        const json = await res.json();
        if (json.success) {
            await Promise.all([loadAllSections(), loadAllStudents()]);
        } else {
            Swal.fire('Error', json.message || 'Failed to remove student', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

function openSectionModal() {
    document.getElementById('sectionForm').reset();
    const modal = document.getElementById('sectionModal');
    const content = document.getElementById('sectionModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSectionModal() {
    const modal = document.getElementById('sectionModal');
    const content = document.getElementById('sectionModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveSection(event) {
    event.preventDefault();
    const name = document.getElementById('sectionName').value.trim().toUpperCase();
    const max_students = document.getElementById('sectionMaxStudents').value;
    const level = document.getElementById('sectionLevelSelect').value;
    const grade_level = document.getElementById('sectionGradeSelect').value;
    const strand = level === 'senior' ? document.getElementById('sectionStrandSelect').value : null;

    if (!name) return;

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch('php/api.php?action=addSection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, level, grade_level, strand, max_students })
        });
        const json = await res.json();
        
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Saved', text: 'Section added successfully.', timer: 1500, showConfirmButton: false });
            hideSectionModal();
            await loadAllSections();
        } else {
            Swal.fire('Error', json.message || 'Failed to add section', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteSection(id) {
    Swal.fire({
        title: 'Delete Section?',
        text: 'Are you sure you want to delete this section?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteSection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({ icon: 'success', title: 'Deleted', text: 'Section deleted.', timer: 1500, showConfirmButton: false });
                    await loadAllSections();
                } else {
                    Swal.fire('Error', json.message || 'Failed to delete section', 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}


// ─── Tab Navigation ───────────────────────────────────────────
function showAdminTab(tabName, button) {
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    });

    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) tabContent.classList.remove('hidden');

    button.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    button.classList.add('bg-blue-600', 'text-white');

    // Show top dashboard widgets ONLY on the dashboard tab
    document.querySelectorAll('.dashboard-widget').forEach(widget => {
        if (tabName === 'dashboard') {
            widget.classList.remove('hidden');
        } else {
            widget.classList.add('hidden');
        }
    });

    // Hide the main content card if we are on the dashboard tab
    const mainCard = document.getElementById('mainContentCard');
    if (mainCard) {
        if (tabName === 'dashboard') mainCard.classList.add('hidden');
        else mainCard.classList.remove('hidden');
    }

    const titles = {
        dashboard:   'Admin Dashboard',
        enrollments: 'Enrollment Applications',
        students:    'Enrolled Students',
        sections:    'Manage Class Sections',
        curriculum:  'Curriculum & Subjects',
        fees:        'Tuition & Voucher Settings',
    };
    const titleEl = document.getElementById('topbarPageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Admin Dashboard';

    if (tabName === 'curriculum') renderCurriculumSubjects();
    if (tabName === 'sections') renderSectionsTab();

    // Auto-close sidebar on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay && !overlay.classList.contains('hidden')) toggleSidebar();
}

function toggleSidebar() {
    if (window.innerWidth < 768) {
        document.getElementById('adminSidebar').classList.toggle('-translate-x-full');
        document.getElementById('sidebarOverlay').classList.toggle('hidden');
    } else {
        document.body.classList.toggle('sidebar-collapsed');
    }
}

// ─── Session & Auth ───────────────────────────────────────────
async function checkAdminSession() {
    try {
        const res    = await fetch('php/api.php?action=current_user');
        const result = await res.json();

        if (result.success && result.user && result.user.role === 'admin') {
            const adminName = result.user.first_name || result.user.name || 'Administrator';
            document.getElementById('adminDisplayName').textContent = result.user.name || adminName;
            
            const welcomeEl = document.getElementById('welcomeAdminName');
            if (welcomeEl) welcomeEl.textContent = adminName;

            loadAllStudents();
            loadAllSubjects();
            loadAllSections();
        } else {
            window.location.href = 'index.html';
        }
    } catch {
        window.location.href = 'index.html';
    }
}

function logoutAdmin() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel',
    }).then(result => {
        if (result.isConfirmed) {
            fetch('php/api.php?action=logout').finally(() => {
                window.location.href = 'index.html';
            });
        }
    });
}

// ─── Change Password ──────────────────────────────────────────
function showChangePasswordModal() {
    const modal   = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    });
}

function hideChangePasswordModal() {
    const modal   = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.getElementById('changePasswordForm').reset();
    }, 300);
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function submitChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('changeCurrentPassword').value;
    const newPassword     = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('changeConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        Swal.fire({ icon: 'error', title: "Passwords Don't Match", text: 'New passwords do not match.' });
        return;
    }
    if (newPassword.length < 6) {
        Swal.fire({ icon: 'error', title: 'Password Too Short', text: 'New password must be at least 6 characters.' });
        return;
    }

    Swal.fire({ title: 'Updating…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res  = await fetch('php/api.php?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
            await Swal.fire({ icon: 'success', title: 'Password Updated!', text: 'Your password has been changed successfully.' });
            hideChangePasswordModal();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to update password.' });
        }
    } catch {
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Please try again.' });
    }
}

// ─ Dark Mode ──────────────────────────────────────────────

function initAdminDarkMode() {
    const isDark = localStorage.getItem('adminDarkMode') === 'true';
    if (isDark) applyAdminDark(true);
}

function toggleAdminDarkMode() {
    const isDark = document.documentElement.classList.contains('admin-dark');
    applyAdminDark(!isDark);
}

function applyAdminDark(dark) {
    const html = document.documentElement;
    const icon = document.getElementById('darkModeIcon');
    if (dark) {
        html.classList.add('admin-dark');
        if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); }
    } else {
        html.classList.remove('admin-dark');
        if (icon) { icon.classList.replace('fa-sun', 'fa-moon'); }
    }
    localStorage.setItem('adminDarkMode', dark ? 'true' : 'false');
    // Re-render charts so grid/axis/tooltip colors match the new theme
    if (allStudents.length) renderCharts();
}

// ─── Date Display ─────────────────────────────────────────────
function updateDateTime() {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

// ─── TEACHERS MANAGEMENT ─────────────────────────────────────
let allTeachers = [];

async function loadAllTeachers() {
    try {
        const res = await fetch('php/api.php?action=getTeachers');
        const json = await res.json();
        if (json.success) {
            allTeachers = json.data;
            if (document.getElementById('teachersTableBody')) renderTeachersTab();
        }
    } catch (e) {
        console.error('Error loading teachers:', e);
    }
}

function renderTeachersTab() {
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;
    if (allTeachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-400">No teachers found. Click "Add Teacher" to add one.</td></tr>';
        return;
    }
    tbody.innerHTML = allTeachers.map(t => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${t.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${t.department || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="deleteTeacher(${t.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openTeacherModal() {
    document.getElementById('teacherForm').reset();
    const modal = document.getElementById('teacherModal');
    const content = document.getElementById('teacherModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideTeacherModal() {
    const modal = document.getElementById('teacherModal');
    const content = document.getElementById('teacherModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function saveTeacher(event) {
    event.preventDefault();
    const name = document.getElementById('teacherName').value.trim();
    const department = document.getElementById('teacherDepartment').value.trim();
    if (!name) return;

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=addTeacher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, department })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Saved', text: 'Teacher added successfully.', timer: 1500, showConfirmButton: false });
            hideTeacherModal();
            await loadAllTeachers();
        } else {
            Swal.fire('Error', json.message || 'Failed to add teacher', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteTeacher(id) {
    Swal.fire({
        title: 'Delete Teacher?',
        text: 'Are you sure you want to delete this teacher?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteTeacher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Deleted!', 'Teacher has been deleted.', 'success');
                    await loadAllTeachers();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── SECTION SCHEDULES ────────────────────────────────────────
let currentScheduleSectionId = null;

async function openScheduleModal(sectionId, sectionName, level, strand) {
    currentScheduleSectionId = sectionId;
    document.getElementById('scheduleSectionNameTitle').textContent = sectionName;
    document.getElementById('schedSectionId').value = sectionId;
    document.getElementById('scheduleForm').reset();

    // Map level/strand to subject level_strand
    let subjectKey = level === 'junior' ? 'jhs' : (strand ? strand.toLowerCase() : '');

    // Populate Subjects Dropdown
    const subjectSelect = document.getElementById('schedSubject');
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    const relevantSubjects = allSubjects.filter(sub => sub.level_strand === subjectKey || sub.level_strand.includes('core'));
    relevantSubjects.forEach(sub => {
        subjectSelect.innerHTML += `<option value="${sub.id}">${sub.code} - ${sub.name}</option>`;
    });

    // Populate Teachers Dropdown
    const teacherSelect = document.getElementById('schedTeacher');
    teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
    allTeachers.forEach(t => {
        teacherSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });

    // Populate Clone Dropdown
    const cloneSelect = document.getElementById('cloneScheduleSelect');
    if (cloneSelect) {
        cloneSelect.innerHTML = '<option value="">-- Clone From --</option>';
        allSections.forEach(s => {
            if (s.id !== sectionId && s.level === level) {
                cloneSelect.innerHTML += `<option value="${s.id}">Grade ${s.grade_level} - ${s.name}</option>`;
            }
        });
    }

    const modal = document.getElementById('scheduleModal');
    const content = document.getElementById('scheduleModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    await loadSectionSchedule(sectionId);
}

function hideScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    const content = document.getElementById('scheduleModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

async function loadSectionSchedule(sectionId) {
    try {
        const res = await fetch(`php/api.php?action=getSectionSchedule&section_id=${sectionId}`);
        const json = await res.json();
        if (json.success) {
            renderScheduleList(json.data);
        }
    } catch (e) {
        console.error('Error loading schedule:', e);
    }
}

function renderScheduleList(scheduleList) {
    const container = document.getElementById('scheduleListContainer');
    if (!scheduleList.length) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400">No classes scheduled yet.</div>';
        return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let html = '';

    days.forEach(day => {
        const dayClasses = scheduleList.filter(s => s.day === day);
        if (dayClasses.length > 0) {
            html += `
                <div class="mb-4">
                    <h4 class="font-bold text-sm text-slate-800 bg-slate-200 px-3 py-1.5 rounded-lg mb-2">${day}</h4>
                    <div class="space-y-2">
                        ${dayClasses.map(c => {
                            const formatTime = (time24) => {
                                const [h, m] = time24.split(':');
                                const d = new Date();
                                d.setHours(h, m);
                                return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            };
                            return `
                            <div class="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                <div>
                                    <div class="font-bold text-blue-600 text-sm">${c.subject_code} - ${c.subject_name}</div>
                                    <div class="text-xs text-slate-500 mt-0.5"><i class="far fa-clock mr-1"></i>${formatTime(c.start_time)} - ${formatTime(c.end_time)}</div>
                                    <div class="text-xs text-slate-500 mt-0.5"><i class="fas fa-chalkboard-teacher mr-1"></i>${c.teacher_name} ${c.room ? `• <i class="fas fa-map-marker-alt mx-1"></i>${c.room}` : ''}</div>
                                </div>
                                <button onclick="deleteSchedule(${c.id})" class="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Remove Class">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
}

async function saveSchedule(event) {
    event.preventDefault();
    const section_id = document.getElementById('schedSectionId').value;
    const subject_id = document.getElementById('schedSubject').value;
    const teacher_id = document.getElementById('schedTeacher').value;
    const day = document.getElementById('schedDay').value;
    const start_time = document.getElementById('schedStartTime').value;
    const end_time = document.getElementById('schedEndTime').value;
    const room = document.getElementById('schedRoom').value.trim();

    if (start_time >= end_time) {
        Swal.fire('Invalid Time', 'Start time must be before end time.', 'warning');
        return;
    }

    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch('php/api.php?action=addSectionSchedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id, subject_id, teacher_id, day, start_time, end_time, room })
        });
        const json = await res.json();
        if (json.success) {
            Swal.fire({ icon: 'success', title: 'Added', text: 'Class scheduled successfully.', timer: 1500, showConfirmButton: false });
            await loadSectionSchedule(section_id);
            document.getElementById('scheduleForm').reset();
            document.getElementById('schedSectionId').value = section_id;
        } else {
            Swal.fire('Conflict Detected', json.message, 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Network error.', 'error');
    }
}

async function deleteSchedule(id) {
    Swal.fire({
        title: 'Remove Class?',
        text: 'Are you sure you want to remove this class from the schedule?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('php/api.php?action=deleteSectionSchedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Removed!', 'Class has been removed.', 'success');
                    await loadSectionSchedule(currentScheduleSectionId);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── BULK OPERATIONS ──────────────────────────────────────────

async function autoAssignStudents() {
    const level = document.getElementById('sectionLevelSelect').value;
    const grade = document.getElementById('sectionGradeSelect').value;
    const strand = level === 'senior' ? document.getElementById('sectionStrandSelect').value : null;

    Swal.fire({
        title: 'Auto-Assign Students?',
        text: `This will assign all unassigned students in Grade ${grade} to available sections.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, auto-assign'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Assigning...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const res = await fetch('php/api.php?action=autoAssignStudents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ level, grade, strand })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Success', json.message, 'success');
                    await Promise.all([loadAllSections(), loadAllStudents()]);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

async function cloneSchedule() {
    const sourceSectionId = document.getElementById('cloneScheduleSelect').value;
    if (!sourceSectionId) {
        Swal.fire('Error', 'Please select a section to clone from.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Clone Schedule?',
        text: 'This will copy the schedule from the selected section. Some classes may be skipped if there are time/teacher conflicts.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, clone'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Cloning...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const res = await fetch('php/api.php?action=cloneSectionSchedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_section_id: sourceSectionId, target_section_id: currentScheduleSectionId })
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Success', json.message, 'success');
                    await loadSectionSchedule(currentScheduleSectionId);
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        }
    });
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAdminDarkMode();
    updateDateTime();
    updateSectionGradeOptions();
    checkAdminSession();
    loadAllTeachers();
});
