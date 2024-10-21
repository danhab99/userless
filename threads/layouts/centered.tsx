export type CenteredLayoutProps = {
  fullscreen?: boolean;
};

export function CenteredLayout(
  props: React.PropsWithChildren<CenteredLayoutProps>,
) {
  return (
    <div
      className={`centered lg:items-center md:items-center ${props.fullscreen ? "h-screen" : ""}`}
    >
      <div className="centered-widths">{props.children}</div>
    </div>
  );
}
