import { Link, routes } from '@redwoodjs/router'
import ActionButton from 'src/components/ActionButton/ActionButton'

type NavbarLayoutProps = {
  children?: React.ReactNode
}

const NavbarLayout = ({ children }: NavbarLayoutProps) => {
  return (
    <>
      <Link to={routes.welcome()}>
        <ActionButton label="Home" color="text-purple-600" />
      </Link>
      <Link to={routes.generateKey()}>
        <ActionButton label="Generate keys" />
      </Link>
      <ActionButton label="Directory" />
      {children}
    </>
  )
}

export default NavbarLayout
