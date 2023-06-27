import { useState } from 'react'

import { ListGroup, Spinner } from 'react-bootstrap'

interface SelectorProps {
    elements: string[]
    onChange: (element: string) => void
    width?: string
    height?: string
}

export default function Selector({
    elements,
    onChange,
    width = '25%',
    height
}: SelectorProps) {
    const [selectedElement, setSelectedElement] = useState(-1)

    if (!elements) {
        return (
            <div
                style={{ width, height }}
                className='d-flex justify-content-center align-items-center border'
            >
                <Spinner animation='border' />
            </div>
        )
    }

    const itemClicked = (index: number) => {
        setSelectedElement(index)
        onChange(elements[index])
    }

    return (
        <ListGroup
            className='mb-2'
            style={{ width, height: height ?? undefined }}
        >
            {elements.map((e, i) => (
                <ListGroup.Item
                    key={i}
                    action
                    active={i === selectedElement}
                    onClick={() => itemClicked(i)}
                    className='unselectable'
                >
                    {e}
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
