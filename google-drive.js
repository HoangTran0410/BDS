// Google Drive API Configuration
const GOOGLE_CONFIG = {
  CLIENT_ID:
    "460725726110-euiej8okd5hfjdd2sm49guatamd10p9j.apps.googleusercontent.com", // Thay bằng Client ID của bạn
  API_KEY: "AIzaSyCQfa_vuzm_u-Z58yGPSP6u2lczWeEQ7SE", // Thay bằng API Key của bạn (đã restrict domain + API)
  SCOPES:
    "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile",
  DISCOVERY_DOCS: [
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  ],
};

let googleAccessToken = null;
let googleUser = null;
let gapiInited = false;
let gisInited = false;
let tokenClient = null;

// Initialize Google API
function initGoogleAPI() {
  loadGoogleConfig();

  if (!GOOGLE_CONFIG.CLIENT_ID || !GOOGLE_CONFIG.API_KEY) {
    console.log("Google API chưa được cấu hình");
    return;
  }

  gapi.load("client", initializeGapiClient);
}

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: GOOGLE_CONFIG.API_KEY,
      discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
  } catch (error) {
    console.error("Error initializing GAPI client:", error);

    // Show error banner on page
    showErrorBanner();

    // Show error notification
    showNotification(
      "Lỗi cấu hình Google Drive API! Vui lòng kiểm tra lại Client ID và API Key.",
      "error"
    );

    // Clear invalid config
    localStorage.removeItem("googleDriveConfig");
    GOOGLE_CONFIG.CLIENT_ID = "";
    GOOGLE_CONFIG.API_KEY = "";

    // Enable button to allow reconfiguration
    const btn = document.getElementById("googleDriveBtn");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fab fa-google-drive"></i><span>Cấu hình lại Drive</span>';
    }
  }
}

function showErrorBanner() {
  // Remove existing banner if any
  const existingBanner = document.getElementById("googleErrorBanner");
  if (existingBanner) existingBanner.remove();

  // Create error banner
  const banner = document.createElement("div");
  banner.id = "googleErrorBanner";
  banner.className =
    "fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 shadow-lg z-50";
  banner.innerHTML = `
        <div class="container mx-auto max-w-7xl flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i class="fas fa-exclamation-circle text-2xl"></i>
                <div>
                    <p class="font-semibold">Lỗi cấu hình Google Drive API</p>
                    <p class="text-sm">API Key hoặc Client ID không hợp lệ. Vui lòng kiểm tra lại.</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="showGoogleConfig()" class="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                    Cấu hình lại
                </button>
                <button onclick="document.getElementById('googleErrorBanner').remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
        </div>
    `;
  document.body.prepend(banner);
}

function initGIS() {
  if (!GOOGLE_CONFIG.CLIENT_ID) return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    scope: GOOGLE_CONFIG.SCOPES,
    callback: async (tokenResponse) => {
      googleAccessToken = tokenResponse.access_token;
      gapi.client.setToken({ access_token: googleAccessToken });

      // Get user info
      getUserInfo();

      // Save token
      localStorage.setItem("googleAccessToken", googleAccessToken);
      updateGoogleUI(true);

      // Restore data from Drive first (if exists)
      await restoreDataFromDrive();

      // Then sync current data to Drive
      syncDataToDrive();

      showNotification("Đã kết nối Google Drive!", "success");
    },
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  const btn = document.getElementById("googleDriveBtn");
  if (!btn) return;

  if (gapiInited && gisInited) {
    btn.disabled = false;

    // Check if already logged in
    const savedToken = localStorage.getItem("googleAccessToken");
    const savedUser = localStorage.getItem("googleUser");

    if (savedToken && savedUser) {
      googleAccessToken = savedToken;
      googleUser = JSON.parse(savedUser);
      gapi.client.setToken({ access_token: savedToken });

      // Update UI immediately
      updateGoogleUI(true);

      // Verify token is still valid by getting user info
      getUserInfo()
        .then(async () => {
          // Token is valid, restore data from Drive
          await restoreDataFromDrive();
        })
        .catch(() => {
          console.log("Token expired or invalid, clearing...");
          // Token expired, clear everything
          localStorage.removeItem("googleAccessToken");
          localStorage.removeItem("googleUser");
          googleAccessToken = null;
          googleUser = null;
          gapi.client.setToken("");
          updateGoogleUI(false);

          // Show notification
          showNotification(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            "warning"
          );
        });
    }
  }
}

