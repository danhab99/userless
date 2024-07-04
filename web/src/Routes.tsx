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

const Routes = () => {
  return (
    <Router>
      <Route path="/generate-key" page={GenerateKeyPage} name="generateKey" />
      <Route path="/register" page={RegisterKeyPage} name="registerKey" />
      <Set wrap={MainLayout}>
        <Route path="/k/{keyid}" page={KeyPage} name="key" />
        <Route path="/t/{threadhash}" page={ThreadPage} name="thread" />
      </Set>
      <Route path="/" page={WelcomePage} name="welcome" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
