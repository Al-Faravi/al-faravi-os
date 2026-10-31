#  Faravi OS - The Ultimate Personal Operating System

![Focus Canvas Dashboard](https://img.shields.io/badge/UI-Glassmorphism%20%26%20Minimal-blue?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/React-Vite%20%7C%20Tailwind%20%7C%20Supabase-020F33?style=for-the-badge&logo=react)
![Status](https://img.shields.io/badge/Status-Active%20Development-emerald?style=for-the-badge)

**Faravi OS** is a highly customized, monolithic personal operating system built for absolute focus, productivity, and lifelong learning. Inspired by the clean aesthetics of macOS and modern minimal web apps, it unifies daily task management, professional skill development, competitive exam preparation (BCS), and spiritual growth into a single, seamless workspace.

---

##  Core Modules & Features

###  1. The Focus Canvas (Dashboard)
A clutter-free, dot-patterned workspace designed for deep work.
- **Glassmorphism Widgets:** Apple-inspired statistic cards tracking daily active streaks and completion rates.
- **Floating Pinned Notes:** Minimalist sticky notes with a multi-color palette and rich text formatting.
- **Dynamic Task Manager:** Quick-add tasks with seamless state management.
- **System Mindset:** Auto-refreshing motivational quotes to keep the momentum going.

###  2. LMS Theater Mode (Learning Management)
A dedicated, distraction-free zone for consuming courses and tutorials.
- **Hierarchical Structure:** Organized by Modules > Topics > Attached Materials.
- **Smart Resource Viewer:** Built-in iframe support for YouTube (auto-bypasses `X-Frame-Options` via smart embed conversion), PDFs, and Google Drive links.
- **Multi-tab Rich Notes:** Take synchronized, rich-text notes while watching videos.
- **Floating Utility:** A draggable, floating calculator for on-the-fly math during technical lectures.

###  3. BCS Hub (Competitive Exam Prep)
A structured approach to mastering massive syllabuses.
- **Progress Tracking:** Subject-wise percentage bars and visual tracking.
- **Flashcards & Mock Tests:** Built-in active recall and spaced repetition tools (Spaced Repetition System).

###  4. Al-Hikmah (DeenSpace)
A beautifully designed, tranquil workspace (Soft Emerald & Sand theme) for spiritual growth.
- **Quranic Workspace:** Side-by-side Arabic text, translation, and audio.
- **Hifz & Revision Tracker:** Tracks memorization progress and alerts for due revisions.
- **Hadith Encyclopedia & Spiritual Journal:** A focused vault for authentic knowledge and personal reflections.

###  5. The Vault & Productivity Apps
- **Vault:** Secure cloud storage for personal files, PDFs, and credentials.
- **Finance:** Expense and transaction tracking.
- **Dev Snippets:** A centralized repository for reusable code blocks.

---

##  Tech Stack & Architecture

- **Frontend Environment:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS (Custom color palettes, custom scrollbars, animations)
- **Icons & UI:** Lucide React
- **Backend & Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage Buckets (File uploads & PDF hosting)
- **Routing:** React Router v6

---

##  Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your machine. You will also need a [Supabase](https://supabase.com/) account.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/faravi-os.git
   cd faravi-os
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   Run the provided SQL scripts from the `/db_schema` folder (or via Supabase SQL Editor) to generate the required tables (`tasks`, `lms_courses`, `quran_ayahs`, etc.).

5. **Run the development server:**
   ```bash
   npm run dev
   ```

---

##  Contributing
Since this is a strictly personal OS tailored to specific workflows, direct contributions are not currently expected. However, feel free to fork this project to build your own personal workspace!

## 📜 License
This project is open-sourced under the [MIT License](LICENSE).

---
*Designed and built with ❤️ by Faravi.*
