import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AppWindow,
  ArrowLeft,
  Boxes,
  BookOpen,
  Camera,
  Download,
  Check,
  ChevronRight,
  CircleHelp,
  CircleDollarSign,
  Coins,
  CreditCard,
  Eye,
  FileArchive,
  Gauge,
  House,
  LayoutGrid,
  Mail,
  LogOut,
  Maximize,
  MoreHorizontal,
  Palette,
  Pencil,
  ImagePlus,
  KeyRound,
  Play,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  Power,
  RotateCcw,
  RotateCw,
  Square,
  Sparkles,
  Smartphone,
  Trash2,
  Type,
  Search,
  Upload,
  UserRound,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Switch,
  Toast,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./components/ui";
import {
  controlSession,
  deleteAgentConversation,
  getAppDefaults,
  getBilling,
  endSession,
  getMcpSettings,
  getEmailPreferences,
  getUsage,
  listAgentConversations,
  listApps,
  listSessions,
  removeApp,
  removeSession,
  saveApp,
  saveAppDefaults,
  saveMcpSettings,
  saveEmailPreferences,
  saveUsageLimits,
  redeemPromo,
  renameAgentConversation,
  sessionScreenshotUrl,
  startSession,
  updateApp,
  type AppRecord,
  type BillingOverview,
  type AppDefaults,
  type DeviceControl,
  type SessionRecord,
  type UsageLimits,
  type UsageSummary,
  type McpSettings,
  type EmailPreferences,
} from "./storage";
import { validateApk } from "./upload";
import { authClient } from "./auth-client";
import { BetterAuthScreen } from "./auth-screen";
import { FadeContent } from "./components/fade-content";
import { LandingPage } from "./landing-page";
import { ProductPage } from "./product-page";
import { DocsPage } from "./docs-page";
import { WhySulphurPage } from "./why-sulphur-page";
import { LegalPage, PricingPage, ResourceDetailPage, ResourcesPage } from "./public-pages";
import { DashboardOverview } from "./components/dashboard-overview";
import { AdminPage } from "./admin-page";
import { SessionPanel } from "./components/session-panel";
import { AgentChat } from "./components/agent-chat";
import { LatticeLoader } from "./components/lattice-loader";
import { Iphone } from "../@/components/ui/iphone";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../@/components/ui/command";
import "./styles.css";

