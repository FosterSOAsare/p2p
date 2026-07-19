import { Routes, Route } from 'react-router-dom'
import { Layout } from './features/shared/ui/Layout'
import { StyleGuide } from './pages/StyleGuide'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<div>Home</div>} />
        <Route path="style-guide" element={<StyleGuide />} />
        <Route path="*" element={<div>Not found</div>} />
      </Route>
    </Routes>
  )
}

export default App
