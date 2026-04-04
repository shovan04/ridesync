import { Routes, Route } from 'react-router-dom'
import './App.css'
import ActiveRideScreen from './screen/ActiveRideScreen'
import About from './screen/About'
import SessionScreen from './screen/SessionScreen'
import ProfileScreen from './screen/ProfileScreen'
import OffRouteAlert from './screen/OffRouteAlert'



function App() {

  return (
   <Routes>
      <Route path="/" element={<ActiveRideScreen />} />
      <Route path="/about" element={<About />} />
      <Route path="/session" element={<SessionScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/alert/off-route" element={<OffRouteAlert />} />

      
    </Routes>
  )
}

export default App