function PageMeta({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  useEffect(() => {
    const siteUrl = "https://sulphur.dev";
    const canonicalUrl = `${siteUrl}${window.location.pathname}`;
    document.title = `${title} · Sulphur`;
    let tag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = description;
    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let meta = document.head.querySelector<HTMLMetaElement>(selector);
      if (!meta) { meta = document.createElement("meta"); meta.setAttribute(attribute, key); document.head.appendChild(meta); }
      meta.content = content;
    };
    setMeta('meta[name="keywords"]', "name", "keywords", "Android testing, mobile app testing, AI agents, MCP, Android emulator, mobile QA, developer tools");
    setMeta('meta[name="robots"]', "name", "robots", "index, follow, max-image-preview:large");
    setMeta('meta[property="og:title"]', "property", "og:title", `${title} · Sulphur`);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", `${siteUrl}/og-sulphur.svg`);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", `${title} · Sulphur`);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", `${siteUrl}/og-sulphur.svg`);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    let structured = document.querySelector<HTMLScriptElement>("#sulphur-structured-data");
    if (!structured) { structured = document.createElement("script"); structured.id = "sulphur-structured-data"; structured.type = "application/ld+json"; document.head.appendChild(structured); }
    structured.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Sulphur", applicationCategory: "DeveloperApplication", operatingSystem: "Web", url: canonicalUrl, description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } });
  }, [title, description]);
  return null;
}
function CanonicalLocalhost({ children }: { children: ReactNode }) {
  if (
    window.location.hostname === "127.0.0.1" &&
    window.location.port === "5173"
  ) {
    window.location.replace(
      `http://localhost:5173${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    return null;
  }
  return <>{children}</>;
}
const formatSize = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

type AppearancePreferences = {
  fontFamily: "inter" | "system" | "serif" | "mono";
  fontSize: "small" | "medium" | "large";
  density: "compact" | "comfortable" | "spacious";
  radius: "sharp" | "soft" | "rounded";
  reduceMotion: boolean;
};

const appearanceStorageKey = "sulphur:appearance-preferences";
const defaultAppearance: AppearancePreferences = {
  fontFamily: "inter", fontSize: "medium", density: "comfortable", radius: "soft", reduceMotion: false,
};
const readAppearance = (): AppearancePreferences => {
  try {
    const saved = window.localStorage.getItem(appearanceStorageKey);
    return saved ? { ...defaultAppearance, ...JSON.parse(saved) } : defaultAppearance;
  } catch { return defaultAppearance; }
};
const applyAppearance = (preferences: AppearancePreferences) => {
  const root = document.body;
  root.dataset.uiFontFamily = preferences.fontFamily;
  root.dataset.uiFontSize = preferences.fontSize;
  root.dataset.uiDensity = preferences.density;
  root.dataset.uiRadius = preferences.radius;
  root.dataset.uiReduceMotion = String(preferences.reduceMotion);
};

function UploadApp({ onSaved, defaults }: { onSaved(app: AppRecord): void; defaults?: AppDefaults }) {
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File>(),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseFile = (next?: File) => {
    setError("");
    if (!next) return;
    const issue = validateApk(next);
    if (issue) {
      setFile(undefined);
      setError(issue);
      return;
    }
    setFile(next);
  };
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFile(undefined);
      setName("");
      setDescription("");
      setError("");
    }
  };
  const save = async () => {
    const issue = validateApk(file);
    if (issue) return setError(issue);
    if (!name.trim()) return setError("Give this app a name.");
    setSaving(true);
    try {
      onSaved(
        await saveApp(file!, name.trim(), description.trim(), "restricted"),
      );
      close(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Your APK could not be saved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <Upload size={16} />
          Upload APK
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Add an Android app</DialogTitle>
        <DialogDescription className="dialog-description">
          Give it a clear name so it is easy to find when you prepare a test
          session.
        </DialogDescription>
        <div className="form-stack">
          <div>
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              value={name}
              maxLength={120}
              placeholder="For example, Storefront staging"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="app-description">
              Description <span className="optional-label">Optional</span>
            </Label>
            <textarea
              id="app-description"
              className="input textarea"
              value={description}
              maxLength={1000}
              placeholder="What should an agent test in this app?"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="apk">APK file</Label>
            <input
              ref={inputRef}
              id="apk"
              className="sr-only"
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <div
              className={`apk-dropzone${dragging ? " is-dragging" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files?.[0]);
              }}
            >
              <Upload size={20} />
              <strong>
                {file ? "Choose a different APK" : "Drop an APK here"}
              </strong>
              <span>or click to browse your files</span>
            </div>
            {file && (
              <p className="file-selection">
                <FileArchive size={15} />
                {file.name}
                <span>{formatSize(file.size)}</span>
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="policy-note">
            <strong>Session safety</strong>
            <p>
              New sessions for this APK will start with internet access {defaults?.defaultEgressAllowed ? "allowed" : "blocked"} and expire after {defaults?.sessionDurationMinutes ?? 60} minutes. Change these workspace defaults in Settings → Apps.
            </p>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save app"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditApp({
  app,
  onSaved,
}: {
  app: AppRecord;
  onSaved(app: AppRecord): void;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(app.name),
    [description, setDescription] = useState(app.description ?? ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return setError("Give this app a name.");
    setSaving(true);
    try {
      onSaved(await updateApp(app.id, name.trim(), description.trim()));
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The app could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="row-icon-action" aria-label={`Edit ${app.name}`} title={`Edit ${app.name}`}>
          <Pencil size={15} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Edit app details</DialogTitle>
        <DialogDescription className="dialog-description">
          Update how this saved APK appears in your workspace.
        </DialogDescription>
        <div className="form-stack">
          <div>
            <Label htmlFor={`name-${app.id}`}>App name</Label>
            <Input
              id={`name-${app.id}`}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`description-${app.id}`}>
              Description <span className="optional-label">Optional</span>
            </Label>
            <textarea
              id={`description-${app.id}`}
              className="input textarea"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SilentLoadingPage() {
  return (
    <div aria-busy="true" className="min-h-screen bg-[#f8f8f6]">
      <span className="sr-only">Loading</span>
    </div>
  );
}
function LandingRoute() {
  const { data } = authClient.useSession();
  const signedIn = Boolean(data?.user);
  return (
    <>
      <PageMeta
        title="Android apps for agents"
        description="Turn an Android APK into an MCP-connectable test environment for your agents."
      />
      <LandingPage signedIn={signedIn} />
    </>
  );
}
function ProductRoute() {
  const { data } = authClient.useSession();
  return <><PageMeta title="Product" description="See how Sulphur turns Android APKs into controlled agent-ready test environments." /><ProductPage signedIn={Boolean(data?.user)} /></>
}
function WhySulphurRoute() { const { data } = authClient.useSession(); return <><PageMeta title="Why Sulphur" description="Why teams use Sulphur for controlled, agent-ready Android testing." /><WhySulphurPage signedIn={Boolean(data?.user)} /></> }
function PublicRoute({ page }: { page: "docs" | "pricing" | "resources" | "resource-detail" | "legal" }) {
  const { data } = authClient.useSession();
  const signedIn = Boolean(data?.user);
  if (page === "docs") return <><PageMeta title="Documentation" description="Guides for using Sulphur with Android test sessions and approved agents." /><DocsPage signedIn={signedIn} /></>;
  if (page === "pricing") return <><PageMeta title="Pricing" description="Sulphur workspace plans for agent-ready Android testing." /><PricingPage signedIn={signedIn} /></>;
  if (page === "resources") return <><PageMeta title="Resources" description="Sulphur product notes, updates, and contact information." /><ResourcesPage signedIn={signedIn} /></>;
  if (page === "resource-detail") return <><PageMeta title="Resources" description="Sulphur blog, release updates, FAQs, and company information." /><ResourceDetailPage signedIn={signedIn} /></>;
  return <><PageMeta title="Legal" description="Sulphur legal, privacy, and security policies." /><LegalPage signedIn={signedIn} /></>;
}
function AuthRoute({ view }: { view: "sign-in" | "create" }) {
  const { data, isPending } = authClient.useSession();
  if (!isPending && data?.user?.emailVerified) return <Navigate to="/dashboard" replace />;
  const create = view === "create";
  return (
    <>
      <PageMeta
        title={create ? "Create your agent workspace" : "Sign in to Sulphur"}
        description={
          create
            ? "Create a Sulphur account to prepare Android APKs for agent testing."
            : "Sign in to access your Android agent-test workspaces."
        }
      />
      <FadeContent>
        <BetterAuthScreen initialView={data?.user ? "verify-email" : view} initialEmail={data?.user?.email ?? ""} />
      </FadeContent>
    </>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate(),
    [signingOut, setSigningOut] = useState(false);
  useEffect(() => applyAppearance(readAppearance()), []);
  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    navigate("/", { replace: true });
    setSigningOut(false);
  };
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " active" : ""}`;
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/">
          <span className="brand-mark">S</span>Sulphur
        </a>
        <nav>
          <NavLink end className={navClass} to="/dashboard">
            <Gauge size={17} />
            Dashboard
          </NavLink>
          <NavLink className={navClass} to="/apps">
            <LayoutGrid size={17} />
            Apps
          </NavLink>
          <NavLink className={navClass} to="/sessions">
            <AppWindow size={17} />
            Sessions
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link cotester-nav${isActive ? " active" : ""}`} to="/cotester">
            <Sparkles size={17} />
            CoTester
            <span>NEW</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <NavLink className={navClass} to="/settings/billing">
            <CreditCard size={17} />
            Billing
          </NavLink>
          <NavLink className={navClass} to="/settings">
            <Settings size={17} />
            Settings
          </NavLink>
          <button
            className="nav-link"
            type="button"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut size={17} />
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </aside>
      {children}
    </div>
  );
}

function AppsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRecord[]>([]),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState(""),
    [guidance, setGuidance] = useState(false),
    [startingId, setStartingId] = useState("");
  const [defaults, setDefaults] = useState<AppDefaults>({ defaultEgressAllowed: false, sessionDurationMinutes: 60, cleanStart: true, defaultOrientation: "portrait", sessionRetentionDays: 30 });
  useEffect(() => {
    listApps()
      .then(setApps)
      .catch(() =>
        setToast(
          "Saved apps could not be loaded. Please refresh and try again.",
        ),
      )
      .finally(() => setLoading(false));
    getAppDefaults().then(setDefaults).catch(() => undefined);
  }, []);
  const add = (app: AppRecord) => {
    setApps((all) => [app, ...all]);
    setToast("APK saved. It will be available when agent sessions are ready.");
  };
  const remove = async (id: string) => {
    try {
      await removeApp(id);
      setApps((all) => all.filter((app) => app.id !== id));
      setToast("App removed.");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "This app could not be removed. Your list has not changed.");
    }
  };
  const update = (updated: AppRecord) =>
    setApps((all) => all.map((app) => (app.id === updated.id ? updated : app)));
  const prepare = (id: string) =>
    navigate(`/sessions/preparing?app=${encodeURIComponent(id)}`);
  return (
    <>
      <PageMeta
        title="Apps"
        description="Add Android APKs and prepare MCP-connectable agent test environments."
      />
      <ToastProvider>
        <AppShell>
          <main className="content">
            <header className="topbar">
              <button className="workspace">
                <span className="workspace-dot" />
                Your workspace <ChevronRight size={15} />
              </button>
              <div className="top-actions">
                <button
                  className="icon-button"
                  aria-label="Get help"
                  onClick={() => setGuidance(true)}
                >
                  <CircleHelp size={18} />
                </button>
                <UploadApp onSaved={add} defaults={defaults} />
              </div>
            </header>
            <section className="page-heading">
              <div>
                <p className="eyebrow">AGENT-READY ANDROID APPS</p>
                <h1>Apps</h1>
                <p>
                  Upload an APK once, then prepare a controlled test environment
                  that an approved agent can connect to through MCP.
                </p>
              </div>
              <Card className="trust-card">
                <ShieldCheck size={19} />
                <div>
                  <strong>Private by default</strong>
                  <span>
                    Each future session is isolated before an agent can connect.
                  </span>
                </div>
                <Switch
                  checked={defaults.defaultEgressAllowed}
                  onCheckedChange={(defaultEgressAllowed) => {
                    const next = { ...defaults, defaultEgressAllowed };
                    setDefaults(next);
                    saveAppDefaults(next).catch(() => {
                      setDefaults(defaults);
                      setToast("Network default could not be saved. Please try again.");
                    });
                  }}
                  label="Allow network access by default"
                />
              </Card>
            </section>
            {loading ? (
              <Card className="empty-state">
                <p>Loading your apps…</p>
              </Card>
            ) : apps.length === 0 ? (
              <Card className="empty-state">
                <div className="empty-icon">
                  <Boxes size={23} />
                </div>
                <h2>Add your first Android app</h2>
                <p>
                  Save an APK now. When the session service is available,
                  Sulphur will create an isolated environment and MCP connection
                  for it.
                </p>
                <UploadApp onSaved={add} defaults={defaults} />
              </Card>
            ) : (
              <Card className="apps-card">
                <div className="table-heading">
                  <div>
                    <h2>Your apps</h2>
                    <p>
                      Each saved APK can become an isolated agent test
                      environment.
                    </p>
                  </div>
                  <UploadApp onSaved={add} defaults={defaults} />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>App</th>
                        <th>Uploaded</th>
                        <th>Access</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((app) => (
                        <tr key={app.id}>
                          <td>
                            <div className="app-cell">
                              <span className="apk-icon">
                                <FileArchive size={17} />
                              </span>
                              <div>
                                <strong>{app.name}</strong>
                                <span>
                                  {app.description || formatSize(app.size)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(app.uploadedAt)}</td>
                          <td>
                            <Badge
                              tone={
                                app.policy === "restricted" ? "safe" : "warning"
                              }
                            >
                              {app.policy === "restricted"
                                ? "Private"
                                : "Standard"}
                            </Badge>
                          </td>
                          <td className="row-actions">
                            <Button
                              variant="outline"
                              className="row-icon-action"
                              disabled={startingId === app.id}
                              onClick={() => prepare(app.id)}
                              aria-label={`Prepare a session for ${app.name}`}
                              title={`Prepare a session for ${app.name}`}
                            >
                              <Play size={15} fill="currentColor" />
                              <span className="sr-only">
                                {startingId === app.id ? "Starting" : "Prepare session"}
                              </span>
                            </Button>
                            <EditApp app={app} onSaved={update} />
                            <AlertDialog>
                              <DialogTrigger asChild>
                                <button className="row-icon-action danger" aria-label={`Remove ${app.name}`} title={`Remove ${app.name}`}>
                                  <Trash2 size={15} />
                                </button>
                              </DialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle className="dialog-title">
                                  Remove this app?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="dialog-description">
                                  The saved APK and its details will be removed.
                                  This cannot be undone.
                                </AlertDialogDescription>
                                <div className="dialog-actions">
                                  <AlertDialogCancel asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </AlertDialogCancel>
                                  <AlertDialogAction asChild>
                                    <Button
                                      variant="destructive"
                                      onClick={() => remove(app.id)}
                                    >
                                      Remove app
                                    </Button>
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <section className="next-step">
              <div>
                <p className="eyebrow">HOW IT WILL WORK</p>
                <h2>
                  One APK. One isolated test environment. One MCP connection.
                </h2>
              </div>
              <div className="steps">
                <span>
                  <b>1</b>Save your APK
                </span>
                <span>
                  <b>2</b>Start an isolated session
                </span>
                <span>
                  <b>3</b>Connect an approved agent
                </span>
              </div>
            </section>
          </main>
        </AppShell>
        <Dialog open={guidance} onOpenChange={setGuidance}>
          <DialogContent>
            <DialogTitle className="dialog-title">Getting started</DialogTitle>
            <DialogDescription className="dialog-description">
              Upload an APK first. When the Android session worker is connected,
              you will create an isolated session and receive the MCP
              configuration for an approved agent.
            </DialogDescription>
            <div className="dialog-actions">
              <Button onClick={() => setGuidance(false)}>Got it</Button>
            </div>
          </DialogContent>
        </Dialog>
        {toast && (
          <Toast
            open
            onOpenChange={(open) => !open && setToast("")}
            className="toast"
          >
            <ToastTitle>{toast}</ToastTitle>
          </Toast>
        )}
        <ToastViewport className="toast-viewport" />
      </ToastProvider>
    </>
  );
}

function DashboardPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  useEffect(() => {
    listApps()
      .then(setApps)
      .catch(() => undefined);
  }, []);
  return (
    <>
      <PageMeta
        title="Dashboard"
        description="See your Android app workspace at a glance."
      />
      <AppShell>
        <main className="content">
          <DashboardOverview appsCount={apps.length} />
        </main>
      </AppShell>
    </>
  );
}

const settingsSections = [
  {
    to: "/settings",
    label: "Profile",
    icon: UserRound,
    title: "Profile",
    description: "Manage your account identity and sign-in preferences.",
  },
  {
    to: "/settings/appearance",
    label: "Appearance",
    icon: Palette,
    title: "Appearance",
    description: "Choose how Sulphur looks in your workspace.",
  },
  {
    to: "/settings/usage",
    label: "Usage",
    icon: Gauge,
    title: "Usage",
    description: "Review future session and agent activity in this workspace.",
  },
  {
    to: "/settings/billing",
    label: "Billing",
    icon: CreditCard,
    title: "Billing",
    description: "Plans, credits, top-ups, and invoices will be managed here.",
  },
  {
    to: "/settings/mcp",
    label: "MCP",
    icon: Plug,
    title: "MCP connections",
    description:
      "Manage agent connections and their access to prepared Android sessions.",
  },
  {
    to: "/settings/notifications",
    label: "Email",
    icon: Mail,
    title: "Email notifications",
    description: "Choose which non-essential workspace emails you receive.",
  },
  {
    to: "/settings/sessions",
    label: "Sessions",
    icon: AppWindow,
    title: "Session defaults",
    description: "Set safe defaults for future isolated Android sessions.",
  },
  {
    to: "/settings/apps",
    label: "Apps",
    icon: LayoutGrid,
    title: "App defaults",
    description:
      "Manage default review and access preferences for new APK uploads.",
  },
];

function EmailNotificationSettings() {
  const [preferences, setPreferences] = useState<EmailPreferences>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void getEmailPreferences().then(setPreferences).catch((reason) => setError(reason instanceof Error ? reason.message : "Email preferences could not be loaded.")); }, []);
  const update = async (changes: Partial<EmailPreferences>) => {
    if (!preferences) return;
    const next = { ...preferences, ...changes };
    setPreferences(next); setSaving(true); setError(""); setMessage("");
    try { setPreferences(await saveEmailPreferences(next)); setMessage("Email preferences saved."); }
    catch (reason) { setPreferences(preferences); setError(reason instanceof Error ? reason.message : "Email preferences could not be saved."); }
    finally { setSaving(false); }
  };
  const rows: Array<[keyof EmailPreferences, string, string]> = [
    ["announcements", "Announcements", "Product news and important service announcements."],
    ["productUpdates", "Product updates", "New features, tips, and workspace activity summaries."],
    ["billingUpdates", "Billing updates", "Receipts, successful plan changes, and payment problems."],
    ["teamUpdates", "Team updates", "Workspace invitations and member activity."],
  ];
  if (!preferences) return <Card className="settings-card"><p>{error || "Loading email preferences…"}</p></Card>;
  return <Card className="settings-card"><div className="settings-card-heading"><div><h2>Email controls</h2><p>Turn off any optional category. Email verification and password-reset codes always stay on for account security.</p></div></div><div className="notification-settings">{rows.map(([key, title, description]) => <div className="appearance-switch-row" key={key}><div><strong>{title}</strong><span>{description}</span></div><Switch checked={preferences[key]} onCheckedChange={(value) => { if (!saving) void update({ [key]: value }); }} label={`Receive ${title}`} /></div>)}</div>{message && <p className="form-notice" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</Card>;
}

function ProfileAvatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "S";
  return image ? (
    <img className="profile-avatar" src={image} alt="Your profile" />
  ) : (
    <span className="profile-avatar profile-avatar-fallback" aria-hidden="true">
      {initials}
    </span>
  );
}

