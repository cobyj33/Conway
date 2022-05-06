import React, { useEffect, useState } from 'react'
import { FaWindowClose } from 'react-icons/fa'
import "./alert.css"

const useAlertState = (initialState = {message: '', duration: 0})  => {
    const [alert, setAlert] = useState(initialState)
    return [alert, setAlert]
}


export const Alert = ({ children, duration, close }) => {
    
    useEffect( () => {
        setTimeout(() => close(), duration);
    }, [])

  return (
    <div className="alert">
        <button className="alert-close" onClick={close}> <FaWindowClose /> </button>
        { children }
    </div>
  )
}
