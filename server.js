const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const DB_PATH = path.join(__dirname, "data.sqlite");
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      fullName TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      memberId TEXT DEFAULT ''
    )
  `);
  try { await run("ALTER TABLE users ADD COLUMN fullName TEXT DEFAULT ''"); } catch {}
  try { await run("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''"); } catch {}
  try { await run("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''"); } catch {}
  try { await run("ALTER TABLE users ADD COLUMN memberId TEXT DEFAULT ''"); } catch {}
  await run(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT,
      membershipNo TEXT,
      nicNo TEXT,
      dob TEXT,
      permanentAddress TEXT,
      postalAddress TEXT,
      email TEXT,
      officeTelephone TEXT,
      residenceTelephone TEXT,
      mobileTelephone TEXT,
      yearOfQualification TEXT,
      certificateNo TEXT,
      placeOfWork TEXT,
      higherStudies TEXT,
      professionalStudies TEXT,
      literaryContributions TEXT,
      socialService TEXT,
      countriesVisited TEXT,
      conferencesAttended TEXT,
      awardsReceived TEXT,
      batchYear TEXT,
      teachingCollege TEXT,
      district TEXT,
      teachingStatus TEXT,
      photoPath TEXT,
      documentPath TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS fees (
      memberId TEXT PRIMARY KEY,
      membershipFee TEXT,
      subscriptionType TEXT,
      subscriptionAmount TEXT,
      paidUptoDate TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      memberId TEXT,
      amount REAL,
      paymentDate TEXT,
      method TEXT,
      note TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      actor TEXT,
      action TEXT,
      entity TEXT,
      entityId TEXT,
      createdAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS user_requests (
      id TEXT PRIMARY KEY,
      userId TEXT,
      subject TEXT,
      message TEXT,
      status TEXT,
      createdAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS profile_update_requests (
      id TEXT PRIMARY KEY,
      userId TEXT,
      payload TEXT,
      status TEXT,
      createdAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS member_documents (
      id TEXT PRIMARY KEY,
      userId TEXT,
      filePath TEXT,
      docType TEXT,
      createdAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT,
      body TEXT,
      createdAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      eventDate TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      userId TEXT,
      createdAt TEXT
    )
  `);

  const admin = await get("SELECT * FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    await run("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)", [
      cryptoRandom(),
      "admin",
      await bcrypt.hash("admin123", 10),
      "admin",
    ]);
  }
  const viewer = await get("SELECT * FROM users WHERE username = ?", ["viewer"]);
  if (!viewer) {
    await run("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)", [
      cryptoRandom(),
      "viewer",
      await bcrypt.hash("viewer123", 10),
      "viewer",
    ]);
  }
  const member = await get("SELECT * FROM users WHERE username = ?", ["member1"]);
  if (!member) {
    await run("INSERT INTO users (id, username, password_hash, role, fullName, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      cryptoRandom(),
      "member1",
      await bcrypt.hash("member123", 10),
      "member",
      "Portal Member",
      "member1@example.com",
      "",
    ]);
  }
  const annCount = await get("SELECT COUNT(*) as count FROM announcements");
  if (!annCount?.count) {
    await run("INSERT INTO announcements (id, title, body, createdAt) VALUES (?, ?, ?, ?)", [cryptoRandom(), "Welcome", "Member portal is now live.", new Date().toISOString()]);
  }
  const eventCount = await get("SELECT COUNT(*) as count FROM events");
  if (!eventCount?.count) {
    await run("INSERT INTO events (id, title, description, eventDate) VALUES (?, ?, ?, ?)", [cryptoRandom(), "Annual Gathering", "Main alumni networking event", new Date().toISOString().slice(0, 10)]);
  }
}

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  return next();
}

async function logActivity(actor, action, entity, entityId) {
  await run(
    "INSERT INTO activity_logs (id, actor, action, entity, entityId, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [cryptoRandom(), actor, action, entity, entityId, new Date().toISOString()]
  );
}

function parseMemberRow(m) {
  return {
    ...m,
    countriesVisited: JSON.parse(m.countriesVisited || "[]"),
    conferencesAttended: JSON.parse(m.conferencesAttended || "[]"),
    awardsReceived: JSON.parse(m.awardsReceived || "[]"),
  };
}

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = await get("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "8h",
  });
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName || "", email: user.email || "", phone: user.phone || "" },
  });
});

