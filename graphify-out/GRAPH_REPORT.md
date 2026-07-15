# Graph Report - .  (2026-07-13)

## Corpus Check
- 235 files · ~57,068 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1132 nodes · 2809 edges · 110 communities (50 shown, 60 thin omitted)
- Extraction: 99% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.74)
- Token cost: 1,200 input · 2,100 output

## Community Hubs (Navigation)
- App Components & UI Primitives
- Marketing Pages & Motion UI
- Scripts Feature & LLM Providers
- Product Management & Scoring
- Media Upload & Storage
- Finance Dashboard & Tables
- TypeScript Config & Project Refs
- Calendar & Publishing
- App Shell UI & Utils
- Auth & Contact Forms
- Server Actions & Result Types
- Video Jobs & Polling
- Audit Log & Finance Validation
- Finance Calculations & Dashboard Service
- Affiliate Link Builder & Encryption
- Affiliate Links, Campaigns, Videos Pages
- Publishing Status & Social Mock Provider
- Package Scripts
- App Shell User Menu & Avatar
- Video Mock Provider & Types
- Project Metadata & External Refs
- Dev Dependencies
- Public SVG Assets
- Campaigns Kanban & Status
- Media Page & Grid
- Charts & Design Tokens
- Command Palette & Quick Actions
- Analytics Page & Funnel Charts
- Dashboard Period Filters
- Core Dependencies (Next, AWS, Zod)
- CSV Export & DB Client
- Dashboard KPI Cards & Animated Numbers
- Data Table & Table Components
- Campaign Detail & Confirm Dialog
- Dashboard Page & Audit Format
- Root Layout, Fonts & Toaster
- App Shell Navigation & Breadcrumbs
- Scripts Server Actions & Validation
- Analytics Filters & Platform Lib
- Social Mock Provider & Types
- Product Validation Schemas
- App Layout & Auth RequireUser
- 3D Product Core Scene
- Campaign Validation & Server Actions
- Product Score Badge & Badge UI
- Page Templates & Transitions
- Notifications Center & Actions
- Video Validation Schemas
- Package Metadata
- Proxy Config
- bcryptjs Dependency
- class-variance-authority Dependency
- clsx Dependency
- cmdk Dependency
- dotenv Dev Dependency
- ESLint Config
- ESLint Config Next
- hookform-resolvers Dependency
- jose Dependency
- lucide-react Dependency
- motion Dependency
- Next.js Config
- pg Dependency
- Prisma Adapter PG
- Prisma Client
- Radix Accordion
- Radix Avatar
- Radix Checkbox
- Radix Dialog
- Radix Dropdown Menu
- Radix Label
- Radix Popover
- Radix Radio Group
- Radix Scroll Area
- Radix Select
- Radix Separator
- Radix Slot
- Radix Switch
- Radix Tabs
- Radix Toast
- Radix Tooltip
- React Dependency
- React DOM Dependency
- React Hook Form
- React Three Drei
- React Three Fiber
- Recharts
- Sonner
- Tailwind Merge
- TanStack React Table
- Three.js
- Playwright Test
- Prettier
- Prettier Tailwind Plugin
- TailwindCSS
- Tailwind Animate
- Testing Library React
- Testing Library User Event
- tsx
- Types Node
- Types PG
- Types React DOM
- Types Three
- Vitest
- PostCSS Config
- Prisma Config
- Next.js Breaking Changes Rule
- Next.js Agent Rules Tool

## God Nodes (most connected - your core abstractions)
1. `cn()` - 56 edges
2. `getCurrentUser` - 49 edges
3. `Button` - 45 edges
4. `fail()` - 42 edges
5. `writeAuditLog()` - 41 edges
6. `newRequestId()` - 41 edges
7. `ok()` - 40 edges
8. `runMutation()` - 32 edges
9. `Badge()` - 28 edges
10. `Result` - 28 edges

