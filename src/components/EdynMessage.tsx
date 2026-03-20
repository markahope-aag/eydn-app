export function EdynMessage({ message }: { message: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center">
        <span className="text-[13px] font-semibold text-white">e</span>
      </div>
      <div className="bg-lavender rounded-[12px] rounded-tl-[4px] px-4 py-3 max-w-lg">
        <p className="text-[15px] text-plum leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
