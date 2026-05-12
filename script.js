const state = { token: "", user: null, members: [], fees: [], payments: [], logs: [], requests: [], userDirectory: [], memberPortal: { payments: [], announcements: [], events: [], documents: [], pendingFeeBalance: 0, member: null } };
const API_BASE = "/api";
const authShell = document.getElementById("auth-shell");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const userBadge = document.getElementById("user-badge");
const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-btn");
const memberForm = document.getElementById("member-form");
const clearMemberFormBtn = document.getElementById("clear-member-form");
const memberTableBody = document.querySelector("#member-table tbody");
const feesForm = document.getElementById("fees-form");
const feesMemberSelect = document.getElementById("fees-member-id");
const feesTableBody = document.querySelector("#fees-table tbody");
const paymentForm = document.getElementById("payment-form");
const paymentMemberSelect = document.getElementById("payment-member-id");
const paymentTableBody = document.querySelector("#payment-table tbody");
const logsTableBody = document.querySelector("#logs-table tbody");
const browseForm = document.getElementById("browse-form");
const browseResetBtn = document.getElementById("browse-reset");
const browseTableBody = document.querySelector("#browse-table tbody");
const exportCsvBtn = document.getElementById("export-csv");
const exportXlsxBtn = document.getElementById("export-xlsx");
const exportPdfBtn = document.getElementById("export-pdf");
const exportPrintBtn = document.getElementById("export-print");
const profileForm = document.getElementById("profile-form");
const passwordForm = document.getElementById("password-form");
const settingsForm = document.getElementById("settings-form");
const quickProfileBtn = document.getElementById("quick-profile-btn");
const quickSettingsBtn = document.getElementById("quick-settings-btn");
const userDirectoryForm = document.getElementById("user-directory-form");
const userDirectoryResetBtn = document.getElementById("user-directory-reset");
const userDirectoryTableBody = document.querySelector("#user-directory-table tbody");
const userRequestForm = document.getElementById("user-request-form");
const userRequestsTableBody = document.querySelector("#user-requests-table tbody");
const userPaymentsTableBody = document.querySelector("#user-payments-table tbody");
const userAnnouncementsList = document.getElementById("user-announcements-list");
const userEventsList = document.getElementById("user-events-list");
const userProfileTable = document.getElementById("user-profile-table");
const profileUpdateRequestForm = document.getElementById("profile-update-request-form");
const memberDocumentUploadForm = document.getElementById("member-document-upload-form");
const downloadCertificateBtn = document.getElementById("download-certificate-btn");

const SETTINGS_KEY = "mm_settings";

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401) setLoggedOut();
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Request failed");
  return response.json();
}

