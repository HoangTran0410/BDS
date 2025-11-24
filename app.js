// Global State
let bdsData = [];
let filteredData = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderTable();
    updateStatistics();
});

// LocalStorage Functions
function loadFromLocalStorage() {
    const stored = localStorage.getItem('bdsData');
    if (stored) {
        bdsData = JSON.parse(stored);
        filteredData = [...bdsData];
    }
}

function saveToLocalStorage() {
    localStorage.setItem('bdsData', JSON.stringify(bdsData));

    // Auto sync to Drive if logged in
    if (typeof googleAccessToken !== 'undefined' && googleAccessToken) {
        syncDataToDrive();
    }
}

// CRUD Operations
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Thêm BĐS mới';
    document.getElementById('bdsForm').reset();
    document.getElementById('editId').value = '';

    // Clear galleries
    uploadedImages = [];
    uploadedVideos = [];
    document.getElementById('imageGallery').innerHTML = '';
    document.getElementById('videoGallery').innerHTML = '';
    document.getElementById('imageUploadStatus').textContent = '';
    document.getElementById('videoUploadStatus').textContent = '';

    document.getElementById('bdsModal').classList.add('active');
}

function closeModal() {
    document.getElementById('bdsModal').classList.remove('active');
    // Clear galleries when closing
    uploadedImages = [];
    uploadedVideos = [];
    document.getElementById('imageGallery').innerHTML = '';
    document.getElementById('videoGallery').innerHTML = '';
}

document.getElementById('bdsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        owner: document.getElementById('owner').value,
        address: document.getElementById('address').value,
        originalPrice: parseFloat(document.getElementById('originalPrice').value),
        salePrice: parseFloat(document.getElementById('salePrice').value),
        description: document.getElementById('description').value,
        images: uploadedImages.length > 0 ? uploadedImages : [],
        commission: document.getElementById('commission').value,
        status: document.getElementById('status').value,
        videos: uploadedVideos.length > 0 ? uploadedVideos : [],
        createdAt: Date.now()
    };

    const editId = document.getElementById('editId').value;

    if (editId) {
        // Update existing
        const index = bdsData.findIndex(item => item.id === editId);
        if (index !== -1) {
            bdsData[index] = { ...bdsData[index], ...formData, updatedAt: Date.now() };
        }
    } else {
        // Add new
        formData.id = 'bds_' + Date.now();
        bdsData.push(formData);
    }

    saveToLocalStorage();
    closeModal();
    filterData();
    updateStatistics();

    showNotification(editId ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success');
});

function editBDS(id) {
    const item = bdsData.find(b => b.id === id);
    if (!item) return;

    document.getElementById('modalTitle').textContent = 'Chỉnh sửa BĐS';
    document.getElementById('editId').value = item.id;
    document.getElementById('owner').value = item.owner;
    document.getElementById('address').value = item.address;
    document.getElementById('originalPrice').value = item.originalPrice;
    document.getElementById('salePrice').value = item.salePrice;
    document.getElementById('description').value = item.description || '';
    document.getElementById('commission').value = item.commission || '';
    document.getElementById('status').value = item.status;

    // Load existing images
    uploadedImages = Array.isArray(item.images) ? [...item.images] : (item.images ? [item.images] : []);
    renderImageGallery();

    // Load existing videos
    uploadedVideos = Array.isArray(item.videos) ? [...item.videos] : (item.video ? [item.video] : []);
    renderVideoGallery();

    document.getElementById('imageUploadStatus').textContent = '';
    document.getElementById('videoUploadStatus').textContent = '';

    document.getElementById('bdsModal').classList.add('active');
}

function deleteBDS(id) {
    if (!confirm('Bạn có chắc muốn xóa BĐS này?')) return;

    bdsData = bdsData.filter(item => item.id !== id);
    saveToLocalStorage();
    filterData();
    updateStatistics();
    showNotification('Xóa thành công!', 'success');
}

