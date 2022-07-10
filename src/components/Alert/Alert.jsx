import React, { useEffect, useState } from 'react'
import { FaWindowClose } from 'react-icons/fa'
import "./alert.css"

export const Alert = ({ children, close = () => console.log("Close Callback Required"), startTime = Date.now(), duration = 1000 }) => {
  const [time, setTime] = useState(startTime);
  useEffect( () => {
    const timer = setInterval( () => setTime(Date.now()), 20)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="alert">
      <div className="alert-top-bar">
        <span> Notice: </span> 
        <button className="alert-close" onClick={close}> <FaWindowClose /> </button>
      </div>
        { children }

        <div className="alert-progress-bar">
          <div className="alert-progress-status" style={{width: `${ time / (startTime + duration) * 100 }%`}}> </div>
        </div>
    </div>
  )
}
