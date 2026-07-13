// App State
let currentUser = null;
let students = [];
let allStudents = [];
let approvedStudents = [];
let pendingStudents = [];
let enrollments = [];
let slides = [];
let dots = [];
let progressBar = null;
let sliderInterval = null;
let courses = [
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science', description: 'Learn the basics of programming and computer science concepts' },
    { id: 2, code: 'MATH201', name: 'Calculus I', description: 'Differential and integral calculus fundamentals' },
    { id: 3, code: 'ENG102', name: 'English Composition', description: 'Academic writing and critical thinking skills' },
    { id: 4, code: 'PHY101', name: 'Physics Fundamentals', description: 'Introduction to mechanics and thermodynamics' },
    { id: 5, code: 'BIO201', name: 'Biology I', description: 'Cell biology and genetics' }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeSlider();
    await checkCurrentUser();
    if (!currentUser) showWelcome();
    renderCourses();
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) registrationForm.addEventListener('submit', handleRegistration);
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registerModalForm = document.getElementById('registerModalForm');
    if (registerModalForm) registerModalForm.addEventListener('submit', handleModalRegistration);
    await fetchApprovedStudents();
    await fetchPendingStudents();
    loadStudentSelect();
    startAutoSlider();
    setTimeout(() => {
        const enrollButton = document.getElementById('enrollNowButton');
        if (enrollButton) {
            enrollButton.addEventListener('click', function(e) {
                e.preventDefault();
                showRegisterModal();
                return false;
            });
        }
    }, 1000);
});

// Show Welcome Page
function showWelcome() {
    document.getElementById('welcomeNav').classList.remove('hidden');
    document.getElementById('mainNav').classList.add('hidden');
    document.getElementById('tabNavigation').classList.remove('hidden');
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById('welcome').classList.remove('hidden');
    // Ensure landing extras (news, footer) are visible
    const newsSection = document.getElementById('news');
    if (newsSection) newsSection.classList.remove('hidden');
    const siteFooter = document.querySelector('footer');
    if (siteFooter) siteFooter.classList.remove('hidden');

    showSection('home');
    stopAutoSlider();
    startAutoSlider();
}

function showAuthenticatedView(user) {
    if (!user) {
        showLoginModal();
        return;
    }

    currentUser = user;
    document.getElementById('welcomeNav').classList.add('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    document.getElementById('tabNavigation').classList.add('hidden');
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    if (user.role === 'admin') {
        document.getElementById('admin').classList.remove('hidden');
        document.querySelectorAll('.admin-content').forEach(content => content.classList.add('hidden'));
        document.getElementById('studentsTab').classList.remove('hidden');
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
            tab.classList.add('text-gray-500');
        });
        const firstAdminTab = document.querySelector('.admin-tab');
        if (firstAdminTab) {
            firstAdminTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
            firstAdminTab.classList.remove('text-gray-500');
        }
        updateAdminDashboard();
    } else {
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('dashboard-tab').classList.add('active');
        document.getElementById('home-tab').classList.remove('active');
        showUserDashboard();
    }

    // Hide landing-specific sections when authenticated
    const newsSection = document.getElementById('news');
    if (newsSection) newsSection.classList.add('hidden');
    const siteFooter = document.querySelector('footer');
    if (siteFooter) siteFooter.classList.add('hidden');
}

function logoutUser() {
    fetch('php/api.php?action=logout', { method: 'POST' })
        .then(res => res.json())
        .then(() => {
            currentUser = null;
            showWelcome();
            // Restore landing extras on logout
            const newsSection = document.getElementById('news');
            if (newsSection) newsSection.classList.remove('hidden');
            const siteFooter = document.querySelector('footer');
            if (siteFooter) siteFooter.classList.remove('hidden');
            showToast('Logged out successfully', 'success');
        })
        .catch(() => showToast('Could not log out', 'error'));
}

// Navigation
function showSection(sectionId) {
    if (sectionId === 'home') {
        sectionId = 'welcome';
    }
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    }
    if (sectionId === 'enroll') {
        loadStudentSelect();
        renderCourses();
    } else if (sectionId === 'admin') {
        updateAdminDashboard();
    }
}

