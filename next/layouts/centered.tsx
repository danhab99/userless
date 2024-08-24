export function CenteredLayout(props: React.PropsWithChildren) {
  return (
    <div className="flex flex-row justify-center lg:items-center md:items-center h-screen pt-8">
      <div className="lg:w-1/3 md:w-1/2 sm:w-9/10">{props.children}</div>
    </div>
  );
}
