// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'
import WelcomePage from './pages/WelcomePage/WelcomePage'
import ThreadPage from './pages/ThreadPage/ThreadPage'
import NotFoundPage from './pages/NotFoundPage/NotFoundPage'

const Routes = () => {
  return (
    <Router>
      <Route path="/thread" page={ThreadPage} name="thread" />
      <Route path="/t/{h}" page={ThreadPage} name="thread" />
      <Route path="/" page={WelcomePage} name="welcome" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
