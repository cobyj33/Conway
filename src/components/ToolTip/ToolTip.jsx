import React, { useEffect, useRef, useState } from 'react'
import "./tooltip.css"

export const ToolTip = ({ children, expanded, trigger, target }) => {
    const [opened, setOpened] = useState(false);
    const [showExtra, setShowExtra] = useState(false);
    const [position, setPosition] = useState({ left: 0, top: 0 })
    const toolTipReference = useRef(null);

    const openStatus = useRef(opened);
    useEffect( () => { openStatus.current = opened }, [opened]);

    const getParent = () => target ? target.current : toolTipReference?.current?.parentElement;
    const open = () => setOpened(true);
    const close = () => { setOpened(false); setShowExtra(false); }
    const updatePosition = (event) => setPosition({ left: event.clientX + 10, top: event.clientY + 10 });
    
    const displayExtra = (event) => { 
        if (event.key === "Shift" && openStatus.current && !event.repeat) { 
            setShowExtra(true)
        }
    }

    const hideExtra = () => setShowExtra(false);


    useEffect( () => {
        getParent().addEventListener('mouseenter', open);
        getParent().addEventListener('mouseleave', close);
        getParent().addEventListener('mousemove', updatePosition);
        window.addEventListener('keydown', displayExtra);
        window.addEventListener('keyup', hideExtra);
        

        return () => {
            if (getParent()) {
                getParent().removeEventListener('mouseenter', open);
                getParent().removeEventListener('mouseleave', close);
                getParent().removeEventListener('mousemove', updatePosition);
            };
            window.removeEventListener('keydown', displayExtra);
            window.removeEventListener('keyup', hideExtra);
        }
    }, [])


  return (
    <div className='tooltip' ref={toolTipReference} style={{...position, display: opened ? '' : 'none'}}>
        {children}
        { showExtra && 
        <div className='tooltip-extra'>
            {expanded}
        </div> }
    </div>
  )
}
