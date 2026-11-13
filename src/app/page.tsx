import ChapterLibrary from "@/components/chapter/ChapterLibrary";
import MobileGoalBar from "@/components/dashboard/MobileGoalBar";
import TodayChecklist from "@/components/dashboard/TodayChecklist";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import SubjectPicker from "@/components/subject/SubjectPicker";
import TodoDrawer from "@/components/todo/TodoDrawer";
import StudyProvider from "@/lib/store";

export default function Home() {
  return (
    <StudyProvider>
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
    </StudyProvider>
  );
}