app.get("/api/profile", authRequired, async (req, res) => {
  const user = await get("SELECT id, username, role, fullName, email, phone FROM users WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

app.put("/api/profile", authRequired, async (req, res) => {
  const { fullName = "", email = "", phone = "" } = req.body;
  await run("UPDATE users SET fullName = ?, email = ?, phone = ? WHERE id = ?", [fullName, email, phone, req.user.id]);
  await logActivity(req.user.username, "update", "profile", req.user.id);
  res.json({ ok: true });
});

app.put("/api/profile/password", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing password fields" });
  if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), req.user.id]);
  await logActivity(req.user.username, "change_password", "profile", req.user.id);
  res.json({ ok: true });
});

app.get("/api/data", authRequired, async (req, res) => {
  const members = await all("SELECT * FROM members ORDER BY name ASC");
  const fees = await all("SELECT * FROM fees");
  const payments = await all("SELECT * FROM payments ORDER BY paymentDate DESC");
  const logs = await all("SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 200");
  const requests = await all("SELECT * FROM user_requests ORDER BY createdAt DESC");
  res.json({ members: members.map(parseMemberRow), fees, payments, logs, requests });
});

app.get("/api/user/summary", authRequired, async (req, res) => {
  const membersCount = await get("SELECT COUNT(*) as count FROM members");
  const openRequests = await get("SELECT COUNT(*) as count FROM user_requests WHERE userId = ? AND status = 'open'", [req.user.id]);
  res.json({
    role: req.user.role,
    totalMembers: membersCount?.count || 0,
    openRequests: openRequests?.count || 0,
  });
});

app.get("/api/member/portal", authRequired, async (req, res) => {
  const user = await get("SELECT id, username, role, fullName, email, phone, memberId FROM users WHERE id = ?", [req.user.id]);
  const member = user?.memberId ? await get("SELECT * FROM members WHERE id = ?", [user.memberId]) : null;
  const fee = user?.memberId ? await get("SELECT * FROM fees WHERE memberId = ?", [user.memberId]) : null;
  const payments = user?.memberId ? await all("SELECT * FROM payments WHERE memberId = ? ORDER BY paymentDate DESC", [user.memberId]) : [];
  const docs = await all("SELECT * FROM member_documents WHERE userId = ? ORDER BY createdAt DESC", [req.user.id]);
  const announcements = await all("SELECT * FROM announcements ORDER BY createdAt DESC LIMIT 20");
  const events = await all("SELECT e.*, CASE WHEN er.id IS NULL THEN 0 ELSE 1 END as registered FROM events e LEFT JOIN event_registrations er ON er.eventId = e.id AND er.userId = ? ORDER BY e.eventDate DESC", [req.user.id]);
  const pendingFeeBalance = fee ? Math.max(Number(fee.subscriptionAmount || 0) - payments.reduce((a, p) => a + Number(p.amount || 0), 0), 0) : 0;
  res.json({ user, member: member ? parseMemberRow(member) : null, fee, payments, pendingFeeBalance, documents: docs, announcements, events });
});

app.get("/api/user/directory", authRequired, async (req, res) => {
  const members = (await all("SELECT name, membershipNo, placeOfWork, countriesVisited, teachingCollege, district FROM members ORDER BY name ASC")).map(parseMemberRow);
  res.json({ rows: members });
});

app.post("/api/member/profile-update-request", authRequired, async (req, res) => {
  const id = cryptoRandom();
  await run("INSERT INTO profile_update_requests (id, userId, payload, status, createdAt) VALUES (?, ?, ?, ?, ?)", [
    id,
    req.user.id,
    JSON.stringify(req.body || {}),
    "pending",
    new Date().toISOString(),
  ]);
  await logActivity(req.user.username, "create", "profile_update_request", id);
  res.json({ ok: true, id });
});

app.post("/api/member/documents", authRequired, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = cryptoRandom();
  const docType = req.body.docType || "general";
  const filePath = `/uploads/${req.file.filename}`;
  await run("INSERT INTO member_documents (id, userId, filePath, docType, createdAt) VALUES (?, ?, ?, ?, ?)", [
    id,
    req.user.id,
    filePath,
    docType,
    new Date().toISOString(),
  ]);
  await logActivity(req.user.username, "upload", "member_document", id);
  res.json({ ok: true, id, filePath });
});

app.get("/api/member/certificate.pdf", authRequired, async (req, res) => {
  const user = await get("SELECT fullName, username, memberId FROM users WHERE id = ?", [req.user.id]);
  const member = user?.memberId ? await get("SELECT membershipNo, batchYear FROM members WHERE id = ?", [user.memberId]) : null;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="membership-certificate.pdf"');
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(22).text("Membership Certificate", { align: "center" }).moveDown();
  doc.fontSize(12).text(`Name: ${user?.fullName || user?.username || "Member"}`);
  doc.text(`Membership No: ${member?.membershipNo || "N/A"}`);
  doc.text(`Batch: ${member?.batchYear || "N/A"}`);
  doc.moveDown().text("This certifies that the above individual is a registered member.");
  doc.end();
});

