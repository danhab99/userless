export function Hash(props: { content: string }) {
  return (
    <span className="inline-block w-[8ch] overflow-hidden whitespace-nowrap align-middle">
      {props.content}
    </span>
  );
}