// Admin Tabs
function showAdminTab(tabId, button) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        tab.classList.add('text-gray-500');
    });
    if (button) {
        button.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        button.classList.remove('text-gray-500');
    }
    
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('hidden');
    });
    const tab = document.getElementById(tabId + 'Tab');
    if (tab) {
        tab.classList.remove('hidden');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `fixed bottom-4 right-4 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300`;
    toastMessage.textContent = message;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Student Registration
async function handleRegistration(e) {
    e.preventDefault();

    const data = {
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value,
        address: document.getElementById('address').value,
        guardianName: document.getElementById('guardianName').value,
        guardianPhone: document.getElementById('guardianPhone').value,
        guardianEmail: document.getElementById('guardianEmail').value,
        guardianRelationship: document.getElementById('guardianRelationship').value,
        guardianAddress: document.getElementById('guardianAddress').value,
        program: document.getElementById('programSelect').value,
        section: document.getElementById('sectionSelect').value
    };

    try {
        const response = await fetch('php/api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }

        document.getElementById('registrationForm').reset();
        showToast(result.message, 'success');
        showSection('home');
    } catch (error) {
        showToast('Failed to submit registration. Please try again.', 'error');
    }
}


async function checkCurrentUser() {
    try {
        const response = await fetch('php/api.php?action=current_user');
        const result = await response.json();
        if (result.success && result.user) {
            currentUser = result.user;
            showAuthenticatedView(result.user);
        } else {
            currentUser = null;
            showWelcome();
        }
    } catch (error) {
        currentUser = null;
        showWelcome();
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('loginModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    const content = document.getElementById('loginModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }, 300);
}

async function handleLogin(e) {
    e.preventDefault();
    const role = document.getElementById('loginRole').value;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }

    // For demo purposes, handle admin login directly
    if (role === 'admin') {
        // Demo admin credentials
        if (email === 'admin@biringan.edu' && password === 'admin123') {
            currentUser = { email, role: 'admin', name: 'Admin User' };
            hideLoginModal();
            showAdminDashboard();
            showToast('Admin login successful', 'success');
            return;
        } else {
            showToast('Invalid admin credentials. Use admin@biringan.edu / admin123', 'error');
            return;
        }
    }

    // Student login (existing logic)
    try {
        const response = await fetch('php/api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }

        currentUser = result.user;
        hideLoginModal();
        showAuthenticatedView(result.user);
        showToast('Login successful', 'success');
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    }
}

function showAdminDashboard() {
    console.log('Showing admin dashboard');
    
    // Hide main content wrapper
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // Hide welcome navigation (the original top nav)
    const welcomeNav = document.getElementById('welcomeNav');
    if (welcomeNav) {
        welcomeNav.classList.add('hidden');
        welcomeNav.style.display = 'none';
    }
    
    // Create admin navigation if it doesn't exist
    let adminNav = document.getElementById('adminNav');
    if (!adminNav) {
        adminNav = document.createElement('nav');
        adminNav.id = 'adminNav';
        adminNav.className = 'bg-blue-600 shadow-lg fixed top-0 left-0 right-0 z-50';
        adminNav.innerHTML = `
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-3">
                        <img src="img/new-logo.png" alt="Academy of Biringan Logo" class="h-10 w-auto" />
                        <span class="text-white font-bold text-xl">JJKings Academy of Biringan - Admin</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-white font-medium">Welcome, Admin</span>
                        <button onclick="handleLogoutClick()" class="bg-white text-[#004b87] px-4 py-2 rounded-lg hover:bg-gray-100 transition font-bold">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(adminNav);
    } else {
        adminNav.classList.remove('hidden');
        adminNav.style.display = 'block';
    }
    
    // Create a temporary admin container if it doesn't exist
    let adminContainer = document.getElementById('adminContainer');
    if (!adminContainer) {
        adminContainer = document.createElement('div');
        adminContainer.id = 'adminContainer';
        adminContainer.className = 'w-full min-h-screen bg-gray-100 pt-20';
        document.body.appendChild(adminContainer);
    }
    
    // Move admin section to admin container
    const adminSection = document.getElementById('admin');
    if (adminSection) {
        adminSection.classList.remove('hidden');
        adminSection.style.display = 'block';
        adminContainer.appendChild(adminSection);
        console.log('Admin section shown');
    } else {
        console.error('Admin section not found');
    }
    
    // Hide tab navigation for admin
    const tabNav = document.getElementById('tabNavigation');
    if (tabNav) {
        tabNav.classList.add('hidden');
        tabNav.style.display = 'none';
    }
    
    // Hide footer for admin
    const footer = document.querySelector('footer');
    if (footer) {
        footer.classList.add('hidden');
        footer.style.display = 'none';
    }
    
    // Hide search overlay
    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay) {
        searchOverlay.classList.add('hidden');
        searchOverlay.style.display = 'none';
    }
    
    // Hide search trigger button
    const searchTriggerButtons = document.querySelectorAll('button[onclick="openSearch()"]');
    searchTriggerButtons.forEach(btn => {
        btn.classList.add('hidden');
        btn.style.display = 'none';
    });
    
    // Hide dark mode toggle
    const darkModeToggle = document.querySelector('button[onclick="toggleDarkMode()"]');
    if (darkModeToggle) {
        darkModeToggle.classList.add('hidden');
        darkModeToggle.style.display = 'none';
    }
    
    // Hide language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.classList.add('hidden');
        languageSelect.style.display = 'none';
    }
    
    // Hide main navigation bar
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.classList.add('hidden');
        mainNav.style.display = 'none';
    }
    
    // Change login button to logout button
    const loginButton = document.querySelector('button[onclick="showLoginModal()"]');
    if (loginButton) {
        loginButton.onclick = handleLogoutClick;
        loginButton.textContent = 'Logout';
        loginButton.classList.remove('hidden');
        loginButton.style.display = 'block';
    }
    
    // Hide enroll button
    const enrollButton = document.querySelector('button[onclick="showRegisterModal()"]');
    if (enrollButton) {
        enrollButton.classList.add('hidden');
        enrollButton.style.display = 'none';
    }
    
    // Update navigation for admin
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.remove('hidden');
        authButtons.style.display = 'flex';
    }
    
    const userNav = document.getElementById('userNav');
    if (userNav) {
        userNav.classList.remove('hidden');
        userNav.style.display = 'flex';
    }
    
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = 'Admin';
    }
    
    // Load admin data
    loadEnrollmentApplications();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleLogoutClick() {
    if (confirm('Are you sure you want to logout?')) {
        logoutAdmin();
    }
}

function logoutAdmin() {
    // Show main content wrapper
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Remove admin container
    const adminContainer = document.getElementById('adminContainer');
    if (adminContainer) {
        adminContainer.remove();
    }
    
    // Move admin section back to main content
    const adminSection = document.getElementById('admin');
    if (adminSection) {
        adminSection.classList.add('hidden');
        adminSection.style.display = 'none';
        mainContent.appendChild(adminSection);
    }
    
    // Hide admin navigation
    const adminNav = document.getElementById('adminNav');
    if (adminNav) {
        adminNav.classList.add('hidden');
        adminNav.style.display = 'none';
    }
    
    // Show welcome navigation (the original top nav)
    const welcomeNav = document.getElementById('welcomeNav');
    if (welcomeNav) {
        welcomeNav.classList.remove('hidden');
        welcomeNav.style.display = 'block';
    }
    
    // Show tab navigation
    const tabNav = document.getElementById('tabNavigation');
    if (tabNav) {
        tabNav.classList.remove('hidden');
        tabNav.style.display = 'block';
    }
    
    // Show footer
    const footer = document.querySelector('footer');
    if (footer) {
        footer.classList.remove('hidden');
        footer.style.display = 'block';
    }
    
    // Show search trigger button
    const searchTriggerButtons = document.querySelectorAll('button[onclick="openSearch()"]');
    searchTriggerButtons.forEach(btn => {
        btn.classList.remove('hidden');
        btn.style.display = 'flex';
    });
    
    // Show dark mode toggle
    const darkModeToggle = document.querySelector('button[onclick="toggleDarkMode()"]');
    if (darkModeToggle) {
        darkModeToggle.classList.remove('hidden');
        darkModeToggle.style.display = 'block';
    }
    
    // Show language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.classList.remove('hidden');
        languageSelect.style.display = 'block';
    }
    
    // Hide main navigation bar (if it exists)
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.classList.add('hidden');
        mainNav.style.display = 'none';
    }
    
    // Change logout button back to login button
    const logoutButton = document.querySelector('button[onclick="handleLogoutClick()"]');
    if (logoutButton) {
        logoutButton.onclick = showLoginModal;
        logoutButton.textContent = 'Login';
    }
    
    // Show enroll button
    const enrollButton = document.querySelector('button[onclick="showRegisterModal()"]');
    if (enrollButton) {
        enrollButton.classList.remove('hidden');
        enrollButton.style.display = 'block';
    }
    
    // Hide user nav
    const userNav = document.getElementById('userNav');
    if (userNav) {
        userNav.classList.add('hidden');
        userNav.style.display = 'none';
    }
    
    // Show auth buttons
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.remove('hidden');
        authButtons.style.display = 'flex';
    }
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show welcome section (home)
    const welcomeSection = document.getElementById('welcome');
    if (welcomeSection) {
        welcomeSection.classList.remove('hidden');
    }
    
    // Show news section
    const newsSection = document.getElementById('news');
    if (newsSection) {
        newsSection.classList.remove('hidden');
    }
    
    // Reset to home tab
    switchTab('home');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast('Logged out successfully', 'success');
}

async function fetchAllStudents() {
    try {
        const response = await fetch('php/api.php?action=students');
        const result = await response.json();
        if (result.success) {
            allStudents = result.students.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
        }
    } catch (error) {
        console.error('Failed to fetch students', error);
        allStudents = [];
    }
}

async function fetchApprovedStudents() {
    try {
        const response = await fetch('php/api.php?action=students&status=approved');
        const result = await response.json();
        if (result.success) {
            approvedStudents = result.students.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
            students = approvedStudents;
        }
    } catch (error) {
        console.error('Failed to fetch approved students', error);
        approvedStudents = [];
        students = [];
    }
}

async function fetchPendingStudents() {
    try {
        const response = await fetch('php/api.php?action=pending_students');
        const result = await response.json();
        if (result.success) {
            pendingStudents = result.students.map(student => ({
                ...student,
                fullName: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim()
            }));
        }
    } catch (error) {
        console.error('Failed to fetch pending students', error);
        pendingStudents = [];
    }
}

async function approveStudent(studentId) {
    try {
        const response = await fetch('php/api.php?action=approve_student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId })
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }
        showToast(result.message, 'success');
        await updateAdminDashboard();
    } catch (error) {
        showToast('Failed to approve student. Please try again.', 'error');
    }
}

function renderPendingStudentCount() {
    const pendingCountEl = document.getElementById('pendingApplications');
    if (pendingCountEl) {
        pendingCountEl.textContent = pendingStudents.length;
    }
}

function showUserDashboard() {
    const header = document.querySelector('#dashboard h2');
    if (header && currentUser) {
        header.textContent = `Welcome back, ${currentUser.firstName} ${currentUser.lastName}`;
    }
}

// Render Courses
function renderCourses() {
    const courseList = document.getElementById('courseList');
    courseList.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition';
        courseCard.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold text-gray-800">${course.code} - ${course.name}</h4>
                <button onclick="enrollInCourse(${course.id})" class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition">
                    Enroll
                </button>
            </div>
            <p class="text-gray-600 text-sm">${course.description}</p>
        `;
        courseList.appendChild(courseCard);
    });
}

// Enroll in Course
function enrollInCourse(courseId) {
    const studentId = parseInt(document.getElementById('studentSelect').value);
    
    if (!studentId) {
        showToast('Please select a student first', 'error');
        return;
    }
    
    // Check if already enrolled
    const alreadyEnrolled = enrollments.some(
        e => e.studentId === studentId && e.courseId === courseId
    );
    
    if (alreadyEnrolled) {
        showToast('Already enrolled in this course', 'error');
        return;
    }
    
    const enrollment = {
        id: Date.now(),
        studentId: studentId,
        courseId: courseId,
        enrolledDate: new Date().toISOString()
    };
    
    enrollments.push(enrollment);
    saveData();
    
    showToast('Successfully enrolled in course!');
    renderEnrolledCourses(studentId);
}

// Render Enrolled Courses
function renderEnrolledCourses(studentId) {
    const enrolledCoursesDiv = document.getElementById('enrolledCourses');
    
    if (!studentId) {
        enrolledCoursesDiv.innerHTML = '<p class="text-gray-500 italic">Please select a student to view enrolled courses</p>';
        return;
    }
    
    const studentEnrollments = enrollments.filter(e => e.studentId === studentId);
    
    if (studentEnrollments.length === 0) {
        enrolledCoursesDiv.innerHTML = '<p class="text-gray-500 italic">No courses enrolled yet</p>';
        return;
    }
    
    enrolledCoursesDiv.innerHTML = '';
    
    studentEnrollments.forEach(enrollment => {
        const course = courses.find(c => c.id === enrollment.courseId);
        const student = students.find(s => s.id === enrollment.studentId);
        
        const courseItem = document.createElement('div');
        courseItem.className = 'bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center';
        courseItem.innerHTML = `
            <div>
                <h4 class="font-semibold text-gray-800">${course.code} - ${course.name}</h4>
                <p class="text-gray-600 text-sm">Enrolled: ${new Date(enrollment.enrolledDate).toLocaleDateString()}</p>
            </div>
            <button onclick="unenrollFromCourse(${enrollment.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                Unenroll
            </button>
        `;
        enrolledCoursesDiv.appendChild(courseItem);
    });
}

// Unenroll from Course
function unenrollFromCourse(enrollmentId) {
    enrollments = enrollments.filter(e => e.id !== enrollmentId);
    saveData();
    
    const studentId = parseInt(document.getElementById('studentSelect').value);
    renderEnrolledCourses(studentId);
    showToast('Successfully unenrolled from course');
}

// Update Admin Dashboard
async function updateAdminDashboard() {
    await fetchAllStudents();
    await fetchApprovedStudents();
    await fetchPendingStudents();
    document.getElementById('totalStudents').textContent = allStudents.length;
    document.getElementById('totalEnrollments').textContent = enrollments.length;
    document.getElementById('totalCourses').textContent = courses.length;
    renderStudentsTable();
    renderEnrollmentsTable();
    renderCoursesTable();
    renderPendingStudentCount();
}

// Render Students Table
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    allStudents.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        const fullName = student.fullName || `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim();
        const status = student.status || 'pending';
        const actionButtons = [];
        if (status === 'pending') {
            actionButtons.push(`<button onclick="approveStudent(${student.id})" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition mr-2">Approve</button>`);
        }
        actionButtons.push(`<button onclick="deleteStudent(${student.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">Delete</button>`);

        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${student.id}</td>
            <td class="px-4 py-3 text-gray-800">${fullName}</td>
            <td class="px-4 py-3 text-gray-800">${student.email}</td>
            <td class="px-4 py-3 text-gray-800">${student.phone}</td>
            <td class="px-4 py-3 text-gray-800">${status}</td>
            <td class="px-4 py-3">${actionButtons.join('')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render Enrollments Table
function renderEnrollmentsTable() {
    const tbody = document.getElementById('enrollmentsTableBody');
    tbody.innerHTML = '';
    enrollments.forEach(enrollment => {
        const student = students.find(s => s.id === enrollment.studentId);
        const course = courses.find(c => c.id === enrollment.courseId);
        
        if (!student || !course) return;
        
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${student.fullName}</td>
            <td class="px-4 py-3 text-gray-800">${course.code} - ${course.name}</td>
            <td class="px-4 py-3 text-gray-800">${new Date(enrollment.enrolledDate).toLocaleDateString()}</td>
            <td class="px-4 py-3">
                <button onclick="unenrollFromCourse(${enrollment.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    Remove
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render Courses Table
function renderCoursesTable() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';
    
    courses.forEach(course => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${course.code}</td>
            <td class="px-4 py-3 text-gray-800">${course.name}</td>
            <td class="px-4 py-3 text-gray-800">${course.description}</td>
            <td class="px-4 py-3">
                <button onclick="deleteCourse(${course.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Delete Student
function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== studentId);
        enrollments = enrollments.filter(e => e.studentId !== studentId);
        updateAdminDashboard();
        showToast('Student deleted successfully');
    }
}

// Delete Course
function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course?')) {
        courses = courses.filter(c => c.id !== courseId);
        enrollments = enrollments.filter(e => e.courseId !== courseId);
        saveData();
        updateAdminDashboard();
        renderCourses();
        showToast('Course deleted successfully');
    }
}

// Add Course
function addCourse() {
    const name = document.getElementById('newCourseName').value;
    const code = document.getElementById('newCourseCode').value;
    const description = document.getElementById('newCourseDescription').value;
    
    if (!name || !code) {
        showToast('Please fill in course name and code', 'error');
        return;
    }
    
    const course = {
        id: Date.now(),
        code: code,
        name: name,
        description: description
    };
    
    courses.push(course);
    saveData();
    
    document.getElementById('newCourseName').value = '';
    document.getElementById('newCourseCode').value = '';
    document.getElementById('newCourseDescription').value = '';
    
    updateAdminDashboard();
    renderCourses();
    showToast('Course added successfully');
}

// Save Data to LocalStorage
function saveData() {
    // No-op in API mode
}

// Toggle Grade/Strand Selection based on Level
function toggleGradeStrandSelection() {
    const levelSelect = document.getElementById('modalLevel');
    const gradeLevelContainer = document.getElementById('gradeLevelContainer');
    const strandContainer = document.getElementById('strandContainer');
    const voucherEligibilityContainer = document.getElementById('voucherEligibilityContainer');
    
    const selectedLevel = levelSelect.value;
    
    if (selectedLevel === 'junior-high') {
        gradeLevelContainer.style.display = 'block';
        strandContainer.style.display = 'none';
        voucherEligibilityContainer.style.display = 'none';
        document.getElementById('modalGradeLevel').required = true;
        document.getElementById('modalStrand').required = false;
        document.getElementById('modalVoucherEligibility').required = false;
        updatePaymentSummary();
    } else if (selectedLevel === 'senior-high') {
        gradeLevelContainer.style.display = 'none';
        strandContainer.style.display = 'block';
        voucherEligibilityContainer.style.display = 'block';
        document.getElementById('modalGradeLevel').required = false;
        document.getElementById('modalStrand').required = true;
        document.getElementById('modalVoucherEligibility').required = true;
        updatePaymentSummary();
    } else {
        gradeLevelContainer.style.display = 'none';
        strandContainer.style.display = 'none';
        voucherEligibilityContainer.style.display = 'none';
        document.getElementById('modalGradeLevel').required = false;
        document.getElementById('modalStrand').required = false;
        document.getElementById('modalVoucherEligibility').required = false;
        updatePaymentSummary();
    }
}

