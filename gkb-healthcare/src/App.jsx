import { useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Home     from './pages/Home.jsx'
import Schedule from './pages/Schedule.jsx'
import Meals    from './pages/Meals.jsx'
import Focus    from './pages/Focus.jsx'
import Morning  from './pages/Morning.jsx'
import Review   from './pages/Review.jsx'

const PAGES = { home: Home, schedule: Schedule, meals: Meals, focus: Focus, morning: Morning, review: Review }

export default function App() {
  const [page, setPage] = useState('home')
  const Page = PAGES[page]

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-paper relative overflow-x-hidden">
      <main className="pb-24 min-h-screen">
        <Page navigate={setPage} />
      </main>
      <BottomNav currentPage={page} onChange={setPage} />
    </div>
  )
}