async function getUserInfo() {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();
    googleUser = user;

    localStorage.setItem("googleUser", JSON.stringify(user));
    updateGoogleUI(true);

    // Remove error banner if exists
    const errorBanner = document.getElementById("googleErrorBanner");
    if (errorBanner) errorBanner.remove();
  } catch (error) {
    console.error("Error getting user info:", error);
    // Token might be expired, clear everything
    throw error;
  }
}

function updateGoogleUI(loggedIn) {
  const btn = document.getElementById("googleDriveBtn");
  const userInfo = document.getElementById("userInfo");

  if (loggedIn && googleUser) {
    btn.classList.add("hidden");
    userInfo.classList.remove("hidden");
    document.getElementById("userAvatar").src = googleUser.picture || "";
    document.getElementById("userName").textContent =
      googleUser.name || googleUser.email;
  } else {
    btn.classList.remove("hidden");
    userInfo.classList.add("hidden");
  }
}

function handleGoogleDriveAuth() {
  if (!GOOGLE_CONFIG.CLIENT_ID || !GOOGLE_CONFIG.API_KEY) {
    showGoogleConfig();
    return;
  }

  if (!tokenClient) {
    showNotification(
      "Google API chưa sẵn sàng. Vui lòng đợi hoặc tải lại trang.",
      "warning"
    );
    return;
  }

  // Always request with consent to ensure we get all scopes
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    // Re-request to get new scopes if needed
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

function signOutGoogle() {
  if (!confirm("Bạn có chắc muốn đăng xuất Google Drive?")) return;

  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
  }

  googleAccessToken = null;
  googleUser = null;
  localStorage.removeItem("googleAccessToken");
  localStorage.removeItem("googleUser");

  updateGoogleUI(false);
  showNotification("Đã đăng xuất Google Drive", "info");
}

// Get or create folder in Drive
async function getOrCreateFolder(folderName, parentId = null) {
  try {
    // Build query
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    // Search for existing folder
    const searchResponse = await gapi.client.drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (searchResponse.result.files && searchResponse.result.files.length > 0) {
      return searchResponse.result.files[0].id;
    }

    // Create new folder if not exists
    const resource = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (parentId) {
      resource.parents = [parentId];
    }

    const createResponse = await gapi.client.drive.files.create({
      resource: resource,
      fields: "id",
    });

    return createResponse.result.id;
  } catch (error) {
    console.error("Error creating folder:", error);
    return null;
  }
}

// Upload file to Google Drive
async function uploadFileToDrive(file, fileName, mimeType) {
  if (!googleAccessToken) {
    showNotification("Vui lòng đăng nhập Google Drive trước!", "warning");
    return null;
  }

  try {
    // Get or create root folder "BDS Manager"
    if (!rootFolderId) {
      rootFolderId = await getOrCreateFolder("BDS Manager");
    }

    // Determine subfolder based on file type
    const isImage = file.type.startsWith("image/");
    const subFolderName = isImage ? "Images" : "Videos";

    // Get or create subfolder inside BDS Manager
    let folderId = isImage ? imageFolderId : videoFolderId;
    if (!folderId) {
      folderId = await getOrCreateFolder(subFolderName, rootFolderId);
      if (isImage) {
        imageFolderId = folderId;
      } else {
        videoFolderId = folderId;
      }
    }

    // Create metadata
    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: folderId ? [folderId] : ["root"],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
        body: form,
      }
    );

    const result = await response.json();

    if (result.id) {
      // Make file public
      await makeFilePublic(result.id);

      // Use thumbnail link that works with CORS
      // For images: use thumbnail URL that's embeddable
      const directLink = isImage
        ? `https://drive.google.com/thumbnail?id=${result.id}&sz=w1000`
        : `https://drive.google.com/file/d/${result.id}/preview`;

      return directLink;
    }

    return null;
  } catch (error) {
    console.error("Error uploading to Drive:", error);
    showNotification("Lỗi upload lên Drive!", "error");
    return null;
  }
}