// Update Payment Summary based on level and voucher eligibility
function updatePaymentSummary() {
    const levelSelect = document.getElementById('modalLevel');
    const voucherEligibility = document.getElementById('modalVoucherEligibility');
    const uniformFeeRow = document.getElementById('uniformFeeRow');
    const voucherRow = document.getElementById('voucherRow');
    const voucherNote = document.getElementById('voucherNote');
    const selectLevelNote = document.getElementById('selectLevelNote');
    const modalTuitionFee = document.getElementById('modalTuitionFee');
    const modalTotalPayment = document.getElementById('modalTotalPayment');
    
    const selectedLevel = levelSelect.value;
    const selectedVoucher = voucherEligibility ? voucherEligibility.value : '';
    
    // Base fees
    const tuitionFee = 25000;
    const registrationFee = 500;
    const labFee = 1000;
    const libraryFee = 500;
    const idFee = 200;
    const uniformFee = 3000;
    const voucherAmount = 27000; // Covers tuition + registration + lab + library + ID
    
    let total = 0;
    
    if (selectedLevel === 'junior-high') {
        // Junior High pays full fees
        total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
        modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
        uniformFeeRow.style.display = 'none';
        voucherRow.style.display = 'none';
        voucherNote.style.display = 'none';
        selectLevelNote.style.display = 'none';
    } else if (selectedLevel === 'senior-high') {
        if (selectedVoucher === 'public-school' || selectedVoucher === 'same-school') {
            // Voucher eligible - pay only uniform fee
            total = uniformFee;
            modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
            uniformFeeRow.style.display = 'flex';
            voucherRow.style.display = 'flex';
            voucherNote.style.display = 'block';
            selectLevelNote.style.display = 'none';
        } else if (selectedVoucher === 'private-school') {
            // No voucher - pay full fees
            total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
            modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
            uniformFeeRow.style.display = 'none';
            voucherRow.style.display = 'none';
            voucherNote.style.display = 'none';
            selectLevelNote.style.display = 'none';
        } else {
            // Not selected yet - show full fees
            total = tuitionFee + registrationFee + labFee + libraryFee + idFee;
            modalTuitionFee.textContent = '₱' + tuitionFee.toLocaleString();
            uniformFeeRow.style.display = 'none';
            voucherRow.style.display = 'none';
            voucherNote.style.display = 'none';
            selectLevelNote.style.display = 'none';
        }
    } else {
        // Not selected - show default
        total = 0;
        modalTuitionFee.textContent = '₱0';
        uniformFeeRow.style.display = 'none';
        voucherRow.style.display = 'none';
        voucherNote.style.display = 'none';
        selectLevelNote.style.display = 'block';
    }
    
    modalTotalPayment.textContent = '₱' + total.toLocaleString();
}

// Register Modal Functions
function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    const content = document.getElementById('registerModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideRegisterModal() {
    const modal = document.getElementById('registerModal');
    const content = document.getElementById('registerModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('registerModalForm').reset();
    }, 300);
}

// Close Confirmation Modal Functions
function showCloseConfirmation() {
    const modal = document.getElementById('closeConfirmationModal');
    const content = document.getElementById('closeConfirmationContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideCloseConfirmation() {
    const modal = document.getElementById('closeConfirmationModal');
    const content = document.getElementById('closeConfirmationContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function confirmClose() {
    hideCloseConfirmation();
    hideRegisterModal();
}

// Handle Modal Registration
function handleModalRegistration(e) {
    e.preventDefault();
    const form = document.getElementById('registerModalForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            let errorMsg = field.parentNode.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('span');
                errorMsg.className = 'error-message text-red-500 text-xs mt-1';
                errorMsg.textContent = 'This field is required';
                field.parentNode.appendChild(errorMsg);
            }
        } else {
            field.classList.remove('border-red-500');
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    });
    if (isValid) {
        showRegistrationConfirmation();
    } else {
        showToast('Please fill in all required fields.', 'error');
    }
}

// Clear error when user starts typing
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerModalForm');
    if (form) {
        form.addEventListener('input', function(e) {
            if (e.target.hasAttribute('required')) {
                e.target.classList.remove('border-red-500');
                const errorMsg = e.target.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
    }
});

// Registration Confirmation Modal Functions
function showRegistrationConfirmation() {
    // Populate confirmation data
    document.getElementById('confirmLastName').textContent = document.getElementById('modalLastName').value;
    document.getElementById('confirmFirstName').textContent = document.getElementById('modalFirstName').value;
    document.getElementById('confirmMiddleName').textContent = document.getElementById('modalMiddleName').value || 'N/A';
    document.getElementById('confirmEmail').textContent = document.getElementById('modalEmail').value;
    document.getElementById('confirmPhone').textContent = document.getElementById('modalPhone').value;
    document.getElementById('confirmDob').textContent = document.getElementById('modalDob').value;
    document.getElementById('confirmAddress').textContent = document.getElementById('modalAddress').value;
    
    document.getElementById('confirmGuardianName').textContent = document.getElementById('modalGuardianName').value;
    document.getElementById('confirmGuardianPhone').textContent = document.getElementById('modalGuardianPhone').value;
    document.getElementById('confirmGuardianEmail').textContent = document.getElementById('modalGuardianEmail').value;
    
    const relationshipSelect = document.getElementById('modalGuardianRelationship');
    document.getElementById('confirmGuardianRelationship').textContent = relationshipSelect.options[relationshipSelect.selectedIndex].text;
    
    const programSearch = document.getElementById('modalProgramSearch');
    document.getElementById('confirmProgram').textContent = programSearch.value;
    
    const sectionSelect = document.getElementById('modalSectionSelect');
    document.getElementById('confirmSection').textContent = sectionSelect.options[sectionSelect.selectedIndex].text;
    
    document.getElementById('confirmTotalPayment').textContent = document.getElementById('modalTotalPayment').textContent;
    
    const paymentMethodSelect = document.getElementById('modalPaymentMethod');
    const paymentMethodText = paymentMethodSelect.options[paymentMethodSelect.selectedIndex].text;
    document.getElementById('confirmPaymentMethod').textContent = paymentMethodText;
    
    // Show modal
    const modal = document.getElementById('registrationConfirmationModal');
    const content = document.getElementById('registrationConfirmationContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideRegistrationConfirmation() {
    const modal = document.getElementById('registrationConfirmationModal');
    const content = document.getElementById('registrationConfirmationContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function confirmRegistration() {
    const paymentMethod = document.getElementById('modalPaymentMethod').value;
    
    // Process payment based on method
    if (paymentMethod === 'online') {
        // Simulate online payment processing
        processOnlinePayment();
    } else {
        // Cash payment - proceed directly
        completeRegistration(paymentMethod);
    }
}

function processOnlinePayment() {
    // Simulate payment processing delay
    showToast('Processing payment...', 'info');
    
    setTimeout(() => {
        completeRegistration('online');
    }, 2000);
}

async function completeRegistration(paymentMethod) {
    const data = {
        lastName: document.getElementById('modalLastName').value,
        firstName: document.getElementById('modalFirstName').value,
        middleName: document.getElementById('modalMiddleName').value,
        email: document.getElementById('modalEmail').value,
        phone: document.getElementById('modalPhone').value,
        dob: document.getElementById('modalDob').value,
        address: document.getElementById('modalAddress').value,
        guardianName: document.getElementById('modalGuardianName').value,
        guardianPhone: document.getElementById('modalGuardianPhone').value,
        guardianEmail: document.getElementById('modalGuardianEmail').value,
        guardianRelationship: document.getElementById('modalGuardianRelationship').value,
        guardianAddress: document.getElementById('modalGuardianAddress').value,
        program: document.getElementById('modalProgramSelect').value || document.getElementById('modalProgramSearch').value,
        section: document.getElementById('modalSectionSelect').value
    };

    try {
        const response = await fetch('php/api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) {
            showToast(result.message, 'error');
            return;
        }
        hideRegistrationConfirmation();
        document.getElementById('registerModalForm').reset();
        document.getElementById('onlinePaymentDetails').classList.add('hidden');
        document.getElementById('modalCardNumber').removeAttribute('required');
        document.getElementById('modalCardExpiry').removeAttribute('required');
        document.getElementById('modalCardCvv').removeAttribute('required');
        hideRegisterModal();
        showToast('Registration submitted. Await admin approval.', 'success');
    } catch (error) {
        showToast('Failed to submit registration. Please try again.', 'error');
    }
}

// Slider Functions
let currentSlide = 0;

function initializeSlider() {
    slides = Array.from(document.querySelectorAll('.slide'));
    dots = Array.from(document.querySelectorAll('.slider-dot'));
    progressBar = document.getElementById('sliderProgress');
    const sliderContainer = document.getElementById('slider');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlider);
        sliderContainer.addEventListener('mouseleave', startAutoSlider);
    }
    if (slides.length) {
        goToSlide(0);
    }
}

function goToSlide(index) {
    // Hide all slides with scale animation
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.remove('opacity-0', 'scale-105');
            slide.classList.add('opacity-100', 'scale-100');
        } else {
            slide.classList.remove('opacity-100', 'scale-100');
            slide.classList.add('opacity-0', 'scale-105');
        }
    });
    
    // Update dots
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.remove('opacity-50');
            dot.classList.add('opacity-100');
        } else {
            dot.classList.remove('opacity-100');
            dot.classList.add('opacity-50');
        }
    });
    
    // Update progress bar
    if (progressBar) {
        const progress = ((index + 1) / 3) * 100;
        progressBar.style.width = progress + '%';
    }
    
    currentSlide = index;
}

function nextSlide() {
    const nextIndex = (currentSlide + 1) % slides.length;
    goToSlide(nextIndex);
}

function prevSlide() {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
}

function startAutoSlider() {
    sliderInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
}

function stopAutoSlider() {
    clearInterval(sliderInterval);
}

// Pause auto-slider on hover
const sliderContainer = document.getElementById('slider');
if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', stopAutoSlider);
    sliderContainer.addEventListener('mouseleave', startAutoSlider);
}

// Scroll to Top Button
const scrollTopBtn = document.getElementById('scrollTopBtn');
const tabNavigation = document.getElementById('tabNavigation');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.remove('translate-y-20', 'opacity-0');
        scrollTopBtn.classList.add('translate-y-0', 'opacity-100');
    } else {
        scrollTopBtn.classList.add('translate-y-20', 'opacity-0');
        scrollTopBtn.classList.remove('translate-y-0', 'opacity-100');
    }

    // Tab navigation transparency on scroll
    if (window.scrollY > 50) {
        tabNavigation.classList.remove('bg-transparent', 'shadow-none');
        tabNavigation.classList.add('bg-white', 'shadow-md');
    } else {
        tabNavigation.classList.add('bg-transparent', 'shadow-none');
        tabNavigation.classList.remove('bg-white', 'shadow-md');
    }
});

// Student Dashboard Functions
function updateStudentDashboard(enrollmentData) {
    // Update status workflow
    updateDashboardStatusWorkflow(enrollmentData.status);
    
    // Update academic info
    document.getElementById('dashboardLevel').textContent = enrollmentData.level || 'Senior High';
    document.getElementById('dashboardStrand').textContent = enrollmentData.strand || 'STEM Strand';
    document.getElementById('dashLevel').textContent = enrollmentData.level || 'Senior High';
    document.getElementById('dashGradeStrand').textContent = enrollmentData.strand || 'STEM';
    document.getElementById('dashLRN').textContent = enrollmentData.lrn || '123456789012';
    document.getElementById('dashPreviousSchool').textContent = enrollmentData.previousSchool || 'Biringan High School';
    
    // Update voucher status
    document.getElementById('dashboardVoucherStatus').textContent = enrollmentData.voucherStatus || 'Pending';
    document.getElementById('dashboardVoucherType').textContent = enrollmentData.voucherType || 'Public School Graduate';
    document.getElementById('dashboardVoucherEligibility').textContent = enrollmentData.voucherType || 'Public School Graduate';
    document.getElementById('dashboardVoucherVerification').textContent = enrollmentData.voucherVerification || 'Under Verification';
    
    // Update payment summary based on voucher
    if (enrollmentData.voucherEligible) {
        document.getElementById('dashboardTuition').textContent = '₱25,000';
        document.getElementById('dashboardUniformRow').style.display = 'flex';
        document.getElementById('dashboardVoucherRow').style.display = 'flex';
        document.getElementById('dashboardTotal').textContent = '₱3,000';
        document.getElementById('dashboardPaymentStatus').textContent = '₱3,000';
    } else {
        document.getElementById('dashboardTuition').textContent = '₱25,000';
        document.getElementById('dashboardUniformRow').style.display = 'none';
        document.getElementById('dashboardVoucherRow').style.display = 'none';
        document.getElementById('dashboardTotal').textContent = '₱27,200';
        document.getElementById('dashboardPaymentStatus').textContent = '₱27,200';
    }
    
    // Show admin requests if any
    if (enrollmentData.adminRequest) {
        document.getElementById('adminRequestsSection').style.display = 'block';
        document.getElementById('adminRequestMessage').textContent = enrollmentData.adminRequest;
    }
}

