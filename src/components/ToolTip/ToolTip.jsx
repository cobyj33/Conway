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
    const updatePosition = (event) => setPosition({ left: `${event.clientX + 10}px`, top: `${event.clientY + 10}px` });
    
    const displayExtra = (event) => { 
        if (event.key === "Shift" && openStatus.current && !event.repeat) { 
            setShowExtra(true)
        }
    }

    const hideExtra = () => setShowExtra(false);


    useEffect( () => {
        const parent = getParent();
        parent?.addEventListener('mouseenter', open);
        parent?.addEventListener('mouseleave', close);
        parent?.addEventListener('mousemove', updatePosition);
        window.addEventListener('keydown', displayExtra);
        window.addEventListener('keyup', hideExtra);
        

        return () => {
            const parent = getParent();
            if (parent != null) {
                parent.removeEventListener('mouseenter', open);
                parent.removeEventListener('mouseleave', close);
                parent.removeEventListener('mousemove', updatePosition);
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