async function makeFilePublic(fileId) {
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );
  } catch (error) {
    console.error("Error making file public:", error);
  }
}

// Global arrays to store uploaded files
let uploadedImages = [];
let uploadedVideos = [];

// Folder IDs cache
let rootFolderId = null; // Main BDS Manager folder
let imageFolderId = null;
let videoFolderId = null;

// Handle multiple image uploads
async function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  if (!googleAccessToken) {
    showNotification("Vui lòng đăng nhập Google Drive trước!", "warning");
    handleGoogleDriveAuth();
    return;
  }

  const statusEl = document.getElementById("imageUploadStatus");
  statusEl.textContent = `Đang upload ${files.length} ảnh...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusEl.textContent = `Đang upload ảnh ${i + 1}/${files.length}...`;

    // Upload to Drive
    const fileName = `bds_image_${Date.now()}_${file.name}`;
    const link = await uploadFileToDrive(file, fileName, file.type);

    if (link) {
      uploadedImages.push(link);
      addImageToGallery(link);
    }
  }

  statusEl.textContent = `Upload thành công ${files.length} ảnh!`;
  showNotification(`Upload thành công ${files.length} ảnh!`, "success");
  event.target.value = ""; // Reset input
}

function addImageToGallery(imageUrl) {
  const gallery = document.getElementById("imageGallery");
  const imageCard = document.createElement("div");
  imageCard.className = "relative group";
  imageCard.innerHTML = `
    <img src="${imageUrl}" class="w-full h-24 object-cover rounded-lg border-2 border-gray-200" alt="Property image">
    <button type="button" onclick="removeImage('${imageUrl}')"
      class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;
  gallery.appendChild(imageCard);
}

function removeImage(imageUrl) {
  uploadedImages = uploadedImages.filter((url) => url !== imageUrl);
  renderImageGallery();
}

function renderImageGallery() {
  const gallery = document.getElementById("imageGallery");
  gallery.innerHTML = "";
  uploadedImages.forEach((url) => addImageToGallery(url));
}

// Handle multiple video uploads
async function handleVideoUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  if (!googleAccessToken) {
    showNotification("Vui lòng đăng nhập Google Drive trước!", "warning");
    handleGoogleDriveAuth();
    return;
  }

  const statusEl = document.getElementById("videoUploadStatus");
  statusEl.textContent = `Đang upload ${files.length} video...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusEl.textContent = `Đang upload video ${i + 1}/${files.length}...`;

    // Upload to Drive
    const fileName = `bds_video_${Date.now()}_${file.name}`;
    const link = await uploadFileToDrive(file, fileName, file.type);

    if (link) {
      uploadedVideos.push(link);
      addVideoToGallery(link);
    }
  }

  statusEl.textContent = `Upload thành công ${files.length} video!`;
  showNotification(`Upload thành công ${files.length} video!`, "success");
  event.target.value = ""; // Reset input
}

function addVideoToGallery(videoUrl) {
  const gallery = document.getElementById("videoGallery");
  const videoCard = document.createElement("div");
  videoCard.className =
    "relative group bg-gray-50 border-2 border-gray-200 rounded-lg p-3 flex items-center gap-2";
  videoCard.innerHTML = `
    <i class="fas fa-video text-red-500 text-xl"></i>
    <a href="${videoUrl}" target="_blank" class="flex-1 text-blue-600 hover:underline text-sm truncate">
      ${videoUrl.split("/").pop() || "Video"}
    </a>
    <button type="button" onclick="removeVideo('${videoUrl}')"
      class="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition flex-shrink-0">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;
  gallery.appendChild(videoCard);
}

function removeVideo(videoUrl) {
  uploadedVideos = uploadedVideos.filter((url) => url !== videoUrl);
  renderVideoGallery();
}

function renderVideoGallery() {
  const gallery = document.getElementById("videoGallery");
  gallery.innerHTML = "";
  uploadedVideos.forEach((url) => addVideoToGallery(url));
}

