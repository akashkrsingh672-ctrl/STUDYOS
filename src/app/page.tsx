import TopNavigation from "@/components/layout/TopNavigation";
import Sidebar from "@/components/layout/Sidebar";
import SubjectPicker from "@/components/subject/SubjectPicker";
import ChapterLibrary from "@/components/chapter/ChapterLibrary";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      <TopNavigation />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <SubjectPicker selectedSubject="Physics" />
            <ChapterLibrary />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

