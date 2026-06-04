import { useState } from 'react'
import HomePage from './pages/HomePage/HomePage'
import MovieDetail from '/pages/MoveDetail/MovieDetail'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

    return (
        <div className="app">
            <Header />
            <main className="app__main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movies" element={<MoviesPage />} />
                </Routes>
            </main>
            <Footer />
        </div>

    );
}

export default App