app.post("/api/member/events/:eventId/register", authRequired, async (req, res) => {
  const event = await get("SELECT * FROM events WHERE id = ?", [req.params.eventId]);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const existing = await get("SELECT * FROM event_registrations WHERE eventId = ? AND userId = ?", [req.params.eventId, req.user.id]);
  if (existing) return res.json({ ok: true, message: "Already registered" });
  const id = cryptoRandom();
  await run("INSERT INTO event_registrations (id, eventId, userId, createdAt) VALUES (?, ?, ?, ?)", [id, req.params.eventId, req.user.id, new Date().toISOString()]);
  await logActivity(req.user.username, "register", "event", req.params.eventId);
  res.json({ ok: true });
});

app.post("/api/user/requests", authRequired, async (req, res) => {
  const { subject = "", message = "" } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Subject and message are required" });
  const id = cryptoRandom();
  await run(
    "INSERT INTO user_requests (id, userId, subject, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [id, req.user.id, subject, message, "open", new Date().toISOString()]
  );
  await logActivity(req.user.username, "create", "user_request", id);
  res.json({ ok: true, id });
});

app.get("/api/user/requests", authRequired, async (req, res) => {
  const rows = await all("SELECT * FROM user_requests WHERE userId = ? ORDER BY createdAt DESC", [req.user.id]);
  res.json({ rows });
});

app.post("/api/upload", authRequired, adminRequired, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const relativePath = `/uploads/${req.file.filename}`;
  await logActivity(req.user.username, "upload", "file", req.file.filename);
  res.json({ path: relativePath });
});

