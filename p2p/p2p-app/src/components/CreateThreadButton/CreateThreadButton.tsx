type CreateThreadButtonProps = {
  onClick: () => void;
};

export function CreateThreadButton(props: CreateThreadButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border text-xl font-bold shadow-lg transition-transform hover:scale-110 active:scale-95"
      title="Create new thread"
    >
      +
    </button>
  );
}
