export function Hash(props: { content: string }) {
  return (
    <span className="inline-block w-[8ch] font-mono hover:w-full overflow-hidden whitespace-nowrap align-middle text-gray-800">
      {props.content}
    </span>
  );
}