async function downloadWithAuth(path, filename) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${state.token}` },
  });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const canEdit = () => state.user?.role === "admin";
const splitCSV = (v) => v.split(",").map((x) => x.trim()).filter(Boolean);
function setView(v) { views.forEach((x) => x.classList.toggle("active", x.id === v)); navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === v)); }
function applyRoleUI() {
  const role = state.user?.role || "viewer";
  document.querySelectorAll(".role-admin").forEach((el) => { el.style.display = role === "admin" ? "" : "none"; });
  document.querySelectorAll(".role-user").forEach((el) => { el.style.display = role === "admin" ? "none" : ""; });
  document.querySelectorAll(".role-all").forEach((el) => { el.style.display = ""; });
}
function setLoggedOut() { state.token = ""; state.user = null; sessionStorage.clear(); authShell.classList.remove("hidden"); appShell.classList.add("hidden"); }
function setLoggedIn(token, user) { state.token = token; state.user = user; sessionStorage.setItem("mm_token", token); sessionStorage.setItem("mm_user", JSON.stringify(user)); userBadge.textContent = `${user.username} (${user.role})`; authShell.classList.add("hidden"); appShell.classList.remove("hidden"); applyRoleUI(); }
function restoreSession() { try { const t = sessionStorage.getItem("mm_token"); const u = JSON.parse(sessionStorage.getItem("mm_user")); if (!t || !u) return false; setLoggedIn(t, u); return true; } catch { return false; } }
function applyTheme(theme) { document.documentElement.setAttribute("data-theme", theme || "light"); }
function loadSettings() {
  const defaults = { theme: "light", density: "comfortable", landingView: "dashboard", rows: "20" };
  const settings = { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
  applyTheme(settings.theme);
  document.body.classList.toggle("compact-ui", settings.density === "compact");
  document.getElementById("setting-theme").value = settings.theme;
  document.getElementById("setting-density").value = settings.density;
  document.getElementById("setting-landing-view").value = settings.landingView;
  document.getElementById("setting-rows").value = settings.rows;
  return settings;
}
function saveSettings() {
  const settings = {
    theme: document.getElementById("setting-theme").value,
    density: document.getElementById("setting-density").value,
    landingView: document.getElementById("setting-landing-view").value,
    rows: document.getElementById("setting-rows").value,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme(settings.theme);
  document.body.classList.toggle("compact-ui", settings.density === "compact");
  return settings;
}

async function uploadFile(inputId) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return "";
  const fd = new FormData();
  fd.append("file", file);
  const res = await api("/upload", { method: "POST", body: fd });
  return res.path;
}

function memberFromForm(extra = {}) {
  return {
    id: document.getElementById("member-id").value || crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    membershipNo: document.getElementById("membershipNo").value.trim(),
    nicNo: document.getElementById("nicNo").value.trim(),
    dob: document.getElementById("dob").value,
    permanentAddress: document.getElementById("permanentAddress").value.trim(),
    postalAddress: document.getElementById("postalAddress").value.trim(),
    email: document.getElementById("email").value.trim(),
    officeTelephone: document.getElementById("officeTelephone").value.trim(),
    residenceTelephone: document.getElementById("residenceTelephone").value.trim(),
    mobileTelephone: document.getElementById("mobileTelephone").value.trim(),
    yearOfQualification: document.getElementById("yearOfQualification").value.trim(),
    certificateNo: document.getElementById("certificateNo").value.trim(),
    placeOfWork: document.getElementById("placeOfWork").value.trim(),
    higherStudies: document.getElementById("higherStudies").value.trim(),
    professionalStudies: document.getElementById("professionalStudies").value.trim(),
    literaryContributions: document.getElementById("literaryContributions").value.trim(),
    socialService: document.getElementById("socialService").value.trim(),
    countriesVisited: splitCSV(document.getElementById("countriesVisited").value),
    conferencesAttended: splitCSV(document.getElementById("conferencesAttended").value),
    awardsReceived: splitCSV(document.getElementById("awardsReceived").value),
    batchYear: document.getElementById("batchYear").value.trim(),
    teachingCollege: document.getElementById("teachingCollege").value.trim(),
    district: document.getElementById("district").value.trim(),
    teachingStatus: document.getElementById("teachingStatus").value,
    ...extra,
  };
}

function resetMemberForm() { memberForm.reset(); document.getElementById("member-id").value = ""; }
function populateMemberForm(m) {
  ["member-id:id", "name:name", "membershipNo:membershipNo", "nicNo:nicNo", "dob:dob", "permanentAddress:permanentAddress", "postalAddress:postalAddress", "email:email", "officeTelephone:officeTelephone", "residenceTelephone:residenceTelephone", "mobileTelephone:mobileTelephone", "yearOfQualification:yearOfQualification", "certificateNo:certificateNo", "placeOfWork:placeOfWork", "higherStudies:higherStudies", "professionalStudies:professionalStudies", "literaryContributions:literaryContributions", "socialService:socialService", "batchYear:batchYear", "teachingCollege:teachingCollege", "district:district", "teachingStatus:teachingStatus"].forEach((s) => { const [id, key] = s.split(":"); document.getElementById(id).value = m[key] || ""; });
  document.getElementById("countriesVisited").value = (m.countriesVisited || []).join(", ");
  document.getElementById("conferencesAttended").value = (m.conferencesAttended || []).join(", ");
  document.getElementById("awardsReceived").value = (m.awardsReceived || []).join(", ");
}

function renderMemberTable(rows = state.members) {
  memberTableBody.innerHTML = "";
  rows.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m.name || "-"}</td><td>${m.membershipNo || "-"}</td><td>${m.nicNo || "-"}</td><td>${m.photoPath ? `<a href="${m.photoPath}" target="_blank">View</a>` : "-"}</td><td>${m.documentPath ? `<a href="${m.documentPath}" target="_blank">View</a>` : "-"}</td><td>${m.batchYear || "-"}</td><td>${m.placeOfWork || "-"}</td><td><button data-action="edit" data-id="${m.id}" ${canEdit() ? "" : "disabled"}>Edit</button> <button class="secondary" data-action="delete" data-id="${m.id}" ${canEdit() ? "" : "disabled"}>Delete</button></td>`;
    memberTableBody.appendChild(tr);
  });
}
function renderMemberSelects() {
  const opts = [`<option value="">-- Select Member --</option>`, ...state.members.map((m) => `<option value="${m.id}">${m.name} (${m.membershipNo})</option>`)].join("");
  feesMemberSelect.innerHTML = opts;
  paymentMemberSelect.innerHTML = opts;
}
function renderFeesTable() {
  feesTableBody.innerHTML = "";
  state.fees.forEach((f) => {
    const m = state.members.find((x) => x.id === f.memberId);
    feesTableBody.insertAdjacentHTML("beforeend", `<tr><td>${m?.name || "-"}</td><td>${f.membershipFee || "-"}</td><td>${f.subscriptionType || "-"}</td><td>${f.subscriptionAmount || "-"}</td><td>${f.paidUptoDate || "-"}</td></tr>`);
  });
}
function renderPaymentsTable() {
  paymentTableBody.innerHTML = "";
  state.payments.forEach((p) => {
    const m = state.members.find((x) => x.id === p.memberId);
    paymentTableBody.insertAdjacentHTML("beforeend", `<tr><td>${m?.name || "-"}</td><td>${p.amount}</td><td>${p.paymentDate}</td><td>${p.method || "-"}</td><td>${p.note || "-"}</td><td><button type="button" data-receipt-id="${p.id}">Receipt PDF</button></td></tr>`);
  });
}
function renderLogs() {
  logsTableBody.innerHTML = "";
  state.logs.forEach((l) => {
    logsTableBody.insertAdjacentHTML("beforeend", `<tr><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.actor}</td><td>${l.action}</td><td>${l.entity}</td><td>${l.entityId}</td></tr>`);
  });
}
function renderDashboard() {
  document.getElementById("stat-total-members").textContent = state.members.length;
  document.getElementById("stat-current-teachers").textContent = state.members.filter((m) => m.teachingStatus === "currently_teaching").length;
  document.getElementById("stat-batches").textContent = new Set(state.members.map((m) => m.batchYear).filter(Boolean)).size;
  document.getElementById("stat-fees").textContent = state.fees.length;
  document.getElementById("stat-payments").textContent = state.payments.length;
}
function renderGeneral() {
  const batchList = document.getElementById("batch-list");
  const graduatesByBatch = document.getElementById("graduates-by-batch");
  const taughtBeforeList = document.getElementById("taught-before-list");
  const currentlyTeachingList = document.getElementById("currently-teaching-list");
  batchList.innerHTML = graduatesByBatch.innerHTML = taughtBeforeList.innerHTML = currentlyTeachingList.innerHTML = "";
  const batches = [...new Set(state.members.map((m) => m.batchYear).filter(Boolean))].sort();
  batches.forEach((b) => {
    batchList.insertAdjacentHTML("beforeend", `<li>${b}</li>`);
    graduatesByBatch.insertAdjacentHTML("beforeend", `<p>${b}: ${state.members.filter((m) => m.batchYear === b).map((m) => m.name).join(", ") || "-"}</p>`);
  });
  state.members.filter((m) => m.teachingStatus === "taught_before").forEach((m) => taughtBeforeList.insertAdjacentHTML("beforeend", `<li>${m.name} - ${m.teachingCollege || "N/A"} (${m.district || "N/A"})</li>`));
  state.members.filter((m) => m.teachingStatus === "currently_teaching").forEach((m) => currentlyTeachingList.insertAdjacentHTML("beforeend", `<li>${m.name} - ${m.teachingCollege || "N/A"} (${m.district || "N/A"})</li>`));
}
async function renderReports() {
  const defaulters = await api("/reports/defaulters");
  const bc = await api("/reports/batch-country");
  document.getElementById("defaulters-list").innerHTML = defaulters.rows.map((r) => `<li>${r.name} (${r.membershipNo})</li>`).join("") || "<li>No defaulters</li>";
  document.getElementById("batch-report-list").innerHTML = bc.batchReport.map((r) => `<li>${r.name}: ${r.count}</li>`).join("");
  document.getElementById("country-report-list").innerHTML = bc.countryReport.map((r) => `<li>${r.name}: ${r.count}</li>`).join("") || "<li>No countries</li>";
}
function renderBrowseTable(rows) {
  browseTableBody.innerHTML = "";
  rows.forEach((m) => browseTableBody.insertAdjacentHTML("beforeend", `<tr><td>${m.name || "-"}</td><td>${m.membershipNo || "-"}</td><td>${m.nicNo || "-"}</td><td>${(m.countriesVisited || []).join(", ") || "-"}</td><td>${m.placeOfWork || "-"}</td><td>${m.teachingStatus || "-"}</td><td>${m.district || "-"}</td></tr>`));
}
function applyBrowseFilter() {
  const key = document.getElementById("browse-keyword").value.trim().toLowerCase();
  const country = document.getElementById("browse-country").value.trim().toLowerCase();
  const college = document.getElementById("browse-college").value.trim().toLowerCase();
  const district = document.getElementById("browse-district").value.trim().toLowerCase();
  const status = document.getElementById("browse-teaching-status").value;
  const batch = document.getElementById("browse-batch-year").value.trim();
  const award = document.getElementById("browse-award").value.trim().toLowerCase();
  const year = document.getElementById("browse-year").value.trim();
  const paymentStatus = document.getElementById("browse-payment-status").value;
  const paidMemberIds = new Set(state.payments.map((p) => p.memberId));
  const rows = state.members.filter((m) => {
    const text = [m.name, m.membershipNo, m.nicNo, m.placeOfWork, m.email, m.teachingCollege, m.district].filter(Boolean).join(" ").toLowerCase();
    return (!key || text.includes(key)) &&
      (!country || (m.countriesVisited || []).some((c) => c.toLowerCase().includes(country))) &&
      (!college || (m.teachingCollege || "").toLowerCase().includes(college)) &&
      (!district || (m.district || "").toLowerCase().includes(district)) &&
      (!status || m.teachingStatus === status) &&
      (!batch || m.batchYear === batch) &&
      (!award || (m.awardsReceived || []).some((a) => a.toLowerCase().includes(award))) &&
      (!year || m.yearOfQualification === year) &&
      (!paymentStatus || (paymentStatus === "paid" ? paidMemberIds.has(m.id) : !paidMemberIds.has(m.id)));
  });
  renderBrowseTable(rows);
}
function renderAll() {
  renderMemberTable();
  renderMemberSelects();
  renderFeesTable();
  renderPaymentsTable();
  renderLogs();
  renderDashboard();
  renderGeneral();
  renderBrowseTable(state.members);
  memberForm.querySelectorAll("input, textarea, select, button").forEach((n) => { if (n.id === "clear-member-form") return; n.disabled = !canEdit(); });
  feesForm.querySelectorAll("input, select, button").forEach((n) => (n.disabled = !canEdit()));
  paymentForm.querySelectorAll("input, select, button").forEach((n) => (n.disabled = !canEdit()));
  const profileDisabled = !state.user;
  profileForm.querySelectorAll("input, button").forEach((n) => (n.disabled = profileDisabled));
  passwordForm.querySelectorAll("input, button").forEach((n) => (n.disabled = profileDisabled));
  renderUserRequests();
  renderUserDirectory(state.userDirectory.length ? state.userDirectory : state.members);
}
async function loadAllData() { const d = await api("/data"); state.members = d.members || []; state.fees = d.fees || []; state.payments = d.payments || []; state.logs = d.logs || []; state.requests = d.requests || []; renderAll(); await renderReports(); }
function renderUserDirectory(rows) {
  userDirectoryTableBody.innerHTML = "";
  rows.forEach((m) => {
    const maskedMembership = m.membershipNo ? `${String(m.membershipNo).slice(0, 3)}***` : "-";
    userDirectoryTableBody.insertAdjacentHTML("beforeend", `<tr><td>${m.name || "-"}</td><td>${maskedMembership}</td><td>${m.placeOfWork || "-"}</td><td>${(m.countriesVisited || []).join(", ") || "-"}</td></tr>`);
  });
}
function renderUserRequests() {
  userRequestsTableBody.innerHTML = "";
  const mine = state.requests.filter((r) => r.userId === state.user?.id);
  mine.forEach((r) => {
    userRequestsTableBody.insertAdjacentHTML("beforeend", `<tr><td>${new Date(r.createdAt).toLocaleString()}</td><td>${r.subject}</td><td>${r.status}</td></tr>`);
  });
}
function renderMemberPortal() {
  const p = state.memberPortal;
  document.getElementById("user-pending-balance").textContent = p.pendingFeeBalance || 0;
  userProfileTable.innerHTML = "";
  const member = p.member || {};
  const rows = [
    ["Name", member.name || state.user?.fullName || "-"],
    ["Membership No", member.membershipNo || "-"],
    ["Email", member.email || state.user?.email || "-"],
    ["Mobile", member.mobileTelephone || "-"],
    ["Workplace", member.placeOfWork || "-"],
  ];
  rows.forEach(([k, v]) => userProfileTable.insertAdjacentHTML("beforeend", `<tr><th>${k}</th><td>${v}</td></tr>`));
  userPaymentsTableBody.innerHTML = "";
  (p.payments || []).forEach((pay) => {
    userPaymentsTableBody.insertAdjacentHTML("beforeend", `<tr><td>${pay.paymentDate}</td><td>${pay.amount}</td><td>${pay.method || "-"}</td><td><button type="button" data-receipt-id="${pay.id}">Download</button></td></tr>`);
  });
  userAnnouncementsList.innerHTML = (p.announcements || []).map((a) => `<li><strong>${a.title}</strong> - ${a.body}</li>`).join("") || "<li>No announcements</li>";
  userEventsList.innerHTML = "";
  (p.events || []).forEach((e) => {
    userEventsList.insertAdjacentHTML("beforeend", `<li><strong>${e.title}</strong> (${e.eventDate}) - ${e.description || ""} ${e.registered ? '<span class="muted">[Registered]</span>' : `<button type="button" data-event-id="${e.id}">Register</button>`}</li>`);
  });
}
async function loadUserSideData() {
  const summary = await api("/user/summary");
  document.getElementById("user-stat-role").textContent = summary.role || "-";
  document.getElementById("user-stat-members").textContent = summary.totalMembers || 0;
  document.getElementById("user-stat-requests").textContent = summary.openRequests || 0;
  const directory = await api("/user/directory");
  state.userDirectory = directory.rows || [];
  const reqs = await api("/user/requests");
  state.requests = reqs.rows || [];
  const portal = await api("/member/portal");
  state.memberPortal = portal || state.memberPortal;
  renderUserDirectory(state.userDirectory);
  renderUserRequests();
  renderMemberPortal();
}
async function loadProfile() {
  const data = await api("/profile");
  state.user = { ...state.user, ...data.user };
  sessionStorage.setItem("mm_user", JSON.stringify(state.user));
  userBadge.textContent = `${state.user.username} (${state.user.role})`;
  document.getElementById("profile-username").value = state.user.username || "";
  document.getElementById("profile-role").value = state.user.role || "";
  document.getElementById("profile-full-name").value = state.user.fullName || "";
  document.getElementById("profile-email").value = state.user.email || "";
  document.getElementById("profile-phone").value = state.user.phone || "";
}

