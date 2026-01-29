# UI/UX Redesign Plan: Mobile-First Approach

## Overview

This document outlines the current UI/UX state, identifies critical issues, and proposes a mobile-first redesign that can be easily converted to native iOS/Android apps.

**Document Version:** 1.0
**Created:** January 2025
**Status:** PROPOSAL

---

## TABLE OF CONTENTS

1. [Current UI/UX Analysis](#part-1-current-uiux-analysis)
2. [Critical Issues Identified](#part-2-critical-issues-identified)
3. [Mobile-First Design Principles](#part-3-mobile-first-design-principles)
4. [Proposed New UI/UX](#part-4-proposed-new-uiux)
5. [Component Library Specification](#part-5-component-library-specification)
6. [Role-Specific Redesigns](#part-6-role-specific-redesigns)
7. [Implementation Plan](#part-7-implementation-plan)

---

## PART 1: CURRENT UI/UX ANALYSIS

### 1.1 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Tailwind CSS | 4.1.18 | Styling |
| Heroicons | 2.2.0 | Icons (24-outline) |
| Lucide React | 0.562.0 | Additional icons |
| Framer Motion | 12.24.10 | Animations |
| Headless UI | 2.2.9 | Accessible components |
| React Hot Toast | 2.6.0 | Notifications |

### 1.2 Current Page Structure

```
/pages/
├── LoginPage.tsx              - Authentication
├── RegisterPage.tsx           - Registration
├── AnalysesPage.tsx           - Script Writer dashboard
├── AdminDashboard.tsx         - Admin hub
├── VideographerDashboard.tsx  - Videographer projects
├── EditorDashboard.tsx        - Editor projects
├── PostingManagerDashboard.tsx - Posting manager
├── SettingsPage.tsx           - Configuration
└── admin/
    ├── NeedApprovalPage.tsx   - Script approvals
    ├── AnalysisTablePage.tsx  - Data grid view
    ├── ProductionStatusPage.tsx - Production tracking
    └── TeamMembersPage.tsx    - Team management
```

### 1.3 Current Navigation Pattern

```
┌────────────────────────────────────────────────────────────────┐
│  ◀ Logo                    [Nav Links]          [User Menu] ▼  │  ← Top Bar (h-16, 64px)
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐                                                  │
│  │ Sidebar  │                    CONTENT AREA                  │  ← Desktop Layout
│  │ (w-64)   │                                                  │
│  │          │                                                  │
│  └──────────┘                                                  │
└────────────────────────────────────────────────────────────────┘

Mobile: Hamburger menu → Slide-in sidebar from left
```

**Issues with Current Navigation:**
- Top navigation wastes vertical space on mobile (64px)
- No bottom navigation (thumb zone ignored)
- Hamburger menu requires 2 taps to reach any destination
- No persistent navigation on mobile

### 1.4 Current Design Tokens

```css
/* Primary Color Palette */
--color-primary-50: #f0f9ff;
--color-primary-500: #0ea5e9;  /* Sky Blue */
--color-primary-900: #0c4a6e;

/* Status Colors */
--status-approved: Green
--status-rejected: Red
--status-pending: Yellow/Amber
--status-posted: Gray

/* Touch Targets */
--min-touch: 48px;  /* Defined but inconsistently used */
```

### 1.5 Current Component Patterns

#### Tables (AnalysisDataGrid.tsx, VideographerDashboard.tsx)
```
Current Pattern:
┌────────────────────────────────────────────────────────────┐
│ ID │ Project │ Priority │ Stage │ Deadline │ Team │ Actions │
├────────────────────────────────────────────────────────────┤
│ ... │  ...   │   ...    │  ...  │   ...    │ ...  │   ...   │
└────────────────────────────────────────────────────────────┘
        ← Horizontal scroll on mobile (10+ columns) →

Issues:
- Requires horizontal scroll on mobile
- Sticky columns don't work well on touch
- Header text too small (text-xs)
- No card view alternative
```

#### Modals (VideographerDashboard.tsx:636-1068)
```
Current Pattern:
Desktop: Centered modal (max-w-4xl)
Mobile: Bottom sheet (h-[100dvh], rounded-t-2xl)

Good:
✓ Uses dvh unit for viewport height
✓ Bottom sheet pattern on mobile
✓ Close button always visible

Issues:
✗ No swipe-to-dismiss
✗ Full viewport blocks all content
✗ Keyboard may cause layout issues
```

#### View Switchers (PostingManagerDashboard.tsx:354-388)
```
Current: [Table] [Kanban] [Calendar] - Horizontal buttons

Issues:
- All views use same layout regardless of screen
- Calendar is hardcoded 7-column grid
- Kanban uses fixed 320px columns
```

---

## PART 2: CRITICAL ISSUES IDENTIFIED

### 2.1 Severity Matrix

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Calendar 7-column grid | 🔴 CRITICAL | PostingManagerDashboard:703 | Unusable on mobile |
| Kanban fixed width (320px) | 🔴 CRITICAL | PostingManagerDashboard:578 | Forces horizontal scroll |
| Data tables 10+ columns | 🔴 CRITICAL | AnalysisDataGrid.tsx | Impossible to use on mobile |
| No bottom navigation | 🟠 HIGH | All pages | Poor thumb ergonomics |
| Tables require scroll | 🟠 HIGH | All dashboards | Bad mobile experience |
| Touch targets < 44px | 🟠 HIGH | Filter buttons, icons | Hard to tap |
| No swipe gestures | 🟡 MEDIUM | Modals, lists | Missing expected interactions |
| Text too small | 🟡 MEDIUM | Table headers (text-xs) | Hard to read |
| No card view for data | 🟡 MEDIUM | All tables | Desktop-only pattern |

### 2.2 Critical Issue Details

#### Issue #1: Calendar View (CRITICAL)
```
File: PostingManagerDashboard.tsx (Lines 660-774)
Problem: grid-cols-7 hardcoded for all screen sizes

Current Code:
<div className="grid grid-cols-7 gap-px bg-gray-200">
  {/* 7 columns always, ~40-50px wide on mobile */}
</div>

Result on Mobile (375px screen):
Each cell = 375px / 7 = ~53px wide
With padding/borders = ~40px usable
This is UNREADABLE for calendar content
```

#### Issue #2: Kanban View (CRITICAL)
```
File: PostingManagerDashboard.tsx (Line 578)
Problem: Fixed column width doesn't adapt to mobile

Current Code:
<div className="w-80">  {/* 320px fixed */}

Result on Mobile (375px screen):
Column = 320px + padding = ~340px
Screen = 375px
Only 1 column visible, forced horizontal scroll
```

#### Issue #3: Data Tables (CRITICAL)
```
File: AnalysisDataGrid.tsx (Lines 108-220+)
Columns: ID | Status | Hook | Emotion | Outcome | Shoot% | People | Stage | Score | Date | Actions

On Desktop: 11 columns fit well
On Mobile (375px): Each column = ~34px (UNUSABLE)

Missing: Card view alternative for mobile
```

### 2.3 Missing Mobile Patterns

| Pattern | Status | Industry Standard |
|---------|--------|-------------------|
| Bottom Tab Navigation | ❌ Missing | 3-5 tabs, thumb zone |
| Swipe Gestures | ❌ Missing | Swipe to dismiss, swipe actions |
| Pull to Refresh | ❌ Missing | Standard mobile pattern |
| Card-based Lists | ❌ Missing | Replace tables on mobile |
| Floating Action Button | ❌ Missing | Primary action access |
| Skeleton Loading | ❌ Missing | Visual loading feedback |
| Haptic Feedback | ❌ Missing | Touch confirmation |

---

## PART 3: MOBILE-FIRST DESIGN PRINCIPLES

### 3.1 Core Principles (2025 Best Practices)

Based on research from [Smashing Magazine](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/), [UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-patterns-pros-and-cons/), and [Interaction Design Foundation](https://www.interaction-design.org/literature/article/ui-form-design):

#### 1. Thumb Zone Navigation
```
┌─────────────────────┐
│     HARD TO REACH   │  ← Avoid primary actions here
│                     │
│  ┌───────────────┐  │
│  │   OKAY ZONE   │  │  ← Secondary actions
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  THUMB ZONE   │  │  ← Primary navigation & actions
│  │   (Natural)   │  │     75% of users use one thumb
│  └───────────────┘  │
│  [Tab1][Tab2][Tab3] │  ← Bottom navigation bar
└─────────────────────┘
```

#### 2. Touch Target Sizes
- **Minimum:** 44×44 pt (iOS) / 48×48 dp (Android)
- **Recommended:** 48×48 px with 8px spacing
- **Labels:** 16px minimum font size (prevents iOS zoom)

#### 3. Progressive Enhancement
- Start with mobile layout
- Add complexity for larger screens
- Never hide critical features on mobile

#### 4. Card-Based Data Display
According to [UXPin Dashboard Design](https://www.uxpin.com/studio/blog/dashboard-design-principles/):
- Cards work better than tables on mobile
- Use spacing to create visual separation
- Expandable cards for details

### 3.2 Navigation Pattern: Bottom Tab Bar

Based on research from [AppMySite](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/) and [UXD World](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/):

```
RULES:
✓ 3-5 items maximum (we'll use 4-5 per role)
✓ Icons + Labels (not icons only)
✓ Active state clearly visible
✓ Fixed at bottom (not scrollable)
✓ Equal width distribution
✓ 20-30% faster than hamburger menu

IMPLEMENTATION:
┌─────────────────────────────────────────┐
│                                         │
│              CONTENT AREA               │
│                                         │
├─────────────────────────────────────────┤
│  🏠      📋       ➕       👤       ⚙️  │  ← h-16 (64px)
│ Home   Projects  New    Profile  More   │  ← Labels required
└─────────────────────────────────────────┘
     ↑ Active state (brand color + indicator)
```

### 3.3 Card-Based Data Display

Replace tables with cards on mobile:

```
DESKTOP TABLE:
┌──────┬──────────┬──────────┬──────────┬─────────┐
│  ID  │ Project  │ Priority │  Stage   │ Actions │
├──────┼──────────┼──────────┼──────────┼─────────┤
│ BCH01│ Hook vid │   HIGH   │ SHOOTING │  [···]  │
└──────┴──────────┴──────────┴──────────┴─────────┘

MOBILE CARD:
┌─────────────────────────────────────────┐
│  BCH001                    🔴 HIGH      │  ← ID + Priority badge
│  ────────────────────────────────────   │
│  📹 Hook video for fitness brand        │  ← Title/Hook
│                                         │
│  Stage: SHOOTING    Due: Jan 28         │  ← Key info
│  ────────────────────────────────────   │
│  👤 John (Video) • 👤 Sarah (Edit)     │  ← Team avatars
│                                         │
│  [View Details]              [Actions▼] │  ← Touch-friendly buttons
└─────────────────────────────────────────┘
```

### 3.4 Bottom Sheet Pattern

Based on [Mobbin research](https://mobbin.com/glossary/bottom-sheet), bottom sheets have 25-30% higher engagement than modals:

```
Types to Use:

1. MODAL BOTTOM SHEET (for focused tasks)
   ┌─────────────────────────────────────────┐
   │ ▬▬▬ (drag handle)                       │
   │                                         │
   │  Edit Project Details                   │
   │  ──────────────────────                 │
   │  [Form fields...]                       │
   │                                         │
   │  [Cancel]              [Save Changes]   │
   └─────────────────────────────────────────┘
   ← Swipe down to dismiss
   ← Taps backdrop to close

2. EXPANDABLE BOTTOM SHEET (for details)
   ┌─────────────────────────────────────────┐
   │ ▬▬▬ Preview content (collapsed)        ↑│
   └─────────────────────────────────────────┘
        ↓ Swipe up to expand
   ┌─────────────────────────────────────────┐
   │ ▬▬▬                                     │
   │  Full content (expanded)                │
   │  ...                                    │
   │  ...                                    │
   └─────────────────────────────────────────┘
```

### 3.5 Form Design (Mobile-First)

Based on [Smashing Magazine](https://www.smashingmagazine.com/2018/08/best-practices-for-mobile-form-design/) and [Forms on Fire](https://www.formsonfire.com/blog/mobile-form-design):

```
RULES:
✓ Single-column layout only
✓ 16px minimum font (prevents iOS zoom)
✓ 1-3 fields per step (multi-step for complex forms)
✓ Input height minimum 48px
✓ Show appropriate keyboard (numeric, email, etc.)
✓ Labels above fields (not placeholders only)
✓ CTA button full-width at bottom

LAYOUT:
┌─────────────────────────────────────────┐
│  Step 1 of 3        [○ ○ ○ progress]    │
│  ─────────────────────────────────────  │
│                                         │
│  Reference URL                          │  ← Label above
│  ┌───────────────────────────────────┐  │
│  │ https://...                       │  │  ← 48px height
│  └───────────────────────────────────┘  │
│                                         │
│  Hook Title                             │
│  ┌───────────────────────────────────┐  │
│  │ Enter hook title...               │  │
│  └───────────────────────────────────┘  │
│                                         │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         Continue →                │  │  ← Full-width CTA
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## PART 4: PROPOSED NEW UI/UX

### 4.1 New App Structure

```
MOBILE-FIRST ARCHITECTURE:

┌─────────────────────────────────────────┐
│            STATUS BAR                   │  ← Safe area top
├─────────────────────────────────────────┤
│  ◀        Page Title        [Actions]   │  ← Minimal header (h-14)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│              CONTENT AREA               │
│         (Scrollable, cards)             │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [🏠]    [📋]    [➕]    [👤]    [⚙️]  │  ← Bottom nav (h-16)
│  Home  Projects  New  Profile  More     │
└─────────────────────────────────────────┘
                                          ← Safe area bottom
```

### 4.2 Role-Based Bottom Navigation

#### Videographer
```
┌─────────────────────────────────────────┐
│  🏠        📋         ➕        👤      │
│ Home   My Work    New Shoot  Profile   │
└─────────────────────────────────────────┘
- Home: Available projects (PLANNING queue)
- My Work: My assigned projects
- New Shoot: Create new project
- Profile: Settings, help
```

#### Editor
```
┌─────────────────────────────────────────┐
│  🏠        📋         🎬        👤      │
│ Home   My Edits   Available  Profile   │
└─────────────────────────────────────────┘
- Home: Dashboard stats
- My Edits: Currently editing
- Available: READY_FOR_EDIT queue
- Profile: Settings, help
```

#### Posting Manager
```
┌─────────────────────────────────────────┐
│  🏠        📋         📅        👤      │
│ Home   To Post   Calendar  Profile     │
└─────────────────────────────────────────┘
- Home: Dashboard stats
- To Post: READY_TO_POST queue
- Calendar: Schedule view
- Profile: Settings, help
```

#### Admin
```
┌─────────────────────────────────────────┐
│  🏠        ✅         📊        ⚙️      │
│ Home   Approvals  Status   Settings    │
└─────────────────────────────────────────┘
- Home: Dashboard overview
- Approvals: Pending scripts
- Status: Production stages
- Settings: Team, config
```

#### Script Writer
```
┌─────────────────────────────────────────┐
│  🏠        📝         ➕        👤      │
│ Home   My Scripts   New    Profile     │
└─────────────────────────────────────────┘
- Home: Script status overview
- My Scripts: All my analyses
- New: Create new script
- Profile: Settings, help
```

### 4.3 Calendar View Redesign

**Current Problem:** 7-column grid unusable on mobile

**New Design:** Adaptive calendar with mobile-friendly views

```
MOBILE: List/Agenda View (Default)
┌─────────────────────────────────────────┐
│  ◀  January 2025  ▶        [Week][Day] │  ← Month selector
├─────────────────────────────────────────┤
│  TODAY - Monday, Jan 27                 │
│  ┌───────────────────────────────────┐  │
│  │ 🔵 BCH001 - Hook video           │  │  ← Event card
│  │    9:00 AM • READY_TO_POST        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 🟢 BCH004 - Fitness promo        │  │
│  │    2:00 PM • POSTED               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  TOMORROW - Tuesday, Jan 28             │
│  ┌───────────────────────────────────┐  │
│  │ 🟡 BCH007 - Restaurant ad        │  │
│  │    10:00 AM • SCHEDULED           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

MOBILE: Week View (Horizontal scroll)
┌─────────────────────────────────────────┐
│  ◀  Jan 27 - Feb 2  ▶     [List][Week] │
├─────────────────────────────────────────┤
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun     │
│   27   28   29   30   31    1    2     │
│  ┌─┐  ┌─┐  ┌─┐                         │
│  │2│  │1│  │3│  ·    ·    ·    ·      │  ← Dot indicators
│  └─┘  └─┘  └─┘                         │
├─────────────────────────────────────────┤
│  Selected: Monday, Jan 27               │
│  ┌───────────────────────────────────┐  │
│  │ Event details for selected day... │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

TABLET/DESKTOP: Full Calendar Grid
┌─────────────────────────────────────────────────────────┐
│  ◀  January 2025  ▶                    [List][Calendar] │
├─────────────────────────────────────────────────────────┤
│  Mon    Tue    Wed    Thu    Fri    Sat    Sun         │
├───────┼───────┼───────┼───────┼───────┼───────┼────────┤
│  27   │  28   │  29   │  30   │  31   │   1   │   2    │
│ ┌───┐ │ ┌───┐ │       │       │       │       │        │
│ │BC │ │ │BC │ │       │       │       │       │        │
│ └───┘ │ └───┘ │       │       │       │       │        │
└───────┴───────┴───────┴───────┴───────┴───────┴────────┘
```

### 4.4 Kanban View Redesign

**Current Problem:** Fixed 320px columns force horizontal scroll

**New Design:** Swipeable tabs on mobile, columns on desktop

```
MOBILE: Swipeable Tab View
┌─────────────────────────────────────────┐
│  [READY] [SCHEDULED] [POSTED]           │  ← Swipeable tabs
│     ●         ○          ○              │  ← Active indicator
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔵 BCH001                         │  │
│  │ Hook video for fitness            │  │
│  │ Due: Jan 28  •  HIGH              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔵 BCH004                         │  │
│  │ Restaurant promotion              │  │
│  │ Due: Jan 30  •  NORMAL            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ← Swipe left for SCHEDULED →           │
│                                         │
└─────────────────────────────────────────┘

TABLET/DESKTOP: Traditional Columns
┌─────────────────────────────────────────────────────────┐
│  READY (3)        │  SCHEDULED (2)    │  POSTED (5)     │
├───────────────────┼───────────────────┼─────────────────┤
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌───────────┐  │
│  │ Card 1      │  │  │ Card 1      │  │  │ Card 1    │  │
│  └─────────────┘  │  └─────────────┘  │  └───────────┘  │
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌───────────┐  │
│  │ Card 2      │  │  │ Card 2      │  │  │ Card 2    │  │
│  └─────────────┘  │  └─────────────┘  │  └───────────┘  │
│  ┌─────────────┐  │                   │  ...            │
│  │ Card 3      │  │                   │                 │
│  └─────────────┘  │                   │                 │
└───────────────────┴───────────────────┴─────────────────┘
```

### 4.5 Data List Redesign (Tables → Cards)

**Current Problem:** Tables with 10+ columns impossible on mobile

**New Design:** Card-based list with swipe actions

```
MOBILE: Card List with Swipe Actions
┌─────────────────────────────────────────┐
│  🔍 Search...              [Filter ▼]   │
├─────────────────────────────────────────┤
│                                         │
│  ← [Delete]  ┌─────────────────┐  [Edit] →
│              │ BCH001          │        │  ← Swipe actions
│              │ ────────────────│        │
│              │ 📹 Hook video   │        │
│              │ Stage: SHOOTING │        │
│              │                 │        │
│              │ 🔴 HIGH  Jan 28 │        │
│              └─────────────────┘        │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ BCH004                              ││
│  │ ────────────────────────────────────││
│  │ 📹 Restaurant promo                 ││
│  │ Stage: EDITING                      ││
│  │                                     ││
│  │ 🟡 NORMAL  Jan 30                   ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘

TABLET: Compact Card Grid
┌─────────────────────────────────────────────────────────┐
│  ┌───────────────────┐  ┌───────────────────┐           │
│  │ BCH001            │  │ BCH004            │           │
│  │ Hook video        │  │ Restaurant promo  │           │
│  │ SHOOTING • HIGH   │  │ EDITING • NORMAL  │           │
│  └───────────────────┘  └───────────────────┘           │
│  ┌───────────────────┐  ┌───────────────────┐           │
│  │ BCH007            │  │ BCH008            │           │
│  │ ...               │  │ ...               │           │
│  └───────────────────┘  └───────────────────┘           │
└─────────────────────────────────────────────────────────┘

DESKTOP: Traditional Table (keep current, with improvements)
```

---

## PART 5: COMPONENT LIBRARY SPECIFICATION

### 5.1 Design Tokens (Updated)

```css
/* ============================================
   COLOR SYSTEM
   ============================================ */

/* Primary - Sky Blue (keep current) */
--color-primary-50: #f0f9ff;
--color-primary-100: #e0f2fe;
--color-primary-500: #0ea5e9;
--color-primary-600: #0284c7;
--color-primary-700: #0369a1;

/* Status Colors */
--color-success: #22c55e;    /* Green - Approved/Posted */
--color-warning: #f59e0b;    /* Amber - Pending/In Progress */
--color-error: #ef4444;      /* Red - Rejected/Urgent */
--color-info: #3b82f6;       /* Blue - Informational */

/* Priority Colors */
--color-priority-urgent: #dc2626;   /* Red-600 */
--color-priority-high: #f97316;     /* Orange-500 */
--color-priority-normal: #6b7280;   /* Gray-500 */
--color-priority-low: #9ca3af;      /* Gray-400 */

/* Surface Colors */
--surface-primary: #ffffff;
--surface-secondary: #f9fafb;
--surface-tertiary: #f3f4f6;
--surface-inverse: #111827;

/* ============================================
   SPACING SYSTEM (8px base)
   ============================================ */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* ============================================
   TYPOGRAPHY
   ============================================ */
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-base: 16px;    /* Minimum for inputs */
--font-size-lg: 18px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 30px;

/* ============================================
   TOUCH TARGETS
   ============================================ */
--touch-min: 44px;         /* iOS minimum */
--touch-recommended: 48px; /* Android recommended */
--touch-comfortable: 56px; /* Large interactive elements */

/* ============================================
   BORDER RADIUS
   ============================================ */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;

/* ============================================
   SHADOWS (Elevation)
   ============================================ */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1);

/* ============================================
   Z-INDEX LAYERS
   ============================================ */
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-toast: 600;
```

### 5.2 Core Components

#### Bottom Navigation Bar
```tsx
interface BottomNavProps {
  items: Array<{
    icon: React.ReactNode;
    label: string;
    href: string;
    badge?: number;
  }>;
  activeIndex: number;
}

/*
Specs:
- Height: 64px (--space-16)
- Background: white with top border
- Items: 4-5 max, equal width
- Active: Primary color icon + label + indicator
- Inactive: Gray-500 icon + label
- Touch target: Full item width × 64px height
- Safe area padding on iOS
*/
```

#### Project Card
```tsx
interface ProjectCardProps {
  id: string;
  contentId?: string;
  title: string;
  stage: ProductionStage;
  priority: Priority;
  deadline?: Date;
  team?: TeamMember[];
  onTap?: () => void;
  onSwipeLeft?: () => void;  // Delete/Archive
  onSwipeRight?: () => void; // Edit/Quick action
}

/*
Specs:
- Min height: 120px
- Padding: 16px
- Border radius: 12px
- Shadow: shadow-sm, shadow-md on hover/press
- Swipe threshold: 100px
- Haptic feedback on swipe complete
*/
```

#### Bottom Sheet
```tsx
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: ('content' | number)[]; // e.g., [0.5, 0.9]
  children: React.ReactNode;
}

/*
Specs:
- Drag handle: 40px × 4px, centered, gray-300
- Border radius top: 24px
- Max height: 90vh
- Backdrop: black/50, tap to close
- Swipe velocity threshold: 500
- Spring animation: damping 25, stiffness 300
*/
```

#### Form Input
```tsx
interface FormInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url' | 'number' | 'tel';
  error?: string;
  required?: boolean;
}

/*
Specs:
- Label: 14px, gray-700, mb-1
- Input height: 48px minimum
- Font size: 16px (prevents iOS zoom)
- Padding: 12px horizontal
- Border: 1px gray-300, focus: 2px primary-500
- Border radius: 8px
- Error state: red-500 border, error text below
*/
```

### 5.3 Responsive Breakpoints

```css
/* Mobile-first breakpoints */
--screen-sm: 640px;   /* Large phones, small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large monitors */

/* Usage */
/* Base styles: Mobile (< 640px) */
.component { /* mobile styles */ }

@media (min-width: 640px) {
  .component { /* tablet+ styles */ }
}

@media (min-width: 1024px) {
  .component { /* desktop+ styles */ }
}
```

---

## PART 6: ROLE-SPECIFIC REDESIGNS

### 6.1 Videographer Dashboard

#### Current State (Issues)
- Table view with horizontal scroll
- "New Project" button at top (hard to reach)
- Complex modal for project details
- No quick file upload access

#### Proposed Redesign

```
HOME TAB (Available Projects)
┌─────────────────────────────────────────┐
│  ◀ Available Projects            [🔍]  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ 📹 Hook video - fitness brand      ││
│  │ Script by: John D.                 ││
│  │ ─────────────────────────────────  ││
│  │ Shoot type: Single • People: 2     ││
│  │                                    ││
│  │ 🔴 HIGH        [Pick Project →]    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📹 Restaurant promo - casual       ││
│  │ Script by: Sarah M.                ││
│  │ ─────────────────────────────────  ││
│  │ Shoot type: Multiple • People: 4   ││
│  │                                    ││
│  │ 🟡 NORMAL      [Pick Project →]    ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [➕]       [👤]    │
│  Home   My Work   New Shoot  Profile   │
└─────────────────────────────────────────┘


MY WORK TAB (Assigned Projects)
┌─────────────────────────────────────────┐
│  ◀ My Projects                   [🔍]  │
├─────────────────────────────────────────┤
│  SHOOTING (2)                           │
│  ┌─────────────────────────────────────┐│
│  │ BCH001 • Hook video                 ││
│  │ Due: Jan 28  •  🔴 HIGH             ││
│  │ ─────────────────────────────────   ││
│  │ 📁 3 files uploaded                 ││
│  │ [Upload Files] [Mark Complete]      ││
│  └─────────────────────────────────────┘│
│                                         │
│  SHOOT_REVIEW (1)                       │
│  ┌─────────────────────────────────────┐│
│  │ BCH004 • Restaurant promo           ││
│  │ Waiting for admin review...         ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [➕]       [👤]    │
└─────────────────────────────────────────┘


PICK PROJECT FLOW (Bottom Sheet)
┌─────────────────────────────────────────┐
│  ▬▬▬                                    │  ← Drag handle
│  Pick Project                     [✕]  │
├─────────────────────────────────────────┤
│  📹 Hook video - fitness brand          │
│  Script: John D. • HIGH priority        │
│  ─────────────────────────────────────  │
│                                         │
│  Select Profile *                       │  ← REQUIRED
│  ┌─────────────────────────────────────┐│
│  │ [Select Profile ▼]                  ││
│  └─────────────────────────────────────┘│
│                                         │
│  Hook Tags (optional)                   │
│  [Audio Hook] [Visual Hook] [+ Add]     │
│                                         │
│  Character Tags (optional)              │
│  [Solo] [With Staff] [+ Add]            │
│                                         │
│  People Involved                        │
│  [1] [2] [3] [4] [5+]                   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │      Pick & Start Shooting →        ││  ← Primary CTA
│  └─────────────────────────────────────┘│
│                                         │
│  Content ID will be generated: BCH___###│
└─────────────────────────────────────────┘
```

### 6.2 Editor Dashboard

#### Proposed Redesign

```
HOME TAB (Available for Edit)
┌─────────────────────────────────────────┐
│  ◀ Ready for Edit                [🔍]  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ BCH001 • Hook video                 ││
│  │ Videographer: Mike T.               ││
│  │ ─────────────────────────────────   ││
│  │ 📁 5 raw files • 🎬 A-Roll, B-Roll  ││
│  │                                     ││
│  │ 🔴 HIGH        [Pick to Edit →]     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ BCH007 • Brand story                ││
│  │ Videographer: Lisa R.               ││
│  │ ─────────────────────────────────   ││
│  │ 📁 8 raw files • 🎬 Full shoot      ││
│  │                                     ││
│  │ 🟡 NORMAL      [Pick to Edit →]     ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [🎬]       [👤]    │
│  Home   My Edits  Available  Profile   │
└─────────────────────────────────────────┘


MY EDITS TAB
┌─────────────────────────────────────────┐
│  ◀ My Editing Projects           [🔍]  │
├─────────────────────────────────────────┤
│  EDITING (2)                            │
│  ┌─────────────────────────────────────┐│
│  │ BCH001 • Hook video                 ││
│  │ Due: Jan 28  •  🔴 HIGH             ││
│  │ ─────────────────────────────────   ││
│  │ Raw: 5 files  •  Edited: 0 files    ││
│  │                                     ││
│  │ [View Raw]  [Upload Edit]  [Done]   ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [🎬]       [👤]    │
└─────────────────────────────────────────┘
```

### 6.3 Posting Manager Dashboard

#### Proposed Redesign

```
HOME TAB (Dashboard)
┌─────────────────────────────────────────┐
│  ◀ Posting Dashboard             [🔔]  │
├─────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐         │
│  │     5      │  │     3      │         │
│  │ Ready      │  │ Scheduled  │         │
│  └────────────┘  └────────────┘         │
│  ┌────────────┐  ┌────────────┐         │
│  │    12      │  │    28      │         │
│  │ This Week  │  │ This Month │         │
│  └────────────┘  └────────────┘         │
│                                         │
│  TODAY'S POSTS                          │
│  ┌─────────────────────────────────────┐│
│  │ 📍 9:00 AM • BCH001                 ││
│  │ Hook video - fitness brand          ││
│  │ [View] [Mark Posted]                ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 📍 2:00 PM • BCH004                 ││
│  │ Restaurant promo                    ││
│  │ [View] [Mark Posted]                ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [📅]       [👤]    │
│  Home   To Post   Calendar  Profile    │
└─────────────────────────────────────────┘


CALENDAR TAB (Mobile: List View)
┌─────────────────────────────────────────┐
│  ◀  January 2025  ▶        [List|Week] │
├─────────────────────────────────────────┤
│  TODAY - Monday, Jan 27                 │
│  ┌─────────────────────────────────────┐│
│  │ 🔵 9:00 AM                          ││
│  │ BCH001 - Hook video                 ││
│  │ READY_TO_POST                       ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 🟢 2:00 PM                          ││
│  │ BCH004 - Restaurant promo           ││
│  │ SCHEDULED                           ││
│  └─────────────────────────────────────┘│
│                                         │
│  TOMORROW - Tuesday, Jan 28             │
│  ┌─────────────────────────────────────┐│
│  │ 🟡 10:00 AM                         ││
│  │ BCH007 - Brand story                ││
│  │ SCHEDULED                           ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [📋]       [📅]       [👤]    │
└─────────────────────────────────────────┘
```

### 6.4 Admin Dashboard

#### Proposed Redesign

```
HOME TAB (Overview)
┌─────────────────────────────────────────┐
│  ◀ Admin Dashboard               [🔔]  │
├─────────────────────────────────────────┤
│  NEEDS ATTENTION                        │
│  ┌────────────┐  ┌────────────┐         │
│  │  🔴 3      │  │  🟡 2      │         │
│  │ Pending    │  │ Overdue    │         │
│  │ Approvals  │  │ Projects   │         │
│  └────────────┘  └────────────┘         │
│                                         │
│  PIPELINE OVERVIEW                      │
│  ┌─────────────────────────────────────┐│
│  │ Planning      ████████░░░░░░  12    ││
│  │ Shooting      ████████████░░   8    ││
│  │ Ready Edit    ██████░░░░░░░░   5    ││
│  │ Editing       ████░░░░░░░░░░   3    ││
│  │ Ready Post    ██████████░░░░   7    ││
│  └─────────────────────────────────────┘│
│                                         │
│  RECENT ACTIVITY                        │
│  ┌─────────────────────────────────────┐│
│  │ 📝 New script submitted             ││
│  │ John D. • 5 min ago                 ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ ✅ BCH001 editing complete          ││
│  │ Sarah M. • 15 min ago               ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [✅]       [📊]       [⚙️]    │
│  Home   Approvals  Status   Settings   │
└─────────────────────────────────────────┘


APPROVALS TAB
┌─────────────────────────────────────────┐
│  ◀ Pending Approvals             [🔍]  │
├─────────────────────────────────────────┤
│  3 scripts need your review             │
│                                         │
│  ← [Reject]  ┌───────────────┐  [Approve] →
│              │ Script #1      │         │
│              │ By: John D.    │         │
│              │ ──────────     │         │
│              │ Hook video     │         │
│              │ fitness brand  │         │
│              │                │         │
│              │ [View Full →]  │         │
│              └───────────────┘         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Script #2 • Sarah M.                ││
│  │ Restaurant promo shoot              ││
│  │ [View Full →]                       ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [✅]       [📊]       [⚙️]    │
└─────────────────────────────────────────┘


STATUS TAB (Production Pipeline)
┌─────────────────────────────────────────┐
│  ◀ Production Status             [🔍]  │
├─────────────────────────────────────────┤
│  [PLAN] [SHOOT] [EDIT] [POST] [DONE]    │  ← Swipeable tabs
│    ●       ○       ○      ○      ○      │
├─────────────────────────────────────────┤
│  PLANNING (12 projects)                 │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ BCH015 • Awaiting videographer      ││
│  │ Script: John D. • 🔴 HIGH           ││
│  │ Profile: Fitness                    ││
│  │ [View] [Assign] [Edit]              ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ BCH018 • Awaiting videographer      ││
│  │ Script: Sarah M. • 🟡 NORMAL        ││
│  │ Profile: Not set                    ││
│  │ [View] [Set Profile] [Edit]         ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [🏠]    [✅]       [📊]       [⚙️]    │
└─────────────────────────────────────────┘
```

---

## PART 7: IMPLEMENTATION PLAN

### 7.1 Phase 1: Foundation (Week 1)

**Day 1-2: Design System Setup**
- [ ] Create design tokens file (colors, spacing, typography)
- [ ] Update tailwind.config.js with new tokens
- [ ] Create base component styles

**Day 3-4: Bottom Navigation Component**
- [ ] Build BottomNavigation component
- [ ] Implement role-based nav items
- [ ] Add active state animations
- [ ] Handle safe area insets (iOS)

**Day 5: Layout Restructure**
- [ ] Create new MobileLayout wrapper
- [ ] Update routing to use new layout
- [ ] Remove top navbar on mobile
- [ ] Test on various screen sizes

### 7.2 Phase 2: Core Components (Week 2)

**Day 1-2: Card Components**
- [ ] Build ProjectCard component
- [ ] Add swipe actions (react-swipeable)
- [ ] Implement tap and long-press handlers
- [ ] Create card variants (compact, full)

**Day 3-4: Bottom Sheet Component**
- [ ] Build BottomSheet with react-spring
- [ ] Add drag gestures
- [ ] Implement snap points
- [ ] Add backdrop handling

**Day 5: Form Components**
- [ ] Update FormInput for mobile
- [ ] Build FormSelect with mobile picker
- [ ] Create multi-step form wrapper
- [ ] Add keyboard-aware scroll view

### 7.3 Phase 3: Dashboard Redesigns (Week 3-4)

**Week 3: Videographer & Editor**
- [ ] Redesign VideographerDashboard
- [ ] Implement "Available Projects" view
- [ ] Add profile selection in pick flow
- [ ] Build file upload bottom sheet
- [ ] Redesign EditorDashboard similarly

**Week 4: Posting Manager & Admin**
- [ ] Redesign PostingManagerDashboard
- [ ] Build mobile calendar (list view)
- [ ] Implement swipeable kanban tabs
- [ ] Redesign Admin dashboard
- [ ] Build approval swipe cards

### 7.4 Phase 4: Polish & Testing (Week 5)

**Day 1-2: Animations**
- [ ] Add page transitions
- [ ] Implement skeleton loading
- [ ] Add micro-interactions
- [ ] Optimize animation performance

**Day 3-4: Testing**
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test various screen sizes
- [ ] Test landscape orientation
- [ ] Accessibility audit

**Day 5: PWA Setup**
- [ ] Add manifest.json
- [ ] Configure service worker
- [ ] Add install prompts
- [ ] Test offline functionality

### 7.5 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Mobile Lighthouse Score | ~60 | 90+ |
| Touch target compliance | ~40% | 100% |
| Time to complete action | High | -50% |
| User satisfaction (mobile) | Low | High |
| Cards-based views | 0% | 100% on mobile |
| Bottom nav adoption | N/A | All roles |

---

## APPENDIX: TECHNOLOGY RECOMMENDATIONS

### A.1 Recommended Libraries

| Purpose | Library | Why |
|---------|---------|-----|
| Gestures | react-use-gesture | Swipe, drag, pinch support |
| Animations | framer-motion | Already in use, powerful |
| Bottom Sheet | react-spring-bottom-sheet | Native-like behavior |
| Calendar | react-big-calendar | Customizable views |
| Icons | Heroicons + Lucide | Already in use |
| Forms | react-hook-form | Performance, validation |

### A.2 PWA Configuration

```json
// manifest.json
{
  "name": "Viral Content Analyzer",
  "short_name": "VCA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### A.3 Future: React Native Conversion

The mobile-first web design makes React Native conversion straightforward:

| Web Component | React Native Equivalent |
|---------------|------------------------|
| BottomNavigation | @react-navigation/bottom-tabs |
| BottomSheet | @gorhom/bottom-sheet |
| Cards | react-native-paper Card |
| Swipe Actions | react-native-swipe-list-view |
| Calendar | react-native-calendars |
| Forms | react-hook-form (same) |

---

## SOURCES & REFERENCES

- [Mobile Navigation Best Practices - Smashing Magazine](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/)
- [Bottom Navigation Bar Guide - AppMySite](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Bottom Tab Navigation Best Practices - UXD World](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)
- [Dashboard Design Principles - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Mobile Form Design Best Practices - Smashing Magazine](https://www.smashingmagazine.com/2018/08/best-practices-for-mobile-form-design/)
- [Bottom Sheet UI Design - Mobbin](https://mobbin.com/glossary/bottom-sheet)
- [UI Form Design Guide - Interaction Design Foundation](https://www.interaction-design.org/literature/article/ui-form-design)
- [Mobile App UI Design Best Practices 2025 - NextNative](https://nextnative.dev/blog/mobile-app-ui-design-best-practices)
- [PWA Design Practices - GoMage](https://www.gomage.com/blog/pwa-design/)

---

*Document Version: 1.0*
*Created: January 2025*
*Status: READY FOR REVIEW*