function updateDashboardStatusWorkflow(status) {
    const step1 = document.querySelector('#dashboard .w-8.bg-\\[\\#007dfe\\]');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const statusBar = document.getElementById('statusBar');
    const statusPercent = document.getElementById('statusPercent');
    const currentStatusText = document.getElementById('currentStatusText');
    
    // Reset all steps
    step1.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step2.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
    
    if (status === 'submitted') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        statusBar.style.width = '25%';
        statusPercent.textContent = '25%';
        currentStatusText.textContent = 'Current Status: Submitted';
    } else if (status === 'under-review') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        statusBar.style.width = '50%';
        statusPercent.textContent = '50%';
        currentStatusText.textContent = 'Current Status: Under Review';
    } else if (status === 'approved') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✓';
        statusBar.style.width = '75%';
        statusPercent.textContent = '75%';
        currentStatusText.textContent = 'Current Status: Approved';
    } else if (status === 'enrolled') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✓';
        step4.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step4.textContent = '✓';
        statusBar.style.width = '100%';
        statusPercent.textContent = '100%';
        currentStatusText.textContent = 'Current Status: Enrolled';
    } else if (status === 'rejected') {
        step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step1.textContent = '✓';
        step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step2.textContent = '✓';
        step3.className = 'w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        step3.textContent = '✗';
        statusBar.style.width = '50%';
        statusPercent.textContent = '50%';
        currentStatusText.textContent = 'Current Status: Rejected';
    }
}

// Load mock enrollment data for student dashboard
function loadStudentDashboard() {
    // Mock data - in real implementation, this would come from backend
    const mockEnrollmentData = {
        status: 'submitted',
        level: 'Senior High',
        strand: 'STEM',
        lrn: '123456789012',
        previousSchool: 'Biringan High School',
        voucherStatus: 'Pending',
        voucherType: 'Public School Graduate',
        voucherVerification: 'Under Verification',
        voucherEligible: true,
        adminRequest: null
    };
    
    updateStudentDashboard(mockEnrollmentData);
}

// Load student dashboard when dashboard tab is shown
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
    originalSwitchTab(tabName);
    if (tabName === 'dashboard') {
        loadStudentDashboard();
    }
};

// Admin Enrollment Review Functions
function openEnrollmentReviewModal(enrollmentId) {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.remove('hidden');
    
    // Populate modal with enrollment data (mock data for now)
    document.getElementById('reviewName').textContent = 'Juan Dela Cruz';
    document.getElementById('reviewDob').textContent = '2008-05-15';
    document.getElementById('reviewGender').textContent = 'Male';
    document.getElementById('reviewCivilStatus').textContent = 'Single';
    document.getElementById('reviewNationality').textContent = 'Filipino';
    document.getElementById('reviewReligion').textContent = 'Roman Catholic';
    document.getElementById('reviewAddress').textContent = '123 Main St, Biringan City';
    document.getElementById('reviewMobile').textContent = '09123456789';
    document.getElementById('reviewEmail').textContent = 'juan@example.com';
    
    document.getElementById('reviewElementary').textContent = 'Biringan Elementary School';
    document.getElementById('reviewElementaryYear').textContent = '2020';
    document.getElementById('reviewLRN').textContent = '123456789012';
    document.getElementById('reviewHighSchool').textContent = 'Biringan High School';
    document.getElementById('reviewHighSchoolYear').textContent = '2024';
    document.getElementById('reviewGrade10Section').textContent = 'Section A';
    document.getElementById('reviewSeniorHigh').textContent = 'N/A';
    document.getElementById('reviewPublicSchool').textContent = 'Yes';
    
    document.getElementById('reviewLevel').textContent = 'Senior High';
    document.getElementById('reviewGradeStrand').textContent = 'STEM';
    document.getElementById('reviewVoucherEligibility').textContent = 'From Public School (Voucher Eligible)';
    
    // Update payment summary based on voucher eligibility
    document.getElementById('reviewTuition').textContent = '₱25,000';
    document.getElementById('reviewUniformRow').style.display = 'flex';
    document.getElementById('reviewVoucherRow').style.display = 'flex';
    document.getElementById('reviewTotal').textContent = '₱3,000';
    
    // Update status workflow
    updateStatusWorkflow('under-review');
}

function closeEnrollmentReviewModal() {
    const modal = document.getElementById('enrollmentReviewModal');
    modal.classList.add('hidden');
}

function updateStatusWorkflow(status) {
    const step1 = document.getElementById('statusStep1');
    const step2 = document.getElementById('statusStep2');
    const step3 = document.getElementById('statusStep3');
    const statusText = document.getElementById('currentStatusText');
    
    // Reset all steps
    step1.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    step2.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    step3.className = 'flex-1 text-center p-2 rounded bg-gray-200 text-gray-600';
    
    if (status === 'submitted') {
        step1.className = 'flex-1 text-center p-2 rounded bg-yellow-500 text-white';
        statusText.textContent = 'Current Status: Submitted';
    } else if (status === 'under-review') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-blue-500 text-white';
        statusText.textContent = 'Current Status: Under Review';
    } else if (status === 'approved') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step3.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        statusText.textContent = 'Current Status: Approved';
    } else if (status === 'rejected') {
        step1.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step2.className = 'flex-1 text-center p-2 rounded bg-green-500 text-white';
        step3.className = 'flex-1 text-center p-2 rounded bg-red-500 text-white';
        statusText.textContent = 'Current Status: Rejected';
    }
}

function approveEnrollment() {
    // Verify voucher checkboxes are checked if applicable
    const voucherEligibility = document.getElementById('reviewVoucherEligibility').textContent;
    if (voucherEligibility.includes('Voucher Eligible')) {
        const verifyPublicSchool = document.getElementById('verifyPublicSchool').checked;
        const verifyLRN = document.getElementById('verifyLRN').checked;
        const verifyPreviousSchool = document.getElementById('verifyPreviousSchool').checked;
        
        if (!verifyPublicSchool || !verifyLRN || !verifyPreviousSchool) {
            alert('Please complete all voucher verification checkboxes before approving.');
            return;
        }
    }
    
    updateStatusWorkflow('approved');
    alert('Enrollment approved successfully!');
    closeEnrollmentReviewModal();
    // In real implementation, update database and refresh table
}

function rejectEnrollment() {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
        updateStatusWorkflow('rejected');
        alert('Enrollment rejected. Reason: ' + reason);
        closeEnrollmentReviewModal();
        // In real implementation, update database and refresh table
    }
}

function requestMoreInfo() {
    const infoNeeded = prompt('What additional information do you need from the student?');
    if (infoNeeded) {
        alert('Request for more information sent: ' + infoNeeded);
        closeEnrollmentReviewModal();
        // In real implementation, send notification to student
    }
}

function filterEnrollments(filter) {
    // In real implementation, filter the enrollment table based on status
    console.log('Filtering enrollments by:', filter);
    // This would update the table to show only matching enrollments
}