// Sync data JSON to Drive
async function syncDataToDrive() {
  if (!googleAccessToken || bdsData.length === 0) return;

  try {
    // Get or create root folder "BDS Manager"
    if (!rootFolderId) {
      rootFolderId = await getOrCreateFolder("BDS Manager");
    }

    const dataStr = JSON.stringify(bdsData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const file = new File([blob], "bds_data_backup.json", {
      type: "application/json",
    });

    // Check if backup file exists in BDS Manager folder
    const existingFileId = await findFileByName(
      "bds_data_backup.json",
      rootFolderId
    );

    if (existingFileId) {
      // Update existing file
      await updateFileToDrive(existingFileId, file);
    } else {
      // Create new file in BDS Manager folder
      await uploadJSONToDrive(file, "bds_data_backup.json", rootFolderId);
    }

    console.log("Data synced to Drive");
  } catch (error) {
    console.error("Error syncing to Drive:", error);
  }
}

// Restore data from Google Drive
async function restoreDataFromDrive() {
  if (!googleAccessToken) {
    console.log("No Google access token");
    return;
  }

  try {
    // Get or create root folder "BDS Manager"
    if (!rootFolderId) {
      rootFolderId = await getOrCreateFolder("BDS Manager");
    }

    // Find backup file
    const fileId = await findFileByName("bds_data_backup.json", rootFolderId);

    if (!fileId) {
      console.log("No backup file found on Drive");
      showNotification("Không tìm thấy file backup trên Drive", "info");
      return;
    }

    // Download file content
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: "media",
    });

    if (response.body) {
      const driveData = JSON.parse(response.body);

      if (!Array.isArray(driveData)) {
        throw new Error("Invalid backup format");
      }

      // Get current local data
      const localData = bdsData || [];

      // Merge strategy: Drive data takes priority, but keep local items not in Drive
      const driveIds = new Set(driveData.map((item) => item.id));
      const localOnlyItems = localData.filter((item) => !driveIds.has(item.id));

      // Combine: Drive data + local-only items
      bdsData = [...driveData, ...localOnlyItems];

      // Save merged data to localStorage
      if (typeof saveToLocalStorage === "function") {
        saveToLocalStorage();
      } else {
        localStorage.setItem("bdsData", JSON.stringify(bdsData));
      }

      // Update UI
      if (typeof filterData === "function") {
        filterData();
      }
      if (typeof updateStatistics === "function") {
        updateStatistics();
      }

      console.log(`Restored ${driveData.length} items from Drive`);
      showNotification(
        `Đã khôi phục ${driveData.length} BĐS từ Google Drive!`,
        "success"
      );

      return driveData;
    }
  } catch (error) {
    console.error("Error restoring from Drive:", error);
    showNotification("Lỗi khi tải dữ liệu từ Drive!", "error");
  }
}

