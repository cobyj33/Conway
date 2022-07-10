import React, { useLayoutEffect, useEffect, useState, useRef } from 'react'
// import { currentMousePosition } from '../App';
import './contextmenu.css'

export const ContextMenu = ({position: initialPosition, children, bindReference}) => {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({left: 0, top: 0});
    const contextMenuReference = useRef(null);


    useLayoutEffect(() => {
      const bindedElement = bindReference ? bindReference.current : contextMenuReference.current.parentElement;
      const contextMenu = contextMenuReference.current;

      const clickHandler = function(event) {
        if ( !Array.from(bindedElement.classList).some(className => clickInsideElement(event, className)) ) {
          hide()
        }
      }

      function show(event) {  
        event.preventDefault();
        if (event.button == 2 && !open) {
          setPosition({left: event.clientX, top: event.clientY})
          setOpen(true)
          window.addEventListener('click', clickHandler)
          window.addEventListener('contextmenu', clickHandler)
        }
      };

      function hide() { 
        window.removeEventListener('click', clickHandler)
        window.removeEventListener('contextmenu', clickHandler)
        setOpen(false)
      }

      bindedElement.addEventListener('contextmenu', show);

      return () => {
        bindedElement.removeEventListener('contextmenu', show)
        window.removeEventListener('contextmenu', clickHandler)
        window.removeEventListener('click', clickHandler)
      }
    }, [])

    useEffect(() => setOpen(false), [])
    
    
    return (
        <div className='context-menu' ref={contextMenuReference} style={{...position, display: open ? '' : 'none'}}>
          { children }
        </div>
    )
  }
  
  function clickInsideElement(event, className) {
    let el = event.srcElement || event.target;
    
    if ( el.classList.contains(className) ) {
        return el;
    } else {
        while ( el = el.parentNode ) {
            if ( el.classList && el.classList.contains(className) ) {
                return el;
            }
        }
    }
    
    return false;
  }