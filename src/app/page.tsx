import ChapterLibrary from "@/components/chapter/ChapterLibrary";
import MobileGoalBar from "@/components/dashboard/MobileGoalBar";
import TodayChecklist from "@/components/dashboard/TodayChecklist";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import SubjectPicker from "@/components/subject/SubjectPicker";
import TodoDrawer from "@/components/todo/TodoDrawer";
import StudyProvider, { useStudy } from "@/lib/store";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthPrompt } from "@/components/auth/AuthPrompt";
import { loadState } from "@/lib/storage";

export default function Home() {
  return (
    <StudyProvider>
      <PageContent />
    </StudyProvider>
  );
}

function PageContent() {
  const {
    user,
    authLoading,
    syncEnabled,
    remoteState,
    resolveSync,
  } = useStudy();

  // Show the app only after auth state is resolved.
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-[12px] text-muted">Loading StudyOS…</p>
      </div>
    );
  }

  // Not signed in: show the login form.
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background selection:bg-accent/30">
        <LoginForm onAuthenticated={() => {
          // After sign-in, the store's onAuthStateChange listener sets the
          // user and fetches cloud data; this component re-renders automatically.
        }} />
      </div>
    );
  }

  // Signed in but sync not yet resolved (local + cloud both exist).
  if (!syncEnabled && remoteState) {
    const localState = loadState();
    if (!localState) return null; // should not happen, but guard anyway
    return (
      <div className="flex min-h-screen flex-col bg-background selection:bg-accent/30">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <AuthPrompt
            remoteState={remoteState}
            cloudExists={true}
            onResolve={(choice: "useCloud" | "useLocal" | "merge") => {
              resolveSync(choice);
            }}
          />
        </div>
      </div>
    );
  }

  // Signed in and synced: show the app.
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-accent/30">
      <TopNavigation />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-8 scrollbar-hide">
            <MobileGoalBar />
            <SubjectPicker />
            <TodayChecklist />
            <ChapterLibrary />
          </div>
          <Footer />
        </main>
      </div>
      <TodoDrawer />
    </div>
  );
}