// Mock data for enrollment table (replace with real data from backend)
function loadEnrollmentApplications() {
    const tableBody = document.getElementById('enrollmentsTableBody');
    const mockData = [
        {
            name: 'Juan Dela Cruz',
            level: 'Senior High',
            strand: 'STEM',
            voucher: 'Eligible',
            status: 'submitted',
            date: '2026-07-01'
        },
        {
            name: 'Maria Santos',
            level: 'Junior High',
            strand: 'Grade 8',
            voucher: 'N/A',
            status: 'under-review',
            date: '2026-06-30'
        },
        {
            name: 'Jose Reyes',
            level: 'Senior High',
            strand: 'ABM',
            voucher: 'Not Eligible',
            status: 'approved',
            date: '2026-06-28'
        }
    ];
    
    tableBody.innerHTML = '';
    mockData.forEach((enrollment, index) => {
        const statusColors = {
            'submitted': 'bg-yellow-100 text-yellow-800',
            'under-review': 'bg-blue-100 text-blue-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800'
        };
        
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3">${enrollment.name}</td>
            <td class="px-4 py-3">${enrollment.level}</td>
            <td class="px-4 py-3">${enrollment.strand}</td>
            <td class="px-4 py-3">${enrollment.voucher}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[enrollment.status]}">
                    ${enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </span>
            </td>
            <td class="px-4 py-3">${enrollment.date}</td>
            <td class="px-4 py-3">
                <button onclick="openEnrollmentReviewModal(${index})" class="text-indigo-600 hover:text-indigo-800 mr-2">
                    <i class="fas fa-eye"></i> Review
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Load enrollment applications when admin tab is shown
const originalShowAdminTab = showAdminTab;
showAdminTab = function(tabName, button) {
    originalShowAdminTab(tabName, button);
    if (tabName === 'enrollments') {
        loadEnrollmentApplications();
    }
};

// Language Translations
const translations = {
    en: {
        navHome: 'Home',
        navNews: 'News',
        navPrograms: 'Programs',
        navGuide: 'Guide',
        navPayment: 'Payment Instructions',
        navRegister: 'Register',
        welcomeTitle: 'Welcome to Our University',
        welcomeSubtitle: 'Excellence in Education Since 1950',
        applyNow: 'Apply Now',
        learnMore: 'Learn More',
        newsTitle: 'Latest News',
        newsSubtitle: 'Stay updated with university announcements and events',
        programsTitle: 'Academic Programs',
        programsSubtitle: 'Explore our diverse range of undergraduate and graduate programs',
        guideTitle: 'Enrollment Guide',
        guideSubtitle: 'Follow these simple steps to enroll at our university',
        paymentTitle: 'Payment Instructions',
        paymentSubtitle: 'Choose your preferred payment method to complete your enrollment',
        onlinePayment: 'Online Payment',
        walkinPayment: 'Walk-in Payment'
    },
    id: {
        navHome: 'Beranda',
        navNews: 'Berita',
        navPrograms: 'Program',
        navGuide: 'Panduan',
        navPayment: 'Instruksi Pembayaran',
        navRegister: 'Daftar',
        welcomeTitle: 'Selamat Datang di Universitas Kami',
        welcomeSubtitle: 'Keunggulan Pendidikan Sejak 1950',
        applyNow: 'Daftar Sekarang',
        learnMore: 'Pelajari Lebih Lanjut',
        newsTitle: 'Berita Terbaru',
        newsSubtitle: 'Tetap update dengan pengumuman dan acara universitas',
        programsTitle: 'Program Akademik',
        programsSubtitle: 'Jelajahi berbagai program sarjana dan pascasarjana kami',
        guideTitle: 'Panduan Pendaftaran',
        guideSubtitle: 'Ikuti langkah sederhana untuk mendaftar di universitas kami',
        paymentTitle: 'Instruksi Pembayaran',
        paymentSubtitle: 'Pilih metode pembayaran pilihan Anda untuk menyelesaikan pendaftaran',
        onlinePayment: 'Pembayaran Online',
        walkinPayment: 'Pembayaran Langsung'
    },
    zh: {
        navHome: '首页',
        navNews: '新闻',
        navPrograms: '项目',
        navGuide: '指南',
        navPayment: '付款说明',
        navRegister: '注册',
        welcomeTitle: '欢迎来到我们的大学',
        welcomeSubtitle: '自1950年以来的卓越教育',
        applyNow: '立即申请',
        learnMore: '了解更多',
        newsTitle: '最新新闻',
        newsSubtitle: '了解大学公告和活动的最新动态',
        programsTitle: '学术项目',
        programsSubtitle: '探索我们多样化的本科和研究生项目',
        guideTitle: '入学指南',
        guideSubtitle: '按照这些简单步骤在我们大学注册',
        paymentTitle: '付款说明',
        paymentSubtitle: '选择您偏好的付款方式完成注册',
        onlinePayment: '在线付款',
        walkinPayment: '现场付款'
    },
    ar: {
        navHome: 'الرئيسية',
        navNews: 'الأخبار',
        navPrograms: 'البرامج',
        navGuide: 'الدليل',
        navPayment: 'تعليمات الدفع',
        navRegister: 'التسجيل',
        welcomeTitle: 'مرحباً بكم في جامعتنا',
        welcomeSubtitle: 'التميز في التعليم منذ عام 1950',
        applyNow: 'قدم الآن',
        learnMore: 'اعرف المزيد',
        newsTitle: 'أحدث الأخبار',
        newsSubtitle: 'ابق على اطلاع بإعلانات وأحداث الجامعة',
        programsTitle: 'البرامج الأكاديمية',
        programsSubtitle: 'استكشف نطاقنا المتنوع من برامج البكالوريوس والدراسات العليا',
        guideTitle: 'دليل التسجيل',
        guideSubtitle: 'اتبع هذه الخطوات البسيطة للتسجيل في جامعتنا',
        paymentTitle: 'تعليمات الدفع',
        paymentSubtitle: 'اختر طريقة الدفع المفضلة لإكمال التسجيل',
        onlinePayment: 'الدفع الإلكتروني',
        walkinPayment: 'الدفع المباشر'
    },
    es: {
        navHome: 'Inicio',
        navNews: 'Noticias',
        navPrograms: 'Programas',
        navGuide: 'Guía',
        navPayment: 'Instrucciones de Pago',
        navRegister: 'Registrarse',
        welcomeTitle: 'Bienvenido a Nuestra Universidad',
        welcomeSubtitle: 'Excelencia en Educación Desde 1950',
        applyNow: 'Solicitar Ahora',
        learnMore: 'Saber Más',
        newsTitle: 'Últimas Noticias',
        newsSubtitle: 'Manténgase actualizado con anuncios y eventos de la universidad',
        programsTitle: 'Programas Académicos',
        programsSubtitle: 'Explore nuestra diversa gama de programas de pregrado y posgrado',
        guideTitle: 'Guía de Inscripción',
        guideSubtitle: 'Siga estos simples pasos para inscribirse en nuestra universidad',
        paymentTitle: 'Instrucciones de Pago',
        paymentSubtitle: 'Elija su método de pago preferido para completar la inscripción',
        onlinePayment: 'Pago en Línea',
        walkinPayment: 'Pago Presencial'
    },
    fr: {
        navHome: 'Accueil',
        navNews: 'Actualités',
        navPrograms: 'Programmes',
        navGuide: 'Guide',
        navPayment: 'Instructions de Paiement',
        navRegister: 'S\'inscrire',
        welcomeTitle: 'Bienvenue à Notre Université',
        welcomeSubtitle: 'Excellence en Éducation Depuis 1950',
        applyNow: 'Postuler Maintenant',
        learnMore: 'En Savoir Plus',
        newsTitle: 'Dernières Nouvelles',
        newsSubtitle: 'Restez informé des annonces et événements de l\'université',
        programsTitle: 'Programmes Académiques',
        programsSubtitle: 'Explorez notre large gamme de programmes de premier et deuxième cycle',
        guideTitle: 'Guide d\'Inscription',
        guideSubtitle: 'Suivez ces étapes simples pour vous inscrire à notre université',
        paymentTitle: 'Instructions de Paiement',
        paymentSubtitle: 'Choisissez votre méthode de paiement préférée pour compléter l\'inscription',
        onlinePayment: 'Paiement en Ligne',
        walkinPayment: 'Paiement en Personne'
    },
    de: {
        navHome: 'Startseite',
        navNews: 'Nachrichten',
        navPrograms: 'Programme',
        navGuide: 'Leitfaden',
        navPayment: 'Zahlungsanweisungen',
        navRegister: 'Registrieren',
        welcomeTitle: 'Willkommen an Unserer Universität',
        welcomeSubtitle: 'Exzellenz in Bildung Seit 1950',
        applyNow: 'Jetzt Bewerben',
        learnMore: 'Mehr Erfahren',
        newsTitle: 'Neueste Nachrichten',
        newsSubtitle: 'Bleiben Sie über Ankündigungen und Veranstaltungen der Universität informiert',
        programsTitle: 'Akademische Programme',
        programsSubtitle: 'Erkunden Sie unsere vielfältige Palette an Bachelor- und Masterstudiengängen',
        guideTitle: 'Einschreibungsleitfaden',
        guideSubtitle: 'Folgen Sie diesen einfachen Schritten zur Einschreibung an unserer Universität',
        paymentTitle: 'Zahlungsanweisungen',
        paymentSubtitle: 'Wählen Sie Ihre bevorzugte Zahlungsmethode, um die Einschreibung abzuschließen',
        onlinePayment: 'Online-Zahlung',
        walkinPayment: 'Barzahlung'
    },
    ja: {
        navHome: 'ホーム',
        navNews: 'ニュース',
        navPrograms: 'プログラム',
        navGuide: 'ガイド',
        navPayment: '支払い手順',
        navRegister: '登録',
        welcomeTitle: '私たちの大学へようこそ',
        welcomeSubtitle: '1950年からの教育の卓越性',
        applyNow: '今すぐ申請',
        learnMore: '詳細を見る',
        newsTitle: '最新ニュース',
        newsSubtitle: '大学の発表やイベントについて最新情報を入手',
        programsTitle: '学術プログラム',
        programsSubtitle: '多様な学部および大学院プログラムを探索',
        guideTitle: '入学ガイド',
        guideSubtitle: '大学に登録するための簡単な手順に従う',
        paymentTitle: '支払い手順',
        paymentSubtitle: '登録を完了するために希望する支払い方法を選択',
        onlinePayment: 'オンライン支払い',
        walkinPayment: '直接支払い'
    },
    ko: {
        navHome: '홈',
        navNews: '뉴스',
        navPrograms: '프로그램',
        navGuide: '가이드',
        navPayment: '결제 안내',
        navRegister: '등록',
        welcomeTitle: '우리 대학에 오신 것을 환영합니다',
        welcomeSubtitle: '1950년부터의 교육의 탁월성',
        applyNow: '지금 신청',
        learnMore: '자세히 알아보기',
        newsTitle: '최신 뉴스',
        newsSubtitle: '대학 공지 및 이벤트에 대한 최신 정보 유지',
        programsTitle: '학술 프로그램',
        programsSubtitle: '다양한 학부 및 대학원 프로그램 탐색',
        guideTitle: '등록 가이드',
        guideSubtitle: '대학에 등록하기 위한 간단한 단계 따르기',
        paymentTitle: '결제 안내',
        paymentSubtitle: '등록을 완료하기 위해 선호하는 결제 방법 선택',
        onlinePayment: '온라인 결제',
        walkinPayment: '직접 결제'
    },
    pt: {
        navHome: 'Início',
        navNews: 'Notícias',
        navPrograms: 'Programas',
        navGuide: 'Guia',
        navPayment: 'Instruções de Pagamento',
        navRegister: 'Registrar',
        welcomeTitle: 'Bem-vindo à Nossa Universidade',
        welcomeSubtitle: 'Excelência em Educação Desde 1950',
        applyNow: 'Inscrever-se Agora',
        learnMore: 'Saiba Mais',
        newsTitle: 'Últimas Notícias',
        newsSubtitle: 'Mantenha-se atualizado com anúncios e eventos da universidade',
        programsTitle: 'Programas Acadêmicos',
        programsSubtitle: 'Explore nossa ampla gama de programas de graduação e pós-graduação',
        guideTitle: 'Guia de Inscrição',
        guideSubtitle: 'Siga estes passos simples para se inscrever em nossa universidade',
        paymentTitle: 'Instruções de Pagamento',
        paymentSubtitle: 'Escolha seu método de pagamento preferido para completar a inscrição',
        onlinePayment: 'Pagamento Online',
        walkinPayment: 'Pagamento Presencial'
    },
    ru: {
        navHome: 'Главная',
        navNews: 'Новости',
        navPrograms: 'Программы',
        navGuide: 'Руководство',
        navPayment: 'Инструкции по оплате',
        navRegister: 'Регистрация',
        welcomeTitle: 'Добро пожаловать в наш университет',
        welcomeSubtitle: 'Превосходство в образовании с 1950 года',
        applyNow: 'Подать заявку',
        learnMore: 'Узнать больше',
        newsTitle: 'Последние новости',
        newsSubtitle: 'Будьте в курсе объявлений и событий университета',
        programsTitle: 'Академические программы',
        programsSubtitle: 'Изучите наш широкий спектр программ бакалавриата и магистратуры',
        guideTitle: 'Руководство по зачислению',
        guideSubtitle: 'Следуйте этим простым шагам для зачисления в наш университет',
        paymentTitle: 'Инструкции по оплате',
        paymentSubtitle: 'Выберите предпочитаемый способ оплаты для завершения зачисления',
        onlinePayment: 'Онлайн-оплата',
        walkinPayment: 'Оплата наличными'
    },
    hi: {
        navHome: 'होम',
        navNews: 'समाचार',
        navPrograms: 'कार्यक्रम',
        navGuide: 'गाइड',
        navPayment: 'भुगतान निर्देश',
        navRegister: 'पंजीकरण',
        welcomeTitle: 'हमारे विश्वविद्यालय में आपका स्वागत है',
        welcomeSubtitle: '1950 से शिक्षा में उत्कृष्टता',
        applyNow: 'अभी आवेदन करें',
        learnMore: 'और जानें',
        newsTitle: 'नवीनतम समाचार',
        newsSubtitle: 'विश्वविद्यालय की घोषणाओं और कार्यक्रमों के बारे में अपडेट रहें',
        programsTitle: 'शैक्षणिक कार्यक्रम',
        programsSubtitle: 'हमारे विविध स्नातक और स्नातकोत्तर कार्यक्रमों का अन्वेषण करें',
        guideTitle: 'नामांकन गाइड',
        guideSubtitle: 'हमारे विश्वविद्यालय में नामांकन के लिए इन सरल चरणों का पालन करें',
        paymentTitle: 'भुगतान निर्देश',
        paymentSubtitle: 'नामांकन पूरा करने के लिए अपनी पसंदीदा भुगतान विधि चुनें',
        onlinePayment: 'ऑनलाइन भुगतान',
        walkinPayment: 'सीधे भुगतान'
    },
    th: {
        navHome: 'หน้าแรก',
        navNews: 'ข่าว',
        navPrograms: 'โปรแกรม',
        navGuide: 'คู่มือ',
        navPayment: 'คำแนะนำการชำระเงิน',
        navRegister: 'ลงทะเบียน',
        welcomeTitle: 'ยินดีต้อนรับสู่มหาวิทยาลัยของเรา',
        welcomeSubtitle: 'ความเป็นเลิศทางการศึกษาตั้งแต่ปี 1950',
        applyNow: 'สมัครเลย',
        learnMore: 'เรียนรู้เพิ่มเติม',
        newsTitle: 'ข่าวล่าสุด',
        newsSubtitle: 'ติดตามประกาศและกิจกรรมของมหาวิทยาลัย',
        programsTitle: 'โปรแกรมทางวิชาการ',
        programsSubtitle: 'สำรวจหลักสูตรปริญญาตรีและบัณฑิตศึกษาที่หลากหลายของเรา',
        guideTitle: 'คู่มือการลงทะเบียน',
        guideSubtitle: 'ทำตามขั้นตอนง่ายๆ เหล่านี้เพื่อลงทะเบียนที่มหาวิทยาลัยของเรา',
        paymentTitle: 'คำแนะนำการชำระเงิน',
        paymentSubtitle: 'เลือกวิธีการชำระเงินที่คุณต้องการเพื่อทำการลงทะเบียนให้สมบูรณ์',
        onlinePayment: 'ชำระเงินออนไลน์',
        walkinPayment: 'ชำระเงินด้วยตนเอง'
    },
    vi: {
        navHome: 'Trang chủ',
        navNews: 'Tin tức',
        navPrograms: 'Chương trình',
        navGuide: 'Hướng dẫn',
        navPayment: 'Hướng dẫn thanh toán',
        navRegister: 'Đăng ký',
        welcomeTitle: 'Chào mừng đến với Đại học của chúng tôi',
        welcomeSubtitle: 'Sự xuất sắc trong giáo dục từ năm 1950',
        applyNow: 'Đăng ký ngay',
        learnMore: 'Tìm hiểu thêm',
        newsTitle: 'Tin tức mới nhất',
        newsSubtitle: 'Cập nhật thông báo và sự kiện của đại học',
        programsTitle: 'Chương trình học thuật',
        programsSubtitle: 'Khám phá các chương trình đại học và sau đại học đa dạng của chúng tôi',
        guideTitle: 'Hướng dẫn đăng ký',
        guideSubtitle: 'Làm theo các bước đơn giản này để đăng ký vào đại học của chúng tôi',
        paymentTitle: 'Hướng dẫn thanh toán',
        paymentSubtitle: 'Chọn phương thức thanh toán ưa thích của bạn để hoàn tất đăng ký',
        onlinePayment: 'Thanh toán trực tuyến',
        walkinPayment: 'Thanh toán trực tiếp'
    },
    tl: {
        navHome: 'Tahanan',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Gabay',
        navPayment: 'Mga Tagubilin sa Pagbabayad',
        navRegister: 'Magrehistro',
        welcomeTitle: 'Maligayang Pagdating sa Aming Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Mula noong 1950',
        applyNow: 'Mag-apply Ngayon',
        learnMore: 'Alamin Pa',
        newsTitle: 'Pinakabagong Balita',
        newsSubtitle: 'Manatiling updated sa mga anunsyo at kaganapan ng unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Tuklasin ang iba\'t ibang programa ng undergraduate at graduate namin',
        guideTitle: 'Gabay sa Pagpaparehistro',
        guideSubtitle: 'Sundan ang mga simpleng hakbang na ito para magrehistro sa aming unibersidad',
        paymentTitle: 'Mga Tagubilin sa Pagbabayad',
        paymentSubtitle: 'Piliin ang iyong gustong paraan ng pagbabayad upang makumpleto ang pagpaparehistro',
        onlinePayment: 'Online na Pagbabayad',
        walkinPayment: 'Personal na Pagbabayad'
    },
    ceb: {
        navHome: 'Balay',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Giya',
        navPayment: 'Mga Sugli sa Pagbayad',
        navRegister: 'Parehistro',
        welcomeTitle: 'Maayong Pag-abot sa Atong Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Gikan sa 1950',
        applyNow: 'Pamuyo Karon',
        learnMore: 'Pag-aram Pa',
        newsTitle: 'Pinakabagong Balita',
        newsSubtitle: 'Pabilin nga updated sa mga anunsyo ug mga panghitabo sa unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Susi ang lain-laing mga programa sa undergraduate ug graduate namo',
        guideTitle: 'Giya sa Pagparehistro',
        guideSubtitle: 'Sundan kining mga yano nga mga lakang aron magparehistro sa atong unibersidad',
        paymentTitle: 'Mga Sugli sa Pagbayad',
        paymentSubtitle: 'Piliin ang imong gipili nga paagi sa pagbayad aron makompleto ang pagparehistro',
        onlinePayment: 'Online nga Pagbayad',
        walkinPayment: 'Personal nga Pagbayad'
    },
    ilo: {
        navHome: 'Balay',
        navNews: 'Dagiti Damag',
        navPrograms: 'Dagiti Programa',
        navGuide: 'Gida',
        navPayment: 'Dagiti Panunot iti Panagbayad',
        navRegister: 'Marehistro',
        welcomeTitle: 'Naragsak nga Panagabot iti Nagan nga Unibersidad',
        welcomeSubtitle: 'Kalaing iti Edukasion Manipud idi 1950',
        applyNow: 'Ag-apply Itan',
        learnMore: 'Ad-adda Pay',
        newsTitle: 'Kaudian a Damag',
        newsSubtitle: 'Mantemid nga updated kadagiti annunsio ken panagpaspasamak ti unibersidad',
        programsTitle: 'Dagiti Akademiko a Programa',
        programsSubtitle: 'Sukisok dagiti nadumaduma a programa ti undergraduate ken graduate tayo',
        guideTitle: 'Gida iti Panagrehistro',
        guideSubtitle: 'Sundan dagitoy a simple nga pasos tapno marehistro iti unibersidad tayo',
        paymentTitle: 'Dagiti Panunot iti Panagbayad',
        paymentSubtitle: 'Piliem ti kaykayat a pamay-an iti panagbayad tapno maipasubli ti panagrehistro',
        onlinePayment: 'Online a Panagbayad',
        walkinPayment: 'Personal a Panagbayad'
    },
    hil: {
        navHome: 'Balay',
        navNews: 'Balita',
        navPrograms: 'Mga Programa',
        navGuide: 'Gide',
        navPayment: 'Mga Suglanon sa Pagbayad',
        navRegister: 'Magparehistro',
        welcomeTitle: 'Maayong Pag-abot sa Amon Unibersidad',
        welcomeSubtitle: 'Kahusayan sa Edukasyon Gikan pa 1950',
        applyNow: 'Mag-apply Karon',
        learnMore: 'Pag-aram Pa',
        newsTitle: 'Pinakabag-o nga Balita',
        newsSubtitle: 'Pabilin nga updated sa mga anunsyo kag mga panghitabo sang unibersidad',
        programsTitle: 'Mga Akademikong Programa',
        programsSubtitle: 'Suklon ang mga iba-ibang nga programa sang undergraduate kag graduate namon',
        guideTitle: 'Gide sa Pagparehistro',
        guideSubtitle: 'Sundan kining mga simpleng nga lakas para magparehistro sa amon unibersidad',
        paymentTitle: 'Mga Suglanon sa Pagbayad',
        paymentSubtitle: 'Piliin ang imo gusto nga paagi sang pagbayad para makumpleto ang pagparehistro',
        onlinePayment: 'Online nga Pagbayad',
        walkinPayment: 'Personal nga Pagbayad'
    }
};

function changeLanguage(lang) {
    // Update navigation buttons
    document.querySelector('button[onclick*="window.scrollTo"]').textContent = translations[lang].navHome;
    document.querySelector('button[onclick*="news"]').textContent = translations[lang].navNews;
    document.querySelector('button[onclick*="programs"]').textContent = translations[lang].navPrograms;
    document.querySelector('button[onclick*="guide"]').textContent = translations[lang].navGuide;
    document.querySelector('button[onclick*="payment"]').textContent = translations[lang].navPayment;
    document.querySelector('button[onclick*="showRegisterModal"]').textContent = translations[lang].navRegister;

    // Update slider text for all slides
    const welcomeTitles = document.querySelectorAll('.slide h1');
    welcomeTitles.forEach(title => {
        title.textContent = translations[lang].welcomeTitle;
    });
    
    const welcomeSubtitles = document.querySelectorAll('.slide p');
    welcomeSubtitles.forEach(subtitle => {
        subtitle.textContent = translations[lang].welcomeSubtitle;
    });

    // Update slider buttons
    const sliderButtons = document.querySelectorAll('.slide button');
    sliderButtons.forEach((button, index) => {
        if (button.textContent.includes('Apply') || button.textContent.includes('Solicitar') || button.textContent.includes('Postuler') || button.textContent.includes('Bewerben') || button.textContent.includes('申請') || button.textContent.includes('신청') || button.textContent.includes('Inscrever') || button.textContent.includes('Подать') || button.textContent.includes('आवेदन') || button.textContent.includes('สมัคร') || button.textContent.includes('Đăng ký') || button.textContent.includes('Mag-apply') || button.textContent.includes('Pamuyo') || button.textContent.includes('Ag-apply') || button.textContent.includes('Mag-apply')) {
            button.innerHTML = `<i class="fas fa-graduation-cap mr-2"></i>${translations[lang].applyNow}`;
        } else if (button.textContent.includes('Learn') || button.textContent.includes('Saber') || button.textContent.includes('Savoir') || button.textContent.includes('Erfahren') || button.textContent.includes('詳細') || button.textContent.includes('알아보기') || button.textContent.includes('Saiba') || button.textContent.includes('Узнать') || button.textContent.includes('जानें') || button.textContent.includes('เรียนรู้') || button.textContent.includes('Tìm hiểu') || button.textContent.includes('Alamin') || button.textContent.includes('Pag-aram') || button.textContent.includes('Ad-adda') || button.textContent.includes('Pag-aram')) {
            button.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${translations[lang].learnMore}`;
        }
    });

    // Update section titles
    const newsTitle = document.querySelector('#news h1');
    if (newsTitle) newsTitle.textContent = translations[lang].newsTitle;

    const newsSubtitle = document.querySelector('#news p');
    if (newsSubtitle) newsSubtitle.textContent = translations[lang].newsSubtitle;

    const programsTitle = document.querySelector('#programs h1');
    if (programsTitle) programsTitle.textContent = translations[lang].programsTitle;

    const programsSubtitle = document.querySelector('#programs p');
    if (programsSubtitle) programsSubtitle.textContent = translations[lang].programsSubtitle;

    const guideTitle = document.querySelector('#guide h1');
    if (guideTitle) guideTitle.textContent = translations[lang].guideTitle;

    const guideSubtitle = document.querySelector('#guide p');
    if (guideSubtitle) guideSubtitle.textContent = translations[lang].guideSubtitle;

    const paymentTitle = document.querySelector('#payment h1');
    if (paymentTitle) paymentTitle.textContent = translations[lang].paymentTitle;

    const paymentSubtitle = document.querySelector('#payment p');
    if (paymentSubtitle) paymentSubtitle.textContent = translations[lang].paymentSubtitle;

    // Update payment section titles
    const paymentSectionTitles = document.querySelectorAll('#payment h2');
    paymentSectionTitles.forEach((title, index) => {
        if (index === 0) title.textContent = translations[lang].onlinePayment;
        if (index === 1) title.textContent = translations[lang].walkinPayment;
    });

    // Update RTL for Arabic and other RTL languages
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    if (rtlLanguages.includes(lang)) {
        document.body.style.direction = 'rtl';
    } else {
        document.body.style.direction = 'ltr';
    }
}

// FAQ Toggle
function toggleFAQ(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// File Upload Handler
function handleFileUpload(input, documentName) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const parent = input.parentElement.parentElement;
        const statusSpan = parent.querySelector('span:last-child');
        const icon = parent.querySelector('i');
        
        icon.className = 'fas fa-spinner fa-spin text-[#007dfe]';
        statusSpan.textContent = 'Uploading...';
        statusSpan.className = 'text-[#007dfe] text-sm';
        
        setTimeout(() => {
            icon.className = 'fas fa-check-circle text-green-500';
            statusSpan.textContent = 'Uploaded';
            statusSpan.className = 'text-green-500 text-sm';
            showToast(`${documentName} uploaded successfully!`);
        }, 1500);
    }
}

// Tab Navigation
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to selected button
    const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    
    if (isDark) {
        document.body.style.backgroundColor = '#1a1a2e';
        document.body.style.color = '#ffffff';
        document.body.classList.remove('bg-gray-100');
        document.body.classList.add('bg-[#1a1a2e]');
    } else {
        document.body.style.backgroundColor = '#f3f4f6';
        document.body.style.color = '#1f2937';
        document.body.classList.remove('bg-[#1a1a2e]');
        document.body.classList.add('bg-gray-100');
    }
}

// Search Functions
function openSearch() {
    document.getElementById('searchOverlay').classList.remove('hidden');
    document.getElementById('searchInput').focus();
    
    // Show suggested questions
    showSearchSuggestions();
}

function showSearchSuggestions() {
    const resultsContainer = document.getElementById('searchResults');
    const suggestions = [
        { type: 'Question', title: 'What are the admission requirements?', answer: 'To be admitted, you need a high school diploma or equivalent, minimum GPA of 2.5, and completion of prerequisite courses. International students must provide English proficiency test scores.' },
        { type: 'Question', title: 'How do I apply for scholarships?', answer: 'Scholarship applications are available through the student portal. You can apply for merit-based, need-based, and program-specific scholarships. Deadlines vary by scholarship type.' },
        { type: 'Question', title: 'What payment methods are accepted?', answer: 'We accept credit cards (Visa, Mastercard), bank transfers, and e-wallets (GoPay, OVO, Dana). You can also pay in person at the Finance Office using cash or debit cards.' },
        { type: 'Question', title: 'When is the enrollment deadline?', answer: 'The enrollment deadline for Fall semester is August 15th, and for Spring semester is January 15th. Late applications may be considered on a space-available basis with additional fees.' },
        { type: 'Question', title: 'How do I upload documents?', answer: 'Go to the Dashboard tab and navigate to the Required Documents section. Click the Upload button next to each document type and select your file. Accepted formats include PDF, JPG, and PNG.' },
        { type: 'Program', title: 'Computer Science program details', answer: 'Computer Science is a 4-year Bachelor\'s program covering programming, algorithms, software development, and industry partnerships. Students learn hands-on with real-world projects.' },
        { type: 'Program', title: 'Business Administration courses', answer: 'Business Administration is a 4-year program covering management, finance, marketing, and entrepreneurship. Includes internship opportunities and practical business skills.' },
        { type: 'Program', title: 'Biotechnology degree requirements', answer: 'Biotechnology is a 4-year program covering genetic engineering, molecular biology, and biochemistry. Features state-of-the-art laboratory facilities and research opportunities.' },
    ];
    
    resultsContainer.innerHTML = `
        <div class="mb-4">
            <p class="text-sm text-gray-500 font-medium mb-2">Suggested Questions:</p>
            ${suggestions.map((item, index) => `
                <div class="p-3 hover:bg-gray-100 rounded-lg cursor-pointer" onclick="showAnswer('${item.title.replace(/'/g, "\\'")}', '${item.answer.replace(/'/g, "\\'")}')">
                    <span class="text-xs text-[#007dfe] font-semibold">${item.type}</span>
                    <p class="text-gray-800">${item.title}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function closeSearch() {
    document.getElementById('searchOverlay').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

function showAnswer(question, answer) {
    const modal = document.getElementById('answerModal');
    const content = document.getElementById('answerModalContent');
    const questionEl = document.getElementById('answerQuestion');
    const answerEl = document.getElementById('answerText');
    
    questionEl.textContent = question;
    answerEl.textContent = answer;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideAnswerModal() {
    const modal = document.getElementById('answerModal');
    const content = document.getElementById('answerModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        showSearchSuggestions();
        return;
    }
    
    const searchableContent = [
        { type: 'Program', title: 'Computer Science', answer: 'Computer Science is a 4-year Bachelor\'s program covering programming, algorithms, software development, and industry partnerships. Students learn hands-on with real-world projects.' },
        { type: 'Program', title: 'Biotechnology', answer: 'Biotechnology is a 4-year program covering genetic engineering, molecular biology, and biochemistry. Features state-of-the-art laboratory facilities and research opportunities.' },
        { type: 'Program', title: 'Business Administration', answer: 'Business Administration is a 4-year program covering management, finance, marketing, and entrepreneurship. Includes internship opportunities and practical business skills.' },
        { type: 'Program', title: 'Medicine', answer: 'Medicine is a professional program preparing students for medical careers with comprehensive clinical training and research opportunities.' },
        { type: 'Program', title: 'Fine Arts', answer: 'Fine Arts program offers creative expression through various mediums including painting, sculpture, digital arts, and performance.' },
        { type: 'Program', title: 'International Relations', answer: 'International Relations program covers global politics, diplomacy, and international law with opportunities for study abroad.' },
        { type: 'FAQ', title: 'Admission Requirements', answer: 'To be admitted, you need a high school diploma or equivalent, minimum GPA of 2.5, and completion of prerequisite courses. International students must provide English proficiency test scores.' },
        { type: 'FAQ', title: 'Scholarships', answer: 'Scholarship applications are available through the student portal. You can apply for merit-based, need-based, and program-specific scholarships. Deadlines vary by scholarship type.' },
        { type: 'FAQ', title: 'Payment Methods', answer: 'We accept credit cards (Visa, Mastercard), bank transfers, and e-wallets (GoPay, OVO, Dana). You can also pay in person at the Finance Office using cash or debit cards.' },
        { type: 'FAQ', title: 'Credit Transfer', answer: 'Yes, we accept transfer credits from accredited institutions. Credits are evaluated on a case-by-case basis. Submit your official transcripts for evaluation during the application process.' },
        { type: 'FAQ', title: 'Enrollment Deadlines', answer: 'The enrollment deadline for Fall semester is August 15th, and for Spring semester is January 15th. Late applications may be considered on a space-available basis with additional fees.' },
    ];
    
    const results = searchableContent.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length > 0) {
        resultsContainer.innerHTML = results.map(item => `
            <div class="p-3 hover:bg-gray-100 rounded-lg cursor-pointer" onclick="showAnswer('${item.title.replace(/'/g, "\\'")}', '${item.answer.replace(/'/g, "\\'")}')">
                <span class="text-xs text-[#007dfe] font-semibold">${item.type}</span>
                <p class="text-gray-800">${item.title}</p>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No results found</p>';
    }
}

// Close search on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSearch();
    }
});

// Close search when clicking outside
document.getElementById('searchOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'searchOverlay') {
        closeSearch();
    }
});

