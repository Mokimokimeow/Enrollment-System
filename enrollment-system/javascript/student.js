// Student Dashboard JavaScript

// Customize SweetAlert2 to match the landing page modal design
const Swal = window.Swal.mixin({
    customClass: {
        popup: 'rounded-xl shadow-2xl p-8 border border-gray-100 max-w-md w-full',
        title: 'text-2xl font-bold text-gray-800',
        htmlContainer: 'text-gray-600 text-sm leading-relaxed mt-2',
        confirmButton: 'bg-[#007dfe] text-white px-6 py-2.5 rounded-lg hover:bg-[#004b87] transition font-medium focus:ring-2 focus:ring-blue-300 border-none outline-none mx-2 cursor-pointer',
        cancelButton: 'bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition font-medium focus:ring-2 focus:ring-gray-300 border-none outline-none mx-2 cursor-pointer'
    },
    buttonsStyling: false
});

// Check active student session on page load
async function checkStudentSession() {
    try {
        const response = await fetch('php/api.php?action=current_user');
        const result = await response.json();
        
        if (result.success && result.user) {
            // Update dashboard profile info
            updateStudentDashboard(result.user);
            
            // Load DB grades and schedules
            loadGrades();
            loadSchedule();
        } else {
            // No active session - redirect to home/login
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Session validation error:', error);
        window.location.href = 'index.html';
    }
}

// Student Logout Functions
function logoutStudent() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('php/api.php?action=logout')
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch(() => {
                    window.location.href = 'index.html';
                });
        }
    });
}

// Navigate to Home (refresh student dashboard)
function navigateToHome() {
    window.location.reload();
}

