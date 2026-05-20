---
name: project-taskpilot-planned-features
description: "Planned premium features for TaskPilot/PilotKit — Resume Builder and WhatsApp Archiver"
metadata:
  type: project
---

Two premium features planned for PilotKit (formerly TaskPilot). Both are feasible using reference code that already exists.

**Why:** Mike wants to expand beyond IT script generation into two new revenue streams for IT professionals.

**How to apply:** Surface these as next features to build after the rename + Next.js upgrade are done.

---

## Feature 1: AI Resume Builder (Premium)

**Status:** Ready to build — core logic exists in `D:\Projects\job-search\generate-application.ps1`

**What it does:** User pastes their resume + a job description → generates a tailored, ATS-optimised resume + cover letter as downloadable PDF and DOCX.

**Architecture:**
- Frontend: two textarea inputs (resume + JD) + customization options + Generate button
- Backend: Vercel serverless function → Claude API (claude-sonnet-4-6)
- PDF: `@sparticuz/chromium` (Vercel-compatible Chromium, same as `build_pdf.js`)
- DOCX: `docx` npm library (same as `build_resume.js`) — no Pandoc, runs serverless
- Gate: Stripe premium tier or per-generation credit pack

**UI customization options:**
- Focus dropdown: IT Support / SysAdmin / Cloud & DevOps / AI & Automation
- Length toggle: 1 page / 2 pages
- Sections checkboxes: Technical Projects, Certifications, Education
- Highlight tag input: 1–3 technologies to emphasise
- Cover letter toggle + tone selector (formal / conversational) + length (brief / standard)
- Context notes: free-text extra guidance to Claude
- Output format: PDF / DOCX / Both

**Reference files:**
- System prompt: `D:\Projects\job-search\generate-application.ps1` lines 282–401
- DOCX builder: `D:\Projects\job-search\build_resume.js`
- PDF generator: `D:\Projects\job-search\build_pdf.js`
- DOCX post-processor: `D:\Projects\job-search\templates\fix-docx.py`

---

## Feature 2: WhatsApp Archiver (Premium Download + Cloud Dashboard)

**Status:** Script exists and is security-hardened (see MASTER_RESUME.md WhatsApp Archiver project)

**What it does:** Automatically captures and archives WhatsApp Desktop conversations on Windows (screenshots, sequential naming, OneDrive sync + cloud backup).

**Why it can't be a pure web service:** Uses Windows-only APIs (GDI+, Win32 P/Invoke, UI Automation, Task Scheduler). Must run on the user's local desktop.

**Viable model:**
- Download gate: premium users purchase and download the hardened PowerShell script
- License key: Stripe webhook generates a key on purchase; script validates on first run
- Cloud sync (phase 2): script uploads captures to Supabase Storage; web dashboard for browse/search/export
- Pricing: one-time purchase or subscription for cloud sync tier