async function findFileByName(fileName, parentId = null) {
  try {
    let query = `name='${fileName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await gapi.client.drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (response.result.files && response.result.files.length > 0) {
      return response.result.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding file:", error);
    return null;
  }
}

async function uploadJSONToDrive(file, fileName, parentId) {
  try {
    const metadata = {
      name: fileName,
      mimeType: "application/json",
      parents: parentId ? [parentId] : ["root"],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
        body: form,
      }
    );

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error("Error uploading JSON:", error);
    return null;
  }
}

async function updateFileToDrive(fileId, file) {
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: e.target.result,
        }
      );
    };
    reader.readAsText(file);
  } catch (error) {
    console.error("Error updating file:", error);
  }
}

// Load/Save Google Config
function loadGoogleConfig() {
  const config = localStorage.getItem("googleDriveConfig");
  console.log(config);
  if (config) {
    const { clientId, apiKey } = JSON.parse(config);
    GOOGLE_CONFIG.CLIENT_ID = clientId || "";
    GOOGLE_CONFIG.API_KEY = apiKey || "";

    // Only set values if elements exist (in modal)
    const clientIdEl = document.getElementById("googleClientId");
    const apiKeyEl = document.getElementById("googleApiKey");
    if (clientIdEl) clientIdEl.value = clientId || "";
    if (apiKeyEl) apiKeyEl.value = apiKey || "";
  }

  // User info will be restored in maybeEnableButtons()
  // when both gapi and gis are ready
}

function showGoogleConfig() {
  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="bg-red-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center sticky top-0">
                <h2 class="text-xl font-bold">Cấu hình Google Drive API</h2>
                <button onclick="this.closest('.modal').remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="p-6">
                <div class="mb-4 bg-blue-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-700 mb-2"><strong>Hướng dẫn setup (cần CẢ HAI loại credentials):</strong></p>
                    <ol class="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                        <li>Truy cập <a href="https://console.cloud.google.com" target="_blank" class="text-blue-600 hover:underline">Google Cloud Console</a></li>
                        <li>Tạo project mới hoặc chọn project có sẵn</li>
                        <li>Vào "APIs & Services" → "Enable APIs and Services" → Tìm và enable "<strong>Google Drive API</strong>"</li>
                        <li class="font-semibold text-gray-700">Tạo OAuth 2.0 Client ID (để đăng nhập):
                            <ul class="ml-6 mt-1 space-y-1 list-disc">
                                <li>Vào "Credentials" → "Create Credentials" → "OAuth client ID"</li>
                                <li>Application type: <strong>Web application</strong></li>
                                <li>Authorized JavaScript origins: <code class="bg-gray-200 px-1">http://localhost</code> (hoặc domain thực)</code></li>
                                <li>Copy <strong>Client ID</strong> (dạng: xxx.apps.googleusercontent.com)</li>
                            </ul>
                        </li>
                        <li class="font-semibold text-gray-700">Tạo API Key (để gọi API):
                            <ul class="ml-6 mt-1 space-y-1 list-disc">
                                <li>Vào "Credentials" → "Create Credentials" → "<strong>API key</strong>"</li>
                                <li>Copy <strong>API Key</strong> (bắt đầu với <span class="text-red-600 font-semibold">AIza...</span>)</li>
                                <li><strong class="text-red-600">KHÔNG phải Client Secret!</strong></li>
                            </ul>
                        </li>
                    </ol>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">Client ID *</label>
                    <input type="text" id="googleClientId" placeholder="123456789.apps.googleusercontent.com"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                    <p class="text-xs text-gray-500 mt-1">Kết thúc bằng .apps.googleusercontent.com</p>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">API Key *</label>
                    <input type="text" id="googleApiKey" placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                    <p class="text-xs text-red-500 mt-1"><strong>Lưu ý:</strong> Không phải Client Secret! API Key bắt đầu bằng "AIza..."</p>
                </div>
                <button onclick="saveGoogleConfig(); this.closest('.modal').remove();"
                    class="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold">
                    Lưu cấu hình
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(modal);

  loadGoogleConfig();
}

function saveGoogleConfig() {
  const clientId = document.getElementById("googleClientId").value.trim();
  const apiKey = document.getElementById("googleApiKey").value.trim();

  if (!clientId || !apiKey) {
    showNotification("Vui lòng điền đầy đủ thông tin!", "warning");
    return;
  }

  // Validate format
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    showNotification(
      "Client ID không hợp lệ! Phải kết thúc bằng .apps.googleusercontent.com",
      "error"
    );
    return;
  }

  if (!apiKey.startsWith("AIza")) {
    showNotification(
      'API Key không hợp lệ! Phải bắt đầu bằng "AIza". Bạn có thể đang dùng nhầm Client Secret.',
      "error"
    );
    return;
  }

  localStorage.setItem(
    "googleDriveConfig",
    JSON.stringify({ clientId, apiKey })
  );

  GOOGLE_CONFIG.CLIENT_ID = clientId;
  GOOGLE_CONFIG.API_KEY = apiKey;

  showNotification(
    "Lưu cấu hình thành công! Vui lòng tải lại trang.",
    "success"
  );

  setTimeout(() => {
    location.reload();
  }, 2000);
}

// Initialize on load
// Wait for both gapi and google to be ready
window.addEventListener("load", () => {
  // Initialize Google API (gapi)
  if (typeof gapi !== "undefined") {
    initGoogleAPI();
  } else {
    console.error("Google API (gapi) not loaded");
  }

  // Initialize Google Identity Services (google.accounts)
  // This library loads async, so we need to wait for it
  const checkGoogleLoaded = setInterval(() => {
    if (typeof google !== "undefined" && google.accounts) {
      clearInterval(checkGoogleLoaded);
      initGIS();
    }
  }, 100); // Check every 100ms

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkGoogleLoaded);
    if (typeof google === "undefined" || !google.accounts) {
      console.error("Google Identity Services not loaded after 10s");
    }
  }, 10000);
});
