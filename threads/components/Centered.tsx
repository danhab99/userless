const Centered = (props: React.PropsWithChildren<{}>) => {
  return (
    <div className="w-full px-4 md:w-2/3 md:mx-auto">
      {props.children}
    </div>
  )
}

export default Centered