## Surprising Connections (you probably didn't know these)
- `seedProducts()` --calls--> `computeProductScore()`  [EXTRACTED]
  prisma/seed.ts → src/features/products/scoring.ts
- `LoginPage()` --calls--> `getCurrentUser`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/lib/auth/current-user.ts
- `AffiliateProgramsPage()` --calls--> `listAffiliatePrograms()`  [EXTRACTED]
  src/app/app/affiliate-programs/page.tsx → src/server/services/affiliate.ts
- `AnalyticsPage()` --calls--> `getAnalyticsData()`  [EXTRACTED]
  src/app/app/analytics/page.tsx → src/server/services/analytics.ts
- `TaxReservePanel()` --indirect_call--> `saveTaxSettingAction()`  [INFERRED]
  src/components/finance/tax-reserve-panel.tsx → src/server/actions/finance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Next.js Project Ecosystem** — project:ugc-affiliate-os, framework:nextjs, tool:create-next-app, tool:next-font, https_vercel_com_font_geist, platform:vercel, file:app-page-tsx [0.95]
- **README Documentation References** — file:readme-md, resource:nextjs-docs, resource:learn-nextjs, repo:nextjs-github, resource:vercel-deploy, resource:vercel-deploy-docs [1.0]
- **Agent Configuration Chain** — file:claude-md, file:ag-agents-md, rule:nextjs-agent-rules, rule:nextjs-breaking-changes [1.0]
- **Development Workflow** — file:readme-md, command:dev, url:localhost3000, file:app-page-tsx [1.0]
- **File Icon Visual Components** — public_file_file_icon, public_file_folded_corner, public_file_content_lines [EXTRACTED 1.00]
- **Globe Icon Visual Components** — public_globe_globe_icon, public_globe_spherical_globe, public_globe_meridians, public_globe_parallels [EXTRACTED 1.00]
- **Mock Video Result Visual Components** — public_mock_video_result_mock_video_result, public_mock_video_result_gradient_background, public_mock_video_result_play_button, public_mock_video_result_play_triangle, public_mock_video_result_german_text_mock_videoergebnis, public_mock_video_result_german_text_lokal_simuliert [EXTRACTED 1.00]
- **Public UI Icons Set** — public_file_file_icon, public_globe_globe_icon [INFERRED 0.85]
- **Public Mock Assets Set** — public_mock_video_result_mock_video_result [INFERRED 0.75]

## Communities (110 total, 60 thin omitted)

### Community 0 - "App Components & UI Primitives"
Cohesion: 0.07
Nodes (55): AffiliateProgramsPage(), metadata, Option, ProgramDialog(), ProgramDialogInitial, ProgramRow, ProgramsTable(), Option (+47 more)

### Community 1 - "Marketing Pages & Motion UI"
Cohesion: 0.05
Nodes (43): LoginPage(), LoginPageProps, metadata, metadata, metadata, NETWORKS, metadata, metadata (+35 more)

### Community 2 - "Scripts Feature & LLM Providers"
Cohesion: 0.05
Nodes (47): metadata, ScriptsPage(), AppShellProps, NotificationItem, ThemeSwitcher(), COLUMNS, SiteFooter(), NAV_LINKS (+39 more)

### Community 3 - "Product Management & Scoring"
Cohesion: 0.07
Nodes (46): adapter, AGENT_CATALOG, daysAgo(), main(), prisma, PRODUCT_SEED, seedAdminUser(), seedAffiliateLinks() (+38 more)

### Community 4 - "Media Upload & Storage"
Cohesion: 0.09
Nodes (24): GET(), MIME_BY_EXT, MediaUploadZone(), buildStorageKey(), isValidStorageKey(), LocalStorageProvider, localStorageRoot(), STORAGE_ROOT (+16 more)

### Community 5 - "Finance Dashboard & Tables"
Cohesion: 0.12
Nodes (25): PlatformBreakdownRow, PlatformBreakdownTable(), ExpenseDialog(), ExpenseInitial, ExpenseRow, ExpensesTable(), Option, FinanceOverview() (+17 more)