function ProfileSettings() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [identityMessage, setIdentityMessage] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setUsername(user.username ?? user.displayUsername ?? "");
    setImage(user.image ?? null);
  }, [user?.id]);

  const errorText = (response: { error?: { message?: string } } | undefined, fallback: string) =>
    response?.error?.message ?? fallback;

  const saveIdentity = async () => {
    const nextName = name.trim();
    const nextUsername = username.trim();
    setIdentityError("");
    setIdentityMessage("");
    if (!nextName) return setIdentityError("Enter the name you want displayed in Sulphur.");
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(nextUsername)) {
      return setIdentityError("Username must be 3–30 characters and use only letters, numbers, periods, underscores, or hyphens.");
    }
    setSavingIdentity(true);
    try {
      const response = await authClient.updateUser({
        name: nextName,
        username: nextUsername,
        image,
      });
      if (response.error) {
        setIdentityError(errorText(response, "Your profile could not be saved. Try again."));
        return;
      }
      setIdentityMessage("Profile saved.");
    } catch {
      setIdentityError("Your profile could not be saved. Check your connection and try again.");
    } finally {
      setSavingIdentity(false);
    }
  };

  const chooseImage = (file?: File) => {
    setIdentityError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setIdentityError("Choose an image file (PNG, JPG, WebP, or GIF).");
      return;
    }
    if (file.size > 1024 * 1024) {
      setIdentityError("Choose an image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setIdentityError("That image could not be read. Try another file.");
    reader.readAsDataURL(file);
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordMessage("");
    if (!currentPassword) return setPasswordError("Enter your current password.");
    if (newPassword.length < 8) return setPasswordError("Use at least 8 characters for your new password.");
    if (newPassword !== confirmPassword) return setPasswordError("Your new passwords do not match.");
    setSavingPassword(true);
    try {
      const response = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (response.error) {
        setPasswordError(errorText(response, "Your password could not be changed. Try again."));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed. Other signed-in sessions have been signed out.");
    } catch {
      setPasswordError("Your password could not be changed. Check your connection and try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (isPending || !user) {
    return <Card className="settings-card"><p>Loading your profile…</p></Card>;
  }

  return (
    <div className="profile-settings">
      <Card className="settings-card profile-card">
        <div className="settings-card-heading">
          <div>
            <h2>Profile picture</h2>
            <p>Use a clear photo so teammates can recognize you.</p>
          </div>
        </div>
        <div className="profile-photo-row">
          <ProfileAvatar name={name || user.name} image={image} />
          <div className="profile-photo-actions">
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => chooseImage(event.target.files?.[0])}
            />
            <Button className="button-outline" onClick={() => fileInput.current?.click()}>
              <ImagePlus size={15} />
              {image ? "Change photo" : "Upload photo"}
            </Button>
            {image && <button className="text-button" type="button" onClick={() => setImage(null)}>Remove</button>}
            <span>PNG, JPG, WebP, or GIF. Up to 1 MB.</span>
          </div>
        </div>
        <div className="profile-fields">
          <div>
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="profile-username">Username</Label>
            <Input id="profile-username" value={username} maxLength={30} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            <p className="field-help">Used to identify you in your workspace. Letters, numbers, periods, underscores, and hyphens only.</p>
          </div>
        </div>
        {identityError && <p className="form-error" role="alert">{identityError}</p>}
        {identityMessage && <p className="form-notice" role="status">{identityMessage}</p>}
        <div className="profile-save-row">
          <p>Your email address is <strong>{user.email}</strong>.</p>
          <Button onClick={saveIdentity} disabled={savingIdentity}>{savingIdentity ? "Saving…" : "Save profile"}</Button>
        </div>
      </Card>

      <Card className="settings-card password-card">
        <div className="settings-card-heading">
          <div>
            <h2><KeyRound size={16} /> Change password</h2>
            <p>Confirm your current password, then choose a new one.</p>
          </div>
        </div>
        <div className="profile-fields">
          <div>
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
          </div>
          <div className="password-field-grid">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
            </div>
          </div>
        </div>
        {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
        {passwordMessage && <p className="form-notice" role="status">{passwordMessage}</p>}
        <div className="profile-save-row">
          <p>Changing your password signs out your other active sessions.</p>
          <Button onClick={changePassword} disabled={savingPassword}>{savingPassword ? "Changing…" : "Change password"}</Button>
        </div>
      </Card>
    </div>
  );
}

const appearanceTemplates: Array<{ id: string; name: string; description: string; preferences: AppearancePreferences }> = [
  { id: "balanced", name: "Balanced", description: "A versatile everyday workspace.", preferences: defaultAppearance },
  { id: "focused", name: "Focused", description: "Compact and crisp for longer work sessions.", preferences: { fontFamily: "inter", fontSize: "small", density: "compact", radius: "sharp", reduceMotion: false } },
  { id: "calm", name: "Calm", description: "Extra room and softer edges for easy scanning.", preferences: { fontFamily: "system", fontSize: "large", density: "spacious", radius: "rounded", reduceMotion: true } },
  { id: "terminal", name: "Terminal", description: "A dense monospace setup for technical work.", preferences: { fontFamily: "mono", fontSize: "medium", density: "compact", radius: "sharp", reduceMotion: true } },
];

function AppearanceSettings() {
  const [preferences, setPreferences] = useState<AppearancePreferences>(readAppearance);
  const [saved, setSaved] = useState(false);
  const update = (changes: Partial<AppearancePreferences>) => {
    const next = { ...preferences, ...changes };
    setPreferences(next);
    applyAppearance(next);
    window.localStorage.setItem(appearanceStorageKey, JSON.stringify(next));
    setSaved(true);
  };
  const activeTemplate = appearanceTemplates.find((template) =>
    Object.entries(template.preferences).every(([key, value]) => preferences[key as keyof AppearancePreferences] === value),
  )?.id;
  const options = <T extends string>(
    label: string, value: T, values: Array<[T, string]>, onChange: (next: T) => void,
  ) => <div className="appearance-control"><span>{label}</span><div className="segmented-control" aria-label={label}>{values.map(([item, name]) => <button key={item} type="button" className={value === item ? "active" : ""} onClick={() => onChange(item)}>{name}</button>)}</div></div>;
  return (
    <div className="appearance-settings">
      <Card className="settings-card appearance-card">
        <div className="settings-card-heading"><div><h2><Type size={16} /> Typography</h2><p>Choose a typeface and text size that feels comfortable for long sessions.</p></div></div>
        {options("Font family", preferences.fontFamily, [["inter", "Inter"], ["system", "System"], ["serif", "Serif"], ["mono", "Mono"]], (fontFamily) => update({ fontFamily }))}
        {options("Font size", preferences.fontSize, [["small", "Small"], ["medium", "Default"], ["large", "Large"]], (fontSize) => update({ fontSize }))}
      </Card>
      <Card className="settings-card appearance-card">
        <div className="settings-card-heading"><div><h2>Interface</h2><p>Adjust spacing and visual weight without changing the light workspace.</p></div></div>
        {options("Layout density", preferences.density, [["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]], (density) => update({ density }))}
        {options("Corner radius", preferences.radius, [["sharp", "Sharp"], ["soft", "Soft"], ["rounded", "Rounded"]], (radius) => update({ radius }))}
        <div className="appearance-switch-row"><div><strong>Reduce motion</strong><span>Minimize non-essential animations and transitions.</span></div><Switch checked={preferences.reduceMotion} onCheckedChange={(reduceMotion) => update({ reduceMotion })} label="Reduce motion" /></div>
      </Card>
      <Card className="settings-card appearance-card">
        <div className="settings-card-heading"><div><h2>Templates</h2><p>Start from a tested combination, then make it your own.</p></div></div>
        <div className="appearance-templates">
          {appearanceTemplates.map((template) => <button key={template.id} type="button" className={`appearance-template ${activeTemplate === template.id ? "active" : ""}`} onClick={() => update(template.preferences)}>
            <span className={`template-preview template-${template.id}`}><i /><i /><i /></span><strong>{template.name}</strong><small>{template.description}</small>{activeTemplate === template.id && <em><Check size={13} /> Applied</em>}
          </button>)}
        </div>
        <div className="appearance-footer"><p>{saved ? "Appearance preferences are saved on this device." : "Your choices will be saved on this device."}</p><button type="button" className="text-button" onClick={() => update(defaultAppearance)}>Reset to defaults</button></div>
      </Card>
    </div>
  );
}

function UsageSettings() {
  const [summary, setSummary] = useState<UsageSummary>();
  const [limits, setLimits] = useState<UsageLimits>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = () => {
    setLoading(true);
    getUsage().then((next) => {
      setSummary(next);
      setLimits(next.limits);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Usage could not be loaded.")).finally(() => setLoading(false));
  };
  useEffect(() => { void refresh(); }, []);
  const saveLimits = async () => {
    if (!limits) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await saveUsageLimits(limits);
      setLimits(saved);
      setSummary((current) => current ? { ...current, limits: saved } : current);
      setMessage("Workspace guardrails saved. New requests are checked against them immediately.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Limits could not be saved."); }
    finally { setSaving(false); }
  };
  const exportUsage = () => {
    if (!summary) return;
    const rows = [
      ["metric", "value"],
      ["sessions_this_month", summary.metrics.sessionsThisMonth],
      ["session_minutes_this_month", summary.metrics.sessionMinutesThisMonth],
      ["saved_apps", summary.metrics.appCount],
      ["active_sessions", summary.metrics.activeSessions],
      ["storage_bytes", summary.metrics.storageBytes],
      ["mcp_calls_today", summary.metrics.mcpCallsToday],
      ["tool_calls_today", summary.metrics.toolCallsToday],
      ["clicks_today", summary.metrics.clicksToday],
      ["ai_requests_today", summary.metrics.aiRequestsToday],
      [],
      ["day", "mcp_calls", "tool_calls", "clicks", "ai_requests"],
      ...summary.history.map((item) => [item.day, item.mcpCalls, item.toolCalls, item.clicks, item.aiRequests]),
      [],
      ["timestamp", "event_kind", "action"],
      ...summary.events.map((item) => [item.at, item.kind, item.action ?? ""]),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sulphur-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  if (loading) return <Card className="settings-card"><p>Loading workspace usage…</p></Card>;
  if (!summary || !limits) return <Card className="settings-card"><h2>Usage unavailable</h2><p>{error || "Refresh the page to try again."}</p></Card>;
  const cards = [
    ["Sessions", `${summary.metrics.sessionsThisMonth} / ${summary.limits.monthlySessionStarts}`, "this month"],
    ["Session time", `${summary.metrics.sessionMinutesThisMonth} min`, "this month"],
    ["Saved apps", summary.metrics.appCount, "using workspace storage"],
    ["MCP calls", `${summary.metrics.mcpCallsToday} / ${summary.limits.dailyMcpCalls}`, "today"],
    ["Tool calls", summary.metrics.toolCallsToday, "today"],
    ["Clicks", summary.metrics.clicksToday, "agent taps today"],
    ["AI usage", summary.metrics.aiRequestsToday, "connected providers today"],
    ["Storage", formatSize(summary.metrics.storageBytes), `${summary.metrics.activeSessions} active session${summary.metrics.activeSessions === 1 ? "" : "s"}`],
  ];
  const chartMax = Math.max(1, ...summary.history.flatMap((item) => [item.mcpCalls, item.toolCalls, item.clicks, item.aiRequests]));
  return <div className="usage-settings">
    <div className="usage-actions"><p className="usage-note">Only session starts, APK storage, and MCP calls are guarded. Ordinary workspace navigation and unconnected AI features stay available.</p><Button className="button-outline" onClick={exportUsage}><Download size={15} /> Export CSV</Button></div>
    <div className="usage-metrics">{cards.map(([label, value, detail]) => <Card key={String(label)} className="usage-metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>)}</div>
    <Card className="settings-card usage-chart-card">
      <div className="settings-card-heading"><div><h2>Activity over the last 7 days</h2><p>Live MCP and tool telemetry starts recording when a connector makes its next request.</p></div></div>
      {summary.history.length ? <div className="usage-chart" role="img" aria-label="MCP, tool, click, and AI activity over seven days">{summary.history.map((item) => <div className="usage-day" key={item.day}><div className="usage-bars"><i className="mcp" style={{ height: `${Math.max(3, item.mcpCalls / chartMax * 100)}%` }} /><i className="tool" style={{ height: `${Math.max(3, item.toolCalls / chartMax * 100)}%` }} /><i className="click" style={{ height: `${Math.max(3, item.clicks / chartMax * 100)}%` }} /><i className="ai" style={{ height: `${Math.max(3, item.aiRequests / chartMax * 100)}%` }} /></div><span>{item.day.slice(5)}</span></div>)}</div> : <div className="usage-empty-chart">No metered activity recorded yet. Start a session or use an MCP connector to populate this chart.</div>}
      <div className="usage-legend"><span><i className="mcp" /> MCP</span><span><i className="tool" /> Tool calls</span><span><i className="click" /> Clicks</span><span><i className="ai" /> AI provider</span></div>
    </Card>
    <Card className="settings-card usage-event-card">
      <div className="settings-card-heading"><div><h2>Recent activity</h2><p>App, session, and MCP lifecycle events are retained for export.</p></div></div>
      {summary.events.length ? <div className="usage-event-list">{summary.events.slice(0, 8).map((event) => <div key={`${event.at}-${event.kind}-${event.action}`}><span>{event.kind.replaceAll("_", " ")}</span><strong>{event.action?.replaceAll("_", " ") ?? "workspace event"}</strong><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.at))}</time></div>)}</div> : <p className="usage-empty-events">No activity has been recorded yet.</p>}
    </Card>
    <Card className="settings-card usage-limits-card">
      <div className="settings-card-heading"><div><h2>Workspace guardrails</h2><p>When a metered limit is reached, that specific request stops and points here to increase the limit. Limits do not block lightweight workspace actions.</p></div></div>
      <div className="usage-limit-grid">
        <label><span>Session starts per month</span><Input type="number" min="1" max="10000" value={limits.monthlySessionStarts} onChange={(event) => setLimits({ ...limits, monthlySessionStarts: Number(event.target.value) })} /></label>
        <label><span>Concurrent sessions</span><Input type="number" min="1" max="5" value={limits.maxActiveSessions} onChange={(event) => setLimits({ ...limits, maxActiveSessions: Number(event.target.value) })} /></label>
        <label><span>APK storage (MB)</span><Input type="number" min="50" max="20480" value={Math.round(limits.maxStorageBytes / 1024 / 1024)} onChange={(event) => setLimits({ ...limits, maxStorageBytes: Number(event.target.value) * 1024 * 1024 })} /></label>
        <label><span>MCP calls per day</span><Input type="number" min="1" max="100000" value={limits.dailyMcpCalls} onChange={(event) => setLimits({ ...limits, dailyMcpCalls: Number(event.target.value) })} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-notice" role="status">{message}</p>}
      <div className="profile-save-row"><p>Changes are server-enforced for your workspace.</p><Button onClick={saveLimits} disabled={saving}>{saving ? "Saving…" : "Save limits"}</Button></div>
    </Card>
  </div>;
}

function AppDefaultsSettings() {
  const [defaults, setDefaults] = useState<AppDefaults>({ defaultEgressAllowed: false, sessionDurationMinutes: 60, cleanStart: true, defaultOrientation: "portrait", sessionRetentionDays: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getAppDefaults()
      .then(setDefaults)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "App defaults could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      setDefaults(await saveAppDefaults(defaults));
      setMessage("App defaults saved. New sessions will use them.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "App defaults could not be saved.");
    } finally { setSaving(false); }
  };

  if (loading) return <Card className="settings-card"><p>Loading app defaults…</p></Card>;
  return <div className="app-defaults-settings">
    <Card className="settings-card app-defaults-card">
      <div className="settings-card-heading"><div><h2>Upload review</h2><p>Every APK is quarantined and must remain within the workspace storage limit before it can run.</p></div><Badge tone="safe">Required</Badge></div>
      <div className="setting-summary"><strong>Private APK intake</strong><span>APK files are stored per workspace and are never made public by an upload.</span></div>
      <div className="setting-summary"><strong>Safe review boundary</strong><span>Sessions can only start from APKs that pass Sulphur’s server-side intake checks.</span></div>
    </Card>
    <Card className="settings-card app-defaults-card">
      <div className="settings-card-heading"><div><h2>Default session policy</h2><p>These settings are applied when any saved app starts a new isolated Android session.</p></div></div>
      <div className="appearance-switch-row"><div><strong>Allow network egress by default</strong><span>New sessions may reach their configured test services. Keep this off unless a test requires it.</span></div><Switch label="Allow network egress by default" checked={defaults.defaultEgressAllowed} onCheckedChange={(defaultEgressAllowed) => setDefaults({ ...defaults, defaultEgressAllowed })} /></div>
      <div className="appearance-switch-row"><div><strong>Start from a clean app state</strong><span>Reinstall and clear app data before every new session so an agent never inherits a previous test run.</span></div><Switch label="Start from a clean app state" checked={defaults.cleanStart} onCheckedChange={(cleanStart) => setDefaults({ ...defaults, cleanStart })} /></div>
      <div className="app-defaults-duration"><div><strong>Session duration</strong><span>End a session automatically after this time. Existing sessions are unchanged.</span></div><label><Input type="number" min="15" max="1440" value={defaults.sessionDurationMinutes} onChange={(event) => setDefaults({ ...defaults, sessionDurationMinutes: Number(event.target.value) })} /><small>minutes · 15–1,440</small></label></div>
      <div className="app-defaults-duration"><div><strong>Default device orientation</strong><span>Set the orientation before a new app is opened in its session.</span></div><div className="segmented-control"><button className={defaults.defaultOrientation === "portrait" ? "active" : ""} type="button" onClick={() => setDefaults({ ...defaults, defaultOrientation: "portrait" })}>Portrait</button><button className={defaults.defaultOrientation === "landscape" ? "active" : ""} type="button" onClick={() => setDefaults({ ...defaults, defaultOrientation: "landscape" })}>Landscape</button></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-notice" role="status">{message}</p>}
      <div className="profile-save-row"><p>Changes apply to new sessions only.</p><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save app defaults"}</Button></div>
    </Card>
    <Card className="settings-card app-defaults-card">
      <div className="settings-card-heading"><div><h2>Agent access and data protection</h2><p>These platform protections are enforced for every app and cannot be weakened at workspace level.</p></div></div>
      <div className="setting-summary"><strong>Owner-scoped access</strong><span>Only the signed-in workspace owner can view, prepare, control, or remove its APKs and sessions.</span></div>
      <div className="setting-summary"><strong>Guarded agent actions</strong><span>Session controls require a live, authorized session; payment, host escape, and arbitrary ADB access remain blocked.</span></div>
      <div className="setting-summary"><strong>Private screenshots</strong><span>Session screenshots are served only to the authenticated session owner and are never cached by the browser API.</span></div>
      <div className="app-defaults-duration"><div><strong>Completed-session retention</strong><span>Remove ended and failed session records after this period when a new session is started.</span></div><label><Input type="number" min="1" max="365" value={defaults.sessionRetentionDays} onChange={(event) => setDefaults({ ...defaults, sessionRetentionDays: Number(event.target.value) })} /><small>days · 1–365</small></label></div>
    </Card>
  </div>;
}

function McpSettingsPage() {
  const [settings, setSettings] = useState<McpSettings>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getMcpSettings().then(setSettings).catch((reason) => setError(reason instanceof Error ? reason.message : "MCP settings could not be loaded.")); }, []);
  const update = <K extends keyof McpSettings>(key: K, value: McpSettings[K]) => settings && setSettings({ ...settings, [key]: value });
  const save = async () => {
    if (!settings) return;
    setSaving(true); setError(""); setMessage("");
    try { setSettings(await saveMcpSettings(settings)); setMessage("MCP defaults saved. Active and new local connections use these tool permissions immediately."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "MCP settings could not be saved."); }
    finally { setSaving(false); }
  };
  if (!settings) return <Card className="settings-card"><p>{error || "Loading MCP connection settings…"}</p></Card>;
  const scopes: Array<[keyof Pick<McpSettings, "allowScreenState" | "allowScreenshots" | "allowActionLog" | "allowActions">, string, string]> = [["allowScreenState", "Screen state", "Read session status and a fresh actionable UI snapshot."], ["allowScreenshots", "Screenshots", "Capture the current Android screen for this session."], ["allowActionLog", "Activity log", "Read session lifecycle and recorded MCP activity."], ["allowActions", "UI actions", "Tap, type, scroll, go back, long-press, and wait with a fresh snapshot."]];
  return <div className="mcp-settings">
    <Card className="settings-card mcp-settings-card"><div className="settings-card-heading"><div><h2><Plug size={16} /> Connection defaults</h2><p>Choose the client shown first whenever someone sets up MCP for a running session. Connections remain tied to one session.</p></div></div><div className="mcp-connector-options">{(["codex", "claude", "gemini"] as const).map((connector) => <button type="button" key={connector} onClick={() => update("defaultConnector", connector)} className={settings.defaultConnector === connector ? "active" : ""}>{connector === "codex" ? "Codex CLI" : connector === "claude" ? "Claude Code" : "Gemini CLI"}</button>)}</div></Card>
    <Card className="settings-card mcp-settings-card"><div className="settings-card-heading"><div><h2><ShieldCheck size={16} /> Default tool access</h2><p>These permissions are enforced by the local MCP server for every session in this workspace. No MCP connection receives ADB, APK files, database credentials, or another session.</p></div></div><div className="mcp-scope-list">{scopes.map(([key, title, description]) => <div className="mcp-setting-row" key={key}><div><strong>{title}</strong><span>{description}</span></div><Switch checked={settings[key]} onCheckedChange={(value) => update(key, value)} label={`Allow ${title}`} /></div>)}</div></Card>
    <Card className="settings-card mcp-settings-card"><div className="settings-card-heading"><div><h2>Tool surface</h2><p>Fixed tools keep agent context compact and prevent broad device control.</p></div></div><div className="mcp-tools">{[["get_screen_state", "Session status"], ["get_ui_snapshot", "Current actionable elements"], ["take_screenshot", "Current PNG screen"], ["get_action_log", "Session activity"], ["act", "Snapshot-bound Android action"]].map(([tool, description]) => <div key={tool}><code>{tool}</code><span>{description}</span></div>)}</div><div className="profile-save-row"><p>Changes are saved to this workspace and apply across the app.</p><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save MCP settings"}</Button></div>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-notice" role="status">{message}</p>}</Card>
  </div>;
}

function BillingSettings() {
  const [billing, setBilling] = useState<BillingOverview>();
  const [promo, setPromo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const refresh = () => getBilling().then(setBilling).catch((reason) => setError(reason instanceof Error ? reason.message : "Billing could not be loaded."));
  useEffect(() => { void refresh(); }, []);
  const exportBilling = () => {
    if (!billing) return;
    const lines = ["date,description,amount,currency,status", ...billing.payments.map((payment) => [payment.createdAt, `Payment via ${payment.provider}`, (payment.amount_cents / 100).toFixed(2), payment.currency, payment.status].map((cell) => `\"${String(cell).replaceAll('\"', '\"\"')}\"`).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "sulphur-billing-history.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const applyPromo = async () => {
    setError(""); setMessage("");
    if (!promo.trim()) { setError("Enter a promo code first."); return; }
    setRedeeming(true);
    try { const result = await redeemPromo(promo); setMessage(`${result.promo.code} applied: ${result.promo.discountPercent}% off.`); setPromo(""); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Promo code could not be applied."); }
    finally { setRedeeming(false); }
  };
  if (!billing) return <Card className="settings-card"><p>{error || "Loading billing…"}</p></Card>;
  const statusTone = billing.subscription?.status === "active" || billing.subscription?.status === "trialing" ? "safe" : "warning";
  return <div className="billing-settings">
    <Card className="settings-card billing-summary-card">
      <div className="billing-summary-heading"><div><p className="eyebrow">CURRENT ACCESS</p><h2>{billing.subscription?.planId ?? "No plan"} {billing.subscription && <Badge tone={statusTone}>{billing.subscription.status}</Badge>}</h2><span>{billing.subscription?.currentPeriodEnd ? `Access ends ${formatDate(billing.subscription.currentPeriodEnd)}` : "No active billing period"}</span></div><div className="credit-balance"><Coins size={18} /><strong>{billing.creditBalance}</strong><span>credits available</span></div></div>
    </Card>
    <div className="billing-split">
      <Card className="settings-card"><div className="settings-card-heading"><div><h2><CircleDollarSign size={16} /> Plan changes</h2><p>Plan changes are available when a payment provider is connected.</p></div></div><a className="billing-pricing-link" href="/pricing">View plans and pricing</a></Card>
      <Card className="settings-card"><div className="settings-card-heading"><div><h2><CreditCard size={16} /> Payment method</h2><p>No payment method has been recorded for this workspace.</p></div></div></Card>
    </div>
    <Card className="settings-card"><div className="settings-card-heading"><div><h2>Promo codes</h2><p>Apply a code issued by your workspace administrator.</p></div></div><div className="promo-entry"><Input aria-label="Promo code" value={promo} placeholder="Enter promo code" onChange={(event) => { setPromo(event.target.value.toUpperCase()); setMessage(""); setError(""); }} /><Button variant="outline" disabled={redeeming} onClick={applyPromo}>{redeeming ? "Applying…" : "Apply code"}</Button></div>{message && <p className="form-notice" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="billing-history-list">{billing.promos.length ? billing.promos.map((item) => <div key={`${item.code}-${item.redeemedAt}`}><span>{item.code}</span><strong>{item.discountPercent}% discount</strong><time>Applied {formatDate(item.redeemedAt)}</time></div>) : <p className="billing-empty">No promo codes have been applied.</p>}</div></Card>
    <Card className="settings-card billing-history-card"><div className="settings-card-heading"><div><h2><ReceiptText size={16} /> Billing history</h2><p>Completed and pending transactions from your payment provider.</p></div><Button variant="outline" disabled={!billing.payments.length} onClick={exportBilling}><Download size={15} /> Export CSV</Button></div><div className="billing-history-list">{billing.payments.length ? billing.payments.map((payment) => <div key={payment.id}><span>{formatDate(payment.createdAt)}</span><strong>Payment via {payment.provider}</strong><b>{new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount_cents / 100)}</b><Badge tone={payment.status === "paid" ? "safe" : payment.status === "failed" ? "warning" : "neutral"}>{payment.status}</Badge></div>) : <p className="billing-empty">No billing transactions yet.</p>}</div></Card>
  </div>;
}

function SettingsPage() {
  const location = useLocation();
  const active =
    settingsSections.find((section) => section.to === location.pathname) ??
    settingsSections[0];
  return (
    <>
      <PageMeta title={active.title} description={active.description} />
      <AppShell>
        <main className="content">
          <header className="topbar">
            <span className="workspace">
              <span className="workspace-dot" />
              Your workspace
            </span>
          </header>
          <div className="settings-layout">
            <aside className="settings-nav">
              <p className="eyebrow">SETTINGS</p>
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <NavLink
                    end={section.to === "/settings"}
                    key={section.to}
                    to={section.to}
                    className={({ isActive }) =>
                      `settings-link${isActive ? " active" : ""}`
                    }
                  >
                    <Icon size={16} />
                    {section.label}
                  </NavLink>
                );
              })}
            </aside>
            <section className="settings-content">
              <p className="eyebrow">WORKSPACE SETTINGS</p>
              <h1>{active.title}</h1>
              <p>{active.description}</p>
              {active.to === "/settings" ? <ProfileSettings /> : active.to === "/settings/appearance" ? <AppearanceSettings /> : active.to === "/settings/usage" ? <UsageSettings /> : active.to === "/settings/billing" ? <BillingSettings /> : active.to === "/settings/mcp" ? <McpSettingsPage /> : active.to === "/settings/notifications" ? <EmailNotificationSettings /> : active.to === "/settings/sessions" || active.to === "/settings/apps" ? <AppDefaultsSettings /> : (
                <Card className="settings-card">
                  <h2>Coming next</h2>
                  <p>
                    This area is ready for its live controls. It will only show
                    settings that apply to your workspace.
                  </p>
                </Card>
              )}
            </section>
          </div>
        </main>
      </AppShell>
    </>
  );
}

function LiveScreen({ sessionId, minimal = false }: { sessionId: string; minimal?: boolean }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<string>();
  const [notice, setNotice] = useState("");
  const [volume, setVolume] = useState<number | null>(null);
  const [volumeMax, setVolumeMax] = useState(15);
  const [zoom, setZoom] = useState(1);
  const [orientation, setOrientation] = useState<0 | 90 | -90>(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [state, setState] = useState<"loading" | "connected" | "reconnecting">(
    "loading",
  );
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let current: string | undefined;
    const pull = async () => {
      try {
        const response = await fetch(
          `${sessionScreenshotUrl(sessionId)}?t=${Date.now()}`,
          { credentials: "include", cache: "no-store" },
        );
        if (!response.ok) throw new Error("screen unavailable");
        const next = URL.createObjectURL(await response.blob());
        const image = new Image();
        image.src = next;
        await image.decode().catch(() => undefined);
        if (stopped) return URL.revokeObjectURL(next);
        setFrame(next);
        setState("connected");
        if (current) URL.revokeObjectURL(current);
        current = next;
      } catch {
        if (!stopped) setState("reconnecting");
      } finally {
        if (!stopped) timer = window.setTimeout(pull, 120);
      }
    };
    pull();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (current) URL.revokeObjectURL(current);
    };
  }, [sessionId]);
  useEffect(() => {
    controlSession(sessionId, "volume_status")
      .then((response) => {
        setVolume(response.result.volume);
        if (response.result.volumeMax !== null) setVolumeMax(response.result.volumeMax);
      })
      .catch(() => undefined);
  }, [sessionId]);
  const fullscreen = () =>
    screenRef.current?.requestFullscreen().catch(() => undefined);
  const downloadScreenshot = () => {
    if (!frame) return setNotice("The first screen frame is still loading.");
    const link = document.createElement("a");
    link.href = frame;
    link.download = `sulphur-${sessionId}.png`;
    link.click();
    setNotice("Screenshot saved to your downloads.");
  };
  const control = async (action: DeviceControl, label: string) => {
    try {
      const response = await controlSession(sessionId, action);
      if (response.result.volume !== null) setVolume(response.result.volume);
      if (response.result.volumeMax !== null) setVolumeMax(response.result.volumeMax);
      const volumeChanged =
        (action === "volume_up" || action === "volume_down") &&
        response.result.volume === volume;
      setNotice(
        volumeChanged
          ? response.result.volume !== null
            ? `Android kept media volume at ${response.result.volume}/${response.result.volumeMax ?? volumeMax}.`
            : "Android did not report the current media volume."
          : response.result.volume !== null
            ? `${label}: ${response.result.volume}/${response.result.volumeMax ?? volumeMax}`
            : `${label} completed.`,
      );
      return true;
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : `${label} could not be completed.`,
      );
      return false;
    }
  };
  const rotate = async (
    action: "rotate_left" | "rotate_right",
    angle: 90 | -90,
    label: string,
  ) => {
    if (await control(action, label)) setOrientation(angle);
  };
  const controls = [
    { label: "Power", icon: Power, run: () => control("power", "Power") },
    {
      label: "Volume up",
      icon: Volume2,
      run: () => control("volume_up", "Volume up"),
    },
    {
      label: "Volume down",
      icon: VolumeX,
      run: () => control("volume_down", "Volume down"),
    },
    { label: "Take screenshot", icon: Camera, run: downloadScreenshot },
    {
      label: "Zoom in",
      icon: ZoomIn,
      run: () => {
        setZoom((value) => {
          const next = Math.min(value + 0.35, 1.35);
          setNotice(
            next === value
              ? "Screen is already at maximum zoom."
              : `Screen zoomed to ${Math.round(next * 100)}%.`,
          );
          return next;
        });
      },
    },
    {
      label: "Zoom out",
      icon: ZoomOut,
      run: () => {
        setZoom((value) => {
          const next = Math.max(value - 0.35, 1);
          setNotice(
            next === value
              ? "Screen is already at 100%."
              : "Screen zoom reset.",
          );
          return next;
        });
      },
    },
    {
      label: "Rotate left",
      icon: RotateCcw,
      run: () => rotate("rotate_left", -90, "Rotate left"),
    },
    {
      label: "Rotate right",
      icon: RotateCw,
      run: () => rotate("rotate_right", 90, "Rotate right"),
    },
    { label: "Back", icon: ArrowLeft, run: () => control("back", "Back") },
    { label: "Home", icon: House, run: () => control("home", "Home") },
    {
      label: "Recent apps",
      icon: Square,
      run: () => control("overview", "Recent apps"),
    },
    {
      label: "More device controls",
      icon: MoreHorizontal,
      run: () => setMoreOpen((open) => !open),
    },
    {
      label: "Library",
      icon: BookOpen,
      run: () => window.location.assign("/apps"),
    },
  ];
  return (
    <div className={`live-screen${minimal ? " live-screen-minimal" : ""}`} ref={screenRef}>
      <div className="live-device">
        <div className={orientation === 0 ? "live-screen-stage" : "live-screen-stage landscape"}>
          {frame ? (
            <Iphone
              src={frame}
              streamZoom={zoom}
              className={orientation === 0 ? "magic-iphone" : "magic-iphone rotated"}
              style={{ transform: `rotate(${orientation}deg)` }}
            />
          ) : (
            <div
              className="screen-skeleton"
              aria-label="Connecting to Android screen"
            />
          )}
          {!minimal && state !== "connected" && (
            <span className="screen-status">
              {state === "loading"
                ? "Connecting to Android…"
                : "Keeping the last frame while reconnecting…"}
            </span>
          )}
        </div>
        {!minimal && <aside
          className="device-control-rail"
          aria-label="Android device controls"
        >
          {controls.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={
                run ??
                (() =>
                  setNotice(
                    `${label} will be enabled with the controlled-device action layer.`,
                  ))
              }
            >
              <Icon size={18} />
            </button>
          ))}
        </aside>}
      </div>
      {!minimal && <div className="volume-meter">
        <span>Media volume</span>
        <input
          aria-label="Current media volume"
          type="range"
          min="0"
          max={volumeMax}
          value={volume ?? 0}
          readOnly
        />
        <b>{volume === null ? "—" : `${volume}/${volumeMax}`}</b>
      </div>}
      {!minimal && moreOpen && (
        <div className="more-controls">
          <strong>Device controls</strong>
          <span>
            Power, sound, rotation, navigation, screenshot, and library are
            available from this session rail.
          </span>
        </div>
      )}
      {!minimal && <span className="frame-status">
        {state === "connected" ? "Live local preview" : "Reconnecting"}
      </span>}
      <button
        className="fullscreen-button"
        type="button"
        onClick={fullscreen}
        aria-label="Open session screen in full screen"
      >
        <Maximize size={15} /> Full screen
      </button>
      {!minimal && notice && <span className="control-notice">{notice}</span>}
    </div>
  );
}

const preparationSteps = [
  "Starting your Android device",
  "Preparing device support services",
  "Installing your APK",
  "Finishing your session",
];

type Connector = {
  id: string;
  name: string;
  group: string;
  setup: "direct" | "manual";
};

const connectors: Connector[] = [
  { id: "codex", name: "Codex CLI", group: "Recommended", setup: "direct" },
  { id: "claude", name: "Claude Code", group: "Recommended", setup: "direct" },
  { id: "gemini", name: "Gemini CLI", group: "Recommended", setup: "direct" },
  { id: "opencode", name: "OpenCode", group: "Terminal agents", setup: "manual" },
  { id: "aider", name: "Aider", group: "Terminal agents", setup: "manual" },
  { id: "goose", name: "Goose", group: "Terminal agents", setup: "manual" },
  { id: "droid", name: "Factory Droid", group: "Terminal agents", setup: "manual" },
  { id: "cursor", name: "Cursor", group: "AI-native editors", setup: "manual" },
  { id: "zed", name: "Zed", group: "AI-native editors", setup: "manual" },
  { id: "trae", name: "Trae", group: "AI-native editors", setup: "manual" },
  { id: "devin-desktop", name: "Devin Desktop", group: "AI-native editors", setup: "manual" },
  { id: "copilot", name: "GitHub Copilot", group: "IDE extensions", setup: "manual" },
  { id: "cline", name: "Cline", group: "IDE extensions", setup: "manual" },
  { id: "continue", name: "Continue", group: "IDE extensions", setup: "manual" },
  { id: "devin", name: "Devin", group: "Cloud agents", setup: "manual" },
  { id: "augment", name: "Augment Code", group: "Cloud agents", setup: "manual" },
  { id: "jules", name: "Jules", group: "Cloud agents", setup: "manual" },
  { id: "replit", name: "Replit Agent", group: "Web builders", setup: "manual" },
  { id: "bolt", name: "Bolt.new", group: "Web builders", setup: "manual" },
  { id: "lovable", name: "Lovable", group: "Web builders", setup: "manual" },
  { id: "v0", name: "v0", group: "Web builders", setup: "manual" },
];

function McpSetupDialog({ sessionId }: { sessionId: string }) {
  const [selectedId, setSelectedId] = useState("codex");
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => { getMcpSettings().then((settings) => setSelectedId(settings.defaultConnector)).catch(() => undefined); }, []);
  const selected = connectors.find((connector) => connector.id === selectedId) ?? connectors[0];
  const launcher = `npx -y @sulphur-ai/mcp --project "C:\\Users\\razin\\Desktop\\Products\\Sulphur" --session ${sessionId}`;
  const commands: Record<string, string> = {
    codex: `codex mcp add sulphur -- ${launcher}`,
    claude: `claude mcp add sulphur --scope project -- ${launcher}`,
    gemini: `gemini mcp add --scope project sulphur ${launcher}`,
  };
  const command = commands[selected.id] ?? launcher;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Set up MCP</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Connect an agent</DialogTitle>
        <DialogDescription className="dialog-description">
          This connection can only read this running session’s status and screen.
        </DialogDescription>
        <div className="connector-recommended">
          {connectors.slice(0, 3).map((connector) => (
            <button
              className={selected.id === connector.id ? "connector-choice active" : "connector-choice"}
              key={connector.id}
              onClick={() => setSelectedId(connector.id)}
              type="button"
            >
              {connector.name}
            </button>
          ))}
          <Button variant="outline" type="button" onClick={() => setCommandOpen(true)}>
            <Search size={15} /> Find a connector
          </Button>
        </div>
        <div className="mcp-setup">
          <strong>{selected.name}</strong>
          <code>{command}</code>
          <p>
            {selected.setup === "direct"
              ? "Paste this command into a terminal in this project, then confirm the connection in your agent."
              : "Use this launcher in this product’s local MCP configuration. Its exact configuration location depends on the installed client."}
          </p>
          {selected.setup === "manual" && <span className="connector-note">Manual setup is shown because this client’s MCP setup differs by version. It is not represented as a one-click connection.</span>}
        </div>
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Find a connector" description="Search available agent integrations.">
          <CommandInput placeholder="Search agents and editors…" />
          <CommandList>
            <CommandEmpty>No connector found.</CommandEmpty>
            {Array.from(new Set(connectors.map((connector) => connector.group))).map((group) => (
              <CommandGroup heading={group} key={group}>
                {connectors.filter((connector) => connector.group === group).map((connector) => (
                  <CommandItem key={connector.id} value={`${connector.name} ${connector.group}`} onSelect={() => { setSelectedId(connector.id); setCommandOpen(false); }}>
                    {connector.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      </DialogContent>
    </Dialog>
  );
}
function PreparingSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const appId = new URLSearchParams(location.search).get("app");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!appId) {
      navigate("/apps", { replace: true });
      return;
    }
    let cancelled = false;
    const prepare = async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      if (cancelled) return;
      setStep(1);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      if (cancelled) return;
      setStep(2);
      try {
        const session = await startSession(appId);
        if (cancelled) return;
        setStep(3);
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        if (!cancelled) navigate(`/sessions/${session.id}`, { replace: true });
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "This session could not be prepared.",
          );
      }
    };
    prepare();
    return () => {
      cancelled = true;
    };
  }, [appId, navigate, attempt]);
  return (
    <>
      <PageMeta
        title="Preparing session"
        description="Preparing your Android test session."
      />
      <AppShell>
        <main className="content preparation-page">
          <section className="preparation-card">
            <div className="preparation-visual">
              <div className="phone-outline">
                <div className="phone-pulse" />
              </div>
            </div>
            <p className="eyebrow">PREPARING YOUR SESSION</p>
            <h1>
              {error
                ? "We could not start this session"
                : preparationSteps[step]}
            </h1>
            <p>
              {error ||
                "Sulphur is preparing a private local Android environment for your app."}
            </p>
            {error ? (
              <div className="dialog-actions">
                <NavLink to="/apps">
                  <Button variant="outline">Back to apps</Button>
                </NavLink>
                <Button onClick={() => { setError(""); setStep(0); setAttempt((value) => value + 1); }}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="preparation-steps">
                {preparationSteps.map((label, index) => (
                  <span
                    key={label}
                    className={
                      index < step ? "done" : index === step ? "current" : ""
                    }
                  >
                    {index < step ? <Check size={13} aria-label="Complete" /> : index + 1} {label}
                  </span>
                ))}
              </div>
            )}
          </section>
        </main>
      </AppShell>
    </>
  );
}

function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reloadSessions = async () => {
    setLoading(true);
    setError("");
    try { setSessions(await listSessions()); }
    catch { setError("Sessions could not be loaded. Check your local server, then try again."); }
    finally { setLoading(false); }
  };
  const remove = async (id: string) => {
    try {
      await removeSession(id);
      setSessions((all) => all.filter((session) => session.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This session could not be removed.");
    }
  };
  const end = async (id: string) => {
    try {
      await endSession(id);
      setSessions((all) => all.map((session) => session.id === id ? { ...session, status: "ended" } : session));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This session could not be ended.");
    }
  };
  useEffect(() => {
    void reloadSessions();
  }, []);
  return (
    <>
      <PageMeta
        title="Sessions"
        description="View and manage your Android test sessions."
      />
      <AppShell>
        <main className="content">
          <header className="topbar">
            <span className="workspace">
              <span className="workspace-dot" />
              Your workspace
            </span>
          </header>
          <section className="page-heading">
            <div>
              <p className="eyebrow">ANDROID TEST SESSIONS</p>
              <h1>Sessions</h1>
              <p>
                Open a session to view its current Android screen and connection
                details.
              </p>
            </div>
          </section>
          {loading ? (
            <Card className="empty-state">
              <p>Loading sessions…</p>
            </Card>
          ) : error ? (
            <Card className="empty-state">
              <h2>Sessions are unavailable</h2>
              <p>{error}</p>
              <Button
                variant="outline"
                onClick={() => void reloadSessions()}
              >
                Try again
              </Button>
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="empty-state">
              <div className="empty-icon">
                <AppWindow size={23} />
              </div>
              <h2>No sessions yet</h2>
              <p>
                Choose an uploaded app and select Prepare session to launch it
                in the local Android emulator.
              </p>
              <NavLink to="/apps">
                <Button>Open apps</Button>
              </NavLink>
            </Card>
          ) : (
            <Card className="apps-card">
              <div className="table-heading">
                <div>
                  <h2>All sessions</h2>
                  <p>Running and previous local sessions are kept here.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Started</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <span className="session-table-name"><Smartphone size={15} /><strong>Android session</strong></span>
                        </td>
                        <td>{formatDate(session.createdAt)}</td>
                        <td>
                          <Badge
                            tone={
                              session.status === "running"
                                ? "safe"
                                : session.status === "failed"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {session.status}
                          </Badge>
                        </td>
                        <td className="row-actions">
                          <NavLink to={`/sessions/${session.id}`}>
                            <Button variant="outline" className="row-icon-action" aria-label="Open session" title="Open session">
                              <Eye size={15} />
                            </Button>
                          </NavLink>
                          {session.status === "running" ? (
                            <button
                              className="row-icon-action"
                              onClick={() => end(session.id)}
                              aria-label="End session"
                              title="End session"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          ) : (
                            <>
                              <button className="row-icon-action" onClick={() => navigate(`/sessions/preparing?app=${encodeURIComponent(session.artifactId)}`)} aria-label="Restart session" title="Restart this app in a fresh session">
                                <RotateCcw size={15} />
                              </button>
                              <AlertDialog>
                                <DialogTrigger asChild>
                                  <button className="row-icon-action danger" aria-label="Delete session" title="Delete session">
                                    <Trash2 size={15} />
                                  </button>
                                </DialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogTitle className="dialog-title">
                                    Delete this session?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="dialog-description">
                                    This removes the saved session record. It will
                                    not affect your APK.
                                  </AlertDialogDescription>
                                  <div className="dialog-actions">
                                    <AlertDialogCancel asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </AlertDialogCancel>
                                    <AlertDialogAction asChild>
                                      <Button
                                        variant="destructive"
                                        onClick={() => void remove(session.id)}
                                      >
                                        Delete session
                                      </Button>
                                    </AlertDialogAction>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </AppShell>
    </>
  );
}

function SessionDetailPage() {
  const { id: requested } = useParams();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const active = sessions.find((session) => session.id === requested);
  const refresh = () =>
    listSessions()
      .then(setSessions)
      .catch(() => setError("This session could not be loaded."))
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);
  const stop = async () => {
    if (!active) return;
    setEnding(true);
    try {
      await endSession(active.id);
      await refresh();
    } finally {
      setEnding(false);
    }
  };
  return (
    <>
      <PageMeta
        title="Sessions"
        description="View and manage your local Android test sessions."
      />
      <AppShell>
        <main className="content">
          <header className="topbar">
            <span className="workspace">
              <span className="workspace-dot" />
              Your workspace
            </span>
          </header>
          <section className="page-heading">
            <div>
              <p className="eyebrow">LOCAL ANDROID SESSIONS</p>
              <h1>Sessions</h1>
              <p>
                Each local session uses the dedicated Sulphur emulator. The live
                view refreshes automatically.
              </p>
            </div>
          </section>
          {loading ? (
            <Card className="empty-state">
              <p>Loading sessions…</p>
            </Card>
          ) : error ? (
            <Card className="empty-state">
              <h2>Session unavailable</h2>
              <p>{error}</p>
              <NavLink to="/sessions">
                <Button variant="outline">Back to sessions</Button>
              </NavLink>
            </Card>
          ) : active?.status === "running" ? (
            <SessionPanel sessionId={active.id} screen={<LiveScreen sessionId={active.id} />} setupAction={<McpSetupDialog sessionId={active.id} />} ending={ending} onEnd={stop} />
          ) : (
            <Card className="empty-state">
              <div className="empty-icon">
                <AppWindow size={23} />
              </div>
              <h2>
                {active
                  ? `This session is ${active.status}`
                  : "Session not found"}
              </h2>
              <p>
                {active
                  ? "It is no longer connected to the local Android emulator."
                  : "It may have been removed or belong to another workspace."}
              </p>
              <NavLink to="/sessions">
                <Button>Back to sessions</Button>
              </NavLink>
            </Card>
          )}
        </main>
      </AppShell>
    </>
  );
}

type CoTesterConversation = { id: string; appId: string; title: string; messages: import("./storage").AgentMessage[]; updatedAt: string };
const cotesterChatsKey = "sulphur-cotester-chats";

function testChatTitle(request: string) {
  const sentence = request.replace(/\s+/g, " ").trim().split(/[.!?]/)[0]?.replace(/^(please|can you|could you|would you)\s+/i, "") ?? "";
  if (!sentence) return "New test";
  const concise = sentence.replace(/^(test|check|explore|verify)\s+(the\s+)?/i, "");
  const title = concise ? `Test ${concise}` : sentence;
  return title.charAt(0).toUpperCase() + title.slice(1, 64);
}

function coTesterLoadMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "The workspace service did not respond.";
  if (/sign in|verify your email/i.test(message)) return "Your workspace session has expired. Sign in again, then return to CoTester.";
  if (/failed to fetch|networkerror|network request/i.test(message)) return "CoTester cannot reach the local workspace service. Start `npm run auth:dev`, then try again.";
  return `We could not load your app library. ${message}`;
}

function CoTesterPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [conversations, setConversations] = useState<CoTesterConversation[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(cotesterChatsKey) ?? "[]") as CoTesterConversation[]; }
    catch { return []; }
  });
  const [activeChatId, setActiveChatId] = useState("");
  const [chatMenuId, setChatMenuId] = useState("");
  const [renameTarget, setRenameTarget] = useState<CoTesterConversation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CoTesterConversation | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [railWidth, setRailWidth] = useState(236);
  const [resizingRail, setResizingRail] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const pendingConversationId = useRef(crypto.randomUUID());
  const loadWorkspace = async () => {
    setLoading(true); setLoadError("");
    const [appsResult, sessionsResult, billingResult, conversationsResult] = await Promise.allSettled([listApps(), listSessions(), getBilling(), listAgentConversations()]);
    if (appsResult.status === "rejected") { const message = coTesterLoadMessage(appsResult.reason); setLoadError(message); setToast(message); setLoading(false); return; }
    setApps(appsResult.value);
    setSessions(sessionsResult.status === "fulfilled" ? sessionsResult.value : []);
    setCreditsRemaining(billingResult.status === "fulfilled" ? billingResult.value.creditBalance : null);
    if (conversationsResult.status === "fulfilled") setConversations(conversationsResult.value.map((chat) => ({ id: chat.id, appId: chat.artifactId, title: chat.title, messages: chat.messages, updatedAt: chat.updatedAt })));
    setSelectedAppId((current) => current || appsResult.value[0]?.id || "");
    setLoading(false);
  };
  useEffect(() => { void loadWorkspace(); }, []);
  const selectedApp = apps.find((app) => app.id === selectedAppId);
  const activeSession = sessions.find((session) => session.artifactId === selectedAppId && session.status === "running");
  const appChats = conversations.filter((chat) => chat.appId === selectedAppId);
  const activeChat = appChats.find((chat) => chat.id === activeChatId) ?? appChats[0];
  const conversationId = activeChat?.id || activeChatId || pendingConversationId.current;
  useEffect(() => { window.localStorage.setItem(cotesterChatsKey, JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { if (activeChat) setActiveChatId(activeChat.id); }, [selectedAppId]);
  const newChat = () => {
    if (!selectedAppId) return;
    const chat = { id: crypto.randomUUID(), appId: selectedAppId, title: "New test", messages: [], updatedAt: new Date().toISOString() };
    setConversations((all) => [chat, ...all]); setActiveChatId(chat.id);
  };
  const renameChat = async () => {
    const chat = renameTarget;
    const title = renameValue.trim();
    if (!chat || !title || title === chat.title) { setRenameTarget(null); return; }
    try {
      if (chat.messages.length) await renameAgentConversation(chat.id, title);
      setConversations((all) => all.map((item) => item.id === chat.id ? { ...item, title: title.slice(0, 120), updatedAt: new Date().toISOString() } : item));
      setChatMenuId(""); setRenameTarget(null);
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "This chat could not be renamed."); }
  };
  const deleteChat = async () => {
    const chat = deleteTarget;
    if (!chat) return;
    try {
      if (chat.messages.length) await deleteAgentConversation(chat.id);
      setConversations((all) => all.filter((item) => item.id !== chat.id));
      if (activeChat?.id === chat.id) { setActiveChatId(""); pendingConversationId.current = crypto.randomUUID(); }
      setChatMenuId(""); setDeleteTarget(null);
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "This chat could not be deleted."); }
  };
  const updateMessages = (messages: import("./storage").AgentMessage[]) => {
    if (!selectedAppId) return;
    const id = activeChat?.id || activeChatId || pendingConversationId.current;
    const firstUserMessage = messages.find((message) => message.role === "user")?.content;
    const updated = { id, appId: selectedAppId, title: firstUserMessage ? testChatTitle(firstUserMessage) : "New test", messages, updatedAt: new Date().toISOString() };
    setActiveChatId(id); setConversations((all) => [updated, ...all.filter((chat) => chat.id !== id)]);
  };
  const resizeRail = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizingRail) return;
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
    setRailWidth(Math.max(184, Math.min(360, event.clientX - left)));
  };
  const ensureSession = async () => {
    const remoteSessions = await listSessions();
    setSessions(remoteSessions);
    const existing = remoteSessions.find((session) => session.artifactId === selectedAppId && session.status === "running");
    if (existing) return existing;
    if (!selectedAppId) throw new Error("Select an app before starting a CoTester session.");
    setStarting(true);
    try {
      const session = await startSession(selectedAppId);
      setSessions((all) => [session, ...all.filter((candidate) => candidate.id !== session.id)]);
      return session;
    }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : "CoTester could not start this app.";
      setToast(message);
      throw new Error(message);
    }
    finally { setStarting(false); }
  };
  return <><PageMeta title="CoTester" description="An AI copilot for testing your Android app in a private Sulphur session." /><ToastProvider><AppShell><main className="content cotester-page">
    <section className="cotester-workspace">
      {loading ? <section className="cotester-load-state"><LatticeLoader label="Loading your CoTester workspace" detail="Fetching your apps, sessions, and available credits." /></section> : loadError ? <section className="cotester-load-state cotester-load-error"><strong>CoTester could not open your workspace</strong><p>Use retry after resolving the issue shown in the notification.</p><Button onClick={() => void loadWorkspace()}>Try again</Button></section> : <>{selectedApp ? <><section className="cotester-chat-shell" style={{ gridTemplateColumns: `${railWidth}px 8px minmax(0, 1fr)` }}><aside className="cotester-chat-history"><div className="cotester-history-brand"><Sparkles size={16} /><span>CoTester</span></div><label className="cotester-app-select"><span>TESTING APP</span><select value={selectedAppId} onChange={(event) => { setSelectedAppId(event.target.value); setActiveChatId(""); setPreviewOpen(false); }}>{apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</select></label><Button onClick={newChat} variant="outline"><Pencil size={14} /> New chat</Button><label className="cotester-chat-search"><Search size={14} /><input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search chats" /></label><div className="cotester-history-list"><p>RECENT CHATS</p>{appChats.filter((chat) => chat.title.toLowerCase().includes(chatSearch.toLowerCase())).map((chat) => <div className={`cotester-history-chat${chat.id === activeChat?.id ? " active" : ""}`} key={chat.id}><button type="button" className="cotester-history-chat-open" onClick={() => { setActiveChatId(chat.id); setChatMenuId(""); }}><strong>{chat.title}</strong><span>{new Date(chat.updatedAt).toLocaleDateString()}</span></button><button type="button" className="cotester-history-more" aria-label={`Actions for ${chat.title}`} aria-expanded={chatMenuId === chat.id} onClick={() => setChatMenuId((open) => open === chat.id ? "" : chat.id)}><MoreHorizontal size={15} /></button>{chatMenuId === chat.id && <div className="cotester-history-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setRenameTarget(chat); setRenameValue(chat.title); setChatMenuId(""); }}>Rename</button><button type="button" role="menuitem" className="danger" onClick={() => { setDeleteTarget(chat); setChatMenuId(""); }}>Delete</button></div>}</div>)}{!appChats.length && <span className="cotester-history-empty">Your test conversations will appear here.</span>}</div><div className="cotester-history-session"><span><i /> {selectedApp?.name}</span><span className="cotester-credit-count">{creditsRemaining ?? "—"} credits remaining</span>{activeSession && <NavLink to={`/sessions/${activeSession.id}`}>Session controls</NavLink>}</div></aside><div className="cotester-rail-resize" role="separator" aria-orientation="vertical" aria-label="Resize chat history" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setResizingRail(true); }} onPointerMove={resizeRail} onPointerUp={() => setResizingRail(false)} /><section className="cotester-chat-main"><header><div><span><Sparkles size={13} /> CoTester</span><h2>{activeChat?.title === "New test" ? "New test" : activeChat?.title || "Start a new test"}</h2></div><div className="cotester-header-actions"><div className="cotester-live-pill"><i /> {activeSession ? "Live session" : starting ? "Starting session" : "Ready to run"}</div>{activeSession && <button type="button" className="cotester-preview-button" onClick={() => setPreviewOpen(true)} aria-label="Open live app preview" title="Open live preview"><Eye size={17} /></button>}</div></header><AgentChat sessionId={activeSession?.id} ensureSession={ensureSession} conversationId={conversationId} messages={activeChat?.messages ?? []} onMessagesChange={updateMessages} onCreditsChange={setCreditsRemaining} onError={setToast} /></section></section>{activeSession && <aside className={`cotester-preview-drawer${previewOpen ? " open" : ""}`} aria-hidden={!previewOpen}><LiveScreen sessionId={activeSession.id} minimal /></aside>}{previewOpen && <button type="button" className="cotester-drawer-backdrop" aria-label="Close live preview" onClick={() => setPreviewOpen(false)} />}</> : <section className="cotester-setup-shell"><div><span><Sparkles size={17} /> COTESTER</span><h1>Start a new test</h1><p>Upload an Android app to start a private CoTester session.</p><div className="cotester-no-app"><AppWindow size={18} /><span>Upload an APK to start testing.</span><NavLink to="/apps">Open apps</NavLink></div></div></section>}</>}
    </section>
  </main></AppShell><Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}><DialogContent><DialogTitle className="dialog-title">Rename test chat</DialogTitle><DialogDescription className="dialog-description">Use a short name that makes this test easy to find later.</DialogDescription><Input value={renameValue} maxLength={120} autoFocus onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void renameChat(); }} /><div className="dialog-actions"><Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button><Button onClick={() => void renameChat()} disabled={!renameValue.trim()}>Save name</Button></div></DialogContent></Dialog><AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogTitle className="dialog-title">Delete this test chat?</AlertDialogTitle><AlertDialogDescription className="dialog-description">Its messages and saved CoTester context will be permanently removed.</AlertDialogDescription><div className="dialog-actions"><AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" onClick={() => void deleteChat()}>Delete chat</Button></AlertDialogAction></div></AlertDialogContent></AlertDialog>{toast && <Toast open onOpenChange={(open) => !open && setToast("")} className="toast"><ToastTitle>{toast}</ToastTitle></Toast>}<ToastViewport className="toast-viewport" /></ToastProvider></>;
}

