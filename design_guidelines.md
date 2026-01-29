# Project & Task Management Web App - Design Guidelines

## Design Approach

**Selected Approach:** Design System with Linear & Notion Inspiration

This productivity-focused application prioritizes clarity, efficiency, and information density. Drawing from Linear's precise typography and Notion's flexible layouts, the design emphasizes scannable content, clear hierarchy, and minimal cognitive load.

---

## Core Design Elements

### A. Typography

**Primary Font:** Inter (via Google Fonts CDN)
- Headings: 600-700 weight for emphasis
- Body: 400-500 weight for readability
- UI Elements: 500 weight for consistency

**Hierarchy:**
- Page Titles: text-3xl (30px), font-semibold
- Section Headers: text-xl (20px), font-semibold  
- Card/Panel Titles: text-base (16px), font-medium
- Body Text: text-sm (14px), font-normal
- Metadata/Labels: text-xs (12px), font-medium, uppercase tracking-wide
- Timestamps: text-xs (12px), font-normal

### B. Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 4, 6, 8, 12, 16

**Common Patterns:**
- Component padding: p-4 or p-6
- Section margins: mb-8 or mb-12
- Card spacing: gap-4 between items
- Header heights: h-16 for top navigation
- Sidebar width: w-64 on desktop, collapsible on mobile

**Grid Systems:**
- Dashboard: 2-column split (sidebar + main content)
- List views: Full-width single column with max-w-7xl
- Kanban: Horizontal scrollable columns with min-w-80 per column
- Calendar: CSS Grid with 7 columns for week view

---

## C. Component Library

### Navigation & Layout

**Top Navigation Bar:**
- Fixed height (h-16), sticky positioning
- Left: Logo + workspace switcher dropdown
- Center: Global search bar (max-w-md, rounded-lg)
- Right: Notifications bell icon, user avatar dropdown
- Border bottom for subtle separation

**Sidebar Navigation:**
- Fixed width w-64 on desktop, overlay on mobile
- Sections: Projects, My Tasks, Team, Reports
- Nested project lists with indent (pl-4 for children)
- Active state: Subtle background highlight
- Icons from Heroicons (outline style)

### Cards & Panels

**Project Cards:**
- Rounded corners (rounded-lg)
- Padding p-6
- Header with project name + status badge
- Metadata row: Due date, assignees (avatar stack), progress bar
- Footer: Quick actions (edit, archive icons)

**Task Cards (Kanban):**
- Compact design with p-4 padding
- Title (font-medium, text-sm)
- Priority indicator: Small pill badge (uppercase, text-xs)
- Metadata: Avatar (h-6 w-6), due date icon + text
- Drag handle indicator on hover

**List View Rows:**
- Table-style layout with consistent column widths
- Checkbox (w-4 h-4), task name, assignee avatar, status dropdown, priority, due date
- Row height: h-12, hover background highlight
- Zebra striping for better scanability

### Forms & Inputs

**Input Fields:**
- Height h-10 for consistency
- Rounded borders (rounded-md)
- Placeholder text at 60% opacity
- Focus state: Border emphasis (ring-2)
- Label above input (text-sm, font-medium, mb-2)

**Buttons:**
- Primary: Solid background, rounded-md, px-4 py-2, font-medium
- Secondary: Bordered style, same dimensions
- Icon buttons: Square (h-10 w-10), rounded-md, centered icon
- Hover/active states: Subtle opacity shifts

**Dropdowns & Selectors:**
- Consistent height h-10
- Chevron icon right-aligned
- Multi-select with tag chips (rounded-full, text-xs, removable X)
- Autocomplete with search input + filtered results

### Data Display

**Kanban Board:**
- Horizontal scroll container
- Columns: min-w-80, max-w-sm, gap-4 between
- Column headers: Sticky, task count badge, add button
- Cards: Draggable, gap-3 vertical spacing
- Drop zones with dashed border on drag-over

**Calendar View:**
- Monthly grid: 7 columns (weekdays), 5-6 rows (weeks)
- Day cells: aspect-square, p-2
- Task indicators: Small dots or condensed bars
- Header: Month/year selector, today button, view toggle
- Popover on cell click for task details

**Dashboard Widgets:**
- Card-based layout with gap-6
- Stat cards: 2x2 grid on desktop, stacked on mobile
- Large number (text-4xl, font-bold)
- Label beneath (text-sm, uppercase, tracking-wide)
- Trend indicator (small icon + percentage)

**Progress Indicators:**
- Progress bars: h-2, rounded-full, track + fill
- Percentage text: text-xs, right-aligned
- Circular progress: For time tracking, stroke-dasharray animation

### Overlays & Modals

**Task Detail Modal:**
- Max width max-w-3xl, centered overlay
- Header: Task title (editable), close X button, status dropdown
- Body: Description editor, metadata fields, comment thread
- Footer: Action buttons (save, delete)
- Backdrop: Semi-transparent overlay with blur

**Dropdown Menus:**
- Positioned absolute to trigger
- Rounded-lg, shadow-lg
- Menu items: px-4 py-2, hover background
- Dividers between logical groups
- Icons left-aligned with text

**Toast Notifications:**
- Fixed bottom-right position
- Slide-in animation (translateY)
- Auto-dismiss after 4 seconds
- Success/error variants with appropriate icons
- Dismissible X button

---

## D. Responsive Behavior

**Breakpoints:**
- Mobile: Base styles, single column, stacked layouts
- Tablet (md:): 2-column where appropriate, condensed sidebar
- Desktop (lg:+): Full multi-column, fixed sidebar, optimized spacing

**Mobile Adaptations:**
- Hamburger menu for sidebar navigation
- Bottom tab bar for primary actions
- Single column list views
- Swipe gestures for Kanban columns
- Simplified calendar (week view default)

---

## E. Interaction Patterns

**Drag & Drop:**
- Visual feedback: Opacity 50% on drag
- Drop zone indicators: Dashed border
- Smooth transitions: 150ms ease

**Inline Editing:**
- Click-to-edit for task titles, descriptions
- Show/hide edit mode on focus/blur
- Auto-save indicators (small checkmark)

**Bulk Actions:**
- Checkbox selection in list views
- Floating action bar appears on selection
- Actions: Assign, change status, delete, move

---

## F. Accessibility

- Semantic HTML throughout (nav, main, article, section)
- ARIA labels on icon-only buttons
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators (ring-2 ring-offset-2)
- Sufficient contrast ratios (WCAG AA minimum)
- Screen reader announcements for dynamic updates

---

## Images

This web application does not require hero images or decorative photography. All visual elements serve functional purposes:

**User Avatars:** Circular (rounded-full), sizes h-6 w-6 (inline), h-10 w-10 (profiles)

**Empty States:** Simple line illustrations (via CDN like Undraw) showing:
- Empty project list: Folder illustration
- No tasks: Checklist illustration  
- No team members: Team illustration

**Icons:** Heroicons (outline style) for all UI actions and indicators