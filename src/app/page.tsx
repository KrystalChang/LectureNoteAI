import UploadPage from "@/components/pdf_upload";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="flex flex-col items-center gap-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">LectureNoteAI</h1>
        <p className="text-gray-500 text-lg text-center max-w-md">
          Upload your lecture slides to get AI summaries, ask questions, and
          take notes.
        </p>
      </div>
      <UploadPage />
    </div>
  );
}