function viewDetail(id) {
    const item = bdsData.find(b => b.id === id);
    if (!item) return;

    const content = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Chủ nhà</p>
                    <p class="text-lg">${item.owner}</p>
                </div>
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Địa chỉ</p>
                    <p class="text-lg">${item.address}</p>
                </div>
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Giá gốc</p>
                    <p class="text-lg font-bold text-blue-600">${formatCurrency(item.originalPrice)}</p>
                </div>
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Giá đăng bán</p>
                    <p class="text-lg font-bold text-green-600">${formatCurrency(item.salePrice)}</p>
                </div>
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Hoa hồng MG</p>
                    <p class="text-lg">${item.commission || 'Chưa có'}</p>
                </div>
                <div>
                    <p class="text-gray-600 text-sm font-semibold">Tình trạng</p>
                    <p><span class="px-3 py-1 rounded-full text-sm font-semibold status-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></p>
                </div>
            </div>

            ${item.description ? `
                <div>
                    <p class="text-gray-600 text-sm font-semibold mb-2">Nội dung chi tiết</p>
                    <p class="text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">${item.description}</p>
                </div>
            ` : ''}

            ${(item.images && (Array.isArray(item.images) ? item.images.length > 0 : item.images)) ? `
                <div>
                    <p class="text-gray-600 text-sm font-semibold mb-2">Hình ảnh</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        ${(Array.isArray(item.images) ? item.images : [item.images]).map(img => `
                            <a href="${img}" target="_blank">
                                <img src="${img}" class="w-full h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition cursor-pointer" alt="Property">
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${(item.videos && (Array.isArray(item.videos) ? item.videos.length > 0 : item.videos)) || item.video ? `
                <div>
                    <p class="text-gray-600 text-sm font-semibold mb-2">Video</p>
                    <div class="space-y-2">
                        ${(Array.isArray(item.videos) ? item.videos : (item.video ? [item.video] : [])).map(vid => `
                            <div class="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 flex items-center gap-2">
                                <i class="fas fa-video text-red-500 text-xl"></i>
                                <a href="${vid}" target="_blank" class="flex-1 text-blue-600 hover:underline text-sm truncate">
                                    Xem video
                                </a>
                                <i class="fas fa-external-link-alt text-gray-400"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="flex gap-3 pt-4 border-t">
                <button onclick="editBDS('${item.id}'); document.getElementById('detailModal').classList.remove('active');"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                    <i class="fas fa-edit mr-2"></i>Chỉnh sửa
                </button>
                <button onclick="deleteBDS('${item.id}'); document.getElementById('detailModal').classList.remove('active');"
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg">
                    <i class="fas fa-trash mr-2"></i>Xóa
                </button>
            </div>
        </div>
    `;

    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').classList.add('active');
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filteredData.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = filteredData.map((item, index) => `
        <tr class="hover:bg-gray-50 transition cursor-pointer" onclick="viewDetail('${item.id}')">
            <td class="px-4 py-3">${index + 1}</td>
            <td class="px-4 py-3 font-semibold">${item.owner}</td>
            <td class="px-4 py-3 max-w-xs truncate" title="${item.address}">${item.address}</td>
            <td class="px-4 py-3 text-blue-600 font-semibold">${formatCurrency(item.originalPrice)}</td>
            <td class="px-4 py-3 text-green-600 font-semibold">${formatCurrency(item.salePrice)}</td>
            <td class="px-4 py-3">${item.commission || '-'}</td>
            <td class="px-4 py-3">
                <span class="px-3 py-1 rounded-full text-xs font-semibold status-${item.status.toLowerCase().replace(' ', '-')}">
                    ${item.status}
                </span>
            </td>
            <td class="px-4 py-3">
                <div class="flex gap-2" onclick="event.stopPropagation()">
                    <button onclick="editBDS('${item.id}')"
                        class="text-blue-600 hover:text-blue-800 p-2" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteBDS('${item.id}')"
                        class="text-red-600 hover:text-red-800 p-2" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filter Data
function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredData = bdsData.filter(item => {
        const matchSearch = !searchTerm ||
            item.owner.toLowerCase().includes(searchTerm) ||
            item.address.toLowerCase().includes(searchTerm);

        const matchStatus = !statusFilter || item.status === statusFilter;

        return matchSearch && matchStatus;
    });

    renderTable();
    updateStatistics();
}

// Statistics
function updateStatistics() {
    document.getElementById('totalCount').textContent = bdsData.length;
    document.getElementById('sellingCount').textContent = bdsData.filter(b => b.status === 'Đang bán').length;
    document.getElementById('soldCount').textContent = bdsData.filter(b => b.status === 'Đã bán').length;

    const totalValue = bdsData.reduce((sum, item) => sum + (item.salePrice || 0), 0);
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
}

// Export/Import Functions
function exportData() {
    if (bdsData.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }

    const dataStr = JSON.stringify(bdsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bds_data_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification('Xuất dữ liệu thành công!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) {
                throw new Error('Invalid format');
            }

            if (confirm(`Tìm thấy ${imported.length} BĐS. Bạn muốn:\n- OK: Gộp với dữ liệu hiện tại\n- Cancel: Thay thế toàn bộ`)) {
                // Merge: avoid duplicates by id
                const existingIds = new Set(bdsData.map(b => b.id));
                const newItems = imported.filter(item => !existingIds.has(item.id));
                bdsData = [...bdsData, ...newItems];
            } else {
                // Replace
                bdsData = imported;
            }

            saveToLocalStorage();
            filterData();
            updateStatistics();
            showNotification('Nhập dữ liệu thành công!', 'success');
        } catch (error) {
            showNotification('File không hợp lệ!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


// Utility Functions
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    // Get or create notification container
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in break-words`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => {
            notification.remove();
            // Remove container if empty
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
`;
document.head.appendChild(style);
