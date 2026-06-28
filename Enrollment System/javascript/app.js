// Data Storage
let students = JSON.parse(localStorage.getItem('students')) || [];
let courses = JSON.parse(localStorage.getItem('courses')) || [
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science', description: 'Learn the basics of programming and computer science concepts' },
    { id: 2, code: 'MATH201', name: 'Calculus I', description: 'Differential and integral calculus fundamentals' },
    { id: 3, code: 'ENG102', name: 'English Composition', description: 'Academic writing and critical thinking skills' },
    { id: 4, code: 'PHY101', name: 'Physics Fundamentals', description: 'Introduction to mechanics and thermodynamics' },
    { id: 5, code: 'BIO201', name: 'Biology I', description: 'Cell biology and genetics' }
];
let enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show welcome page initially
    showWelcome();
    
    loadStudentSelect();
    renderCourses();
    updateAdminDashboard();
    
    // Registration form handler
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
    
    // Student select change handler
    document.getElementById('studentSelect').addEventListener('change', handleStudentSelect);
    
    // Register modal form handler
    document.getElementById('registerModalForm').addEventListener('submit', handleModalRegistration);
    
    // Start auto slider
    startAutoSlider();
    
    // Add event listener to Enroll Now button in slide 2
    setTimeout(() => {
        const enrollButton = document.getElementById('enrollNowButton');
        if (enrollButton) {
            enrollButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Enroll Now button clicked via event listener');
                showRegisterModal();
                return false;
            });
            console.log('Enroll Now button event listener attached');
        } else {
            console.log('Enroll Now button not found');
        }
    }, 1000);
});

// Show Welcome Page
function showWelcome() {
    document.getElementById('welcomeNav').classList.remove('hidden');
    document.getElementById('mainNav').classList.add('hidden');
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById('welcome').classList.remove('hidden');
    
    // Restart auto-slider if it was stopped
    stopAutoSlider();
    startAutoSlider();
}

// Enter System
function enterSystem() {
    document.getElementById('welcomeNav').classList.add('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    document.getElementById('welcome').classList.add('hidden');
    showSection('home');
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    
    if (sectionId === 'enroll') {
        loadStudentSelect();
        renderCourses();
    } else if (sectionId === 'admin') {
        updateAdminDashboard();
    }
}

// Admin Tabs
function showAdminTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        tab.classList.add('text-gray-500');
    });
    event.target.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    event.target.classList.remove('text-gray-500');
    
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(tabId + 'Tab').classList.remove('hidden');
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
function handleRegistration(e) {
    e.preventDefault();
    
    const student = {
        id: Date.now(),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value,
        address: document.getElementById('address').value,
        registeredDate: new Date().toISOString()
    };
    
    students.push(student);
    saveData();
    
    document.getElementById('registrationForm').reset();
    showToast('Student registered successfully!');
    showSection('home');
}

// Load Student Select
function loadStudentSelect() {
    const select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">-- Select a student --</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.fullName;
        select.appendChild(option);
    });
}

// Handle Student Select
function handleStudentSelect(e) {
    const studentId = parseInt(e.target.value);
    renderEnrolledCourses(studentId);
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
function updateAdminDashboard() {
    // Update stats
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalEnrollments').textContent = enrollments.length;
    document.getElementById('totalCourses').textContent = courses.length;
    
    // Render students table
    renderStudentsTable();
    
    // Render enrollments table
    renderEnrollmentsTable();
    
    // Render courses table
    renderCoursesTable();
}

// Render Students Table
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-800">${student.id}</td>
            <td class="px-4 py-3 text-gray-800">${student.fullName}</td>
            <td class="px-4 py-3 text-gray-800">${student.email}</td>
            <td class="px-4 py-3 text-gray-800">${student.phone}</td>
            <td class="px-4 py-3">
                <button onclick="deleteStudent(${student.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                    Delete
                </button>
            </td>
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
        saveData();
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
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('courses', JSON.stringify(courses));
    localStorage.setItem('enrollments', JSON.stringify(enrollments));
}

// Register Modal Functions
function showRegisterModal() {
    console.log('showRegisterModal called');
    const modal = document.getElementById('registerModal');
    const content = document.getElementById('registerModalContent');
    
    console.log('Modal element:', modal);
    console.log('Content element:', content);
    console.log('Modal exists:', !!modal);
    console.log('Content exists:', !!content);
    
    if (!modal) {
        console.error('Modal element not found!');
        return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    console.log('Modal classes after:', modal.className);
    console.log('Modal display:', window.getComputedStyle(modal).display);
    
    // Trigger animation
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (content) {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }
    }, 10);
}

function hideRegisterModal() {
    const modal = document.getElementById('registerModal');
    const content = document.getElementById('registerModalContent');
    
    // Animate out
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    // Hide after animation completes
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
    
    // Validate form
    const form = document.getElementById('registerModalForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            
            // Add error message if not exists
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

function completeRegistration(paymentMethod) {
    const student = {
        id: Date.now(),
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
        program: document.getElementById('modalProgramSelect').value || document.getElementById('modalProgramSearch').value,
        section: document.getElementById('modalSectionSelect').value,
        paymentMethod: paymentMethod,
        totalPayment: document.getElementById('modalTotalPayment').textContent,
        paymentStatus: 'paid',
        registeredDate: new Date().toISOString()
    };
    
    students.push(student);
    saveData();
    
    hideRegistrationConfirmation();
    document.getElementById('registerModalForm').reset();
    
    // Reset online payment fields visibility
    document.getElementById('onlinePaymentDetails').classList.add('hidden');
    document.getElementById('modalCardNumber').removeAttribute('required');
    document.getElementById('modalCardExpiry').removeAttribute('required');
    document.getElementById('modalCardCvv').removeAttribute('required');
    
    hideRegisterModal();
    
    if (paymentMethod === 'online') {
        showToast('Payment successful! Enrollment complete. Welcome to our university.', 'success');
    } else {
        showToast('Enrollment successful! Please proceed to the cashier for payment. Welcome to our university.', 'success');
    }
}

// Slider Functions
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.slider-dot');
const progressBar = document.getElementById('sliderProgress');
let sliderInterval;

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

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.remove('translate-y-20', 'opacity-0');
        scrollTopBtn.classList.add('translate-y-0', 'opacity-100');
    } else {
        scrollTopBtn.classList.add('translate-y-20', 'opacity-0');
        scrollTopBtn.classList.remove('translate-y-0', 'opacity-100');
    }
});

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