// Email Notification System (Frontend simulation)
function sendEmailNotification(type, recipient, data) {
    // This is a frontend simulation - in production, this would call a backend API
    const notifications = {
        'registration': {
            subject: 'Welcome to University - Registration Received',
            body: `Dear ${data.name},\n\nThank you for registering at our university. Your application has been received and is under review.\n\nApplication ID: ${data.applicationId}\n\nBest regards,\nAdmissions Team`
        },
        'document_upload': {
            subject: 'Document Uploaded Successfully',
            body: `Dear Student,\n\nYour document "${data.documentName}" has been successfully uploaded.\n\nPlease continue uploading remaining documents to complete your application.\n\nBest regards,\nAdmissions Team`
        },
        'status_update': {
            subject: 'Application Status Update',
            body: `Dear Student,\n\nYour application status has been updated to: ${data.status}\n\n${data.message}\n\nBest regards,\nAdmissions Team`
        },
        'payment_reminder': {
            subject: 'Payment Reminder',
            body: `Dear Student,\n\nThis is a reminder that your payment of ${data.amount} is due on ${data.dueDate}.\n\nPlease complete your payment to avoid any late fees.\n\nBest regards,\nFinance Team`
        }
    };

    const notification = notifications[type];
    console.log(`Email sent to ${recipient}:`, notification);
    
    // Show toast notification to user
    showToast(`Email notification sent: ${notification.subject}`);
}