### Community 6 - "TypeScript Config & Project Refs"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 7 - "Calendar & Publishing"
Cohesion: 0.12
Nodes (22): CalendarPage(), metadata, metadata, PublishingPage(), CalendarPost, ContentCalendar(), dateKey(), STATUS_VARIANT (+14 more)

### Community 8 - "App Shell UI & Utils"
Cohesion: 0.12
Nodes (18): LEVEL_DOT, MediaThumb(), StatusDot(), StatusTone, TONE_COLOR, CardFooter(), CommandShortcut(), EmptyState() (+10 more)

### Community 9 - "Auth & Contact Forms"
Cohesion: 0.14
Nodes (19): LoginForm(), verifyPassword(), attempts, clearAttempts(), isRateLimited(), recordAttempt(), generateOpaqueSecret(), getAuthSecretKey() (+11 more)

### Community 10 - "Server Actions & Result Types"
Cohesion: 0.33
Nodes (26): writeAuditLog(), getCurrentUser, resolveVideoProvider(), saveAffiliateProgramAction(), changeCampaignStatusAction(), saveCampaignAction(), saveExpenseAction(), saveRevenueAction() (+18 more)

### Community 11 - "Video Jobs & Polling"
Cohesion: 0.13
Nodes (18): generateMetadata(), VideoJobPage(), VideoJobPageProps, metadata, VideosPage(), Progress, STATUS_VARIANT, VideoJobDetail() (+10 more)

### Community 12 - "Audit Log & Finance Validation"
Cohesion: 0.13
Nodes (20): AuditEntryInput, expenseCategoryEnum, ExpenseFormInput, expenseFormSchema, idSchema, RevenueFormInput, revenueFormSchema, revenueStatusEnum (+12 more)

### Community 13 - "Finance Calculations & Dashboard Service"
Cohesion: 0.16
Nodes (20): FinancePage(), metadata, estimateTaxReserve(), FinanceSummary, Money, summarizeFinance(), sumMoney(), TaxReserveInput (+12 more)

### Community 14 - "Affiliate Link Builder & Encryption"
Cohesion: 0.12
Nodes (18): buildTrackedUrl(), generateShortSlug(), UtmParams, decryptSecret(), EncryptedPayload, encryptSecret(), getMasterKey(), AffiliateLinkInput (+10 more)

### Community 15 - "Affiliate Links, Campaigns, Videos Pages"
Cohesion: 0.17
Nodes (16): AffiliateLinksPage(), metadata, metadata, NewCampaignPage(), metadata, NewVideoJobPage(), LinkDialog(), LinkDialogInitial (+8 more)

### Community 16 - "Publishing Status & Social Mock Provider"
Cohesion: 0.18
Nodes (16): isValidPostTransition(), SocialPostStatus, TERMINAL_STATUSES, resolveSocialProvider(), idSchema, parseHashtags(), PostFormInput, postFormSchema (+8 more)

### Community 17 - "Package Scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:generate, db:migrate, db:migrate:deploy, db:reset, db:seed, db:studio (+10 more)

### Community 18 - "App Shell User Menu & Avatar"
Cohesion: 0.16
Nodes (14): QuickCreate(), UserMenu(), Avatar, AvatarFallback, AvatarImage, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem (+6 more)

### Community 19 - "Video Mock Provider & Types"
Cohesion: 0.18
Nodes (8): MockJobRecord, MockVideoProvider, registry, LIVE_ENV_KEYS, VideoJobProviderState, VideoJobProviderStatus, VideoJobRequest, VideoProvider

### Community 20 - "Project Metadata & External Refs"
Cohesion: 0.12
Nodes (17): npm run dev, AGENTS.md, app/page.tsx, CLAUDE.md, README.md, Next.js, Geist, Vercel (+9 more)

### Community 21 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): eslint, jsdom, devDependencies, eslint, jsdom, prisma, @tailwindcss/postcss, @testing-library/jest-dom (+9 more)

