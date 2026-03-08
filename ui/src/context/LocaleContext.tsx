import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ja";

const LOCALE_STORAGE_KEY = "paperclip.locale";

const enMessages = {
  "common.loading": "Loading...",
  "global.language": "Language",
  "global.language.en": "English",
  "global.language.ja": "Japanese",
  "global.theme": "Theme",
  "global.theme.light": "Light",
  "global.theme.dark": "Dark",
  "global.theme.switchToLight": "Switch to light mode",
  "global.theme.switchToDark": "Switch to dark mode",

  "layout.skipToMainContent": "Skip to Main Content",
  "layout.documentation": "Documentation",
  "layout.closeSidebar": "Close sidebar",
  "layout.openSidebar": "Open sidebar",
  "layout.selectCompany": "Select company",

  "sidebar.newIssue": "New Issue",
  "sidebar.dashboard": "Dashboard",
  "sidebar.inbox": "Inbox",
  "sidebar.work": "Work",
  "sidebar.issues": "Issues",
  "sidebar.goals": "Goals",
  "sidebar.company": "Company",
  "sidebar.org": "Org",
  "sidebar.costs": "Costs",
  "sidebar.activity": "Activity",
  "sidebar.settings": "Settings",

  "mobile.home": "Home",
  "mobile.create": "Create",
  "mobile.agents": "Agents",
  "mobile.navigation": "Mobile navigation",

  "companyRail.addCompany": "Add company",

  "auth.loading": "Loading...",
  "auth.signInTitle": "Sign in to Paperclip",
  "auth.signUpTitle": "Create your Paperclip account",
  "auth.signInDescription": "Use your email and password to access this instance.",
  "auth.signUpDescription": "Create an account for this instance. Email confirmation is not required in v1.",
  "auth.name": "Name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.working": "Working...",
  "auth.signIn": "Sign In",
  "auth.createAccount": "Create Account",
  "auth.needAccount": "Need an account?",
  "auth.haveAccount": "Already have an account?",
  "auth.createOne": "Create one",
  "auth.switchToSignIn": "Sign in",
  "auth.failed": "Authentication failed",

  "boardClaim.invalidUrl": "Invalid board claim URL.",
  "boardClaim.loading": "Loading claim challenge...",
  "boardClaim.unavailableTitle": "Claim challenge unavailable",
  "boardClaim.unavailableDetail": "Challenge is invalid or expired.",
  "boardClaim.claimedTitle": "Board ownership claimed",
  "boardClaim.claimedDetail": "This instance is now linked to your authenticated user.",
  "boardClaim.openBoard": "Open board",
  "boardClaim.signInRequiredTitle": "Sign in required",
  "boardClaim.signInRequiredDetail": "Sign in or create an account, then return to this page to claim Board ownership.",
  "boardClaim.signInCta": "Sign in / Create account",
  "boardClaim.pageTitle": "Claim Board ownership",
  "boardClaim.pageDetail": "This will promote your user to instance admin and migrate company ownership access from local trusted mode.",
  "boardClaim.claiming": "Claiming...",
  "boardClaim.claim": "Claim ownership",
  "boardClaim.failed": "Failed to claim board ownership",

  "invite.invalidToken": "Invalid invite token.",
  "invite.loading": "Loading invite...",
  "invite.unavailableTitle": "Invite not available",
  "invite.unavailableDetail": "This invite may be expired, revoked, or already used.",
  "invite.bootstrapCompleteTitle": "Bootstrap complete",
  "invite.bootstrapCompleteDetail": "The first instance admin is now configured. You can continue to the board.",
  "invite.joinSubmittedTitle": "Join request submitted",
  "invite.joinSubmittedDetail": "Your request is pending admin approval. You will not have access until approved.",
  "invite.requestId": "Request ID",
  "invite.oneTimeSecret": "One-time claim secret (save now)",
  "invite.skillBootstrap": "Paperclip skill bootstrap",
  "invite.installTo": "Install to",
  "invite.agentReadableOnboarding": "Agent-readable onboarding text",
  "invite.connectivityDiagnostics": "Connectivity diagnostics",
  "invite.bootstrapPageTitle": "Bootstrap your Paperclip instance",
  "invite.joinCompanyTitle": "Join this Paperclip company",
  "invite.expires": "Invite expires",
  "invite.joinAs": "Join as",
  "invite.joinAsHuman": "human",
  "invite.joinAsAgent": "agent",
  "invite.agentName": "Agent name",
  "invite.adapterType": "Adapter type",
  "invite.comingSoon": "Coming soon",
  "invite.capabilitiesOptional": "Capabilities (optional)",
  "invite.signInRequired": "Sign in or create an account before submitting a human join request.",
  "invite.signInCta": "Sign in / Create account",
  "invite.submitting": "Submitting...",
  "invite.acceptBootstrap": "Accept bootstrap invite",
  "invite.submitJoinRequest": "Submit join request",
  "invite.failed": "Failed to accept invite",

  "app.bootstrapRequiredTitle": "Instance setup required",
  "app.bootstrapRequiredDetail": "No instance admin exists yet. Run this command in your Paperclip environment to generate the first admin invite URL:",
  "app.failedToLoad": "Failed to load app state",
  "app.createFirstCompany": "Create your first company",
  "app.createFirstCompanyDetail": "Get started by creating a company.",
  "app.newCompany": "New Company",
} as const;

