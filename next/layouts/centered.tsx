export function CenteredLayout(props: React.PropsWithChildren) {
  return (
    <div className="centered lg:items-center md:items-center h-screen">
      <div className="centered-widths">{props.children}</div>
    </div>
  );
}
