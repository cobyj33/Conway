import React from 'react'
import "./sidebar.css"

export const Sidebar = ({children}) => {
  return (
    <div className='sidebar'>
        {children}
    </div>
  )
}
