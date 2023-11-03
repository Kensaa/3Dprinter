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