### Community 22 - "Public SVG Assets"
Cohesion: 0.13
Nodes (16): Content Lines, Document Icon, File Icon, Folded Corner, Globe Icon, Meridians, Parallels, Spherical Globe (+8 more)

### Community 23 - "Campaigns Kanban & Status"
Cohesion: 0.24
Nodes (10): CampaignsPage(), metadata, CampaignsKanban(), CampaignRow, CampaignsTable(), CampaignsView(), CAMPAIGN_STATUS_FLOW, CampaignStatus (+2 more)

### Community 24 - "Media Page & Grid"
Cohesion: 0.20
Nodes (11): MediaPage(), MediaPageProps, metadata, MediaDetailDialog(), MediaFilters(), MediaAssetItem, MediaGrid(), MediaPageClient() (+3 more)

### Community 25 - "Charts & Design Tokens"
Cohesion: 0.24
Nodes (10): TrendPoint, ChartTooltip(), ChartTooltipProps, HistoryPoint, brandColors, breakpoints, chartChrome, chartSeries (+2 more)

### Community 26 - "Command Palette & Quick Actions"
Cohesion: 0.24
Nodes (11): CommandPalette(), Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+3 more)

### Community 27 - "Analytics Page & Funnel Charts"
Cohesion: 0.20
Nodes (9): AnalyticsPage(), AnalyticsPageProps, metadata, VALID_PERIODS, FunnelTrendChart(), BarList(), BarListItem, ConversionFunnel() (+1 more)

### Community 28 - "Dashboard Period Filters"
Cohesion: 0.30
Nodes (8): PeriodFilter(), DashboardPeriod, PERIOD_OPTIONS, getPeriodRange(), AnalyticsData, AnalyticsFilters, dayKey(), getAnalyticsData()

### Community 29 - "Core Dependencies (Next, AWS, Zod)"
Cohesion: 0.18
Nodes (11): @aws-sdk/client-s3, date-fns, next, dependencies, @aws-sdk/client-s3, date-fns, next, @radix-ui/react-progress (+3 more)

### Community 30 - "CSV Export & DB Client"
Cohesion: 0.29
Nodes (6): RFC-4180, GET(), GET(), escapeField(), parseCsv(), toCsv()

### Community 31 - "Dashboard KPI Cards & Animated Numbers"
Cohesion: 0.25
Nodes (8): KpiCard(), KpiCardProps, TONE_CLASS, FORMATTERS, KpiValue(), KpiVariant, AnimatedNumber(), AnimatedNumberProps

### Community 32 - "Data Table & Table Components"
Cohesion: 0.29
Nodes (9): DataTableProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+1 more)

### Community 33 - "Campaign Detail & Confirm Dialog"
Cohesion: 0.27
Nodes (8): CampaignDetailPage(), CampaignDetailPageProps, generateMetadata(), CampaignFormInitial, CampaignStatusControl(), DeleteCampaignButton(), ConfirmDialog(), getCampaignById()

### Community 34 - "Dashboard Page & Audit Format"
Cohesion: 0.24
Nodes (8): DashboardPage(), DashboardPageProps, metadata, VALID_PERIODS, RevenueCostChart(), ACTION_LABELS, formatAuditAction(), AGENT_STATUS_LABELS

### Community 35 - "Root Layout, Fonts & Toaster"
Cohesion: 0.24
Nodes (6): geistMono, geistSans, metadata, viewport, ThemeScript(), Toaster()

### Community 36 - "App Shell Navigation & Breadcrumbs"
Cohesion: 0.27
Nodes (7): Breadcrumbs(), SidebarNav(), ALL_NAV_ITEMS, findNavItem(), NAV_SECTIONS, NavItem, NavSection

### Community 37 - "Scripts Server Actions & Validation"
Cohesion: 0.27
Nodes (8): resolveScriptProvider(), idSchema, ScriptGenerateInput, scriptGenerateSchema, scriptStatusEnum, changeScriptStatusAction(), deleteScriptAction(), statusChangeSchema

