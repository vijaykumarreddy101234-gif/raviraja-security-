# Raviraja Industries – Security & Gate Management CRM

Inward / outward registers, visitors, gate passes, staff attendance, returns, reports, audit trail,
and a built-in PDF editor.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # type-check
npm test           # unit tests (security logic + PDF engine)
npm run build && npm start
```

## Sign-in & roles

First-run accounts (you are forced to set a new password at first sign-in):

| Username     | Temporary password | Role                |
|--------------|--------------------|---------------------|
| `admin`      | `Admin@123`        | Admin               |
| `supervisor` | `Super@123`        | Security Supervisor |
| `guard`      | `Guard@123`        | Security Staff      |

* Passwords are salted + PBKDF2-hashed (150k iterations); 5 failed attempts lock the account for 5 minutes;
  sessions end after 30 minutes idle or when the tab closes.
* Admins manage users under **Users & Role Access** (create, change role, disable, reset password).
  The last active Admin cannot be demoted or disabled.

| Area                                | Admin | Supervisor | Staff |
|-------------------------------------|:-----:|:----------:|:-----:|
| Dashboard, Inward, Outward, Visitors, Staff, Returns, Gate Pass, Reports, CRM | ✅ | ✅ | ✅ |
| Approve / verify actions            | ✅ | ✅ | ❌ |
| Security Settings                   | ✅ | ✅ | ❌ |
| Audit Trail                         | ✅ | ✅ | ❌ |
| PDF Editor (vouchers, logos, edit & save) | ✅ | ✅ | ✅ |
| Users & Role Access                 | ✅ | ❌ | ❌ |

Permissions are defined in `src/utils/permissions.ts`.

## Audit trail

Every sign-in, failed sign-in, password change, access-denied attempt, user-management change,
PDF export and audit export is recorded alongside the existing inward/outward/visitor/stock events.
The Audit Trail screen filters by module, action, user and date range and exports a spreadsheet-safe CSV.

## Printing = PDF

The old browser "Print" (which printed the whole page and is blocked inside embedded previews) is replaced by PDF:

* **Inward / Outward / Visitor / Return / Gate Pass → print icon →** **Edit & Save as PDF** opens the voucher
  in the PDF Editor; **Download PDF** saves it straight away.
* **Reports → Report to PDF** does the same for any report (landscape A4).
* In the editor: **Upload logo** once (kept in your browser), then **Logo Left / Logo Right** place it at the top
  corners. Drag to move, green dot to resize, arrow keys to nudge (Shift = 10×), zoom buttons / Ctrl+scroll /
  **Fit to width**. **Download** saves the final PDF; **Back** returns to the screen you came from.

## PDF Editor

Open or drag in any PDF (≤ 50 MB): add text, highlight, rectangles, whiteout, freehand drawing, a drawn
signature, PNG/JPG images and approval stamps; rotate / reorder / insert / delete pages; merge PDFs;
extract a page; watermark; page numbers. Everything runs in the browser — files are not uploaded.
Standard PDF fonts are used, so characters outside Latin‑1 are skipped (₹ is written as "Rs.").

**Downloads in previews:** some embedded viewers (e.g. a chat preview frame) block file downloads. If
Download does nothing, open the app from its own web address or run it locally.

## ⚠️ Security limitation

All data (including user accounts) is stored in the browser's `localStorage`. The login and role checks
protect the interface and make the audit trail attributable, but they **cannot stop someone with access
to the same browser's developer tools**. For real enforcement, move storage and these checks to a server
(e.g. the existing Express `server.js` + a database) before using this with production data.