app.post("/api/members", authRequired, adminRequired, async (req, res) => {
  const m = req.body;
  await run(
    `
    INSERT OR REPLACE INTO members (
      id, name, membershipNo, nicNo, dob, permanentAddress, postalAddress, email,
      officeTelephone, residenceTelephone, mobileTelephone, yearOfQualification,
      certificateNo, placeOfWork, higherStudies, professionalStudies, literaryContributions,
      socialService, countriesVisited, conferencesAttended, awardsReceived, batchYear,
      teachingCollege, district, teachingStatus, photoPath, documentPath
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      m.id || cryptoRandom(),
      m.name || "",
      m.membershipNo || "",
      m.nicNo || "",
      m.dob || "",
      m.permanentAddress || "",
      m.postalAddress || "",
      m.email || "",
      m.officeTelephone || "",
      m.residenceTelephone || "",
      m.mobileTelephone || "",
      m.yearOfQualification || "",
      m.certificateNo || "",
      m.placeOfWork || "",
      m.higherStudies || "",
      m.professionalStudies || "",
      m.literaryContributions || "",
      m.socialService || "",
      JSON.stringify(m.countriesVisited || []),
      JSON.stringify(m.conferencesAttended || []),
      JSON.stringify(m.awardsReceived || []),
      m.batchYear || "",
      m.teachingCollege || "",
      m.district || "",
      m.teachingStatus || "",
      m.photoPath || "",
      m.documentPath || "",
    ]
  );
  await logActivity(req.user.username, "save", "member", m.id || "new");
  res.json({ ok: true });
});

app.delete("/api/members/:id", authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM members WHERE id = ?", [id]);
  await run("DELETE FROM fees WHERE memberId = ?", [id]);
  await run("DELETE FROM payments WHERE memberId = ?", [id]);
  await logActivity(req.user.username, "delete", "member", id);
  res.json({ ok: true });
});

app.post("/api/fees", authRequired, adminRequired, async (req, res) => {
  const f = req.body;
  await run(
    `
      INSERT OR REPLACE INTO fees (memberId, membershipFee, subscriptionType, subscriptionAmount, paidUptoDate)
      VALUES (?, ?, ?, ?, ?)
    `,
    [f.memberId, f.membershipFee || "", f.subscriptionType || "", f.subscriptionAmount || "", f.paidUptoDate || ""]
  );
  await logActivity(req.user.username, "save", "fees", f.memberId);
  res.json({ ok: true });
});

app.post("/api/payments", authRequired, adminRequired, async (req, res) => {
  const p = req.body;
  const id = cryptoRandom();
  await run(
    "INSERT INTO payments (id, memberId, amount, paymentDate, method, note) VALUES (?, ?, ?, ?, ?, ?)",
    [id, p.memberId, Number(p.amount || 0), p.paymentDate || new Date().toISOString().slice(0, 10), p.method || "", p.note || ""]
  );
  await logActivity(req.user.username, "create", "payment", id);
  res.json({ ok: true, id });
});

app.get("/api/payments/:id/receipt.pdf", authRequired, async (req, res) => {
  const payment = await get("SELECT * FROM payments WHERE id = ?", [req.params.id]);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  const member = await get("SELECT name, membershipNo FROM members WHERE id = ?", [payment.memberId]);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=receipt-${payment.id}.pdf`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(20).text("Payment Receipt", { align: "center" }).moveDown();
  doc.fontSize(12).text(`Receipt ID: ${payment.id}`);
  doc.text(`Member: ${member?.name || "Unknown"} (${member?.membershipNo || "-"})`);
  doc.text(`Amount: ${payment.amount}`);
  doc.text(`Date: ${payment.paymentDate}`);
  doc.text(`Method: ${payment.method || "-"}`);
  doc.text(`Note: ${payment.note || "-"}`);
  doc.moveDown().text("Generated by Member Management System");
  doc.end();
});

app.get("/api/reports/defaulters", authRequired, async (req, res) => {
  const feeRows = await all("SELECT * FROM fees");
  const members = await all("SELECT id, name, membershipNo FROM members");
  const paymentRows = await all("SELECT memberId, MAX(paymentDate) as lastPaymentDate FROM payments GROUP BY memberId");
  const payMap = new Map(paymentRows.map((r) => [r.memberId, r.lastPaymentDate]));

  const defaulters = members
    .map((m) => {
      const fee = feeRows.find((f) => f.memberId === m.id);
      const lastPaymentDate = payMap.get(m.id) || "";
      return { ...m, feeType: fee?.subscriptionType || "-", lastPaymentDate };
    })
    .filter((m) => !m.lastPaymentDate);
  res.json({ rows: defaulters });
});

app.get("/api/reports/batch-country", authRequired, async (req, res) => {
  const members = (await all("SELECT batchYear, countriesVisited FROM members")).map(parseMemberRow);
  const batchMap = new Map();
  const countryMap = new Map();
  members.forEach((m) => {
    const b = m.batchYear || "Unknown";
    batchMap.set(b, (batchMap.get(b) || 0) + 1);
    (m.countriesVisited || []).forEach((c) => countryMap.set(c, (countryMap.get(c) || 0) + 1));
  });
  res.json({
    batchReport: [...batchMap.entries()].map(([name, count]) => ({ name, count })),
    countryReport: [...countryMap.entries()].map(([name, count]) => ({ name, count })),
  });
});

app.get("/api/logs", authRequired, async (req, res) => {
  const rows = await all("SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 500");
  res.json({ rows });
});

app.get("/api/export/members.csv", authRequired, async (req, res) => {
  const members = await all("SELECT * FROM members ORDER BY name ASC");
  const header = [
    "Name",
    "Membership No",
    "NIC No",
    "Email",
    "Mobile",
    "Batch Year",
    "Place of Work",
    "Countries Visited",
    "Teaching College",
    "District",
    "Teaching Status",
  ];
  const rows = members.map((m) => [
    m.name,
    m.membershipNo,
    m.nicNo,
    m.email,
    m.mobileTelephone,
    m.batchYear,
    m.placeOfWork,
    JSON.parse(m.countriesVisited || "[]").join("; "),
    m.teachingCollege,
    m.district,
    m.teachingStatus,
  ]);
  const toCsvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="members.csv"');
  res.send(csv);
});

app.get("/api/export/members.xlsx", authRequired, async (req, res) => {
  const members = (await all("SELECT * FROM members ORDER BY name ASC")).map(parseMemberRow);
  const rows = members.map((m) => ({
    Name: m.name,
    MembershipNo: m.membershipNo,
    NIC: m.nicNo,
    Email: m.email,
    Mobile: m.mobileTelephone,
    Batch: m.batchYear,
    CountryVisited: (m.countriesVisited || []).join(", "),
    TeachingCollege: m.teachingCollege,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="members.xlsx"');
  res.send(buffer);
});

app.get("/api/export/members.pdf", authRequired, async (req, res) => {
  const members = await all("SELECT name, membershipNo, nicNo, batchYear FROM members ORDER BY name ASC");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="members.pdf"');
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text("Members Report", { align: "center" }).moveDown();
  members.forEach((m, idx) => {
    doc.fontSize(11).text(`${idx + 1}. ${m.name} | ${m.membershipNo} | ${m.nicNo} | Batch ${m.batchYear || "-"}`);
  });
  doc.end();
});

app.use(express.static(__dirname));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    fs.writeFileSync(path.join(__dirname, "server-error.log"), String(error?.stack || error));
    process.exit(1);
  });