function FuturePage({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow: string;
}) {
  return (
    <>
      <PageMeta title={title} description={description} />
      <AppShell>
        <main className="content">
          <header className="topbar">
            <span className="workspace">
              <span className="workspace-dot" />
              Your workspace
            </span>
          </header>
          <section className="page-heading">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </section>
          <Card className="empty-state">
            <div className="empty-icon">
              <AppWindow size={23} />
            </div>
            <h2>Nothing to show yet</h2>
            <p>
              Sessions will appear here after an APK is prepared in an isolated
              Android worker.
            </p>
          </Card>
        </main>
      </AppShell>
    </>
  );
}
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <SilentLoadingPage />;
  return data?.user?.emailVerified ? <>{children}</> : <Navigate to="/auth/login" replace />;
}

createRoot(document.getElementById("root")!).render(
  <CanonicalLocalhost>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/product" element={<ProductRoute />} />
        <Route path="/why-sulphur" element={<WhySulphurRoute />} />
        <Route path="/pricing" element={<PublicRoute page="pricing" />} />
        <Route path="/resources" element={<PublicRoute page="resources" />} />
        <Route path="/resources/:resource" element={<PublicRoute page="resource-detail" />} />
        <Route path="/legal/:page" element={<PublicRoute page="legal" />} />
        <Route path="/docs" element={<PublicRoute page="docs" />} />
        <Route path="/docs/:slug" element={<PublicRoute page="docs" />} />
        <Route path="/auth/login" element={<AuthRoute view="sign-in" />} />
        <Route path="/auth/signup" element={<AuthRoute view="create" />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apps"
          element={
            <ProtectedRoute>
              <AppsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cotester"
          element={
            <ProtectedRoute>
              <CoTesterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/preparing"
          element={
            <ProtectedRoute>
              <PreparingSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:id"
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/*"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </CanonicalLocalhost>,
);