// Load grades data from DB API
async function loadGrades() {
    const gradesTableBody = document.getElementById('gradesTableBody');
    if (!gradesTableBody) return;
    
    try {
        const response = await fetch('php/api.php?action=getGrades');
        const result = await response.json();
        
        if (result.success && result.data) {
            if (result.data.length === 0) {
                gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-gray-500">No grades available yet</td></tr>';
            } else {
                gradesTableBody.innerHTML = result.data.map(grade => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3 font-medium">${grade.subject}</td>
                        <td class="px-4 py-3 text-center">${grade.q1}</td>
                        <td class="px-4 py-3 text-center">${grade.q2}</td>
                        <td class="px-4 py-3 text-center">${grade.q3}</td>
                        <td class="px-4 py-3 text-center">${grade.q4}</td>
                        <td class="px-4 py-3 text-center font-bold">${grade.final}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold ${grade.final >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${grade.remarks}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-red-500">Failed to load grades data</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching grades:', error);
        gradesTableBody.innerHTML = '<tr class="border-b"><td colspan="7" class="px-4 py-3 text-center text-red-500">Error loading grades</td></tr>';
    }
}

// Load schedule data from DB API
async function loadSchedule() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    try {
        const response = await fetch('php/api.php?action=getSchedule');
        const result = await response.json();
        
        if (result.success && result.data) {
            days.forEach(day => {
                const daySchedule = document.getElementById(day + 'Schedule');
                if (!daySchedule) return;
                
                const classes = result.data[day] || [];
                
                if (classes.length > 0) {
                    daySchedule.innerHTML = classes.map(cls => `
                        <div class="bg-blue-50 rounded p-2 text-xs border border-blue-100 shadow-sm transition hover:shadow-md">
                            <div class="font-semibold text-gray-800">${cls.subject}</div>
                            <div class="text-gray-600 mt-1"><i class="fas fa-clock mr-1 text-[#007dfe]"></i>${cls.time}</div>
                            <div class="text-gray-500 mt-0.5"><i class="fas fa-door-open mr-1 text-green-500"></i>${cls.room}</div>
                        </div>
                    `).join('');
                } else {
                    daySchedule.innerHTML = '<p class="text-sm text-gray-500 text-center">No classes</p>';
                }
            });
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
    }
}

// Update student dashboard layout with profile
function updateStudentDashboard(data) {
    // Welcoming header with student's actual database name
    const header = document.querySelector('main h2');
    if (header) {
        header.textContent = `Welcome back, ${data.name}!`;
    }
    
    // Update academic level
    const dashboardLevel = document.getElementById('dashboardLevel');
    if (dashboardLevel) {
        if (data.level === 'junior-high') {
            dashboardLevel.textContent = 'Junior High';
        } else if (data.level === 'senior-high-11') {
            dashboardLevel.textContent = 'Grade 11';
        } else if (data.level === 'senior-high-12') {
            dashboardLevel.textContent = 'Grade 12';
        } else {
            dashboardLevel.textContent = data.level || 'Senior High';
        }
    }
    
    const dashboardStrand = document.getElementById('dashboardStrand');
    if (dashboardStrand) {
        if (data.level === 'junior-high') {
            dashboardStrand.textContent = 'Grade ' + (data.grade_level || '7');
        } else {
            dashboardStrand.textContent = data.strand ? data.strand.toUpperCase() + ' Strand' : 'N/A';
        }
    }
    
    // Update voucher status
    const dashboardVoucherStatus = document.getElementById('dashboardVoucherStatus');
    if (dashboardVoucherStatus) dashboardVoucherStatus.textContent = data.status === 'approved' ? 'Approved' : 'Pending';
    
    const dashboardVoucherType = document.getElementById('dashboardVoucherType');
    if (dashboardVoucherType) {
        if (data.voucher_eligibility === 'public-school') {
            dashboardVoucherType.textContent = 'Public Graduate';
        } else if (data.voucher_eligibility === 'private-school') {
            dashboardVoucherType.textContent = 'Private Graduate';
        } else if (data.voucher_eligibility === 'same-school') {
            dashboardVoucherType.textContent = 'AB Graduate';
        } else {
            dashboardVoucherType.textContent = 'None';
        }
    }
    
    // Update billing ledger dynamically
    const billingLedger = document.getElementById('dashboardBillingLedger');
    if (billingLedger) {
        const isSeniorHigh = data.level && data.level.toLowerCase().includes('senior');
        const voucherType = data.voucher_eligibility || '';
        
        let tuition = isSeniorHigh ? 20000 : 12000;
        let registration = 500;
        let lab = isSeniorHigh ? 1500 : 500;
        let library = isSeniorHigh ? 500 : 300;
        let idFee = 200;
        let uniform = isSeniorHigh ? 3000 : 0;
        
        let subtotal = tuition + registration + lab + library + idFee + uniform;
        let voucherDeduction = 0;
        
        if (isSeniorHigh) {
            if (voucherType === 'public-school' || voucherType === 'same-school') {
                voucherDeduction = tuition + registration + lab + library + idFee; // Full tuition + fees covered
            } else if (voucherType === 'private-school') {
                voucherDeduction = 17500; // Standard private voucher subsidy
            }
        }
        
        let totalToPay = subtotal - voucherDeduction;
        
        // Update statistics cards
        const dashboardPaymentStatus = document.getElementById('dashboardPaymentStatus');
        if (dashboardPaymentStatus) {
            dashboardPaymentStatus.textContent = '₱' + totalToPay.toLocaleString();
        }
        
        let html = `
            <div class="flex justify-between py-1">
                <span class="text-gray-600">Tuition Fee:</span>
                <span class="font-medium text-gray-800">₱${tuition.toLocaleString()}</span>
            </div>
            <div class="flex justify-between py-1">
                <span class="text-gray-600">Registration Fee:</span>
                <span class="font-medium text-gray-800">₱${registration.toLocaleString()}</span>
            </div>
            <div class="flex justify-between py-1">
                <span class="text-gray-600">Laboratory Fee:</span>
                <span class="font-medium text-gray-800">₱${lab.toLocaleString()}</span>
            </div>
            <div class="flex justify-between py-1">
                <span class="text-gray-600">Library Fee:</span>
                <span class="font-medium text-gray-800">₱${library.toLocaleString()}</span>
            </div>
            <div class="flex justify-between py-1">
                <span class="text-gray-600">Student ID Fee:</span>
                <span class="font-medium text-gray-800">₱${idFee.toLocaleString()}</span>
            </div>
        `;
        
        if (isSeniorHigh && uniform > 0) {
            html += `
                <div class="flex justify-between py-1">
                    <span class="text-gray-600">Uniform Fee:</span>
                    <span class="font-medium text-gray-800">₱${uniform.toLocaleString()}</span>
                </div>
            `;
        }
        
        if (voucherDeduction > 0) {
            html += `
                <div class="flex justify-between py-1 text-green-600">
                    <span>Voucher Subsidy:</span>
                    <span>-₱${voucherDeduction.toLocaleString()}</span>
                </div>
            `;
        }
        
        html += `
            <hr class="my-2" />
            <div class="flex justify-between font-bold text-[#007dfe] text-lg">
                <span>Total to Pay:</span>
                <span>₱${totalToPay.toLocaleString()}</span>
            </div>
        `;
        
        billingLedger.innerHTML = html;
    }
    
    const dashboardVoucherEligibility = document.getElementById('dashboardVoucherEligibility');
    if (dashboardVoucherEligibility) {
        if (data.voucher_eligibility === 'public-school') {
            dashboardVoucherEligibility.textContent = 'From Public School (Voucher Eligible)';
        } else if (data.voucher_eligibility === 'private-school') {
            dashboardVoucherEligibility.textContent = 'From Private School (No Voucher)';
        } else if (data.voucher_eligibility === 'same-school') {
            dashboardVoucherEligibility.textContent = 'AB Graduate (Apply for Voucher)';
        } else {
            dashboardVoucherEligibility.textContent = 'Not Eligible (Junior High)';
        }
    }
    
    const dashboardVoucherVerification = document.getElementById('dashboardVoucherVerification');
    if (dashboardVoucherVerification) {
        if (data.level === 'junior-high') {
            dashboardVoucherVerification.textContent = 'Not Applicable';
        } else {
            dashboardVoucherVerification.textContent = data.status === 'approved' ? 'Verified' : 'Under Verification';
        }
    }
    
    // Update progress workflows
    updateStatusWorkflow(data.status);
}

// Update status workflow progress steps
function updateStatusWorkflow(status) {
    const step1 = document.querySelector('.flex.justify-between.mt-4 .text-center:nth-child(1) div');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    const statusText = document.getElementById('currentStatusText');
    const statusPercent = document.getElementById('statusPercent');
    const statusBar = document.getElementById('statusBar');
    
    if (status === 'pending' || status === 'submitted') {
        if (step1) step1.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Submitted';
        if (statusPercent) statusPercent.textContent = '25%';
        if (statusBar) statusBar.style.width = '25%';
    } else if (status === 'under-review') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-[#007dfe] text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Under Review';
        if (statusPercent) statusPercent.textContent = '50%';
        if (statusBar) statusBar.style.width = '50%';
    } else if (status === 'approved') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Approved / Enrolled';
        if (statusPercent) statusPercent.textContent = '100%';
        if (statusBar) statusBar.style.width = '100%';
    } else if (status === 'rejected') {
        if (step1) step1.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step2) step2.className = 'w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step3) step3.className = 'w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (step4) step4.className = 'w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mx-auto mb-1';
        if (statusText) statusText.textContent = 'Current Status: Rejected';
        if (statusPercent) statusPercent.textContent = '75%';
        if (statusBar) statusBar.style.width = '75%';
    }
}

// Check active student session on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    const isDark = localStorage.getItem('darkMode') === 'enabled';
    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        if (document.body) {
            document.body.style.backgroundColor = '#1a1a2e';
            document.body.style.color = '#ffffff';
            document.body.classList.remove('bg-gray-100');
            document.body.classList.add('bg-[#1a1a2e]');
        }
    }
    checkStudentSession();
});

// Change Password Modal functions
function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const content = document.getElementById('changePasswordModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
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
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function submitChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('changeCurrentPassword').value;
    const newPassword = document.getElementById('changeNewPassword').value;
    const confirmPassword = document.getElementById('changeConfirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'New passwords do not match',
            confirmButtonColor: '#007dfe'
        });
        return;
    }
    
    if (newPassword.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'New password must be at least 6 characters',
            confirmButtonColor: '#007dfe'
        });
        return;
    }
    
    Swal.fire({
        title: 'Updating...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await fetch('php/api.php?action=change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Password updated successfully!',
                confirmButtonColor: '#007dfe'
            });
            hideChangePasswordModal();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to update password',
                confirmButtonColor: '#007dfe'
            });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again.',
            confirmButtonColor: '#007dfe'
        });
    }
}