// Modal Functions for Legal Pages
function showPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    const content = document.getElementById('privacyModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hidePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    const content = document.getElementById('privacyModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showTermsModal() {
    const modal = document.getElementById('termsModal');
    const content = document.getElementById('termsModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideTermsModal() {
    const modal = document.getElementById('termsModal');
    const content = document.getElementById('termsModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showCookieModal() {
    const modal = document.getElementById('cookieModal');
    const content = document.getElementById('cookieModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideCookieModal() {
    const modal = document.getElementById('cookieModal');
    const content = document.getElementById('cookieModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function showAccessibilityModal() {
    const modal = document.getElementById('accessibilityModal');
    const content = document.getElementById('accessibilityModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideAccessibilityModal() {
    const modal = document.getElementById('accessibilityModal');
    const content = document.getElementById('accessibilityModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

// FAQ Modal Functions
function showFAQModal() {
    const modal = document.getElementById('faqModal');
    const content = document.getElementById('faqModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideFAQModal() {
    const modal = document.getElementById('faqModal');
    const content = document.getElementById('faqModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function toggleFAQModalItem(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('i');
    
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// Program Modal Functions
function showProgramModal(title, duration, degree, description, curriculum, careers) {
    const modal = document.getElementById('programModal');
    const modalBox = document.getElementById('programModalBox');
    const titleEl = document.getElementById('programModalTitle');
    const durationEl = document.getElementById('programModalDuration');
    const degreeEl = document.getElementById('programModalDegree');
    const descriptionEl = document.getElementById('programModalDescription');
    const curriculumEl = document.getElementById('programModalCurriculum');
    const careersEl = document.getElementById('programModalCareers');
    
    titleEl.textContent = title;
    durationEl.textContent = duration;
    degreeEl.textContent = degree;
    descriptionEl.textContent = description;
    
    // Clear and populate curriculum list
    curriculumEl.innerHTML = '';
    curriculum.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        curriculumEl.appendChild(li);
    });
    
    // Clear and populate careers list
    careersEl.innerHTML = '';
    careers.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        careersEl.appendChild(li);
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalBox.classList.remove('scale-95', 'opacity-0');
        modalBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideProgramModal() {
    const modal = document.getElementById('programModal');
    const modalBox = document.getElementById('programModalBox');
    
    modalBox.classList.remove('scale-100', 'opacity-100');
    modalBox.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

// Payment Calculation Function
function updatePayment() {
    const programSelect = document.getElementById('programSelect');
    const selectedOption = programSelect.options[programSelect.selectedIndex];
    const tuition = parseInt(selectedOption.getAttribute('data-tuition')) || 0;
    
    const registrationFee = 500;
    const libraryFee = 200;
    const studentIdFee = 50;
    const labFee = tuition > 50000 ? 5000 : 2000; // Higher lab fee for expensive programs
    
    const total = tuition + registrationFee + libraryFee + studentIdFee + labFee;
    
    document.getElementById('tuitionFee').textContent = '₱' + tuition.toLocaleString();
    document.getElementById('labFee').textContent = '₱' + labFee.toLocaleString();
    document.getElementById('totalPayment').textContent = '₱' + total.toLocaleString();
}

// Section Data for Each Program
const sectionData = {
    'bs-computer-science': [
        { 
            id: '31M1', name: 'BSIT - 31M1', 
            days: 'Mon-Wed-Fri', start: '7:30 AM', end: '11:30 AM', room: 'Room 101',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Mon', start: '10:30 AM', end: '11:30 AM' },
                { code: 'CS101', day: 'Wed', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Wed', start: '10:30 AM', end: '11:30 AM' },
                { code: 'CS101', day: 'Fri', start: '7:30 AM', end: '9:00 AM' },
                { code: 'MATH101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Fri', start: '10:30 AM', end: '11:30 AM' }
            ]
        },
        { 
            id: '31M2', name: 'BSIT - 31M2', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 102',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'CS101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'CS101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'MATH101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSIT - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:30 PM', end: '9:30 PM', room: 'Room 107',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Mon', start: '8:30 PM', end: '9:30 PM' },
                { code: 'CS101', day: 'Wed', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Wed', start: '8:30 PM', end: '9:30 PM' },
                { code: 'CS101', day: 'Fri', start: '5:30 PM', end: '7:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Fri', start: '8:30 PM', end: '9:30 PM' }
            ]
        },
        { 
            id: '31E2', name: 'BSIT - 31E2', 
            days: 'Mon-Wed-Fri', start: '6:00 PM', end: '10:00 PM', room: 'Room 108',
            subjects: [
                { code: 'CS101', day: 'Mon', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Mon', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Mon', start: '9:00 PM', end: '10:00 PM' },
                { code: 'CS101', day: 'Wed', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Wed', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Wed', start: '9:00 PM', end: '10:00 PM' },
                { code: 'CS101', day: 'Fri', start: '6:00 PM', end: '7:30 PM' },
                { code: 'MATH101', day: 'Fri', start: '7:30 PM', end: '9:00 PM' },
                { code: 'ENG101', day: 'Fri', start: '9:00 PM', end: '10:00 PM' }
            ]
        }
    ],
    'bs-biotechnology': [
        { 
            id: '31M1', name: 'BSBT - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Lab 201',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BT101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BT101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'CHEM101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'MATH101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BSBT - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Lab 202',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Mon', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '12:00 PM', end: '1:00 PM' },
                { code: 'BT101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Wed', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '12:00 PM', end: '1:00 PM' },
                { code: 'BT101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'CHEM101', day: 'Fri', start: '10:30 AM', end: '12:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '12:00 PM', end: '1:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSBT - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:00 PM', end: '9:00 PM', room: 'Lab 205',
            subjects: [
                { code: 'BT101', day: 'Mon', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Mon', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Mon', start: '8:00 PM', end: '9:00 PM' },
                { code: 'BT101', day: 'Wed', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Wed', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Wed', start: '8:00 PM', end: '9:00 PM' },
                { code: 'BT101', day: 'Fri', start: '5:00 PM', end: '6:30 PM' },
                { code: 'CHEM101', day: 'Fri', start: '6:30 PM', end: '8:00 PM' },
                { code: 'MATH101', day: 'Fri', start: '8:00 PM', end: '9:00 PM' }
            ]
        }
    ],
    'bs-business-admin': [
        { 
            id: '31M1', name: 'BSBA - 31M1', 
            days: 'Mon-Wed-Fri', start: '7:30 AM', end: '11:30 AM', room: 'Room 301',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Mon', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Mon', start: '10:30 AM', end: '11:30 AM' },
                { code: 'BA101', day: 'Wed', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Wed', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Wed', start: '10:30 AM', end: '11:30 AM' },
                { code: 'BA101', day: 'Fri', start: '7:30 AM', end: '9:00 AM' },
                { code: 'ECON101', day: 'Fri', start: '9:00 AM', end: '10:30 AM' },
                { code: 'ENG101', day: 'Fri', start: '10:30 AM', end: '11:30 AM' }
            ]
        },
        { 
            id: '31M2', name: 'BSBA - 31M2', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 302',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Mon', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Mon', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BA101', day: 'Wed', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Wed', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Wed', start: '11:00 AM', end: '12:00 PM' },
                { code: 'BA101', day: 'Fri', start: '8:00 AM', end: '9:30 AM' },
                { code: 'ECON101', day: 'Fri', start: '9:30 AM', end: '11:00 AM' },
                { code: 'ENG101', day: 'Fri', start: '11:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'BSBA - 31E1', 
            days: 'Mon-Wed-Fri', start: '5:30 PM', end: '9:30 PM', room: 'Room 307',
            subjects: [
                { code: 'BA101', day: 'Mon', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Mon', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Mon', start: '8:30 PM', end: '9:30 PM' },
                { code: 'BA101', day: 'Wed', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Wed', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Wed', start: '8:30 PM', end: '9:30 PM' },
                { code: 'BA101', day: 'Fri', start: '5:30 PM', end: '7:00 PM' },
                { code: 'ECON101', day: 'Fri', start: '7:00 PM', end: '8:30 PM' },
                { code: 'ENG101', day: 'Fri', start: '8:30 PM', end: '9:30 PM' }
            ]
        }
    ],
    'md-medicine': [
        { 
            id: '31M1', name: 'MD - 31M1', 
            days: 'Mon-Fri', start: '7:00 AM', end: '4:00 PM', room: 'Medical Building 1',
            subjects: [
                { code: 'MD101', day: 'Mon', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Mon', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Mon', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Tue', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Tue', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Tue', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Wed', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Wed', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Wed', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Thu', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Thu', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Thu', start: '1:00 PM', end: '4:00 PM' },
                { code: 'MD101', day: 'Fri', start: '7:00 AM', end: '10:00 AM' },
                { code: 'MD102', day: 'Fri', start: '10:00 AM', end: '1:00 PM' },
                { code: 'MD103', day: 'Fri', start: '1:00 PM', end: '4:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'MD - 31M2', 
            days: 'Mon-Fri', start: '8:00 AM', end: '5:00 PM', room: 'Medical Building 2',
            subjects: [
                { code: 'MD101', day: 'Mon', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Mon', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Mon', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Tue', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Tue', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Tue', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Wed', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Wed', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Wed', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Thu', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Thu', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Thu', start: '2:00 PM', end: '5:00 PM' },
                { code: 'MD101', day: 'Fri', start: '8:00 AM', end: '11:00 AM' },
                { code: 'MD102', day: 'Fri', start: '11:00 AM', end: '2:00 PM' },
                { code: 'MD103', day: 'Fri', start: '2:00 PM', end: '5:00 PM' }
            ]
        }
    ],
    'bfa-fine-arts': [
        { 
            id: '31M1', name: 'BFA - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Art Studio 1',
            subjects: [
                { code: 'FA101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'FA101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'FA101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'FA102', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BFA - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Art Studio 2',
            subjects: [
                { code: 'FA101', day: 'Mon', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Mon', start: '11:00 AM', end: '1:00 PM' },
                { code: 'FA101', day: 'Wed', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Wed', start: '11:00 AM', end: '1:00 PM' },
                { code: 'FA101', day: 'Fri', start: '9:00 AM', end: '11:00 AM' },
                { code: 'FA102', day: 'Fri', start: '11:00 AM', end: '1:00 PM' }
            ]
        }
    ],
    'bs-international-relations': [
        { 
            id: '31M1', name: 'BSIR - 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 401',
            subjects: [
                { code: 'IR101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'IR101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'IR101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'POL101', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31M2', name: 'BSIR - 31M2', 
            days: 'Mon-Wed-Fri', start: '9:00 AM', end: '1:00 PM', room: 'Room 402',
            subjects: [
                { code: 'IR101', day: 'Mon', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Mon', start: '11:00 AM', end: '1:00 PM' },
                { code: 'IR101', day: 'Wed', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Wed', start: '11:00 AM', end: '1:00 PM' },
                { code: 'IR101', day: 'Fri', start: '9:00 AM', end: '11:00 AM' },
                { code: 'POL101', day: 'Fri', start: '11:00 AM', end: '1:00 PM' }
            ]
        }
    ],
    'default': [
        { 
            id: '31M1', name: 'Section 31M1', 
            days: 'Mon-Wed-Fri', start: '8:00 AM', end: '12:00 PM', room: 'Room 101',
            subjects: [
                { code: 'GEN101', day: 'Mon', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Mon', start: '10:00 AM', end: '12:00 PM' },
                { code: 'GEN101', day: 'Wed', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Wed', start: '10:00 AM', end: '12:00 PM' },
                { code: 'GEN101', day: 'Fri', start: '8:00 AM', end: '10:00 AM' },
                { code: 'GEN102', day: 'Fri', start: '10:00 AM', end: '12:00 PM' }
            ]
        },
        { 
            id: '31E1', name: 'Section 31E1', 
            days: 'Mon-Wed-Fri', start: '5:00 PM', end: '9:00 PM', room: 'Room 102',
            subjects: [
                { code: 'GEN101', day: 'Mon', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Mon', start: '7:00 PM', end: '9:00 PM' },
                { code: 'GEN101', day: 'Wed', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Wed', start: '7:00 PM', end: '9:00 PM' },
                { code: 'GEN101', day: 'Fri', start: '5:00 PM', end: '7:00 PM' },
                { code: 'GEN102', day: 'Fri', start: '7:00 PM', end: '9:00 PM' }
            ]
        }
    ]
};

// Modal Payment Calculation Function
function updateModalPayment() {
    const programSearch = document.getElementById('modalProgramSearch');
    const programList = document.getElementById('modalProgramList');
    const selectedOption = Array.from(programList.options).find(option => option.value === programSearch.value);
    
    const tuition = selectedOption ? parseInt(selectedOption.getAttribute('data-tuition')) || 0 : 0;
    
    // Update hidden select value
    const programSelect = document.getElementById('modalProgramSelect');
    programSelect.value = selectedOption ? selectedOption.getAttribute('data-value') : '';
    
    const registrationFee = 500;
    const libraryFee = 200;
    const studentIdFee = 50;
    const labFee = tuition > 50000 ? 5000 : 2000;
    
    const total = tuition + registrationFee + libraryFee + studentIdFee + labFee;
    
    document.getElementById('modalTuitionFee').textContent = '₱' + tuition.toLocaleString();
    document.getElementById('modalLabFee').textContent = '₱' + labFee.toLocaleString();
    document.getElementById('modalTotalPayment').textContent = '₱' + total.toLocaleString();
    
    // Show section selection modal if program is selected
    if (selectedOption && programSelect.value) {
        showSectionSelection(programSelect.value, programSearch.value);
    }
}

// Section Selection Modal Functions
function showSectionSelection(programValue, programName) {
    const modal = document.getElementById('sectionSelectionModal');
    const content = document.getElementById('sectionSelectionContent');
    const programNameDisplay = document.getElementById('selectedProgramName');
    const sectionOptions = document.getElementById('sectionOptions');
    
    programNameDisplay.textContent = programName;
    
    // Get sections for the selected program
    const sections = sectionData[programValue] || sectionData['default'];
    
    // Populate section options with subject tables like the reference image
    sectionOptions.innerHTML = sections.map(section => `
        <div class="border border-gray-200 rounded-lg overflow-hidden">
            <button onclick="selectSection('${section.id}', '${section.name}', '${section.days}', '${section.start} - ${section.end}', '${section.room}')" class="w-full bg-[#007dfe] text-white py-3 px-4 font-medium hover:bg-[#004b87] transition">
                Enroll to this section
            </button>
            <div class="p-4">
                <h4 class="font-bold text-[#007dfe] text-xl mb-3">${section.name}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="border border-gray-300 px-3 py-2 text-left">Subject</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Day</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Start</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">End</th>
                                <th class="border border-gray-300 px-3 py-2 text-center">Enroll</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${section.subjects.map(subject => `
                                <tr class="border-b">
                                    <td class="border border-gray-300 px-3 py-2">${subject.code}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.day}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.start}</td>
                                    <td class="border border-gray-300 px-3 py-2">${subject.end}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">
                                        <i class="fas fa-check text-green-500"></i>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-gray-500 text-sm mt-3">${section.subjects.length} Compatible Subjects</p>
                <button onclick="selectSection('${section.id}', '${section.name}', '${section.days}', '${section.start} - ${section.end}', '${section.room}')" class="w-full mt-3 bg-[#007dfe] text-white py-3 px-4 font-medium hover:bg-[#004b87] transition">
                    Enroll to this section
                </button>
            </div>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideSectionSelection() {
    const modal = document.getElementById('sectionSelectionModal');
    const content = document.getElementById('sectionSelectionContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

function selectSection(sectionId, sectionName, days, time, room) {
    const sectionSelect = document.getElementById('modalSectionSelect');
    const sectionDisplay = document.getElementById('modalSectionDisplay');
    
    sectionSelect.value = sectionId;
    sectionDisplay.value = `${sectionName} (${days}, ${time})`;
    
    hideSectionSelection();
    
    showToast(`Selected: ${sectionName} - ${days}, ${time}`, 'success');
}

// Toggle Online Payment Fields
function toggleOnlinePaymentFields() {
    const paymentMethod = document.getElementById('modalPaymentMethod').value;
    const onlineDetails = document.getElementById('onlinePaymentDetails');
    
    if (paymentMethod === 'online') {
        onlineDetails.classList.remove('hidden');
        document.getElementById('modalCardNumber').setAttribute('required', 'true');
        document.getElementById('modalCardExpiry').setAttribute('required', 'true');
        document.getElementById('modalCardCvv').setAttribute('required', 'true');
    } else {
        onlineDetails.classList.add('hidden');
        document.getElementById('modalCardNumber').removeAttribute('required');
        document.getElementById('modalCardExpiry').removeAttribute('required');
        document.getElementById('modalCardCvv').removeAttribute('required');
    }
}

// News Modal Functions
function showNewsModal(title, category, content) {
    const modal = document.getElementById('newsModal');
    const modalBox = document.getElementById('newsModalBox');
    const titleEl = document.getElementById('newsModalTitle');
    const categoryEl = document.getElementById('newsModalCategory');
    const contentEl = document.getElementById('newsModalText');
    
    titleEl.textContent = title;
    categoryEl.textContent = category;
    contentEl.textContent = content;
    
    // Set category color
    if (category === 'ACADEMIC') {
        categoryEl.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-[#007dfe] text-white';
    } else if (category === 'EVENT') {
        categoryEl.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-[#fbc707] text-[#004b87]';
    } else {
        categoryEl.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-[#007dfe] text-white';
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalBox.classList.remove('scale-95', 'opacity-0');
        modalBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideNewsModal() {
    const modal = document.getElementById('newsModal');
    const modalBox = document.getElementById('newsModalBox');
    modalBox.classList.remove('scale-100', 'opacity-100');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}