type MessageKey = keyof typeof enMessages;

const jaMessages: Record<MessageKey, string> = {
  "common.loading": "読み込み中...",
  "global.language": "言語",
  "global.language.en": "英語",
  "global.language.ja": "日本語",
  "global.theme": "テーマ",
  "global.theme.light": "ライト",
  "global.theme.dark": "ダーク",
  "global.theme.switchToLight": "ライトモードに切り替え",
  "global.theme.switchToDark": "ダークモードに切り替え",

  "layout.skipToMainContent": "メインコンテンツへスキップ",
  "layout.documentation": "ドキュメント",
  "layout.closeSidebar": "サイドバーを閉じる",
  "layout.openSidebar": "サイドバーを開く",
  "layout.selectCompany": "会社を選択",

  "sidebar.newIssue": "新規Issue",
  "sidebar.dashboard": "ダッシュボード",
  "sidebar.inbox": "受信箱",
  "sidebar.work": "作業",
  "sidebar.issues": "Issue",
  "sidebar.goals": "目標",
  "sidebar.company": "会社",
  "sidebar.org": "組織",
  "sidebar.costs": "コスト",
  "sidebar.activity": "アクティビティ",
  "sidebar.settings": "設定",

  "mobile.home": "ホーム",
  "mobile.create": "作成",
  "mobile.agents": "エージェント",
  "mobile.navigation": "モバイルナビゲーション",

  "companyRail.addCompany": "会社を追加",

  "auth.loading": "読み込み中...",
  "auth.signInTitle": "Paperclipにサインイン",
  "auth.signUpTitle": "Paperclipアカウントを作成",
  "auth.signInDescription": "メールアドレスとパスワードでこのインスタンスにアクセスします。",
  "auth.signUpDescription": "このインスタンス用のアカウントを作成します。v1ではメール確認は不要です。",
  "auth.name": "名前",
  "auth.email": "メールアドレス",
  "auth.password": "パスワード",
  "auth.working": "処理中...",
  "auth.signIn": "サインイン",
  "auth.createAccount": "アカウント作成",
  "auth.needAccount": "アカウントが必要ですか？",
  "auth.haveAccount": "すでにアカウントをお持ちですか？",
  "auth.createOne": "作成する",
  "auth.switchToSignIn": "サインイン",
  "auth.failed": "認証に失敗しました",

  "boardClaim.invalidUrl": "無効なボード権限取得URLです。",
  "boardClaim.loading": "権限取得チャレンジを読み込み中...",
  "boardClaim.unavailableTitle": "権限取得チャレンジを利用できません",
  "boardClaim.unavailableDetail": "チャレンジが無効か期限切れです。",
  "boardClaim.claimedTitle": "ボード所有権を取得しました",
  "boardClaim.claimedDetail": "このインスタンスは認証済みユーザーに紐づきました。",
  "boardClaim.openBoard": "ボードを開く",
  "boardClaim.signInRequiredTitle": "サインインが必要です",
  "boardClaim.signInRequiredDetail": "サインインまたはアカウント作成後、このページに戻ってボード所有権を取得してください。",
  "boardClaim.signInCta": "サインイン / アカウント作成",
  "boardClaim.pageTitle": "ボード所有権を取得",
  "boardClaim.pageDetail": "ユーザーをインスタンス管理者に昇格し、ローカルトラストモードから会社所有アクセスを移行します。",
  "boardClaim.claiming": "取得中...",
  "boardClaim.claim": "所有権を取得",
  "boardClaim.failed": "ボード所有権の取得に失敗しました",

  "invite.invalidToken": "無効な招待トークンです。",
  "invite.loading": "招待を読み込み中...",
  "invite.unavailableTitle": "招待を利用できません",
  "invite.unavailableDetail": "この招待は期限切れ、取り消し済み、または使用済みの可能性があります。",
  "invite.bootstrapCompleteTitle": "初期設定が完了しました",
  "invite.bootstrapCompleteDetail": "最初のインスタンス管理者が設定されました。ボードへ進めます。",
  "invite.joinSubmittedTitle": "参加リクエストを送信しました",
  "invite.joinSubmittedDetail": "管理者承認待ちです。承認されるまでアクセスできません。",
  "invite.requestId": "リクエストID",
  "invite.oneTimeSecret": "ワンタイム取得シークレット（今すぐ保存）",
  "invite.skillBootstrap": "Paperclipスキル初期化",
  "invite.installTo": "インストール先",
  "invite.agentReadableOnboarding": "エージェント向けオンボーディングテキスト",
  "invite.connectivityDiagnostics": "接続診断",
  "invite.bootstrapPageTitle": "Paperclipインスタンスを初期設定",
  "invite.joinCompanyTitle": "このPaperclip会社に参加",
  "invite.expires": "招待の有効期限",
  "invite.joinAs": "参加種別",
  "invite.joinAsHuman": "人間",
  "invite.joinAsAgent": "エージェント",
  "invite.agentName": "エージェント名",
  "invite.adapterType": "アダプター種別",
  "invite.comingSoon": "近日対応",
  "invite.capabilitiesOptional": "能力（任意）",
  "invite.signInRequired": "人間として参加リクエストを送る前に、サインインまたはアカウント作成してください。",
  "invite.signInCta": "サインイン / アカウント作成",
  "invite.submitting": "送信中...",
  "invite.acceptBootstrap": "初期設定招待を承認",
  "invite.submitJoinRequest": "参加リクエストを送信",
  "invite.failed": "招待の承認に失敗しました",

  "app.bootstrapRequiredTitle": "インスタンス設定が必要です",
  "app.bootstrapRequiredDetail": "まだインスタンス管理者が存在しません。Paperclip環境で次のコマンドを実行して最初の管理者招待URLを生成してください。",
  "app.failedToLoad": "アプリ状態の読み込みに失敗しました",
  "app.createFirstCompany": "最初の会社を作成",
  "app.createFirstCompanyDetail": "会社を作成して開始します。",
  "app.newCompany": "新しい会社",
};