memberForm.addEventListener("submit", async (e) => {
  e.preventDefault(); if (!canEdit()) return;
  const photoPath = await uploadFile("memberPhoto").catch(() => "");
  const documentPath = await uploadFile("memberDocument").catch(() => "");
  const current = state.members.find((m) => m.id === document.getElementById("member-id").value);
  await api("/members", { method: "POST", body: JSON.stringify(memberFromForm({ photoPath: photoPath || current?.photoPath || "", documentPath: documentPath || current?.documentPath || "" })) });
  resetMemberForm(); await loadAllData();
});
clearMemberFormBtn.addEventListener("click", resetMemberForm);
memberTableBody.addEventListener("click", async (e) => {
  const t = e.target; if (!(t instanceof HTMLElement)) return;
  const id = t.dataset.id; if (!id) return; const m = state.members.find((x) => x.id === id); if (!m) return;
  if (t.dataset.action === "edit") { populateMemberForm(m); setView("members"); }
  if (t.dataset.action === "delete" && canEdit()) { await api(`/members/${id}`, { method: "DELETE" }); await loadAllData(); }
});
feesForm.addEventListener("submit", async (e) => {
  e.preventDefault(); if (!canEdit()) return;
  await api("/fees", { method: "POST", body: JSON.stringify({ memberId: document.getElementById("fees-member-id").value, membershipFee: document.getElementById("membershipFee").value, subscriptionType: document.getElementById("subscriptionType").value, subscriptionAmount: document.getElementById("subscriptionAmount").value, paidUptoDate: document.getElementById("paidUptoDate").value }) });
  feesForm.reset(); await loadAllData();
});
paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault(); if (!canEdit()) return;
  await api("/payments", { method: "POST", body: JSON.stringify({ memberId: document.getElementById("payment-member-id").value, amount: document.getElementById("payment-amount").value, paymentDate: document.getElementById("payment-date").value, method: document.getElementById("payment-method").value, note: document.getElementById("payment-note").value }) });
  paymentForm.reset(); await loadAllData();
});
paymentTableBody.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const receiptId = t.dataset.receiptId;
  if (!receiptId) return;
  try {
    await downloadWithAuth(`/payments/${receiptId}/receipt.pdf`, `receipt-${receiptId}.pdf`);
  } catch (error) {
    alert(error.message);
  }
});
browseForm.addEventListener("submit", (e) => { e.preventDefault(); applyBrowseFilter(); });
browseResetBtn.addEventListener("click", () => { browseForm.reset(); renderBrowseTable(state.members); });
userDirectoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const key = document.getElementById("user-directory-keyword").value.trim().toLowerCase();
  const country = document.getElementById("user-directory-country").value.trim().toLowerCase();
  const rows = state.userDirectory.filter((m) => {
    const text = [m.name, m.membershipNo, m.placeOfWork].filter(Boolean).join(" ").toLowerCase();
    return (!key || text.includes(key)) && (!country || (m.countriesVisited || []).some((c) => c.toLowerCase().includes(country)));
  });
  renderUserDirectory(rows);
});
userDirectoryResetBtn.addEventListener("click", () => {
  userDirectoryForm.reset();
  renderUserDirectory(state.userDirectory);
});
userRequestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await api("/user/requests", {
    method: "POST",
    body: JSON.stringify({
      subject: document.getElementById("user-request-subject").value.trim(),
      message: document.getElementById("user-request-message").value.trim(),
    }),
  });
  userRequestForm.reset();
  await loadUserSideData();
});
profileUpdateRequestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await api("/member/profile-update-request", {
    method: "POST",
    body: JSON.stringify({
      fullName: document.getElementById("request-full-name").value.trim(),
      email: document.getElementById("request-email").value.trim(),
      phone: document.getElementById("request-phone").value.trim(),
      message: document.getElementById("request-message").value.trim(),
    }),
  });
  profileUpdateRequestForm.reset();
  alert("Profile update request submitted");
});
memberDocumentUploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("member-document-file").files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("docType", document.getElementById("member-document-type").value);
  await api("/member/documents", { method: "POST", body: fd });
  memberDocumentUploadForm.reset();
  await loadUserSideData();
});
downloadCertificateBtn.addEventListener("click", async () => {
  try { await downloadWithAuth("/member/certificate.pdf", "membership-certificate.pdf"); } catch (error) { alert(error.message); }
});
userPaymentsTableBody.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const receiptId = t.dataset.receiptId;
  if (!receiptId) return;
  try { await downloadWithAuth(`/payments/${receiptId}/receipt.pdf`, `receipt-${receiptId}.pdf`); } catch (error) { alert(error.message); }
});
userEventsList.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const eventId = t.dataset.eventId;
  if (!eventId) return;
  await api(`/member/events/${eventId}/register`, { method: "POST" });
  await loadUserSideData();
});
navButtons.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
quickProfileBtn.addEventListener("click", () => setView("profile"));
quickSettingsBtn.addEventListener("click", () => setView("settings"));
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ username: document.getElementById("login-username").value.trim(), password: document.getElementById("login-password").value.trim() }) });
  setLoggedIn(data.token, data.user); await loadAllData();
});
logoutBtn.addEventListener("click", setLoggedOut);
exportCsvBtn.addEventListener("click", async () => {
  try { await downloadWithAuth("/export/members.csv", "members.csv"); } catch (error) { alert(error.message); }
});
exportXlsxBtn.addEventListener("click", async () => {
  try { await downloadWithAuth("/export/members.xlsx", "members.xlsx"); } catch (error) { alert(error.message); }
});
exportPdfBtn.addEventListener("click", async () => {
  try { await downloadWithAuth("/export/members.pdf", "members.pdf"); } catch (error) { alert(error.message); }
});
exportPrintBtn.addEventListener("click", () => window.print());
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveSettings();
  alert("Settings saved");
});
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await api("/profile", {
    method: "PUT",
    body: JSON.stringify({
      fullName: document.getElementById("profile-full-name").value.trim(),
      email: document.getElementById("profile-email").value.trim(),
      phone: document.getElementById("profile-phone").value.trim(),
    }),
  });
  await loadProfile();
  alert("Profile updated");
});
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/profile/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: document.getElementById("current-password").value,
        newPassword: document.getElementById("new-password").value,
      }),
    });
    passwordForm.reset();
    alert("Password changed");
  } catch (error) {
    alert(error.message);
  }
});
(async function bootstrap() {
  const settings = loadSettings();
  if (!restoreSession()) return setLoggedOut();
  applyRoleUI();
  await loadAllData();
  await loadProfile();
  await loadUserSideData();
  setView(state.user?.role === "admin" ? (settings.landingView || "dashboard") : "user-home");
})();