### Community 38 - "Analytics Filters & Platform Lib"
Cohesion: 0.31
Nodes (7): AnalyticsFilters(), Option, ENUM_TO_LABEL, LABEL_TO_ENUM, PLATFORM_OPTIONS, platformEnumValue(), platformLabel()

### Community 39 - "Social Mock Provider & Types"
Cohesion: 0.39
Nodes (4): MockSocialProvider, SocialProvider, SocialPublishRequest, SocialPublishResult

### Community 40 - "Product Validation Schemas"
Cohesion: 0.22
Nodes (8): dimensionValue, ProductFormInput, productFormSchema, productIdSchema, productScoreDimensionsSchema, productStatusEnum, riskLevelEnum, trendStatusEnum

### Community 41 - "App Layout & Auth RequireUser"
Cohesion: 0.46
Nodes (5): AppLayout(), AppShell(), requireUser(), countUnreadNotifications(), listRecentNotifications()

### Community 43 - "Campaign Validation & Server Actions"
Cohesion: 0.36
Nodes (6): CampaignFormInput, campaignFormSchema, campaignStatusEnum, idSchema, statusChangeSchema, deleteCampaignAction()

### Community 44 - "Product Score Badge & Badge UI"
Cohesion: 0.52
Nodes (4): ScoreBadge(), Badge(), BadgeProps, badgeVariants

### Community 46 - "Notifications Center & Actions"
Cohesion: 0.50
Nodes (4): NotificationsCenter(), markAllNotificationsReadAction(), markNotificationReadAction(), markReadSchema

### Community 47 - "Video Validation Schemas"
Cohesion: 0.40
Nodes (4): idSchema, VideoJobFormInput, videoJobFormSchema, videoProviderEnum

### Community 48 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 49 - "Proxy Config"
Cohesion: 0.67
Nodes (3): config, proxy(), redirectToLogin()

## Knowledge Gaps
- **331 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+326 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `App Shell UI & Utils` to `App Components & UI Primitives`, `Marketing Pages & Motion UI`, `Scripts Feature & LLM Providers`, `Data Table & Table Components`, `App Shell Navigation & Breadcrumbs`, `Media Upload & Storage`, `Finance Dashboard & Tables`, `Video Jobs & Polling`, `Product Score Badge & Badge UI`, `Notifications Center & Actions`, `App Shell User Menu & Avatar`, `Media Page & Grid`, `Command Palette & Quick Actions`, `Analytics Page & Funnel Charts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Button` connect `App Components & UI Primitives` to `Marketing Pages & Motion UI`, `Scripts Feature & LLM Providers`, `Product Management & Scoring`, `Campaign Detail & Confirm Dialog`, `Finance Dashboard & Tables`, `Analytics Filters & Platform Lib`, `Calendar & Publishing`, `App Shell UI & Utils`, `Media Upload & Storage`, `Video Jobs & Polling`, `Product Score Badge & Badge UI`, `Affiliate Links, Campaigns, Videos Pages`, `App Shell User Menu & Avatar`, `Campaigns Kanban & Status`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Badge()` connect `Product Score Badge & Badge UI` to `App Components & UI Primitives`, `Campaign Detail & Confirm Dialog`, `Dashboard Page & Audit Format`, `Product Management & Scoring`, `Marketing Pages & Motion UI`, `Scripts Feature & LLM Providers`, `Finance Dashboard & Tables`, `Calendar & Publishing`, `App Shell UI & Utils`, `Video Jobs & Polling`, `Affiliate Links, Campaigns, Videos Pages`, `Campaigns Kanban & Status`, `Media Page & Grid`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _331 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Components & UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.07216494845360824 - nodes in this community are weakly interconnected._
- **Should `Marketing Pages & Motion UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05477477477477478 - nodes in this community are weakly interconnected._
- **Should `Scripts Feature & LLM Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.05456095481670929 - nodes in this community are weakly interconnected._