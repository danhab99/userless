// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route, Set } from '@redwoodjs/router'
import WelcomePage from './pages/WelcomePage/WelcomePage'
import ThreadPage from './pages/ThreadPage/ThreadPage'
import NotFoundPage from './pages/NotFoundPage/NotFoundPage'
import MainLayout from './layouts/MainLayout/MainLayout'
import NavbarLayout from './layouts/NavbarLayout/NavbarLayout'
import PostLayout from './layouts/PostLayout/PostLayout'

const Routes = () => {
  return (
    <Router>
      <Set wrap={NavbarLayout}>
        <Route path="/generate-key" page={GenerateKeyPage} name="generateKey" />
        <Route path="/register" page={RegisterKeyPage} name="registerKey" />
        <Set wrap={PostLayout}>
          <Route path="/k/{keyid}" page={KeyPage} name="key" />
          <Route path="/t/{threadhash}" page={ThreadPage} name="thread" />
          <Route path="/" page={WelcomePage} name="welcome" />
          <Route notfound page={NotFoundPage} />
        </Set>
      </Set>
    </Router>
  )
}

export default Routes
