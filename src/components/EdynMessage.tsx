export function EdynMessage({ message }: { message: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
        <span className="text-sm font-bold text-rose-600">E</span>
      </div>
      <div className="bg-rose-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
        <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