const looseJaTextMap: Record<string, string> = {
  Dashboard: "ダッシュボード",
  Inbox: "受信箱",
  Work: "作業",
  Issues: "Issue",
  Goals: "目標",
  Company: "会社",
  Org: "組織",
  Costs: "コスト",
  Activity: "アクティビティ",
  Settings: "設定",
  live: "稼働中",
  Documentation: "ドキュメント",
  Companies: "会社",
  "No companies": "会社がありません",
  "Company Settings": "会社設定",
  "Manage Companies": "会社管理",
  Agents: "エージェント",
  Projects: "プロジェクト",
  Approvals: "承認",
  Actions: "アクション",
  Pages: "ページ",
  "Search issues, agents, projects...": "Issue・エージェント・プロジェクトを検索...",
  "No results found.": "結果が見つかりません。",
  "Create new issue": "新規Issueを作成",
  "Create new agent": "新規エージェントを作成",
  "Create new project": "新規プロジェクトを作成",
  "Select a company first.": "先に会社を選択してください。",
  "Select a company to view activity.": "アクティビティを見るには会社を選択してください。",
  "No activity yet.": "まだアクティビティはありません。",
  "No pending approvals.": "保留中の承認はありません。",
  "No approvals yet.": "承認はまだありません。",
  "Approval not found.": "承認が見つかりません。",
  "Open sidebar": "サイドバーを開く",
  "Close sidebar": "サイドバーを閉じる",
};

const messages: Record<Locale, Record<MessageKey, string>> = {
  en: enMessages,
  ja: jaMessages,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
  translateText: (text: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ja" || stored === "en") return stored;
  } catch {
    // Ignore localStorage read failures.
  }

  const docLang = document.documentElement.lang.toLowerCase();
  return docLang.startsWith("ja") ? "ja" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => (current === "en" ? "ja" : "en"));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore localStorage write failures.
    }
  }, [locale]);

  const t = useCallback(
    (key: MessageKey) => {
      return messages[locale][key] ?? enMessages[key];
    },
    [locale],
  );

  const translateText = useCallback(
    (text: string) => {
      if (locale !== "ja") return text;
      return looseJaTextMap[text] ?? text;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t, translateText }),
    [locale, setLocale, toggleLocale, t, translateText],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
