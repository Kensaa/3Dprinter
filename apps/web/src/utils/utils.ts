import { deflate, inflate, type DeflateFunctionOptions } from 'pako'

export const blobToBase64 = async (blob: Blob) => {
    return new Promise<string>((onSuccess, onError) => {
        try {
            const reader = new FileReader()
            reader.onload = function () {
                onSuccess(this.result as string)
            }
            reader.readAsDataURL(blob)
        } catch (e) {
            onError(e)
        }
    })
}

export const getImageDimensions = (image: string) => {
    return new Promise<{ w: number; h: number }>(resolve => {
        const i = new Image()
        i.onload = function () {
            resolve({ w: i.width, h: i.height })
        }
        i.src = image
    })
}

export function blockCountString(number: number) {
    // add spaces every 3 digits
    const numberString = number.toString()
    const len = numberString.length
    let result = ''
    for (let i = len - 1; i >= 0; i--) {
        if ((len - i - 1) % 3 === 0) {
            result = ' ' + result
        }
        result = numberString[i] + result
    }
    return `${result} block${number === 1 ? '' : 's'}`
}

export function decompress(data: ArrayBuffer): ArrayBuffer {
    return inflate(data).buffer
}
export function compress(data: ArrayBuffer, level: number): ArrayBuffer {
    return deflate(data, { level: level as DeflateFunctionOptions['level'] })
        .buffer
}
