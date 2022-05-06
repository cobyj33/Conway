import { useRef } from "react";
import "./dragselect.css";
import $ from "jquery";

export const DragSelect = ({parentRef, boundingRef, position, setPosition, left, top, right, bottom, children, style}) => {


    const dragSelector = useRef(null);
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let mouseXOffset = 0;
    let mouseYOffset = 0;

    function updatePosition() {
        if (isMouseDown) {
            const parent = parentRef ? parentRef.current : window;
            const bounds = boundingRef?.current ? boundingRef.current.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            let leftPos = mouseX - mouseXOffset - bounds.left;
            let topPos = mouseY - mouseYOffset - bounds.top;

            if (leftPos < 0) {
                leftPos = 0;
            } else if (leftPos > bounds.width - $(parent).width()) {
                leftPos = bounds.width - $(parent).width()
            }

            if (topPos < 0) {
                topPos = 0;
            } else if (topPos > bounds.height - $(parent).height()) {
                topPos = bounds.height - $(parent).height()
            }

            setPosition({
                left: leftPos,
                top: topPos
            });

            window.setTimeout(() => updatePosition(), 10);
            return;
        }
    }

    function updateMouse(mouseEvent) {
        mouseX = mouseEvent.clientX;
        mouseY = mouseEvent.clientY;
    }

    function startDrag(e) {
        console.log('starting drag');
      if (e.target.tagName == "input" || e.target.tagName == "button" || !position || !dragSelector.current) {
        return;
      }

      window.addEventListener('mousemove', updateMouse);
      updateMouse(e);

      isMouseDown = true;
      mouseXOffset = Math.abs(e.clientX - $(dragSelector.current).offset().left);
      mouseYOffset = Math.abs(e.clientY - $(dragSelector.current).offset().top);

      updatePosition();
    };

    window.addEventListener('mouseup', function() {
      isMouseDown = false;
      window.removeEventListener('mousemove', updateMouse);
    });

    let orientation = ''
    if (top) {
        orientation = 'top oriented'
    } else if (bottom) {
        orientation = 'bottom oriented'
    } else if (left) {
        orientation = 'left oriented'
    } else if (right) {
        orientation = 'right oriented'
    }


    return (
        <div className={`drag-selector ${orientation}`} onMouseDown={(event) => startDrag(event)} ref={dragSelector} style={style}>
            {children}
        </div>
    )
}

export default DragSelect