const Centered = (props: React.PropsWithChildren<{}>) => {
  return (
    <div className="my-8 flex flex-row justify-center px-8">
      <div className="max-w-4xl flex-grow">{props.children}</div>
    </div>
  )
}

export default Centered
