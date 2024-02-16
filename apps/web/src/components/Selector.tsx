import { useState } from 'react'

import { ListGroup } from 'react-bootstrap'
import LoadingSpinner from './LoadingSpinner'

interface SelectorProps {
    elements: { name: string; type: string }[]
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
        return <LoadingSpinner style={{ width, height }} />
    }

    const itemClicked = (index: number) => {
        setSelectedElement(index)
        onChange(elements[index].name)
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
                    <div className='d-flex align-items-center justify-content-between'>
                        {e.name}
                        <div className='border p-1 tag'>{e.type}</div>
                    </div>
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
